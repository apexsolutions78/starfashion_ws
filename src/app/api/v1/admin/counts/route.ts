import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// GET counts for sidebar badges
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) return ApiUtils.unauthorized();

    const [
      newOrders,
      onHoldOrders,
      acceptedOrders,
      confirmedOrders,
      pendingPayments,
      pendingApprovals,
      lowStock,
    ] = await Promise.all([
      prisma.order.count({ where: { status: 'SUBMITTED' } }),
      prisma.order.count({ where: { status: 'ON_HOLD' } }),
      prisma.order.count({ where: { status: 'ACCEPTED' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
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
      pendingPayments,
      pendingApprovals,
      lowStock,
    });
  } catch (error: any) {
    console.error('Error fetching counts:', error);
    return ApiUtils.error(error.message || 'Failed to fetch counts');
  }
}
