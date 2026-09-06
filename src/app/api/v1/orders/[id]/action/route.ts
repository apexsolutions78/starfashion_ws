import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// Customer accepts or cancels ON_HOLD order
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return ApiUtils.unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!['ACCEPT', 'CANCEL'].includes(action)) {
      return ApiUtils.error('Invalid action. Use ACCEPT or CANCEL');
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!order) {
      return ApiUtils.notFound('Order not found');
    }

    // Tenant check
    if (session.userType === 'CUSTOMER' && order.customerId !== session.customerId) {
      return ApiUtils.notFound('Order not found');
    }

    // Only ON_HOLD orders can be accepted/cancelled by customer
    if (order.status !== 'ON_HOLD') {
      return ApiUtils.error('Only orders on hold can be accepted or cancelled');
    }

    // Check if hold has expired
    if (order.holdExpiresAt && new Date() > order.holdExpiresAt) {
      // Auto-cancel expired order
      await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return ApiUtils.error('Order hold has expired. Order has been cancelled.');
    }

    if (action === 'ACCEPT') {
      // Customer accepts - order moves to ACCEPTED (awaiting payment)
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          customerReviewed: true,
        },
      });

      // Notify admin
      await prisma.customerNotification.create({
        data: {
          customerId: order.customerId,
          title: 'Order Accepted — Awaiting Payment',
          message: `Order ${order.orderNumber} has been accepted by the customer. Awaiting payment to confirm the order.`,
          type: 'ORDER_UPDATE',
          orderId: id,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: session.userId,
          actorEmail: session.email,
          action: 'ORDER_ACCEPTED_BY_CUSTOMER',
          entityType: 'Order',
          entityId: id,
          afterJson: JSON.stringify({ status: 'ACCEPTED' }),
        },
      });

      return ApiUtils.success(updatedOrder, 'Order accepted. Please proceed with payment to confirm your order.');
    } else {
      // Customer cancels
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await prisma.auditLog.create({
        data: {
          actorId: session.userId,
          actorEmail: session.email,
          action: 'ORDER_CANCELLED_BY_CUSTOMER',
          entityType: 'Order',
          entityId: id,
          beforeJson: JSON.stringify({ status: order.status }),
          afterJson: JSON.stringify({ status: 'CANCELLED' }),
        },
      });

      return ApiUtils.success(updatedOrder, 'Order cancelled');
    }
  } catch (error: any) {
    console.error('Error processing order action:', error);
    return ApiUtils.error(error.message || 'Failed to process order action');
  }
}
