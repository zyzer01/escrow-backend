import { Request, Response } from "express";
import { getUserNotifications, markAsRead } from "./notification.service";
import { StringConstants } from "../../common/strings";

export async function markAsReadHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    try {
      const recusal = await markAsRead(id);
      return res.status(200).json(recusal);
    } catch (error: any) {
      switch (error.message) {
        case StringConstants.NOTIFICATION_NOT_FOUND:
          return res
            .status(404)
            .json({ error: StringConstants.NOTIFICATION_NOT_FOUND });
        case StringConstants.NOTIFICATION_ALREADY_READ:
          return res
            .status(404)
            .json({ error: StringConstants.NOTIFICATION_ALREADY_READ });
        default:
          return res
            .status(500)
            .json({ error: StringConstants.FAILED_TO_MARK_AS_READ });
      }
    }
}

export async function getUserNotificationsHandler(req: Request, res: Response) {
    const { userId, isRead } = req.body
    const limit = parseInt(req.query.limit as string, 10)

    try {
      const notifications = await getUserNotifications(userId, isRead);
      if(!isNaN(limit) && limit > 0) {
        return res.status(200).json(notifications.slice(0, limit))
      }
      res.status(200).json(notifications)
    } catch (error: any) {
        console.error(error)
      switch (error.message) {
        case StringConstants.NOTIFICATION_NOT_FOUND:
          return res
            .status(404)
            .json({ error: StringConstants.NOTIFICATION_NOT_FOUND });
        default:
          return res
            .status(500)
            .json({ error: StringConstants.FAILED_TO_FETCH_NOTIFICATIONS });
      }
    }
}
