import { RateLimitRequestHandler } from 'express-rate-limit';

declare module 'express-serve-static-core' {
  interface Request {
    rateLimit?: {
      resetTime: Date;
      current: number;
      limit: number;
      remaining: number;
    };
  }
}
