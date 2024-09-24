import { Request, Response } from "express";
import { paystackCallback, verifyAccountNumber } from "./wallet.service";
import { fundWallet, withdrawFromWallet } from './wallet.service';
import Wallet from "./models/wallet.model";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;


export async function verifyAccountNumberHandler(req: Request, res: Response): Promise<void> {
    const { accountNumber, bankCode } = req.body;

    try {
        const accountDetails = await verifyAccountNumber(accountNumber, bankCode);
        res.status(200).json({ message: 'Account verified', data: accountDetails });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}
export async function fundWalletHandler(req: Request, res: Response): Promise<void> {
    const { userId, amount } = req.body;
    const callbackUrl = `${process.env.BASE_URL}/wallet/callback`;

    try {
        const data = await fundWallet(userId, amount, callbackUrl);
        res.status(200).json({ message: 'Payment link created', data });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export async function paystackCallbackHandler(req: Request, res: Response): Promise<void> {
    const { reference } = req.body;

    try {
        await paystackCallback(reference);
        res.status(200).json({ message: 'Wallet funded successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}
export async function withdrawFromWalletHandler(req: Request, res: Response): Promise<void> {
    const { walletId, amount, bankCode, accountNumber } = req.body;

    try {
        await withdrawFromWallet(walletId, amount, bankCode, accountNumber);
        res.status(200).json({ message: 'Withdrawal successful' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}



export async function updateWalletBalance(email: string, amount: number): Promise<void> {
    const wallet = await Wallet.findOne({ email });

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    wallet.balance += amount;  // Add the funded amount to the balance
    await wallet.save();
}
