import { NextFunction, Request, Response } from 'express';
import { loginUser, resendEmailVerificationCode, forgotPassword, resetPassword, verifyEmail, requestEmailVerification, completeRegistration } from './auth.service';
import { IUser } from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { validateLoginInput } from '../../lib/utils/validators';
import { generateToken } from '../../lib/utils/auth';
import { EmailNotVerifiedException } from '../../common/errors/EmailNotVerifiedException';

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

    const token = generateToken({
      userId: user.id.toString(),
      role: user.role
    });

    console.log(token)

    const response = {
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    };

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000,
      path: '/',
    });
    res.status(201).json({
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

    const { token, user } = await loginUser(email, password);

    const response = {
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    };

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000,
      path: '/',
    });

    console.log('Login successful:', response);
    return res.status(200).json(response);

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
  // Set the cookie before sending the response
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // This effectively removes the cookie
    path: '/', // Ensure the cookie is cleared on all paths
  });

  return res.status(200).json({ message: 'Logged out successfully' });
}
