import { saltRounds, verificationCodeExpiry } from "../config";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from "../resources/users/user.model";

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET as string

export const generateOTP = (length = 4) =>
    Math.floor(
        Math.random() * (Math.pow(10, length) - 1 - Math.pow(10, length - 1) + 1),
    ) + Math.pow(10, length - 1);

export const hashPassword = (password: string) => bcrypt.hash(password, saltRounds)

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

export async function selectNeutralWitness() {
    const eligibleUsers = await User.find({ isEligibleForNeutralWitness: true });
    if (eligibleUsers.length === 0) {
        throw new Error('No eligible neutral witnesses found.');
    }
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
    return eligibleUsers[randomIndex];
}
