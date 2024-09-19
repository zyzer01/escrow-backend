import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../users/user.model';
import dotenv from 'dotenv'
import { sendEmail } from '../../mail/mail.service';
import { calculateVerificationCodeExpiryTime, generateOTP, generateVerificationCode, hashPassword } from '../../utils';

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET as string;

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
  const savedUser = newUser.save();

  await sendEmail({
    to: userData.email,
    subject: 'Confirm your email!',
    template: 'confirm-email',
    params: { username: userData.firstname, code: code },
  });
  return savedUser
}

export async function loginUser(email: string, password: string): Promise<{ token: string, user: IUser }> {
  const user: IUser | null = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  if(!user.isEmailVerified) {
    throw new Error('User is not verified. Please verify your email before logging in.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  return { token, user };
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({email})

  if(!user) {
    throw new Error('User not found')
  }

  const resetToken = generateVerificationCode();
  const resetTokenExpiry = calculateVerificationCodeExpiryTime()

  user.resetPasswordToken = resetToken
  user.resetPasswordTokenExpiry = resetTokenExpiry

  await user.save;

  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    template: 'reset-password',
    params: { username: user.firstname, code: resetToken },
  });
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  const user = await User.findOne({resetPasswordToken: resetToken, resetPasswordTokenExpiry: { $gt: new Date() }})

  if(!user) {
    throw new Error('Invalid or expired token')
  }

  const hashedPassword = hashPassword(newPassword)
  user.password = hashedPassword;
  user.resetPasswordToken = null
  user.resetPasswordTokenExpiry = null
  user.save()
}


export async function verifyEmail(email: string, code: number): Promise<void> {
  const user: IUser | null = await User.findOne({email})
  if(!user) {
    throw new Error('User not found')
  }

  if (user.emailVerificationCodeExpiry && new Date() > user.emailVerificationCodeExpiry) {
    throw new Error('Verification code has expired');
  }
  
  if(user.emailVerificationCode != code) {
    throw new Error('Invalid Verification Code')
  }

  user.isEmailVerified = true
  user.emailVerificationCode = null;
  user.emailVerificationCodeExpiry = null;

  user.save()
}

export async function resendEmailVerificationCode(email: string): Promise<void> {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.isVerified) {
    throw new Error('User is already verified');
  }

  const newVerificationCode = generateOTP();
  const newVerificationCodeExpiry = calculateVerificationCodeExpiryTime()

  user.verificationCode = newVerificationCode;
  user.verificationCodeExpiry = newVerificationCodeExpiry;
  await user.save();

  await sendEmail({
    to: user.email,
    subject: 'Confirm your email',
    template: 'resend-code',
    params: { username: user.firstname, code: newVerificationCode },
  });
}



