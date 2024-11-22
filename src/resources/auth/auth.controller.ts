import { NextFunction, Request, Response } from 'express';
import { loginUser, resendEmailVerificationCode, forgotPassword, resetPassword, verifyEmail, requestEmailVerification, completeRegistration, refreshTokens, logout } from './auth.service';
import { StringConstants } from '../../common/strings';

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
    const { tokens, user } = await completeRegistration(userData);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh-token',
    });
    
    const response = {
      accessToken: tokens.accessToken,
      user: {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    next(error);
  }
}



export async function loginUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await loginUser(email, password);
    
    const response = {
      user: {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function refreshTokenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    const tokens = await refreshTokens(refreshToken);
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
    
    return res.status(200).json({ accessToken: tokens.accessToken });
  } catch (error) {
    next(error);
  }
}


export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.data.user.id;
    await logout(userId);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.status(200).json({ message: 'Logged out successfully' });
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
