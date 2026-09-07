import { NextRequest } from 'next/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// GET counts for sidebar badges
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.REPORTS_READ);
    if (!auth) return ApiUtils.forbidden();

    const [
      newOrders,
      onHoldOrders,
      acceptedOrders,
      confirmedOrders,
      processingOrders,
      pendingPayments,
      pendingApprovals,
      lowStock,
    ] = await Promise.all([
      prisma.order.count({ where: { status: 'SUBMITTED' } }),
      prisma.order.count({ where: { status: 'ON_HOLD' } }),
      prisma.order.count({ where: { status: 'ACCEPTED' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.customerCompany.count({ where: { onboardingStatus: 'PENDING_APPROVAL' } }),
      prisma.inventory.aggregate({
        _sum: { onHand: true, reserved: true },
        where: { onHand: { lte: 10 } },
      }).then(async () => {
        return prisma.productVariant.count({
          where: {
            active: true,
            inProduction: false,
            inventory: { some: { onHand: { lte: 10 } } },
          },
        });
      }),
    ]);

    return ApiUtils.success({
      newOrders,
      onHoldOrders,
      acceptedOrders,
      confirmedOrders,
      processingOrders,
      pendingPayments,
      pendingApprovals,
      lowStock,
    });
  } catch (error: any) {
    console.error('Error fetching counts:', error);
    return ApiUtils.error(error.message || 'Failed to fetch counts');
  }
}
