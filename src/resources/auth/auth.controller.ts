import { NextFunction, Request, Response } from 'express';
import { loginUser, resendEmailVerificationCode, forgotPassword, resetPassword, verifyEmail, requestEmailVerification, completeRegistration, checkAuthToken } from './auth.service';
import User, { IUser } from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { validateLoginInput } from '../../lib/utils/validators';
import { generateTokens, verifyRefreshToken } from '../../lib/utils/auth';
import { EmailNotVerifiedException } from '../../common/errors/EmailNotVerifiedException';
import { TokenPayload } from '../../lib/types/auth';
import { NotFoundException, UnauthorizedException } from '../../common/errors';
import { Session } from './session/session.model';

export async function requestEmailVerificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    await requestEmailVerification(email, password);
    res.status(201).json(StringConstants.EMAIL_VERIFICATION_SENT);
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function completeRegistrationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userData = req.body;
    const { tokens, user } = await completeRegistration(req, userData);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return res.status(201).json({
      message: 'Signup successful',
      user: {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
}



export async function loginUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await loginUser({ email, password, request: req });

    const response = {
      tokens,
      user: {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    };

    // Securely set cookies for tokens
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 1 * 60 * 1000, // 15 minutes
      domain: process.env.COOKIE_DOMAIN,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: process.env.COOKIE_DOMAIN,
    });

    console.log('Login successful:', response);
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function refreshTokenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const decoded = verifyRefreshToken(refreshToken) as TokenPayload;

    // Check if the session is valid
    const session = await Session.findById(decoded.sessionId);
    if (!session || !session.isValid) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: decoded.userId,
      role: decoded.role,
      sessionId: session._id.toString(),
    });

    // Refresh token cookie
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN,
    });

    return res.status(200).json({ tokens });
  } catch (error) {
    next(error);
  }
}

export const checkAuthTokenHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies['accessToken'];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const userData = await checkAuthToken(token);
    res.status(200).json({ userId: userData.userId, role: userData.role });
  } catch (error) {
    next(error)
  }
};


export async function verifyEmailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body
    await verifyEmail(code)
    res.status(200).json(StringConstants.EMAIL_VERIFY_SUCCESS)
  } catch (error) {
    console.error(error)
    next(error)
  }
}


export async function resendEmailVerificationCodeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body
    await resendEmailVerificationCode(email)
    res.status(200).json(StringConstants.EMAIL_VERIFICATION_SENT)
  } catch (error) {
    next(error)
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body
    await forgotPassword(email)
    res.status(200).json(StringConstants.PASSWORD_RESET_LINK_SENT)
  } catch (error) {
    next(error)
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    await resetPassword(token, newPassword);
    res.status(200).json(StringConstants.PASSWORD_RESET_SUCCESSFUL);
  } catch (error) {
    console.error(error);
    next(error)
  }
}


export async function logoutHandler(req: Request, res: Response) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/auth/refresh' });

  return res.status(200).json({ message: 'Logged out successfully' });
}
