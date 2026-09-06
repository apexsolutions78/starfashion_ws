import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

// Get payments for a customer or order
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return ApiUtils.forbidden();
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const customerId = searchParams.get('customerId');

    const where: any = {};

    if (orderId) {
      where.orderId = orderId;
    }

    if (customerId) {
      where.customerId = customerId;
    } else if (session.userType === 'CUSTOMER') {
      // Customer can only see their own payments
      const customerUser = await prisma.customerUser.findFirst({
        where: { userId: session.userId },
      });
      if (customerUser) {
        where.customerId = customerUser.customerId;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: { select: { companyName: true } },
        order: { select: { orderNumber: true } },
        allocations: {
          include: {
            invoice: { select: { invoiceNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiUtils.success(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return ApiUtils.error('Failed to fetch payments');
  }
}

// Create a new payment (with optional screenshot)
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return ApiUtils.forbidden();
    }

    const formData = await request.formData();
    const orderId = formData.get('orderId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const paymentMethod = formData.get('paymentMethod') as string || 'BANK_TRANSFER';
    const referenceNumber = formData.get('referenceNumber') as string;
    const notes = formData.get('notes') as string;
    const screenshot = formData.get('screenshot') as File | null;

    if (!orderId || !amount || amount <= 0) {
      return ApiUtils.error('Order ID and valid amount are required');
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        payments: { where: { status: { not: 'VOID' } } },
      },
    });

    if (!order) {
      return ApiUtils.notFound('Order not found');
    }

    // Determine customer ID
    let customerId = order.customerId;
    if (session.userType === 'CUSTOMER') {
      const customerUser = await prisma.customerUser.findFirst({
        where: { userId: session.userId },
      });
      if (!customerUser || customerUser.customerId !== customerId) {
        return ApiUtils.forbidden('You can only make payments for your own orders');
      }
    }

    // Calculate existing payments for this order
    const existingPayments = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceRemaining = order.grandTotal - existingPayments;

    // Check if customer has "Due on Order" payment terms - require full payment
    const customerCompany = await prisma.customerCompany.findUnique({
      where: { id: customerId },
      select: { paymentTermsId: true },
    });
    const isDueOnOrder = customerCompany?.paymentTermsId === 'term-due-on-order';

    if (isDueOnOrder && amount < balanceRemaining - 0.01) {
      return ApiUtils.error(`Full payment of Rs.${balanceRemaining.toFixed(2)} is required for this order (Due on Order terms).`);
    }

    if (amount > balanceRemaining + 0.01) { // Allow small rounding tolerance
      return ApiUtils.error(`Amount exceeds balance remaining. Balance: Rs.${balanceRemaining.toFixed(2)}`);
    }

    // Handle screenshot upload
    let screenshotPath: string | null = null;
    if (screenshot && screenshot.size > 0) {
      const bytes = await screenshot.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = screenshot.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `payment-${crypto.randomUUID()}.${ext}`;
      const uploadDir = join(process.cwd(), 'public', 'images', 'payments');
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      screenshotPath = `/images/payments/${fileName}`;
    }

    // Generate payment number
    const paymentCount = await prisma.payment.count();
    const paymentNumber = `PAY-${String(paymentCount + 1).padStart(5, '0')}`;

    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        customerId,
        orderId,
        amount,
        paymentMethod,
        referenceNumber: referenceNumber || null,
        screenshotPath,
        status: 'PENDING',
        notes: notes || null,
        recordedByUserId: session.userType === 'ADMIN' ? session.userId : null,
      },
    });

    // If order is ACCEPTED and payment covers the balance, auto-confirm the order
    if (order.status === 'ACCEPTED') {
      const newExistingPayments = existingPayments + amount;
      const newBalance = order.grandTotal - newExistingPayments;

      // For "Due on Order" terms, full payment required; for others, any payment confirms
      if (isDueOnOrder ? newBalance <= 0.01 : amount > 0) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED' },
        });

        // Notify customer
        await prisma.customerNotification.create({
          data: {
            customerId,
            title: 'Order Confirmed',
            message: `Payment of Rs.${amount.toFixed(2)} received for order ${order.orderNumber}. Your order has been confirmed and will be processed shortly.`,
            type: 'ORDER_UPDATE',
            orderId,
          },
        });

        // Notify admin
        await prisma.auditLog.create({
          data: {
            actorId: session.userId,
            actorEmail: session.email,
            action: 'ORDER_CONFIRMED_BY_PAYMENT',
            entityType: 'Order',
            entityId: orderId,
            afterJson: JSON.stringify({ status: 'CONFIRMED', paymentAmount: amount }),
          },
        });
      }
    }

    return ApiUtils.success(payment, 'Payment submitted successfully');
  } catch (error) {
    console.error('Error creating payment:', error);
    return ApiUtils.error('Failed to create payment');
  }
}
