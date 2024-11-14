import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 5 requests per windowMs
    handler: (req: Request, res: Response) => {
        const retryAfter = req.rateLimit?.resetTime
            ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
            : null;

        let message: string;

        if (retryAfter) {
            const minutes = Math.floor(retryAfter / 60);
            const seconds = retryAfter % 60;
            message = `Too many attempts. Please try again after ${minutes} minutes and ${seconds} seconds.`;
        } else {
            message = "Too many attempts. Please try again later.";
        }

        res.status(429).json({
            message,
            statusCode: 429,
            path: req.originalUrl,
            timestamp: new Date().toISOString(),
        });
    },
});
