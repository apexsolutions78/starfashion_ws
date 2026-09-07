import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';

async function requireMasterAdmin(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session || session.userType !== 'ADMIN') {
    return { error: ApiUtils.forbidden() };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (currentUser?.role !== 'MASTER_ADMIN') {
    return { error: ApiUtils.forbidden('Only Master Admin can manage role permissions') };
  }

  return { session, currentUser };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMasterAdmin(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return ApiUtils.notFound('Role not found');
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: id },
      include: { permission: true },
    });

    const permissions = rolePermissions.map((rp) => ({
      id: rp.permission.id,
      code: rp.permission.code,
      description: rp.permission.description,
    }));

    return ApiUtils.success({ roleId: id, roleName: role.name, permissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return ApiUtils.error('Failed to fetch role permissions');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMasterAdmin(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return ApiUtils.notFound('Role not found');
    }

    const body = await request.json();
    const { permissionCodes } = body;

    if (!Array.isArray(permissionCodes)) {
      return ApiUtils.error('permissionCodes must be an array');
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    if (permissions.length !== permissionCodes.length) {
      const found = new Set(permissions.map((p) => p.code));
      const missing = permissionCodes.filter((c: string) => !found.has(c));
      return ApiUtils.error(`Invalid permission codes: ${missing.join(', ')}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: auth.session.userId,
          actorEmail: auth.session.email,
          action: 'ROLE_PERMISSIONS_UPDATED',
          entityType: 'Role',
          entityId: id,
          afterJson: JSON.stringify({ roleId: id, permissionCodes }),
        },
      });
    });

    const result = await prisma.rolePermission.findMany({
      where: { roleId: id },
      include: { permission: true },
    });

    const updatedPermissions = result.map((rp) => ({
      id: rp.permission.id,
      code: rp.permission.code,
      description: rp.permission.description,
    }));

    return ApiUtils.success(
      { roleId: id, roleName: role.name, permissions: updatedPermissions },
      'Role permissions updated successfully'
    );
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return ApiUtils.error('Failed to update role permissions');
  }
}
