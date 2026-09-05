import { prisma } from '@/lib/db';
import { LedgerService } from './LedgerService';

export interface RecordPaymentInput {
  customerId: string;
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  recordedByUserId?: string;
  invoiceAllocations?: { invoiceId: string; amount: number }[];
}

export class PaymentService {
  /**
   * Generates a unique payment reference number (e.g. PAY-20260904-7123)
   */
  private static generatePaymentNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `PAY-${dateStr}-${randomSuffix}`;
  }

  /**
   * Admin records a customer payment, posts to ledger, and allocates against open invoices.
   */
  public static async recordPayment(input: RecordPaymentInput) {
    const { customerId, amount, paymentMethod = 'BANK_TRANSFER', referenceNumber, notes, recordedByUserId, invoiceAllocations } = input;

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    return prisma.$transaction(async (tx) => {
      const paymentNumber = this.generatePaymentNumber();

      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          customerId,
          amount,
          paymentMethod,
          referenceNumber,
          status: 'POSTED',
          notes,
          recordedByUserId,
        },
      });

      // 2. Allocate payment to invoices
      let remainingPayment = amount;

      // If explicit allocations provided, use them; otherwise auto-allocate to oldest unpaid invoices
      let targets = invoiceAllocations;

      if (!targets || targets.length === 0) {
        const openInvoices = await tx.invoice.findMany({
          where: {
            customerId,
            status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
          orderBy: { issueDate: 'asc' },
        });

        targets = [];
        for (const inv of openInvoices) {
          if (remainingPayment <= 0) break;
          const allocAmount = Math.min(remainingPayment, inv.balanceDue);
          targets.push({ invoiceId: inv.id, amount: allocAmount });
          remainingPayment -= allocAmount;
        }
      }

      for (const alloc of targets) {
        const invoice = await tx.invoice.findUnique({
          where: { id: alloc.invoiceId },
        });
        if (!invoice) continue;

        const allocAmount = Math.min(alloc.amount, invoice.balanceDue);
        if (allocAmount <= 0) continue;

        // Create PaymentAllocation record
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: invoice.id,
            amount: allocAmount,
          },
        });

        const newPaidAmount = Math.round((invoice.paidAmount + allocAmount + Number.EPSILON) * 100) / 100;
        const newBalanceDue = Math.round((invoice.totalAmount - newPaidAmount + Number.EPSILON) * 100) / 100;
        const newStatus = newBalanceDue <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            balanceDue: Math.max(0, newBalanceDue),
            status: newStatus,
          },
        });
      }

      // 3. Post CREDIT transaction to customer ledger
      const lastTx = await tx.accountTransaction.findFirst({
        where: { customerId },
        orderBy: { postedAt: 'desc' },
      });
      const previousBalance = lastTx ? lastTx.runningBalance : 0.0;
      const runningBalance = Math.round((previousBalance - amount + Number.EPSILON) * 100) / 100;

      await tx.accountTransaction.create({
        data: {
          customerId,
          transactionType: 'PAYMENT',
          referenceType: 'Payment',
          referenceId: payment.id,
          debit: 0.0,
          credit: amount,
          runningBalance,
          notes: `Payment ${paymentNumber} recorded via ${paymentMethod}`,
          createdByUserId: recordedByUserId,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: recordedByUserId,
          actorEmail: recordedByUserId || 'ADMIN',
          action: 'PAYMENT_RECORDED',
          entityType: 'Payment',
          entityId: payment.id,
          afterJson: JSON.stringify({ paymentNumber, amount, customerId }),
        },
      });

      return payment;
    });
  }
}
