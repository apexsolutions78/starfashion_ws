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
