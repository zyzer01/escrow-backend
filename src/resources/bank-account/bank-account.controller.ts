import { NextFunction, Request, Response } from 'express';
import { StringConstants } from '../../common/strings';
import { bankAccountService } from './bank-account.service';


export class BankAccountController {

  public async saveBankAccount(req: Request, res: Response, next: NextFunction) {
    const { userId, bankCode, accountNumber } = req.body;

    try {
      const bankAccount = await bankAccountService.saveBankAccount(userId, bankCode, accountNumber);
      return res.status(201).json({ message: StringConstants.BANK_ACCOUNT_SAVED, bankAccount });
    } catch (error) {
      next(error)
    }
  }


  public async getUserBankAccounts(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params;

    try {
      const bankAccounts = await bankAccountService.getUserBankAccounts(userId);
      return res.status(200).json({ bankAccounts });
    } catch (error) {
      next(error)
    }
  }

  public async setPrimaryBankAccount(req: Request, res: Response, next: NextFunction) {
    const { userId, bankAccountId } = req.body;

    try {
      const bankAccount = await bankAccountService.setPrimaryBankAccount(userId, bankAccountId);
      return res.status(200).json({ message: StringConstants.PRIMARY_BANK_ACCOUNT_SET, bankAccount });
    } catch (error) {
      next(error)
    }
  }

  public async deleteBankAccount(req: Request, res: Response, next: NextFunction) {
    const { userId, bankAccountId } = req.params;

    try {
      await bankAccountService.deleteBankAccount(userId, bankAccountId);
      return res.status(200).json({ message: 'Bank account deleted successfully' });
    } catch (error) {
      next(error)
    }
  }


  public async fetchAvailableBanks(req: Request, res: Response, next: NextFunction) {
    try {
      const banks = await bankAccountService.fetchAvailableBanks();
      return res.status(200).json(banks);
    } catch (error) {
      next(error)
    }
  }


}

export const bankAccountController = new BankAccountController();
