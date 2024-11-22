import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { TokenPayload } from '../types/auth';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const session = req.cookies.session;
  
  if (!session) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const payload = verifyAccessToken(session) as TokenPayload;
    req.user = payload;
    console.log(req.user);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

export function authorizeRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
