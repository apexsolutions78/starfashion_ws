import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// Get customer notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return ApiUtils.unauthorized();
    }

    const customerId = session.customerId;
    if (!customerId) {
      return ApiUtils.error('Customer account required');
    }

    const notifications = await prisma.customerNotification.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.customerNotification.count({
      where: { customerId, isRead: false },
    });

    return ApiUtils.success({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return ApiUtils.error('Failed to fetch notifications');
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) {
      return ApiUtils.unauthorized();
    }

    const customerId = session.customerId;
    if (!customerId) {
      return ApiUtils.error('Customer account required');
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      await prisma.customerNotification.updateMany({
        where: { customerId, isRead: false },
        data: { isRead: true },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.customerNotification.updateMany({
        where: { id: { in: notificationIds }, customerId },
        data: { isRead: true },
      });
    }

    return ApiUtils.success({ updated: true }, 'Notifications marked as read');
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return ApiUtils.error('Failed to update notifications');
  }
}
