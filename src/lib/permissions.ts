import { NextRequest } from 'next/server';
import { prisma } from './db';
import { getAuthSession } from './middleware-auth';
import { ApiUtils } from './api-response';
import { UserSessionPayload } from './auth';

// Permission codes used across the application
export const PERMISSIONS = {
  CATALOG_READ: 'catalog:read',
  CATALOG_WRITE: 'catalog:write',
  ORDERS_READ: 'orders:read',
  ORDERS_PROCESS: 'orders:process',
  ORDERS_DISPATCH: 'orders:dispatch',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_RECORD: 'payments:record',
  TIERS_READ: 'tiers:read',
  TIERS_MANAGE: 'tiers:manage',
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_MANAGE: 'customers:manage',
  STOCK_READ: 'stock:read',
  STOCK_MANAGE: 'stock:manage',
  REPORTS_READ: 'reports:read',
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',
  SALES_READ: 'sales:read',
  SALES_MANAGE: 'sales:manage',
  SETTINGS_READ: 'settings:read',
  SETTINGS_MANAGE: 'settings:manage',
} as const;

// Cache permissions per request to avoid duplicate DB queries
const permissionCache = new Map<string, Set<string>>();

/**
 * Get all permission codes for a user by looking up their role's permissions.
 * MASTER_ADMIN always gets all permissions.
 */
export async function getUserPermissions(userId: string, role?: string | null): Promise<Set<string>> {
  if (role === 'MASTER_ADMIN') {
    return new Set(Object.values(PERMISSIONS));
  }

  const cacheKey = userId;
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!;
  }

  // Users have a `role` string field. Match it to Role.name to find permissions.
  if (!role) {
    return new Set();
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role: { name: role } },
    include: { permission: { select: { code: true } } },
  });

  const perms = new Set(rolePermissions.map(rp => rp.permission.code));
  permissionCache.set(cacheKey, perms);
  return perms;
}

/**
 * Check if a user has a specific permission.
 */
export async function hasPermission(userId: string, permissionCode: string, role?: string | null): Promise<boolean> {
  if (role === 'MASTER_ADMIN') return true;
  const perms = await getUserPermissions(userId, role);
  return perms.has(permissionCode);
}

/**
 * Clear the permission cache (call after role/permission changes).
 */
export function clearPermissionCache(userId?: string) {
  if (userId) {
    permissionCache.delete(userId);
  } else {
    permissionCache.clear();
  }
}

export interface AuthContext {
  session: UserSessionPayload;
  userRole: string | null;
  userDepartment: string | null;
}

/**
 * Get full auth context including role and department from database.
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const session = await getAuthSession(request);
  if (!session || session.userType !== 'ADMIN') return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, department: true },
  });

  return {
    session,
    userRole: user?.role || session.role || null,
    userDepartment: user?.department || null,
  };
}

/**
 * Require a specific permission. Returns AuthContext on success, null on failure.
 * MASTER_ADMIN bypasses all permission checks.
 */
export async function requirePermission(
  request: NextRequest,
  permissionCode: string
): Promise<AuthContext | null> {
  const auth = await getAuthContext(request);
  if (!auth) return null;

  // MASTER_ADMIN bypasses permission checks
  if (auth.userRole === 'MASTER_ADMIN') return auth;

  const permitted = await hasPermission(auth.session.userId, permissionCode, auth.userRole);
  if (!permitted) return null;

  return auth;
}

/**
 * Require a specific permission for SALES role users.
 * Checks the SalesPermission table for granular sales permissions.
 * Returns AuthContext on success, null on failure.
 */
export async function requireSalesPermission(
  request: NextRequest,
  permissionField: keyof { canProcessOrders: boolean; canDispatchOrders: boolean; canManageTiers: boolean; canChangePaymentTerms: boolean }
): Promise<AuthContext | null> {
  const auth = await getAuthContext(request);
  if (!auth) return null;

  // MASTER_ADMIN bypasses all checks
  if (auth.userRole === 'MASTER_ADMIN') return auth;

  // Must be SALES role with SALES department
  if (auth.userRole !== 'SALES' || auth.userDepartment !== 'SALES') return null;

  // Check SalesPermission table
  const salesPermission = await prisma.salesPermission.findUnique({
    where: { salesUserId: auth.session.userId },
  });

  if (!salesPermission || !salesPermission[permissionField]) return null;

  return auth;
}
