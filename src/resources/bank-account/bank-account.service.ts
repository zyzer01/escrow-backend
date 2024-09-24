import { StringConstants } from './../../common/strings';
import axios from 'axios';
import { BankAccount, IBankAccount } from './bank-account.model';
import User from '../users/user.model';
import { PAYSTACK_BASE_URL, PAYSTACK_SECRET_KEY } from '../../config/payment';

export async function verifyAccountNumber(accountNumber: string, bankCode: string): Promise<any> {
  try {
    const response = await axios.get(`${PAYSTACK_BASE_URL}/bank/resolve`, {
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('Error verifying account number:', error);
    throw new Error('Account verification failed');
  }
}

export async function saveBankAccount(userId: string, bankCode: string, accountNumber: string): Promise<IBankAccount> {
  const verifiedAccount = await verifyAccountNumber(accountNumber, bankCode);

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const bankAccount = new BankAccount({
    userId,
    bankName: verifiedAccount.bank_name,
    bankCode,
    accountNumber,
    accountName: verifiedAccount.account_name,
    isPrimary: false,
  });

  await bankAccount.save();
  return bankAccount;
}

export async function getUserBankAccounts(userId: string): Promise<IBankAccount[]> {
  const bankAccounts = await BankAccount.find({ userId }).sort({ isPrimary: -1 }); // Primary first
  return bankAccounts;
}

export async function setPrimaryBankAccount(userId: string, bankAccountId: string): Promise<IBankAccount> {
  // Unset the current primary account
  await BankAccount.updateMany({ userId, isPrimary: true }, { $set: { isPrimary: false } });

  // Set the new primary account
  const bankAccount = await BankAccount.findByIdAndUpdate(bankAccountId, { $set: { isPrimary: true } }, { new: true });

  if (!bankAccount) {
    throw new Error(StringConstants.BANK_ACCOUNT_NOT_FOUND);
  }

  return bankAccount;
}


export async function deleteBankAccount(userId: string, bankAccountId: string): Promise<void> {
    const bankAccount = await BankAccount.findOneAndDelete({ _id: bankAccountId, userId });

    if (!bankAccount) {
        throw new Error('Bank account not found or unauthorized');
    }

    console.log('Bank account deleted successfully');
}
