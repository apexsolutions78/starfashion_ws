import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';

const PREDEFINED_PERMISSIONS = [
  { code: 'catalog:read', description: 'View product catalog' },
  { code: 'catalog:write', description: 'Create and edit products' },
  { code: 'orders:read', description: 'View orders' },
  { code: 'orders:process', description: 'Process and fulfill orders' },
  { code: 'orders:dispatch', description: 'Dispatch orders' },
  { code: 'payments:read', description: 'View payments' },
  { code: 'payments:record', description: 'Record payments' },
  { code: 'tiers:read', description: 'View pricing tiers' },
  { code: 'tiers:manage', description: 'Manage pricing tiers' },
  { code: 'customers:read', description: 'View customers' },
  { code: 'customers:manage', description: 'Manage customers' },
  { code: 'stock:read', description: 'View stock levels' },
  { code: 'stock:manage', description: 'Manage stock levels' },
  { code: 'reports:read', description: 'View reports' },
  { code: 'users:read', description: 'View admin users' },
  { code: 'users:manage', description: 'Manage admin users' },
  { code: 'sales:read', description: 'View sales data' },
  { code: 'sales:manage', description: 'Manage sales data' },
  { code: 'settings:read', description: 'View system settings' },
  { code: 'settings:manage', description: 'Manage system settings' },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const permissions = await prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });

    return ApiUtils.success(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return ApiUtils.error('Failed to fetch permissions');
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
      return ApiUtils.forbidden('Only Master Admin can create permissions');
    }

    const body = await request.json();
    const { code, description } = body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return ApiUtils.error('Permission code is required');
    }

    const normalizedCode = code.trim().toLowerCase();

    const existing = await prisma.permission.findFirst({
      where: { code: normalizedCode },
    });

    if (existing) {
      return ApiUtils.error('A permission with this code already exists');
    }

    const permission = await prisma.permission.create({
      data: {
        code: normalizedCode,
        description: description || null,
      },
    });

    return ApiUtils.success(permission, 'Permission created successfully', 201);
  } catch (error) {
    console.error('Error creating permission:', error);
    return ApiUtils.error('Failed to create permission');
  }
}
