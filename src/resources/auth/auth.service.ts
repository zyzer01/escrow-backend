import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../users/user.model';
import dotenv from 'dotenv'
import { sendEmail } from '../../mail/mail.service';
import { calculateVerificationCodeExpiryTime, comparePasswords, generateOTP, generateTokens, generateVerificationCode, hashPassword } from '../../lib/utils/auth';
import { StringConstants } from '../../common/strings';
import Wallet from '../wallet/models/wallet.model';
import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '../../common/errors';
import { validateLoginInput } from '../../lib/utils/validators';
import { addContactToBrevo } from '../marketing/marketing.service';
import { EmailNotVerifiedException } from '../../common/errors/EmailNotVerifiedException';
import { createNotification } from '../notifications/notification.service';
import { AuthResponse } from '../../lib/types/auth';


dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET as string;

/*
  Initiate Registration
*/

export async function requestEmailVerification(email: string, password: string) {
  let user = await User.findOne({ email });

  const code = generateOTP();
  const codeExpiry = calculateVerificationCodeExpiryTime();
  const hashedPassword = await hashPassword(password)

  if (user) {
    if (user.isEmailVerified && user.registrationComplete) {
      throw new ConflictException(StringConstants.EMAIL_ALREADY_IN_USE);
    } else if (user.googleId) {
      throw new ForbiddenException(StringConstants.GOOGLE_SIGNED)
    } else {
      user.emailVerificationCode = code;
      user.emailVerificationCodeExpiry = codeExpiry;
    }
  } else {
    user = new User({
      email,
      password: hashedPassword,
      emailVerificationCode: code,
      emailVerificationCodeExpiry: codeExpiry,
      isEmailVerified: false,
    });
  }
  await user.save();

  await sendEmail({
    to: email,
    subject: StringConstants.CONFIRM_EMAIL,
    template: 'confirm-email',
    params: { code: user.emailVerificationCode },
  });

  return;
}

/*
  Verify User Email Address
*/

export async function verifyEmail(code: number): Promise<void> {
  const user = await User.findOne({ emailVerificationCode: code, emailVerificationCodeExpiry: { $gt: new Date() } })

  if (!user) {
    throw new NotFoundException(StringConstants.INVALID_EXPIRED_TOKEN)
  }

  if (user.isEmailVerified) {
    throw new ConflictException(StringConstants.EMAIL_ALREADY_VERIFIED)
  }

  user.isEmailVerified = true
  user.emailVerificationCode = null;
  user.emailVerificationCodeExpiry = null;

  user.save()
}

/*
  Complete Registration
*/

export async function completeRegistration(userData: IUser): Promise<AuthResponse> {
  const user = await User.findOne({ email: userData.email, isEmailVerified: true });

  if (!user) {
    throw new NotFoundException(StringConstants.USER_NOT_FOUND);
  }
  if (!user.isEmailVerified) {
    throw new UnprocessableEntityException(StringConstants.EMAIL_NOT_VERIFIED);
  }

  user.username = userData.username;
  user.firstName = userData.firstName;
  user.lastName = userData.lastName;
  user.phone_number = userData.phone_number;
  user.registrationComplete = true;

  const savedUser = await user.save();

  const newWallet = new Wallet({
    userId: savedUser._id,
    balance: 0,
    transactionHistory: [],
  });
  await newWallet.save();

  await sendEmail({
    to: savedUser.email,
    subject: 'Welcome to Escrow Bet',
    template: 'welcome',
    params: { firstName: savedUser.firstName },
  });

  addContactToBrevo(user.email, user.firstName, user.lastName)

  const tokens = generateTokens({
    userId: savedUser._id.toString(),
    role: savedUser.role
  });

  return { tokens, user: savedUser };
}

/*
  Login User
*/
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const user: IUser | null = await User.findOne({ email });
  if (!user) {
    throw new NotFoundException(StringConstants.USER_NOT_FOUND);
  }

  if (!user.isEmailVerified) {
    throw new EmailNotVerifiedException(StringConstants.EMAIL_NOT_VERIFIED)
  }

  const validationErrors = validateLoginInput(email, password);
  
    if (validationErrors) {
      throw new ForbiddenException('Invalid Email or password')
    }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ForbiddenException(StringConstants.INVALID_PASSWORD);
  }
  
  const tokens = generateTokens({
    userId: user.id,
    role: user.role
  });

  return { tokens, user };
}

/*
  Forgot Password
*/

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email })

  if (!user) {
    throw new NotFoundException(StringConstants.USER_NOT_FOUND)
  }

  if (user.googleId) {
    throw new ForbiddenException(StringConstants.GOOGLE_SIGNED)
  }

  if (!user.password) {
    throw new ForbiddenException(StringConstants.MISSING_PASSWORD)
  }


  const resetToken = generateVerificationCode();
  const resetTokenExpiry = calculateVerificationCodeExpiryTime()

  user.resetPasswordToken = resetToken
  user.resetPasswordTokenExpiry = resetTokenExpiry

  await user.save();

  const resetLink = `${process.env.CLIENT_BASE_URL}/auth/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    template: 'forgot-password',
    params: { username: user.firstName, resetLink: resetLink },
  });
}

/*
  Reset User Password
*/

export async function resetPassword(token: string, newPassword: string): Promise<void> {

  if (!token || !newPassword) {
    throw new NotFoundException(StringConstants.MISSING_TOKEN_NEW_PASSWORD)
  }

  const user = await User.findOne({ resetPasswordToken: token, resetPasswordTokenExpiry: { $gt: new Date() } })


  if (!user) {
    const expiredUser = await User.findOne({ resetPasswordToken: token });
    if (expiredUser) {
      console.log('Token expired for user:', expiredUser.email);
      throw new ForbiddenException(StringConstants.EXPIRED_TOKEN)
    } else {
      console.log('No user found with this token');
      throw new ForbiddenException(StringConstants.INVALID_TOKEN)
    }
  }
  if (!user.password) {
    throw new ForbiddenException(StringConstants.MISSING_PASSWORD)
  }

  if (user.googleId) {
    throw new ForbiddenException(StringConstants.GOOGLE_SIGNED)
  }

  if (await comparePasswords(newPassword, user.password)) {
    throw new ForbiddenException(StringConstants.PASSWORD_ALREADY_USED)
  }

  const hashedPassword = await hashPassword(newPassword)
  user.password = hashedPassword;
  user.resetPasswordToken = null
  user.resetPasswordTokenExpiry = null

  user.save()

  await sendEmail({
    to: user.email,
    subject: 'Password Changed Successfully',
    template: 'changed-password',
    params: { username: user.firstName },
  });
}

/*
  Request Change of Email Address
*/

export async function requestEmailChange(email: string): Promise<void> {
  const user = await User.findOne({ email })

  if (!user) {
    throw new NotFoundException(StringConstants.USER_NOT_FOUND)
  }

  if (user.email == email) {
    throw new ConflictException(StringConstants.EMAIL_ALREADY_IN_USE)
  }

  if (!user.isEmailVerified) {
    throw new UnprocessableEntityException(StringConstants.EMAIL_NOT_VERIFIED)
  }

  const resetToken = generateVerificationCode();
  const resetTokenExpiry = calculateVerificationCodeExpiryTime()

  user.changeEmailToken = resetToken;
  user.changeEmailTokenExpiry = resetTokenExpiry;

  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Change Account Email',
    template: 'email-change-request',
    params: { username: user.firstName, code: resetToken },
  });
}

/*
  Change Email Address
*/

export async function changeEmail(resetToken: string, newPassword: string): Promise<void> {
  const user = await User.findOne({ changeEmailToken: resetToken, changeEmailTokenExpiry: { $gt: new Date() } })

  if (!user) {
    throw new UnauthorizedException(StringConstants.INVALID_EXPIRED_TOKEN)
  }

  const hashedPassword = hashPassword(newPassword)
  user.password = hashedPassword;
  user.changeEmailToken = null
  user.changeEmailTokenExpiry = null

  user.save()

  await sendEmail({
    to: user.email,
    subject: 'Email Changed Successfully',
    template: 'changed-password',
    params: { username: user.firstName },
  });
}

/*
  Resend Email Verification Code
*/

export async function resendEmailVerificationCode(email: string): Promise<void> {
  const user = await User.findOne({ email });

  if (!user) {
    throw new NotFoundException(StringConstants.USER_NOT_FOUND);
  }

  if (user.isEmailVerified) {
    throw new ConflictException(StringConstants.EMAIL_ALREADY_VERIFIED);
  }

  const newVerificationCode = generateOTP();
  const newVerificationCodeExpiry = calculateVerificationCodeExpiryTime()

  user.emailVerificationCode = newVerificationCode;
  user.emailVerificationCodeExpiry = newVerificationCodeExpiry;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Confirm your email',
    template: 'resend-code',
    params: { code: newVerificationCode },
  });
}
