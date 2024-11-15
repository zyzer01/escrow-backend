import { JwtPayload } from "jsonwebtoken";
import { IUser } from "../../resources/users/user.model";

export interface TokenPayload extends JwtPayload {
    userId: string;
    role: string;
    sessionId: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    tokens: TokenPair;
    user: IUser;
}

