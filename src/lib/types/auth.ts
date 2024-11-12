import { IUser } from "../../resources/users/user.model";

export interface TokenPayload {
    userId: string;
    role: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    tokens: TokenPair;
  user: IUser;
}

