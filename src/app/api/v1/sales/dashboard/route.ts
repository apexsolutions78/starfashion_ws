import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, department: true },
    });

    if (currentUser?.role !== 'SALES' || currentUser?.department !== 'SALES') {
      return ApiUtils.forbidden('Access restricted to sales department users');
    }

    const salesUserId = session.userId;

    const assignments = await prisma.salesAssignment.findMany({
      where: { salesUserId },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            status: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const customerIds = assignments.map((a) => a.customerId);

    const orderStats = await prisma.order.groupBy({
      by: ['status'],
      where: { customerId: { in: customerIds } },
      _count: { id: true },
      _sum: { grandTotal: true },
    });

    const totalOrders = orderStats.reduce((sum, s) => sum + s._count.id, 0);
    const totalRevenue = orderStats.reduce(
      (sum, s) => sum + (s._sum.grandTotal || 0),
      0
    );

    const paymentStats = await prisma.payment.aggregate({
      where: {
        customerId: { in: customerIds },
        status: 'POSTED',
      },
      _sum: { amount: true },
    });

    const totalPaymentsReceived = paymentStats._sum.amount || 0;

    const invoiceStats = await prisma.invoice.aggregate({
      where: {
        customerId: { in: customerIds },
        status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      _sum: { balanceDue: true },
    });

    const pendingPayments = invoiceStats._sum.balanceDue || 0;

    return ApiUtils.success({
      assignedCustomers: assignments.length,
      totalOrders,
      totalRevenue,
      totalPaymentsReceived,
      pendingPayments,
      ordersByStatus: orderStats.map((s) => ({
        status: s.status,
        count: s._count.id,
        total: s._sum.grandTotal || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching sales dashboard:', error);
    return ApiUtils.error('Failed to fetch sales dashboard');
  }
}
