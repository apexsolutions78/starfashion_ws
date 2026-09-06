import { prisma } from '@/lib/db';
import { PricingEngine } from './PricingEngine';
import { LedgerService } from './LedgerService';

export class OrderService {
  /**
   * Generates a unique order number (e.g. ORD-20260904-8912)
   */
  private static generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${dateStr}-${randomSuffix}`;
  }

  /**
   * Submits a new wholesale order from customer's active cart.
   * Recalculates all pricing server-side and creates an immutable snapshot.
   */
  public static async submitOrder(customerId: string, createdByUserId?: string, notes?: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch Customer Company & Credit Limit
      const company = await tx.customerCompany.findUnique({
        where: { id: customerId },
      });
      if (!company) throw new Error('Customer company not found');
      if (company.status !== 'ACTIVE') throw new Error('Customer company account is suspended or archived');

      // 2. Fetch Cart Items
      const cart = await tx.cart.findUnique({
        where: { customerId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                  color: true,
                  size: true,
                  inventory: true,
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // 3. Check minimum order quantity
      const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const minOrderQty = company.minOrderQty || 30;
      if (totalQuantity < minOrderQty) {
        throw new Error(`Minimum order quantity is ${minOrderQty} units. Your cart has ${totalQuantity} units.`);
      }

      // 4. Prepare items for server pricing calculation & check inventory stock
      const pricingInputs = [];
      for (const cartItem of cart.items) {
        const variant = cartItem.variant;
        const totalOnHand = variant.inventory.reduce((sum, inv) => sum + inv.onHand, 0);
        const totalReserved = variant.inventory.reduce((sum, inv) => sum + inv.reserved, 0);
        const availableStock = totalOnHand - totalReserved;

        if (availableStock < cartItem.quantity) {
          throw new Error(
            `Insufficient stock for ${variant.product.name} (${variant.color.name}/${variant.size.name}). Requested: ${cartItem.quantity}, Available: ${availableStock}`
          );
        }

        pricingInputs.push({
          variantId: variant.id,
          sku: variant.sku,
          articleNumber: variant.product.articleNumber,
          productName: variant.product.name,
          colorName: variant.color.name,
          sizeName: variant.size.name,
          baseUnitPrice: variant.product.basePrice,
          quantity: cartItem.quantity,
          isEligibleForTier: true,
        });
      }

      // 4. Fetch Active Pricing Tiers
      const tiers = await tx.pricingTier.findMany({
        where: { active: true },
        orderBy: { minQuantity: 'desc' },
      });

      // 5. Calculate Server-Side Pricing Quote
      const quote = PricingEngine.calculateQuote(pricingInputs, tiers);

      // 6. Validate Credit Limit (if enabled)
      const lastTx = await tx.accountTransaction.findFirst({
        where: { customerId },
        orderBy: { postedAt: 'desc' },
      });
      const currentBalance = lastTx ? lastTx.runningBalance : 0.0;

      if (company.creditLimit > 0 && currentBalance + quote.netSubtotal > company.creditLimit) {
        throw new Error(
          `Credit limit exceeded. Current balance: Rs.${currentBalance.toFixed(2)}, Order Net Total: Rs.${quote.netSubtotal.toFixed(2)}, Credit Limit: Rs.${company.creditLimit.toFixed(2)}`
        );
      }

      // 7. Create Order Header with Immutable Pricing Snapshot
      const orderNumber = this.generateOrderNumber();
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: 'SUBMITTED',
          qualifyingQty: quote.qualifyingQty,
          tierIdSnapshot: quote.appliedTier?.id || null,
          discountPercentSnapshot: quote.discountPercent,
          grossSubtotal: quote.grossSubtotal,
          discountTotal: quote.discountTotal,
          netSubtotal: quote.netSubtotal,
          grandTotal: quote.netSubtotal,
          currency: 'EUR',
          notes,
          createdByUserId,
          submittedAt: new Date(),
          items: {
            create: quote.lineItems.map((line) => ({
              variantId: line.variantId,
              articleNumberSnapshot: line.articleNumber || '',
              productNameSnapshot: line.productName || '',
              skuSnapshot: line.sku || '',
              colorSnapshot: line.colorName || '',
              sizeSnapshot: line.sizeName || '',
              baseUnitPriceSnapshot: line.baseUnitPrice,
              quantity: line.quantity,
              lineGross: line.lineGross,
              lineDiscount: line.lineDiscount,
              lineNet: line.lineNet,
            })),
          },
        },
        include: { items: true },
      });

      // 8. Reserve Inventory Stock
      for (const cartItem of cart.items) {
        const invRecord = cartItem.variant.inventory[0];
        if (invRecord) {
          await tx.inventory.update({
            where: { id: invRecord.id },
            data: { reserved: { increment: cartItem.quantity } },
          });
        }
      }

      // 9. Clear Cart Items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // 10. Audit Log Record
      await tx.auditLog.create({
        data: {
          actorId: createdByUserId,
          actorEmail: createdByUserId || 'CUSTOMER',
          action: 'ORDER_SUBMITTED',
          entityType: 'Order',
          entityId: order.id,
          afterJson: JSON.stringify({ orderNumber, grandTotal: quote.netSubtotal }),
        },
      });

      return order;
    });
  }

  /**
   * Advances order status (e.g. SUBMITTED -> CONFIRMED -> PROCESSING -> COMPLETED)
   * Auto-generates invoice & ledger debit when status becomes CONFIRMED.
   */
  public static async updateOrderStatus(
    orderId: string,
    newStatus: string,
    updatedByUserId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, customer: true, invoice: true },
      });

      if (!order) throw new Error('Order not found');

      const oldStatus = order.status;
      if (oldStatus === newStatus) return order;

      // Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // If transitioning to CONFIRMED and invoice does not yet exist: create Invoice & Ledger Debit
      if (newStatus === 'CONFIRMED' && !order.invoice) {
        const invoiceNumber = `INV-${order.orderNumber.replace('ORD-', '')}`;
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Default Net 30

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId: order.customerId,
            orderId: order.id,
            issueDate,
            dueDate,
            status: 'UNPAID',
            subtotal: order.netSubtotal,
            totalAmount: order.grandTotal,
            paidAmount: 0.0,
            balanceDue: order.grandTotal,
            items: {
              create: order.items.map((item) => ({
                descriptionSnapshot: `${item.productNameSnapshot} (${item.colorSnapshot}/${item.sizeSnapshot}) - SKU: ${item.skuSnapshot}`,
                quantity: item.quantity,
                unitPrice: item.baseUnitPriceSnapshot,
                lineDiscount: item.lineDiscount,
                lineTotal: item.lineNet,
              })),
            },
          },
        });

        // Post DEBIT transaction to customer ledger
        const lastTx = await tx.accountTransaction.findFirst({
          where: { customerId: order.customerId },
          orderBy: { postedAt: 'desc' },
        });
        const previousBalance = lastTx ? lastTx.runningBalance : 0.0;
        const runningBalance = Math.round((previousBalance + order.grandTotal + Number.EPSILON) * 100) / 100;

        await tx.accountTransaction.create({
          data: {
            customerId: order.customerId,
            transactionType: 'INVOICE',
            referenceType: 'Invoice',
            referenceId: invoice.id,
            debit: order.grandTotal,
            credit: 0.0,
            runningBalance,
            notes: `Invoice ${invoiceNumber} issued for Order ${order.orderNumber}`,
            createdByUserId: updatedByUserId,
          },
        });
      }

      // If transitioning to CANCELLED: release reserved stock
      if (newStatus === 'CANCELLED' && oldStatus !== 'CANCELLED') {
        for (const item of order.items) {
          const invRecord = await tx.inventory.findFirst({
            where: { variantId: item.variantId },
          });
          if (invRecord) {
            await tx.inventory.update({
              where: { id: invRecord.id },
              data: { reserved: { decrement: item.quantity } },
            });
          }
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: updatedByUserId,
          actorEmail: updatedByUserId,
          action: 'ORDER_STATUS_CHANGED',
          entityType: 'Order',
          entityId: orderId,
          beforeJson: JSON.stringify({ status: oldStatus }),
          afterJson: JSON.stringify({ status: newStatus }),
        },
      });

      return updatedOrder;
    });
  }
}
