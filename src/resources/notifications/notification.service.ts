import Notification, { INotification } from './notification.model';

export async function createNotification(userId: string, type: string, title: string, content: string): Promise<INotification> {
  const notification = new Notification({ userId, type, title, content });
  return await notification.save();
}

export async function markAsRead(notificationId: string): Promise<INotification | null> {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new Error('Notification not found');
  }
  notification.isRead = true;
  return await notification.save();
}

export async function getUserNotifications(userId: string, isRead?: boolean): Promise<INotification[]> {
  const query: any = { userId };
  if (typeof isRead === 'boolean') {
    query.isRead = isRead;
  }
  return await Notification.find(query).sort({ createdAt: -1 });
}
