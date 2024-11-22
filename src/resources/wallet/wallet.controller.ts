import { NextFunction, Request, Response } from "express";
import { getWalletBalance, paystackCallback, subtractWalletBalance, updateWalletBalance, validateBVN, verifyAccountNumber } from "./wallet.service";
import { fundWallet, withdrawFromWallet } from './wallet.service';
import { StringConstants } from "../../common/strings";

export async function verifyAccountNumberHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { accountNumber, bankCode } = req.body;

    try {
        const accountDetails = await verifyAccountNumber(accountNumber, bankCode);
        res.status(200).json({ message: 'Account verified', data: accountDetails });
    } catch (error) {
        next(error)
    }
}
export async function fundWalletHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { userId, amount } = req.body;
    const callbackUrl = `${process.env.BASE_URL}/wallet/callback`;

    try {
        const data = await fundWallet(userId, amount, callbackUrl);
        res.status(200).json({ message: 'Payment link created', data });
    } catch (error) {
        next(error)
    }
}

export async function paystackCallbackHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { reference } = req.body;

    try {
        await paystackCallback(reference);
        res.status(200).json({ message: 'Wallet funded successfully' });
    } catch (error) {
        next(error)
    }
}
export async function withdrawFromWalletHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { walletId, amount, bankCode, accountNumber } = req.body;

    try {
        await withdrawFromWallet(walletId, amount, bankCode, accountNumber);
        res.status(200).json({ message: 'Withdrawal successful' });
    } catch (error) {
        next(error)
    }
}


export async function updateWalletBalanceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { userId, amount } = req.body;

    try {
        const data = await updateWalletBalance(userId, amount);
        res.status(200).json({ message: 'Account Funded', data });
    } catch (error) {
        next(error)
    }
}

export async function getWalletBalanceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user?.data.user.id;
        
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const balance = await getWalletBalance(userId);
        res.status(200).json({ balance });
    } catch (error) {
        next(error);
    }
}


export async function subtractWalletBalanceHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user?.data.user.id;
        const { amount } = req.body;

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount provided'
            });
        }

        const wallet = await subtractWalletBalance(userId, amount);
        res.status(200).json(wallet);

    } catch (error) {
        next(error)
    }
}
