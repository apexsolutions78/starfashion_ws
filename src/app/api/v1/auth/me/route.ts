import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return ApiUtils.unauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      userType: true,
      status: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return ApiUtils.notFound('User profile not found');
  }

  let customerCompany = null;
  if (session.customerId) {
    customerCompany = await prisma.customerCompany.findUnique({
      where: { id: session.customerId },
      include: {
        paymentTerms: true,
        addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
      },
    });
  }

  return ApiUtils.success({
    session,
    user,
    customerCompany,
  });
}
