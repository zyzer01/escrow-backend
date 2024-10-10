import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../common/errors/HttpError';

export const errorHandler = (err: HttpError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const response = {
    message: err.message,
    statusCode,
    path: req.originalUrl,
    timestamp: err.timestamp || new Date().toISOString(),
  };

  // Log errors for internal server errors
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json(response);
};
