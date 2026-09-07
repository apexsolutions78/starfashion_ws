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
          include: {
            orders: {
              select: {
                id: true,
                grandTotal: true,
                status: true,
                createdAt: true,
              },
            },
            payments: {
              where: { status: 'POSTED' },
              select: { amount: true },
            },
            invoices: {
              select: { balanceDue: true, totalAmount: true, paidAmount: true },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const customersWithSummary = assignments.map((assignment) => {
      const { customer } = assignment;
      const totalOrders = customer.orders.length;
      const totalRevenue = customer.orders.reduce((sum, o) => sum + o.grandTotal, 0);
      const totalPayments = customer.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalBalanceDue = customer.invoices.reduce(
        (sum, inv) => sum + inv.balanceDue,
        0
      );

      return {
        assignmentId: assignment.id,
        assignedAt: assignment.assignedAt,
        notes: assignment.notes,
        customer: {
          id: customer.id,
          companyName: customer.companyName,
          contactName: customer.contactName,
          phone: customer.phone,
          city: customer.city,
          country: customer.country,
          status: customer.status,
          creditLimit: customer.creditLimit,
        },
        summary: {
          totalOrders,
          totalRevenue,
          totalPayments,
          totalBalanceDue,
        },
      };
    });

    return ApiUtils.success({ customers: customersWithSummary });
  } catch (error) {
    console.error('Error fetching sales customers:', error);
    return ApiUtils.error('Failed to fetch sales customers');
  }
}
