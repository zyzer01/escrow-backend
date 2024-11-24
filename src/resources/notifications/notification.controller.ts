import { NextFunction, Request, Response } from "express";
import { notificationService } from "./notification.service";

export class NotificationController {

  public async markAsRead(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params

    try {
      const markedRead = await notificationService.markAsRead(id);
      return res.status(200).json(markedRead);
    } catch (error) {
      next(error)
    }
  }

  public async getUserNotifications(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.data.user.id;
    const isRead = req.query.isRead as string | undefined;
    const limit = parseInt(req.query.limit as string, 10);

    console.log(userId)
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    try {
      const notifications = await notificationService.getUserNotifications(userId, isRead ? isRead === 'true' : undefined);
      if (!isNaN(limit) && limit > 0) {
        return res.status(200).json(notifications.slice(0, limit));
      }
      res.status(200).json(notifications);
    } catch (error) {
      next(error);
    }
  }

}

export const notificationController = new NotificationController()
