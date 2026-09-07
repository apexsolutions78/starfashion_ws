import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';

// Approve a customer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CUSTOMERS_MANAGE);
    if (!auth) return ApiUtils.forbidden();
    if (auth.userRole !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can approve/reject customers');
    }

    const { id } = await params;
    const body = await request.json();
    const { creditLimit, paymentTermsId, minOrderQty } = body;

    // Find the company
    const company = await prisma.customerCompany.findUnique({
      where: { id },
      include: {
        customerUsers: { include: { user: true } },
      },
    });

    if (!company) {
      return ApiUtils.notFound('Customer not found');
    }

    if (company.onboardingStatus !== 'PENDING_APPROVAL') {
      return ApiUtils.error('Customer is not pending approval');
    }

    // Update company
    const updateData: any = {
      onboardingStatus: 'APPROVED',
      approvedAt: new Date(),
      approvedByUserId: auth.session.userId,
      creditLimit: creditLimit || 0,
      minOrderQty: minOrderQty || 30,
    };
    if (paymentTermsId) {
      const termExists = await prisma.paymentTerm.findUnique({ where: { id: paymentTermsId } });
      if (termExists) {
        updateData.paymentTermsId = paymentTermsId;
      }
    }
    await prisma.customerCompany.update({
      where: { id },
      data: updateData,
    });

    // Update user approval status
    if (company.customerUsers && company.customerUsers.length > 0) {
      await prisma.user.update({
        where: { id: company.customerUsers[0].userId },
        data: { approvalStatus: 'APPROVED' },
      });
    }

    return ApiUtils.success({ companyId: id }, 'Customer approved successfully');
  } catch (error: any) {
    console.error('Error approving customer:', error);
    return ApiUtils.error('Failed to approve customer');
  }
}

// Reject a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CUSTOMERS_MANAGE);
    if (!auth) return ApiUtils.forbidden();
    if (auth.userRole !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can approve/reject customers');
    }

    const { id } = await params;
    const body = await request.json();
    const { rejectionReason } = body;

    // Find the company
    const company = await prisma.customerCompany.findUnique({
      where: { id },
      include: {
        customerUsers: { include: { user: true } },
      },
    });

    if (!company) {
      return ApiUtils.notFound('Customer not found');
    }

    if (company.onboardingStatus !== 'PENDING_APPROVAL') {
      return ApiUtils.error('Customer is not pending approval');
    }

    // Update company
    await prisma.customerCompany.update({
      where: { id },
      data: {
        onboardingStatus: 'REJECTED',
        rejectionReason: rejectionReason || null,
      },
    });

    // Update user approval status
    if (company.customerUsers && company.customerUsers.length > 0) {
      await prisma.user.update({
        where: { id: company.customerUsers[0].userId },
        data: {
          approvalStatus: 'REJECTED',
          rejectionReason: rejectionReason || null,
        },
      });
    }

    return ApiUtils.success({ companyId: id }, 'Customer rejected');
  } catch (error: any) {
    console.error('Error rejecting customer:', error);
    return ApiUtils.error('Failed to reject customer');
  }
}
