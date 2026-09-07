import { NextRequest } from 'next/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, PERMISSIONS.REPORTS_READ);
  if (!auth) return ApiUtils.forbidden();

  const auditLogs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  return ApiUtils.success(auditLogs);
}
