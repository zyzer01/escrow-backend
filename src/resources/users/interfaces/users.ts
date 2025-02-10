export interface IUser {
  username: string | null;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: number | bigint | null;
  dob?: string | null;
}
