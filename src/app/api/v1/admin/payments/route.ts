import { NextRequest } from 'next/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
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

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.PAYMENTS_READ);
  if (!auth) return ApiUtils.forbidden();

  const payments = await prisma.payment.findMany({
    include: {
      customer: { select: { companyName: true } },
      allocations: { include: { invoice: { select: { invoiceNumber: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ApiUtils.success(payments);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.PAYMENTS_RECORD);
  if (!auth) return ApiUtils.forbidden();

  try {
    const body = await request.json();
    const parsed = recordPaymentSchema.parse(body);

    const payment = await PaymentService.recordPayment({
      customerId: parsed.customerId,
      amount: parsed.amount,
      paymentMethod: parsed.paymentMethod,
      referenceNumber: parsed.referenceNumber,
      notes: parsed.notes,
      recordedByUserId: auth.session.userId,
    });

    return ApiUtils.success(payment, 'Payment recorded successfully', 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    return ApiUtils.error(error.message || 'Failed to record payment', 500);
  }
}
