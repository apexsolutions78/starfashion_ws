import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { LedgerService } from '@/services/LedgerService';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session) {
    return ApiUtils.unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const requestedCustomerId = searchParams.get('customerId');

  let targetCustomerId = session.customerId;
  if (session.userType === 'ADMIN' && requestedCustomerId) {
    targetCustomerId = requestedCustomerId;
  }

  if (!targetCustomerId) {
    return ApiUtils.error('Customer ID required', 400);
  }

  try {
    const statement = await LedgerService.getCustomerStatement(targetCustomerId);
    const company = await prisma.customerCompany.findUnique({
      where: { id: targetCustomerId },
      include: { paymentTerms: true },
    });

    return ApiUtils.success({
      company,
      statement,
    });
  } catch (error: any) {
    return ApiUtils.error(error.message || 'Failed to fetch account statement', 500);
  }
}
