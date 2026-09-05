import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { PaymentService } from '@/services/PaymentService';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const recordPaymentSchema = z.object({
  customerId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  const payments = await prisma.payment.findMany({
    include: {
      customer: { select: { companyName: true } },
      allocations: { include: { invoice: { select: { invoiceNumber: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ApiUtils.success(payments);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  try {
    const body = await req.json();
    const parsed = recordPaymentSchema.parse(body);

    const payment = await PaymentService.recordPayment({
      customerId: parsed.customerId,
      amount: parsed.amount,
      paymentMethod: parsed.paymentMethod,
      referenceNumber: parsed.referenceNumber,
      notes: parsed.notes,
      recordedByUserId: session.userId,
    });

    return ApiUtils.success(payment, 'Payment recorded successfully', 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    return ApiUtils.error(error.message || 'Failed to record payment', 500);
  }
}
