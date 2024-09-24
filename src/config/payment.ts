import dotenv from 'dotenv'

dotenv.config()
export const PAYSTACK_BASE_URL = 'https://api.paystack.co';
export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
