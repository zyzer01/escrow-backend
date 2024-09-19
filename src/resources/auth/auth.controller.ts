import { Request, Response } from 'express';
import { registerUser, loginUser, resendEmailVerificationCode, forgotPassword, resetPassword, verifyEmail } from './auth.service';
import { IUser } from '../users/user.model';

export async function registerUserHandler(req: Request, res: Response) {
  try {
    const userData: IUser = req.body;
    const newUser = await registerUser(userData);
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'User with this email or username already exists') {
      res.status(400).json({ error: 'User with this email or username already exists' });
    } else {
      res.status(500).json({ error: error });
    }
  }
}

export async function loginUserHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const { token, user } = await loginUser(email, password);
    res.status(200).json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function verifyEmailHandler(req: Request, res: Response) {
  try {
    const {email, code} = req.body
    await verifyEmail(email, code)
    res.status(200).json('Email Verified Successfully')
  } catch (error) {
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
    res.status(500).json({error: 'Internal server error'})
  }
}

