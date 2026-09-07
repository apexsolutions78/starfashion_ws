import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can manage sales assignments');
    }

    const { id } = await params;

    const salesUser = await prisma.user.findUnique({
      where: { id, role: 'SALES' },
      select: { id: true },
    });

    if (!salesUser) {
      return ApiUtils.notFound('Sales user not found');
    }

    const assignments = await prisma.salesAssignment.findMany({
      where: { salesUserId: id },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            phone: true,
            city: true,
            status: true,
          },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return ApiUtils.success({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return ApiUtils.error('Failed to fetch assignments');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can manage sales assignments');
    }

    const { id } = await params;

    const salesUser = await prisma.user.findUnique({
      where: { id, role: 'SALES' },
      select: { id: true },
    });

    if (!salesUser) {
      return ApiUtils.notFound('Sales user not found');
    }

    const body = await request.json();
    const { customerId, notes } = body;

    if (!customerId) {
      return ApiUtils.error('Customer ID is required');
    }

    const customer = await prisma.customerCompany.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return ApiUtils.notFound('Customer not found');
    }

    const existingAssignment = await prisma.salesAssignment.findUnique({
      where: { salesUserId_customerId: { salesUserId: id, customerId } },
    });

    if (existingAssignment) {
      return ApiUtils.error('Customer is already assigned to this sales user');
    }

    const assignment = await prisma.salesAssignment.create({
      data: {
        salesUserId: id,
        customerId,
        assignedByUserId: session.userId,
        notes: notes || null,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
      },
    });

    await prisma.customerCompany.update({
      where: { id: customerId },
      data: { assignedSalesUserId: id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'SALES_ASSIGNMENT_CREATED',
        entityType: 'SalesAssignment',
        entityId: assignment.id,
        afterJson: JSON.stringify(assignment),
      },
    });

    return ApiUtils.success(assignment, 'Customer assigned successfully', 201);
  } catch (error) {
    console.error('Error creating assignment:', error);
    return ApiUtils.error('Failed to create assignment');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can manage sales assignments');
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return ApiUtils.error('Assignment ID is required');
    }

    const assignment = await prisma.salesAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, customerId: true },
    });

    if (!assignment) {
      return ApiUtils.notFound('Assignment not found');
    }

    await prisma.$transaction([
      prisma.salesAssignment.delete({ where: { id: assignmentId } }),
      prisma.customerCompany.update({
        where: { id: assignment.customerId },
        data: { assignedSalesUserId: null },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'SALES_ASSIGNMENT_DELETED',
        entityType: 'SalesAssignment',
        entityId: assignmentId,
      },
    });

    return ApiUtils.success(null, 'Assignment removed successfully');
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return ApiUtils.error('Failed to delete assignment');
  }
}
