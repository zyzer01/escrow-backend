import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../users/user.model';
import dotenv from 'dotenv'
import { sendEmail } from '../../mail/mail.service';
import { calculateVerificationCodeExpiryTime, generateOTP, generateVerificationCode, hashPassword } from '../../utils';
import { StringConstants } from '../../common/strings';
import Wallet from '../wallet/models/wallet.model';

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET as string;

/*
  Register User
*/

export async function registerUser(userData: IUser): Promise<IUser> {
  const existingUser = await User.findOne({
    $or: [{ email: userData.email }, { username: userData.username }]
  });

  if (existingUser) {
    throw new Error('User with this email or username already exists');
  }

  const hashedPassword = await hashPassword(userData.password);

  const code = generateOTP();
  const codeExpiry = calculateVerificationCodeExpiryTime()

  const newUser = new User({ ...userData, password: hashedPassword, role: userData.role || 'user', emailVerificationCode: code, emailVerificationCodeExpiry: codeExpiry });
  const savedUser = await newUser.save();

  const newWallet = new Wallet({
    userId: savedUser._id,
    balance: 0,
    transactionHistory: [],
  });

  await newWallet.save();

  // await sendEmail({
  //   to: userData.email,
  //   subject: StringConstants.CONFIRM_EMAIL,
  //   template: 'confirm-email',
  //   params: { username: userData.firstname, code: code },
  // });
  return savedUser
}

/*
  Login User
*/

export async function loginUser(email: string, password: string): Promise<{ token: string, user: IUser }> {
  const user: IUser | null = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  if(!user.isEmailVerified) {
    throw new Error(StringConstants.EMAIL_NOT_VERIFIED);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error(StringConstants.INVALID_PASSWORD);
  }

  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  return { token, user };
}

/*
  Forgot Password
*/

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({email})

  if(!user) {
    throw new Error(StringConstants.USER_NOT_FOUND)
  }

  const resetToken = generateVerificationCode();
  const resetTokenExpiry = calculateVerificationCodeExpiryTime()

  user.resetPasswordToken = resetToken
  user.resetPasswordTokenExpiry = resetTokenExpiry

  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    template: 'forgot-password',
    params: { username: user.firstname, code: resetToken },
  });
}

/*
  Reset User Password
*/

export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  const user = await User.findOne({resetPasswordToken: resetToken, resetPasswordTokenExpiry: { $gt: new Date() }})

  if(!user) {
    throw new Error(StringConstants.INVALID_EXPIRED_TOKEN)
  }

  const hashedPassword = hashPassword(newPassword)
  user.password = hashedPassword;
  user.resetPasswordToken = null
  user.resetPasswordTokenExpiry = null

  user.save()

  await sendEmail({
    to: user.email,
    subject: 'Password Changed Successfully',
    template: 'changed-password',
    params: { username: user.firstname },
  });
}

/*
  Request Change of Email Address
*/

export async function requestEmailChange(email: string): Promise<void> {
  const user = await User.findOne({email})

  if(!user) {
    throw new Error(StringConstants.USER_NOT_FOUND)
  }

  if(user.email == email) {
    throw new Error(StringConstants.EMAIL_ALREADY_IN_USE)
  }

  if(!user.isEmailVerified) {
    throw new Error(StringConstants.EMAIL_NOT_VERIFIED)
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
    params: { username: user.firstname, code: resetToken },
  });
}

/*
  Change Email Address
*/

export async function changeEmail(resetToken: string, newPassword: string): Promise<void> {
  const user = await User.findOne({changeEmailToken: resetToken, changeEmailTokenExpiry: { $gt: new Date() }})

  if(!user) {
    throw new Error(StringConstants.INVALID_EXPIRED_TOKEN)
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
    params: { username: user.firstname },
  });
}

/*
  Verify User Email Address
*/

export async function verifyEmail(code: number): Promise<void> {
  const user = await User.findOne({emailVerificationCode: code, emailVerificationCodeExpiry: { $gt: new Date() }})

  if(!user) {
    throw new Error(StringConstants.INVALID_EXPIRED_TOKEN)
  }

  if(user.isEmailVerified) {
    throw new Error(StringConstants.EMAIL_ALREADY_VERIFIED)
  }

  user.isEmailVerified = true
  user.emailVerificationCode = null;
  user.emailVerificationCodeExpiry = null;

  user.save()

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Escrow Bet',
    template: 'welcome',
    params: { username: user.firstname },
  });
}

/*
  Resend Email Verification Code
*/

export async function resendEmailVerificationCode(email: string): Promise<void> {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error(StringConstants.EMAIL_ALREADY_VERIFIED);
  }

  if (user.isEmailVerified) {
    throw new Error(StringConstants.EMAIL_ALREADY_VERIFIED);
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
    params: { username: user.firstname, code: newVerificationCode },
  });
}



