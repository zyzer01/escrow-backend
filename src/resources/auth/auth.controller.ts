import { Request, Response } from 'express';
import { loginUser, resendEmailVerificationCode, forgotPassword, resetPassword, verifyEmail, initiateRegistration, completeRegistration } from './auth.service';
import { IUser } from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { validateLoginInput } from '../../lib/utils/validators';

export async function initiateRegistrationHandler(req: Request, res: Response) {
  try {
    const { email } = req.body;
    await initiateRegistration(email);
    res.status(201).json();
  } catch (error: any) {
    console.error(error);
    if (error instanceof Error) {
      return res.status(403).json({ error: StringConstants.EMAIL_ALREADY_IN_USE });
    }
    res.status(500).json({ error: StringConstants.REGISTRATION_ERROR });
  }
}

export async function completeRegistrationHandler(req: Request, res: Response) {
  try {
    const userData: IUser = req.body
    await completeRegistration(userData);
    res.status(201).json(StringConstants.SIGNUP_SUCCESSFUL);
  } catch (error: any) {
    console.error(error);
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: StringConstants.USER_NOT_FOUND });
    }
    if (error instanceof InvalidStateError) {
      return res.status(403).json({ error: StringConstants.EMAIL_NOT_VERIFIED });
    }
    else {
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
        return res.status(500).json({ error: StringConstants.INTERNAL_SERVER_ERROR });
    }
  }
}

export async function verifyEmailHandler(req: Request, res: Response) {
  try {
    const { code } = req.body
    await verifyEmail(code)
    res.status(200).json(StringConstants.EMAIL_VERIFY_SUCCESS)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: StringConstants.INTERNAL_SERVER_ERROR })
  }
}


export async function resendEmailVerificationCodeHandler(req: Request, res: Response) {
  try {
    const { email } = req.body
    await resendEmailVerificationCode(email)
    res.status(200).json('Email Verification Code Sent')
  } catch (error) {
    res.status(500).json({ error: StringConstants.INTERNAL_SERVER_ERROR })
  }
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const { email } = req.body
    await forgotPassword(email)
    res.status(200).json('Reset Token Sent')
  } catch (error) {
    res.status(500).json({ error: StringConstants.INTERNAL_SERVER_ERROR })
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { resetToken, newPassword } = req.body
    await resetPassword(resetToken, newPassword)
    res.status(200).json('Password Reset Successfully')
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: StringConstants.INTERNAL_SERVER_ERROR })
  }
}

