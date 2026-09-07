import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { PERMISSIONS } from '@/lib/permissions';

// GET current user's permissions (for frontend use)
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, department: true },
    });

    if (!user) {
      return ApiUtils.notFound('User not found');
    }

    // MASTER_ADMIN gets all permissions
    if (user.role === 'MASTER_ADMIN') {
      return ApiUtils.success({
        permissions: Object.values(PERMISSIONS),
        role: user.role,
        department: user.department,
      });
    }

    // SALES users get permissions from SalesPermission table
    if (user.role === 'SALES') {
      const salesPerm = await prisma.salesPermission.findUnique({
        where: { salesUserId: session.userId },
      });

      const perms: string[] = [PERMISSIONS.SETTINGS_READ];
      if (salesPerm?.canProcessOrders) perms.push(PERMISSIONS.ORDERS_PROCESS, PERMISSIONS.ORDERS_READ);
      if (salesPerm?.canDispatchOrders) perms.push(PERMISSIONS.ORDERS_DISPATCH);
      if (salesPerm?.canManageTiers) perms.push(PERMISSIONS.TIERS_READ, PERMISSIONS.TIERS_MANAGE);
      if (salesPerm?.canChangePaymentTerms) perms.push(PERMISSIONS.CUSTOMERS_MANAGE);

      // Sales always get these
      perms.push(PERMISSIONS.SALES_READ, PERMISSIONS.CATALOG_READ, PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.REPORTS_READ);

      return ApiUtils.success({
        permissions: [...new Set(perms)],
        role: user.role,
        department: user.department,
      });
    }

    // Other roles: look up RolePermission table by matching role name
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: { name: user.role! } },
      include: { permission: { select: { code: true } } },
    });

    const perms = rolePermissions.map(rp => rp.permission.code);

    return ApiUtils.success({
      permissions: perms,
      role: user.role,
      department: user.department,
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return ApiUtils.error('Failed to fetch permissions');
  }
}
