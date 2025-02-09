import { Types } from 'mongoose';
import Notification, { INotification } from './notification.model';
import { BetPaginatedResponse } from '../../lib/types/bet';
import { prisma } from '../../lib/db';
import { NotificationType, Prisma } from '@prisma/client';


export class NotificationService {
  public async createNotification({
    userIds,
    type,
    title,
    message,
    link,
    betId,
    walletTransactionId,
  }: {
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    betId?: string;
    walletTransactionId?: string;
  }) {
    try {
      console.log('userids:', userIds)
      const notifications = await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type,
          title,
          message,
          link,
          betId,
          walletTransactionId,
        })),
      });

      return notifications;
    } catch (error) {
      console.log("Failed to create notifications", error);
      throw error;
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
