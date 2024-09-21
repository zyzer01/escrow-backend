import { Request, Response } from 'express';
import { registerUser, loginUser, resendEmailVerificationCode, forgotPassword, resetPassword, verifyEmail } from './auth.service';
import { IUser } from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { validateLoginInput } from '../../utils/validators';

export async function registerUserHandler(req: Request, res: Response) {
  try {
    const userData: IUser = req.body;
    const newUser = await registerUser(userData);
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'email or username already exists') {
      res.status(400).json({ error: StringConstants.EMAIL_USERNAME_ALREADY_EXISTS });
    } else {
      res.status(500).json({ error: StringConstants.REGISTRATION_ERROR });
    }
  }
}

export async function loginUserHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const validationErrors = validateLoginInput(email, password);
    if (validationErrors) {
      return res.status(400).json({ error: validationErrors });
    }

    const { token, user } = await loginUser(email, password);

    if (!user.email) {
      return res.status(401).json({ error: StringConstants.INVALID_CREDENTIALS });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: StringConstants.EMAIL_NOT_VERIFIED });
    }

    res.status(200).json({ token, user });
  } catch (error: any) {
    console.error(error);

    switch (error.message) {
      case StringConstants.USER_NOT_FOUND:
        return res.status(400).json({ error: StringConstants.USER_NOT_FOUND });
      case StringConstants.INVALID_PASSWORD:
        return res.status(401).json({ error: StringConstants.INVALID_PASSWORD });
      default:
        return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export async function verifyEmailHandler(req: Request, res: Response) {
  try {
    const {code} = req.body
    await verifyEmail(code)
    res.status(200).json('Email Verified Successfully')
  } catch (error) {
    console.error(error)
    res.status(500).json({error: 'Internal server error'})
  }
}


export async function resendEmailVerificationCodeHandler(req: Request, res: Response) {
  try {
    const {email} = req.body
    await resendEmailVerificationCode(email)
    res.status(200).json('Email Verification Code Sent')
  } catch (error) {
    res.status(500).json({error: 'Internal server error'})
  }
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const {email} = req.body
    await forgotPassword(email)
    res.status(200).json('Reset Token Sent')
  } catch (error) {
    res.status(500).json({error: 'Internal server error'})
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const {resetToken, newPassword} = req.body
    await resetPassword(resetToken, newPassword)
    res.status(200).json('Password Reset Successfully')
  } catch (error) {
    console.error(error)
    res.status(500).json({error: 'Internal server error'})
  }
}

