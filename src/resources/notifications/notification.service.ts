import { Types } from 'mongoose';
import Notification, { INotification } from './notification.model';
import { BetPaginatedResponse } from '../../lib/types/bet';
import { prisma } from '../../lib/db';
import { NotificationType, Prisma } from '@prisma/client';


export class NotificationService {
  public async createNotification(
    userIds: string | string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    betId?: string,
    walletTransactionId?: string,
  ) {
    try {
      // Input validation
      if (!userIds || !type || !title || !message) {
        throw new Error('Required parameters missing');
      }

      // Convert single userId to array if necessary
      const userIdArray = Array.isArray(userIds) ? userIds : [userIds];

      // Validate array is not empty
      if (userIdArray.length === 0) {
        throw new Error('No user IDs provided');
      }

      // Validate each userId
      userIdArray.forEach((userId, index) => {
        if (!userId || typeof userId !== 'string') {
          throw new Error(`Invalid userId at index ${index}`);
        }
      });

      // Create notifications
      const notifications = await prisma.notification.createMany({
        data: userIdArray.map((userId) => ({
          userId,
          type,
          title,
          message,
          link,
          betId,
          walletTransactionId,
          createdAt: new Date(), // Explicitly set creation timestamp
        })),
      });

      return notifications;
    } catch (error) {
      console.error("Failed to create notifications:", error);
      
      // Enhance error message with more context
      if (error instanceof Error) {
        throw new Error(`Notification creation failed: ${error.message}`);
      } else {
        throw new Error('Notification creation failed: Unknown error');
      }
    }
  }

  // Mark notification as read
  public async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  // Get paginated user notifications
  public async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 10,
    isRead?: boolean
  ) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (typeof isRead !== "undefined") {
      where.isRead = isRead;
    }

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      items: notifications,
      hasMore: notifications.length === limit,
      total,
    };
  }

}

export const notificationService = new NotificationService()
export const {
  createNotification,
  markAsRead,
} = new NotificationService()
