import { NextFunction, Request, Response } from "express";
import { notificationService } from "./notification.service";
import { StringConstants } from "../../common/strings";

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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
        return res.status(400).json({ error: StringConstants.UNAUTHORIZED });
    }

    try {
        const paginatedNotifications = await notificationService.getUserNotifications(
            userId,
            page,
            limit,
            isRead ? isRead === 'true' : undefined
        );
        res.status(200).json(paginatedNotifications);
    } catch (error) {
        next(error);
    }
}

}

export const notificationController = new NotificationController()
