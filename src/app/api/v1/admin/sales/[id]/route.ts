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
      return ApiUtils.forbidden('Only Master Admin can manage sales users');
    }

    const { id } = await params;

    const salesUser = await prisma.user.findUnique({
      where: { id, role: 'SALES' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        salesAssignments: {
          include: {
            customer: { select: { id: true, companyName: true, status: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        salesPermission: true,
        salesCommissions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!salesUser) {
      return ApiUtils.notFound('Sales user not found');
    }

    return ApiUtils.success({ salesUser });
  } catch (error) {
    console.error('Error fetching sales user:', error);
    return ApiUtils.error('Failed to fetch sales user');
  }
}

export async function PUT(
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
      return ApiUtils.forbidden('Only Master Admin can update sales users');
    }

    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id, role: 'SALES' },
      select: { id: true },
    });

    if (!existing) {
      return ApiUtils.notFound('Sales user not found');
    }

    const body = await request.json();
    const { firstName, lastName, phone, status } = body;

    const updateData: Record<string, any> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (status !== undefined) updateData.status = status;

    if (status && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return ApiUtils.error('Invalid status value');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        status: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'SALES_USER_UPDATED',
        entityType: 'User',
        entityId: id,
        afterJson: JSON.stringify(updateData),
      },
    });

    return ApiUtils.success(updated, 'Sales user updated successfully');
  } catch (error) {
    console.error('Error updating sales user:', error);
    return ApiUtils.error('Failed to update sales user');
  }
}

export async function DELETE(
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
      return ApiUtils.forbidden('Only Master Admin can delete sales users');
    }

    const { id } = await params;

    if (id === session.userId) {
      return ApiUtils.forbidden('Cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({
      where: { id, role: 'SALES' },
      select: { id: true },
    });

    if (!existing) {
      return ApiUtils.notFound('Sales user not found');
    }

    await prisma.$transaction([
      prisma.salesAssignment.deleteMany({ where: { salesUserId: id } }),
      prisma.salesPermission.deleteMany({ where: { salesUserId: id } }),
      prisma.salesCommission.deleteMany({ where: { salesUserId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'SALES_USER_DELETED',
        entityType: 'User',
        entityId: id,
      },
    });

    return ApiUtils.success(null, 'Sales user deleted successfully');
  } catch (error) {
    console.error('Error deleting sales user:', error);
    return ApiUtils.error('Failed to delete sales user');
  }
}
