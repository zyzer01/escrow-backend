import { Types } from 'mongoose';
import Notification, { INotification } from './notification.model';


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

  public async getUserNotifications(userId: string, isRead?: boolean): Promise<INotification[]> {
    const query: Record<string, unknown> = { userId };

    if (typeof isRead !== 'undefined') {
      query.isRead = isRead;
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    return notifications;
  }

}

export const notificationService = new NotificationService()
export const {
  createNotification,
  markAsRead,
} = new NotificationService()
