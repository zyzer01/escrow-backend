import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { Session } from '../../resources/auth/session/session.model';
import { TokenPayload } from '../types/auth';


export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies.accessToken;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token not found' });
  }
  try {
    const decoded = verifyAccessToken(accessToken) as TokenPayload;
    // Add session check
    Session.findById(decoded.sessionId)
      .then(session => {
        if (!session || !session.isValid) {
          return res.status(401).json({ error: 'Invalid session' });
        }
        // Add the user object to the request
        req.user = decoded;
        next();
      })
      .catch(error => {
        return res.status(401).json({ error: 'Session verification failed' });
      });
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
