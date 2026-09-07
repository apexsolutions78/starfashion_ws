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
      return ApiUtils.forbidden('Only Master Admin can manage sales permissions');
    }

    const { id } = await params;

    const salesUser = await prisma.user.findUnique({
      where: { id, role: 'SALES' },
      select: { id: true },
    });

    if (!salesUser) {
      return ApiUtils.notFound('Sales user not found');
    }

    const permissions = await prisma.salesPermission.findUnique({
      where: { salesUserId: id },
    });

    return ApiUtils.success({ permissions: permissions || null });
  } catch (error) {
    console.error('Error fetching sales permissions:', error);
    return ApiUtils.error('Failed to fetch sales permissions');
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
      return ApiUtils.forbidden('Only Master Admin can manage sales permissions');
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
    const { canProcessOrders, canDispatchOrders, canManageTiers, canChangePaymentTerms } = body;

    const permissions = await prisma.salesPermission.upsert({
      where: { salesUserId: id },
      create: {
        salesUserId: id,
        canProcessOrders: canProcessOrders ?? false,
        canDispatchOrders: canDispatchOrders ?? false,
        canManageTiers: canManageTiers ?? false,
        canChangePaymentTerms: canChangePaymentTerms ?? false,
      },
      update: {
        ...(canProcessOrders !== undefined && { canProcessOrders }),
        ...(canDispatchOrders !== undefined && { canDispatchOrders }),
        ...(canManageTiers !== undefined && { canManageTiers }),
        ...(canChangePaymentTerms !== undefined && { canChangePaymentTerms }),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'SALES_PERMISSIONS_UPDATED',
        entityType: 'SalesPermission',
        entityId: permissions.id,
        afterJson: JSON.stringify(permissions),
      },
    });

    return ApiUtils.success(permissions, 'Sales permissions updated successfully');
  } catch (error) {
    console.error('Error updating sales permissions:', error);
    return ApiUtils.error('Failed to update sales permissions');
  }
}
