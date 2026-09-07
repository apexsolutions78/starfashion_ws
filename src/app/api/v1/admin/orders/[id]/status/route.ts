import { NextRequest } from 'next/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';
import { OrderService } from '@/services/OrderService';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'CONFIRMED',
    'PROCESSING',
    'DISPATCHED',
    'SHIPPED',
    'COMPLETED',
    'CANCELLED',
    'ON_HOLD',
  ]),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, PERMISSIONS.ORDERS_PROCESS);
  if (!auth) return ApiUtils.forbidden();

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateStatusSchema.parse(body);

    const updatedOrder = await OrderService.updateOrderStatus(
      id,
      parsed.status,
      auth.session.userId
    );

    return ApiUtils.success(updatedOrder, 'Order status updated successfully');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    return ApiUtils.error(error.message || 'Failed to update order status', 500);
  }
}
