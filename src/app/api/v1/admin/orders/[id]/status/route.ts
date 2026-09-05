import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { OrderService } from '@/services/OrderService';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'CONFIRMED',
    'PROCESSING',
    'PACKED',
    'SHIPPED',
    'COMPLETED',
    'CANCELLED',
    'ON_HOLD',
  ]),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateStatusSchema.parse(body);

    const updatedOrder = await OrderService.updateOrderStatus(
      id,
      parsed.status,
      session.userId
    );

    return ApiUtils.success(updatedOrder, 'Order status updated successfully');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    return ApiUtils.error(error.message || 'Failed to update order status', 500);
  }
}
