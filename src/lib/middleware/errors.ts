import express, { Request, Response, NextFunction } from 'express';

// Custom Error Interface
export interface CustomError extends Error {
  statusCode?: number;
  message: string;
}

// Error-handling middleware
export function errorHandler(
  err: CustomError, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  console.error(`[ERROR] ${err.message}`);

  const statusCode = err.statusCode || 500;

  // Format error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message || 'Internal Server Error',
  });
}

// Middleware to catch 404 errors
// export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
//   const error = new Error(`Not Found - ${req.originalUrl}`);
//   res.status(404);
//   next(error);
// }
