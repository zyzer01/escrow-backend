import { NextFunction, Request, Response } from 'express';
import { saveBankAccount, getUserBankAccounts, setPrimaryBankAccount, deleteBankAccount, fetchAvailableBanks } from './bank-account.service';
import { StringConstants } from '../../common/strings';

export async function saveBankAccountHandler(req: Request, res: Response, next: NextFunction) {
  const { userId, bankCode, accountNumber } = req.body;

  try {
    const bankAccount = await saveBankAccount(userId, bankCode, accountNumber);
    return res.status(201).json({ message: StringConstants.BANK_ACCOUNT_SAVED, bankAccount });
  } catch (error) {
    next(error)
  }
}

export async function getUserBankAccountsHandler(req: Request, res: Response, next: NextFunction) {
  const { userId } = req.params;

  try {
    const bankAccounts = await getUserBankAccounts(userId);
    return res.status(200).json({ bankAccounts });
  } catch (error) {
    next(error)
  }
}

export async function setPrimaryBankAccountHandler(req: Request, res: Response, next: NextFunction) {
  const { userId, bankAccountId } = req.body;

  try {
    const bankAccount = await setPrimaryBankAccount(userId, bankAccountId);
    return res.status(200).json({ message: StringConstants.PRIMARY_BANK_ACCOUNT_SET, bankAccount });
  } catch (error) {
    next(error)
  }
}

export async function deleteBankAccountHandler(req: Request, res: Response, next: NextFunction) {
  const { userId, bankAccountId } = req.params;

  try {
    await deleteBankAccount(userId, bankAccountId);
    return res.status(200).json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    next(error)
  }
}


export async function fetchAvailableBanksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const banks = await fetchAvailableBanks();
    return res.status(200).json(banks);
  } catch (error) {
    next(error)
  }
}
