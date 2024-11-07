import { ConflictException, NotFoundException } from '../../common/errors';
import { StringConstants } from '../../common/strings';
import Notification, { INotification } from './notification.model';

export async function createNotification(userIds: string[], type: string, title: string, message: string): Promise<INotification[]> {
  const notifications = userIds.map((userId) => {
    return new Notification({ userId, type, title, message });
  });

  return await Notification.insertMany(notifications);
}


export async function markAsRead(notificationId: string): Promise<INotification | null> {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new NotFoundException(StringConstants.NOTIFICATION_NOT_FOUND);
  }
  if (notification.isRead == true) {
    throw new ConflictException(StringConstants.NOTIFICATION_ALREADY_READ)
  }
  notification.isRead = true;
  return await notification.save();
}

export async function getUserNotifications(userId: string, isRead?: boolean): Promise<INotification[]> {
  const query: Record<string, unknown> = { userId };

  if (typeof isRead !== 'undefined') {
    query.isRead = isRead;
  }

  const notifications = await Notification.find(query).sort({ createdAt: -1 });
  return notifications;
}
