import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../users/user.model';
import dotenv from 'dotenv'
import { sendEmail } from '../../mail/mail.service';
import { hashPassword } from '../../utils';

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
  const newUser = new User({ ...userData, password: hashedPassword, role: userData.role || 'user' });
  const savedUser = newUser.save();

  await sendEmail({
    to: userData.email,
    subject: 'Welcome to Our Service!',
    template: 'welcome',
    params: { username: userData.username },
  });
  return savedUser
}

export async function loginUser(email: string, password: string): Promise<{ token: string, user: IUser }> {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  return { token, user };
}
