import { Request, Response, NextFunction } from 'express';
import { auth } from '../auth';
import { fromNodeHeaders } from 'better-auth/node';
import { UnauthorizedException } from '../../common/errors';

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    req.user = {
      session: session.session,
      id: session.user.id,
      role: session.user.role,
      email: session.user.email
    };

    console.log(req.user)

    next();
  } catch (error) {
    next(error);
  }
}

export function authorizeRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedException('Unauthorized'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permission' });
    }
    next();
  };
}


// const session = cookies.split(';').find((cookie: string) => {
//   return cookie.trim().startsWith('session_token=');
// }).split('=')[1];
