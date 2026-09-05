import { prisma } from '@/lib/db';

export type TransactionType = 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'ADJUSTMENT';

export interface PostTransactionInput {
  customerId: string;
  transactionType: TransactionType;
  referenceType?: string;
  referenceId?: string;
  amount: number;
  notes?: string;
  createdByUserId?: string;
}

export class LedgerService {
  /**
   * Posts an immutable customer ledger transaction and updates running balance atomically.
   */
  public static async postTransaction(input: PostTransactionInput) {
    const { customerId, transactionType, referenceType, referenceId, amount, notes, createdByUserId } = input;

    let debit = 0.0;
    let credit = 0.0;

    switch (transactionType) {
      case 'INVOICE':
        debit = amount;
        break;
      case 'PAYMENT':
      case 'CREDIT_NOTE':
        credit = amount;
        break;
      case 'ADJUSTMENT':
        if (amount >= 0) debit = amount;
        else credit = Math.abs(amount);
        break;
    }

    return prisma.$transaction(async (tx) => {
      // Fetch latest transaction to get previous running balance
      const lastTx = await tx.accountTransaction.findFirst({
        where: { customerId },
        orderBy: { postedAt: 'desc' },
      });

      const previousBalance = lastTx ? lastTx.runningBalance : 0.0;
      const runningBalance = Math.round((previousBalance + debit - credit + Number.EPSILON) * 100) / 100;

      const record = await tx.accountTransaction.create({
        data: {
          customerId,
          transactionType,
          referenceType,
          referenceId,
          debit,
          credit,
          runningBalance,
          notes,
          createdByUserId,
        },
      });

      return record;
    });
  }

  /**
   * Retrieves current outstanding balance for a customer.
   */
  public static async getCustomerBalance(customerId: string): Promise<number> {
    const lastTx = await prisma.accountTransaction.findFirst({
      where: { customerId },
      orderBy: { postedAt: 'desc' },
    });

    return lastTx ? lastTx.runningBalance : 0.0;
  }

  /**
   * Retrieves full chronological statement of account for a customer.
   */
  public static async getCustomerStatement(customerId: string, startDate?: Date, endDate?: Date) {
    const whereClause: any = { customerId };
    if (startDate || endDate) {
      whereClause.postedAt = {};
      if (startDate) whereClause.postedAt.gte = startDate;
      if (endDate) whereClause.postedAt.lte = endDate;
    }

    const transactions = await prisma.accountTransaction.findMany({
      where: whereClause,
      orderBy: { postedAt: 'asc' },
    });

    const currentBalance = await this.getCustomerBalance(customerId);

    return {
      customerId,
      currentBalance,
      transactions,
    };
  }
}
