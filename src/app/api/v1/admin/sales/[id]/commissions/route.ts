import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return ApiUtils.forbidden('Only Master Admin can manage sales commissions');
    }

    const { id } = await params;

    const salesUser = await prisma.user.findUnique({
      where: { id, role: 'SALES' },
      select: { id: true },
    });

    if (!salesUser) {
      return ApiUtils.notFound('Sales user not found');
    }

    const commissions = await prisma.salesCommission.findMany({
      where: { salesUserId: id },
      orderBy: { createdAt: 'desc' },
    });

    return ApiUtils.success({ commissions });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return ApiUtils.error('Failed to fetch commissions');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return ApiUtils.forbidden('Only Master Admin can manage sales commissions');
    }

    const { id } = await params;

    const salesUser = await prisma.user.findUnique({
      where: { id, role: 'SALES' },
      select: { id: true },
    });

    if (!salesUser) {
      return ApiUtils.notFound('Sales user not found');
    }

    const body = await request.json();
    const { commissionRate, bonusAmount, period, notes } = body;

    if (commissionRate === undefined || commissionRate === null) {
      return ApiUtils.error('Commission rate is required');
    }

    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return ApiUtils.error('Commission rate must be between 0 and 100');
    }

    const commission = await prisma.salesCommission.create({
      data: {
        salesUserId: id,
        commissionRate: rate,
        bonusAmount: bonusAmount ? parseFloat(bonusAmount) : 0,
        period: period || null,
        notes: notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'SALES_COMMISSION_CREATED',
        entityType: 'SalesCommission',
        entityId: commission.id,
        afterJson: JSON.stringify(commission),
      },
    });

    return ApiUtils.success(commission, 'Commission added successfully', 201);
  } catch (error) {
    console.error('Error creating commission:', error);
    return ApiUtils.error('Failed to create commission');
  }
}
