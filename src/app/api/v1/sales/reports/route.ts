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

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const assignments = await prisma.salesAssignment.findMany({
      where: {
        salesUserId,
        ...(customerId && { customerId }),
      },
      select: { customerId: true },
    });

    const customerIds = assignments.map((a) => a.customerId);

    if (customerIds.length === 0) {
      return ApiUtils.success({
        ordersByStatus: [],
        totalSales: 0,
        paymentsReceived: 0,
        balances: [],
      });
    }

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: { customerId: { in: customerIds } },
      _count: { id: true },
      _sum: {
        grandTotal: true,
        grossSubtotal: true,
        discountTotal: true,
        shippingTotal: true,
        taxTotal: true,
      },
    });

    const totalSalesAgg = await prisma.order.aggregate({
      where: {
        customerId: { in: customerIds },
        status: { notIn: ['CANCELLED'] },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    });

    const paymentsAgg = await prisma.payment.aggregate({
      where: {
        customerId: { in: customerIds },
        status: 'POSTED',
      },
      _sum: { amount: true },
    });

    const balances = await prisma.customerCompany.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        companyName: true,
        creditLimit: true,
      },
    });

    const invoiceBalances = await prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customerIds },
        status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      _sum: { balanceDue: true, totalAmount: true, paidAmount: true },
    });

    const balancesWithInvoice = balances.map((b) => {
      const invoiceData = invoiceBalances.find((inv) => inv.customerId === b.id);
      return {
        ...b,
        totalOutstanding: invoiceData?._sum.balanceDue || 0,
        totalInvoiced: invoiceData?._sum.totalAmount || 0,
        totalPaid: invoiceData?._sum.paidAmount || 0,
      };
    });

    return ApiUtils.success({
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        grandTotal: s._sum.grandTotal || 0,
        grossSubtotal: s._sum.grossSubtotal || 0,
        discountTotal: s._sum.discountTotal || 0,
        shippingTotal: s._sum.shippingTotal || 0,
        taxTotal: s._sum.taxTotal || 0,
      })),
      totalSales: {
        orderCount: totalSalesAgg._count.id,
        grandTotal: totalSalesAgg._sum.grandTotal || 0,
      },
      paymentsReceived: paymentsAgg._sum.amount || 0,
      balances: balancesWithInvoice,
    });
  } catch (error) {
    console.error('Error fetching sales reports:', error);
    return ApiUtils.error('Failed to fetch sales reports');
  }
}
