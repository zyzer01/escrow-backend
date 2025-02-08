export interface IUser extends Document {
  username: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
  role: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: number;
}