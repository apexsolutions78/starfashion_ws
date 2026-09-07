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
    return { error: ApiUtils.forbidden('Only Master Admin can manage roles') };
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

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      return ApiUtils.notFound('Role not found');
    }

    const result = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        description: rp.permission.description,
      })),
    };

    return ApiUtils.success(result);
  } catch (error) {
    console.error('Error fetching role:', error);
    return ApiUtils.error('Failed to fetch role');
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

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return ApiUtils.notFound('Role not found');
    }

    const body = await request.json();
    const { name, description } = body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return ApiUtils.error('Role name cannot be empty');
    }

    if (name) {
      const duplicate = await prisma.role.findFirst({
        where: { name: name.trim().toUpperCase(), id: { not: id } },
      });
      if (duplicate) {
        return ApiUtils.error('A role with this name already exists');
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim().toUpperCase() }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    return ApiUtils.success(role, 'Role updated successfully');
  } catch (error) {
    console.error('Error updating role:', error);
    return ApiUtils.error('Failed to update role');
  }
}

export async function DELETE(
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

    if (role.name === 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Cannot delete the MASTER_ADMIN role');
    }

    await prisma.role.delete({ where: { id } });

    return ApiUtils.success(null, 'Role deleted successfully');
  } catch (error) {
    console.error('Error deleting role:', error);
    return ApiUtils.error('Failed to delete role');
  }
}
