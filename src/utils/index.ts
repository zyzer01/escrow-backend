import { saltRounds } from "./config";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET as string

export const generateOTP = (length = 4) =>
    Math.floor(
        Math.random() * (Math.pow(10, length) - 1 - Math.pow(10, length - 1) + 1),
    ) + Math.pow(10, length - 1);

export const hashPassword = (password: string) => bcrypt.hash(password, saltRounds)

export function verifyToken(token: string): any {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid token');
    }
}
