import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { OrderService } from '@/services/OrderService';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return ApiUtils.unauthorized();
  }

  try {
    const where: any = {};
    if (session.userType === 'CUSTOMER') {
      where.customerId = session.customerId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { companyName: true } },
        items: true,
        invoice: { select: { invoiceNumber: true, status: true, paidAmount: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return ApiUtils.success(orders);
  } catch (error: any) {
    return ApiUtils.error(error.message || 'Failed to fetch orders', 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || !session.customerId) {
    return ApiUtils.unauthorized('Customer account required to place orders');
  }

  try {
    const body = await req.json().catch(() => ({}));
    const order = await OrderService.submitOrder(
      session.customerId,
      session.userId,
      body.notes
    );

    return ApiUtils.success(order, 'Order submitted successfully', 201);
  } catch (error: any) {
    return ApiUtils.error(error.message || 'Failed to submit order', 400);
  }
}
