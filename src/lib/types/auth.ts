import { JwtPayload } from "jsonwebtoken";
import { IUser } from "../../resources/users/user.model";

export interface TokenPayload {
  userId: string;
  role?: string;
  tokenVersion?: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
    tokens: Tokens;
    user: IUser;
}

