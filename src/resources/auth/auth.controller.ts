import { NextFunction, Request, Response } from 'express';
import { StringConstants } from '../../common/strings';
import { authService } from './auth.service';
import { IUser } from '../users/user.model';

export class AuthController {

  /**
   * Handle email verification request
   */
  public async requestEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email) {
        res.status(400).json({ message: "Email is required." });
        return;
      }

      await authService.requestEmailVerification(email, password);
      res.status(201).json(StringConstants.EMAIL_VERIFICATION_SENT);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  /**
   * Complete user registration
   */
  public async completeRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: IUser = req.body;
      const { tokens, user } = await authService.completeRegistration(userData);

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
      
      res.status(200).json(response);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  /**
   * Handle user login
   */
  public async loginUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await authService.loginUser(email, password);
      
      const response = {
        user: {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle token refresh
   */
  public async refreshTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token required' });
        return;
      }
      
      const tokens = await authService.refreshTokens(refreshToken);
      
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/v1/auth/refresh',
      });
      
      res.status(200).json({ accessToken: tokens.accessToken });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle user logout
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.data.user.id;
      await authService.logout(userId);
      
      res.clearCookie('session');
      res.clearCookie('refreshToken');
      
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email address
   */
  public async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.body;
      await authService.verifyEmail(code);
      
      res.status(200).json(StringConstants.EMAIL_VERIFY_SUCCESS);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  /**
   * Resend email verification code
   */
  public async resendEmailVerificationCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      await authService.resendEmailVerificationCode(email);
      
      res.status(200).json(StringConstants.EMAIL_VERIFICATION_SENT);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiate forgot password process
   */
  public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      
      res.status(200).json(StringConstants.PASSWORD_RESET_LINK_SENT);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset user password
   */
  public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      
      res.status(200).json(StringConstants.PASSWORD_RESET_SUCCESSFUL);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}

export const authController = new AuthController()
