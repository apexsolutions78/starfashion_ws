import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// GET order for admin review with stock info (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden('Admin authorization required');
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { companyName: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { name: true, articleNumber: true } },
                color: { select: { name: true } },
                size: { select: { name: true } },
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return ApiUtils.notFound('Order not found');
    }

    // Enrich items with available stock (admin only)
    const enrichedItems = order.items.map((item) => {
      const variant = item.variant;
      const totalStock = variant?.inventory?.reduce((sum: number, inv: any) => sum + inv.onHand, 0) || 0;
      const totalReserved = variant?.inventory?.reduce((sum: number, inv: any) => sum + inv.reserved, 0) || 0;
      const availableStock = totalStock - totalReserved;

      return {
        ...item,
        availableStock,
      };
    });

    return ApiUtils.success({
      ...order,
      items: enrichedItems,
    });
  } catch (error: any) {
    console.error('Error fetching order for review:', error);
    return ApiUtils.error(error.message || 'Failed to fetch order');
  }
}

// Admin reviews order: update quantities, set hold days, send to customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden('Admin authorization required');
    }

    const { id } = await params;
    const body = await request.json();
    const { items, holdDays, adminNotes } = body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!order) {
      return ApiUtils.notFound('Order not found');
    }

    if (order.status !== 'SUBMITTED') {
      return ApiUtils.error('Only SUBMITTED orders can be reviewed');
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id && item.quantity !== undefined) {
          const orderItem = order.items.find((i) => i.id === item.id);
          if (orderItem) {
            // Recalculate line totals
            const discountPerUnit = orderItem.baseUnitPriceSnapshot * (order.discountPercentSnapshot / 100);
            const lineNet = (orderItem.baseUnitPriceSnapshot - discountPerUnit) * item.quantity;
            const lineDiscount = discountPerUnit * item.quantity;

            await prisma.orderItem.update({
              where: { id: item.id },
              data: {
                quantity: item.quantity,
                lineNet,
                lineDiscount,
              },
            });
          }
        }
      }
    }

    // Recalculate order totals
    const updatedItems = await prisma.orderItem.findMany({
      where: { orderId: id },
    });

    const newQualifyingQty = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    const newGrossSubtotal = updatedItems.reduce((sum, item) => sum + (item.baseUnitPriceSnapshot * item.quantity), 0);
    const newDiscountTotal = updatedItems.reduce((sum, item) => sum + item.lineDiscount, 0);
    const newNetSubtotal = updatedItems.reduce((sum, item) => sum + item.lineNet, 0);

    // Calculate hold expiry
    const holdDaysNum = parseInt(holdDays) || 7;
    const holdExpiresAt = new Date();
    holdExpiresAt.setDate(holdExpiresAt.getDate() + holdDaysNum);

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        qualifyingQty: newQualifyingQty,
        grossSubtotal: newGrossSubtotal,
        discountTotal: newDiscountTotal,
        netSubtotal: newNetSubtotal,
        grandTotal: newNetSubtotal,
        holdDays: holdDaysNum,
        holdExpiresAt,
        adminNotes: adminNotes || null,
        status: 'ON_HOLD',
        customerReviewed: false,
        reviewedByUserId: session.userId,
        reviewedAt: new Date(),
      },
    });

    // Create notification for customer
    await prisma.customerNotification.create({
      data: {
        customerId: order.customerId,
        title: 'Order Reviewed & Re-submitted',
        message: `Your order ${order.orderNumber} has been reviewed by our team. Please review the updated order and confirm within ${holdDaysNum} days. Hold expires: ${holdExpiresAt.toLocaleDateString()}`,
        type: 'ORDER_UPDATE',
        orderId: id,
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'ORDER_REVIEWED',
        entityType: 'Order',
        entityId: id,
        afterJson: JSON.stringify({
          status: 'ON_HOLD',
          holdDays: holdDaysNum,
          holdExpiresAt: holdExpiresAt.toISOString(),
          itemsUpdated: items?.length || 0,
        }),
      },
    });

    return ApiUtils.success(updatedOrder, 'Order reviewed and sent to customer');
  } catch (error: any) {
    console.error('Error reviewing order:', error);
    return ApiUtils.error(error.message || 'Failed to review order');
  }
}
