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
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can manage roles');
    }

    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { rolePermissions: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissionCount: role._count.rolePermissions,
    }));

    return ApiUtils.success(result);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return ApiUtils.error('Failed to fetch roles');
  }
}

export async function POST(request: NextRequest) {
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
      return ApiUtils.forbidden('Only Master Admin can manage roles');
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiUtils.error('Role name is required');
    }

    const existing = await prisma.role.findFirst({
      where: { name: name.trim().toUpperCase() },
    });

    if (existing) {
      return ApiUtils.error('A role with this name already exists');
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim().toUpperCase(),
        description: description || null,
      },
    });

    return ApiUtils.success(role, 'Role created successfully', 201);
  } catch (error) {
    console.error('Error creating role:', error);
    return ApiUtils.error('Failed to create role');
  }
}
