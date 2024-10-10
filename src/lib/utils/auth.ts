import { saltRounds, verificationCodeExpiry } from "../../config";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET as string

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

export function verifyToken(token: string): any {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid token');
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
