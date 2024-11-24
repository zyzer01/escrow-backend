import { NextFunction, Request, Response } from "express";
import { walletService } from './wallet.service';

export class WalletController {

    public async verifyAccountNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { accountNumber, bankCode } = req.body;
    
        try {
            const accountDetails = await walletService.verifyAccountNumber(accountNumber, bankCode);
            res.status(200).json({ message: 'Account verified', data: accountDetails });
        } catch (error) {
            next(error)
        }
    }


    public async fundWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { userId, amount } = req.body;
        const callbackUrl = `${process.env.BASE_URL}/wallet/callback`;
    
        try {
            const data = await walletService.fundWallet(userId, amount, callbackUrl);
            res.status(200).json({ message: 'Payment link created', data });
        } catch (error) {
            next(error)
        }
    }

    public async paystackCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { reference } = req.body;
    
        try {
            await walletService.paystackCallback(reference);
            res.status(200).json({ message: 'Wallet funded successfully' });
        } catch (error) {
            next(error)
        }
    }

    public async withdrawFromWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { walletId, amount, bankCode, accountNumber } = req.body;
    
        try {
            await walletService.withdrawFromWallet(walletId, amount, bankCode, accountNumber);
            res.status(200).json({ message: 'Withdrawal successful' });
        } catch (error) {
            next(error)
        }
    }


    public async updateWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { userId, amount } = req.body;
    
        try {
            const data = await walletService.updateWalletBalance(userId, amount);
            res.status(200).json({ message: 'Account Funded', data });
        } catch (error) {
            next(error)
        }
    }

    public async getWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.data.user.id;
            
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            const balance = await walletService.getWalletBalance(userId);
            res.status(200).json({ balance });
        } catch (error) {
            next(error);
        }
    }


    public async subtractWalletBalance(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.data.user.id;
            const { amount } = req.body;
    
            if (typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount provided'
                });
            }
    
            const wallet = await walletService.subtractWalletBalance(userId, amount);
            res.status(200).json(wallet);
    
        } catch (error) {
            next(error)
        }
    }

}


export const walletController = new WalletController();




