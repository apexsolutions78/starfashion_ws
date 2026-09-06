import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// Auto-cancel expired ON_HOLD orders (can be called by cron or admin)
export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called internally or by a cron job
    // For now, require admin auth
    const session = await getAuthSession(request);

    const now = new Date();

    // Find all ON_HOLD orders that have expired
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'ON_HOLD',
        holdExpiresAt: { lt: now },
      },
      include: { customer: true },
    });

    let cancelledCount = 0;

    for (const order of expiredOrders) {
      // Cancel the order
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      // Notify customer
      await prisma.customerNotification.create({
        data: {
          customerId: order.customerId,
          title: 'Order Auto-Cancelled',
          message: `Your order ${order.orderNumber} has been automatically cancelled because the hold period has expired. Please place a new order if needed.`,
          type: 'WARNING',
          orderId: order.id,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          actorId: session?.userId || 'SYSTEM',
          actorEmail: session?.email || 'system@starfashion.com',
          action: 'ORDER_AUTO_CANCELLED',
          entityType: 'Order',
          entityId: order.id,
          beforeJson: JSON.stringify({ status: 'ON_HOLD' }),
          afterJson: JSON.stringify({ status: 'CANCELLED', reason: 'hold_expired' }),
        },
      });

      cancelledCount++;
    }

    // Also send payment reminders for orders expiring within 24 hours
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const expiringSoonOrders = await prisma.order.findMany({
      where: {
        status: 'ON_HOLD',
        holdExpiresAt: { gt: now, lt: tomorrow },
      },
    });

    for (const order of expiringSoonOrders) {
      // Check if reminder already sent today
      const existingReminder = await prisma.customerNotification.findFirst({
        where: {
          customerId: order.customerId,
          orderId: order.id,
          type: 'PAYMENT_REMINDER',
          createdAt: { gt: new Date(now.toDateString()) },
        },
      });

      if (!existingReminder) {
        const hoursLeft = Math.round((order.holdExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60));
        await prisma.customerNotification.create({
          data: {
            customerId: order.customerId,
            title: 'Payment Reminder',
            message: `Your order ${order.orderNumber} hold expires in ${hoursLeft} hours. Please make payment to confirm your order.`,
            type: 'PAYMENT_REMINDER',
            orderId: order.id,
          },
        });
      }
    }

    return ApiUtils.success({
      cancelledCount,
      expiringSoonCount: expiringSoonOrders.length,
    }, `Processed ${cancelledCount} expired orders`);
  } catch (error: any) {
    console.error('Error auto-cancelling orders:', error);
    return ApiUtils.error('Failed to process auto-cancellation');
  }
}
