import { saltRounds, verificationCodeExpiry } from "../../config";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { TokenPayload } from "../types/auth";

dotenv.config()

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET as string
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string

export const generateOTP = (): number => {
    return Math.floor(100000 + Math.random() * 900000);
};

export const hashPassword = (password: string) => bcrypt.hash(password, saltRounds)

export const comparePasswords = async (inputPassword: string, hashedPassword: string): Promise<boolean> => {
    return bcrypt.compare(inputPassword, hashedPassword);
};

export const generateVerificationCode = (): string => crypto.randomBytes(3).toString('hex')

export const calculateVerificationCodeExpiryTime = () => {
    return new Date(Date.now() + verificationCodeExpiry);
};

export function generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string) {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    } catch (error) {
        throw new Error('Invalid access token');
    }
}

export function verifyRefreshToken(token: string) {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
}

export function generateUniqueReference(maxLength: number = 12): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let reference = '';

    for (let i = 0; i < maxLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        reference += characters[randomIndex];
    }
    return reference;
}
