import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) {
    return ApiUtils.unauthorized();
  }

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        invoice: {
          include: { items: true, allocations: true },
        },
        payments: {
          where: { status: { not: 'VOID' } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return ApiUtils.notFound('Order not found');
    }

    // Tenant Data Isolation Check: Customer user can ONLY access their own company's order
    if (session.userType === 'CUSTOMER' && order.customerId !== session.customerId) {
      return ApiUtils.notFound('Order not found'); // Hide existence across tenants
    }

    return ApiUtils.success(order);
  } catch (error: any) {
    return ApiUtils.error(error.message || 'Failed to fetch order details', 500);
  }
}

// Cancel an order (both admin and customer can cancel)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) {
    return ApiUtils.unauthorized();
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (action !== 'CANCEL') {
      return ApiUtils.error('Invalid action', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!order) {
      return ApiUtils.notFound('Order not found');
    }

    // Tenant check: customer can only cancel their own orders
    if (session.userType === 'CUSTOMER' && order.customerId !== session.customerId) {
      return ApiUtils.notFound('Order not found');
    }

    // Only SUBMITTED orders can be cancelled
    if (order.status !== 'SUBMITTED') {
      return ApiUtils.error('Only orders with SUBMITTED status can be cancelled');
    }

    // Update order status to CANCELLED
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'ORDER_CANCELLED',
        entityType: 'Order',
        entityId: id,
        beforeJson: JSON.stringify({ status: order.status }),
        afterJson: JSON.stringify({ status: 'CANCELLED' }),
      },
    });

    return ApiUtils.success(updatedOrder, 'Order cancelled successfully');
  } catch (error: any) {
    return ApiUtils.error(error.message || 'Failed to cancel order', 500);
  }
}
