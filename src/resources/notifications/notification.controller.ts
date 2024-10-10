import { NextFunction, Request, Response } from "express";
import { getUserNotifications, markAsRead } from "./notification.service";

export async function markAsReadHandler(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params

  try {
    const recusal = await markAsRead(id);
    return res.status(200).json(recusal);
  } catch (error) {
    next(error)
  }
}

export async function getUserNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  const { userId, isRead } = req.body
  const limit = parseInt(req.query.limit as string, 10)

  try {
    const notifications = await getUserNotifications(userId, isRead);
    if (!isNaN(limit) && limit > 0) {
      return res.status(200).json(notifications.slice(0, limit))
    }
    res.status(200).json(notifications)
  } catch (error) {
    next(error)
  }
}
