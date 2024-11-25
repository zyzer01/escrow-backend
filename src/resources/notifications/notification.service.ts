import { Types } from 'mongoose';
import Notification, { INotification } from './notification.model';
import { PaginatedResponse } from '../../lib/types';


export class NotificationService {

  public async createNotification(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    link?: string,
    betId?: Types.ObjectId,
    walletTransactionId?: Types.ObjectId
  ): Promise<INotification[]> {
    const notifications = userIds.map((userId) => {
      return new Notification({ userId, type, title, message, link, betId, walletTransactionId });
    });

    try {
      return await Notification.insertMany(notifications);
    } catch (error) {
      console.error("Failed to create notifications", error);
      throw error;
    }
  }


  public async markAsRead(notificationId: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
  }

  public async getUserNotifications(
    userId: string, 
    page: number = 1,
    limit: number = 10,
    isRead?: boolean
): Promise<PaginatedResponse<INotification>> {
    const query: Record<string, unknown> = { userId };

    if (typeof isRead !== 'undefined') {
        query.isRead = isRead;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
        Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit + 1),
        Notification.countDocuments(query)
    ]);

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;

    return {
        items,
        hasMore,
        total
    };
}

}

export const notificationService = new NotificationService()
export const {
  createNotification,
  markAsRead,
} = new NotificationService()
