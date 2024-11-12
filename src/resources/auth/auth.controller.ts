import { NextFunction, Request, Response } from 'express';
import { loginUser, resendEmailVerificationCode, forgotPassword, resetPassword, verifyEmail, requestEmailVerification, completeRegistration } from './auth.service';
import { IUser } from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { validateLoginInput } from '../../lib/utils/validators';
import { generateTokens, verifyRefreshToken } from '../../lib/utils/auth';
import { EmailNotVerifiedException } from '../../common/errors/EmailNotVerifiedException';
import { TokenPayload } from '../../lib/types/auth';

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
    const userData: IUser = req.body
    const user = await completeRegistration(userData);

    const tokens = generateTokens({
      userId: user.user.id.toString(),
      role: user.user.role
    });

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
      path: '/auth/refresh', // Restrict refresh token to refresh endpoint
    });

    const response = ({
      user: {
        id: user.user.id.toString(),
        email: user.user.email,
        role: user.user.role,
        isEmailVerified: user.user.isEmailVerified
      }
    });
    return res.status(201).json({
      message: StringConstants.SIGNUP_SUCCESSFUL,
      ...response
    });
  } catch (error) {
    console.error(error);
    next(error)
  }
}



export async function loginUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const { user } = await loginUser(email, password);

    const tokens = generateTokens({
      userId: user.id.toString(),
      role: user.role
    });

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh', // Restrict refresh token to refresh endpoint
    });

    return res.status(200).json({
      user: {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Error during login:', error);

    if (error instanceof EmailNotVerifiedException) {
      return res.status(403).json({
        message: error.message,
        needsEmailVerification: true
      });
    }

    next(error);
  }
}

export async function refreshTokenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    const decoded = verifyRefreshToken(refreshToken) as TokenPayload;
    
    const tokens = generateTokens({
      userId: decoded.userId,
      role: decoded.role
    });

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return res.status(200).json({ message: 'Tokens refreshed successfully' });
  } catch (error) {
    next(error);
  }
}


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
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

  return res.status(200).json({ message: 'Logged out successfully' });
}
