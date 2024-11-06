import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export const emailVerificationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 1, // Limit each IP to 5 requests per windowMs
    handler: (req: Request, res: Response) => {
        const retryAfter = req.rateLimit?.resetTime
            ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
            : null;

        let message: string;

        if (retryAfter) {
            const minutes = Math.floor(retryAfter / 60);
            const seconds = retryAfter % 60;
            message = `You can request for another link in ${minutes} minutes and ${seconds} seconds.`;
        } else {
            message = "Please try again after the countdown.";
        }

        res.status(429).json({
            message,
            statusCode: 429,
            path: req.originalUrl,
            timestamp: new Date().toISOString(),
        });
    },
});
