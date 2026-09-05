import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  const auditLogs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  return ApiUtils.success(auditLogs);
}
