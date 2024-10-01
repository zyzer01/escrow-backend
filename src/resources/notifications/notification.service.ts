import { StringConstants } from '../../common/strings';
import Notification, { INotification } from './notification.model';

export async function createNotification(userIds: string[], type: string, title: string, content: string): Promise<INotification[]> {
  const notifications = userIds.map((userId) => {
    return new Notification({ userId, type, title, content });
  });

  if(!notifications) {
    throw new Error(StringConstants.FAILED_TO_CREATE_NOTIFICATION)
  }
  
  return await Notification.insertMany(notifications);
}


export async function markAsRead(notificationId: string): Promise<INotification | null> {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new Error(StringConstants.NOTIFICATION_NOT_FOUND);
  }
  if(notification.isRead == true) {
    throw new Error(StringConstants.NOTIFICATION_ALREADY_READ)
  }
  notification.isRead = true;
  return await notification.save();
}

export async function getUserNotifications(userId: string, isRead?: boolean): Promise<INotification[]> {
  const query: any = { userId };

  if (typeof isRead !== 'undefined') {
    query.isRead = isRead;
  }

  const notifications = await Notification.find(query).sort({ createdAt: -1 });
  return notifications
}
