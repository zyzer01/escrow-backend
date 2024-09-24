import Wallet from './models/wallet.model';
import WalletTransaction from './models/wallet-transaction.model';
import User from '../users/user.model';
import axios from 'axios'
import { StringConstants } from '../../common/strings';
import { generateUniqueReference } from '../../utils';
import { PAYSTACK_BASE_URL, PAYSTACK_SECRET_KEY } from '../../config/payment';

const reference = generateUniqueReference()

export async function payoutFunds(userId: string, amount: number, betId: string): Promise<void> {
  try {
    let userWallet = await Wallet.findOne({ userId });

    if (!userWallet) {
      userWallet = new Wallet({ userId, balance: 0 });
    }

    userWallet.balance += amount;
    await userWallet.save();

    const transaction = new WalletTransaction({
      userId,
      amount,
      type: 'payout',
      description: `Payout from Bet ID: ${betId}`,
      reference: reference,
      betId
    });
    await transaction.save();
  } catch (error) {
    console.error('Error during payout:', error);
    throw new Error('Payout failed');
  }
};

export async function refund(userId: string, amount: number, betId: string): Promise<void> {
  const userWallet = await Wallet.findOne({ userId });

  if (!userWallet) {
    throw new Error('User wallet not found.');
  }

  userWallet.balance += amount;
  const transaction = new WalletTransaction({
    userId,
    amount,
    type: 'refund',
    description: `Refund from Bet ID: ${betId}`,
    betId
  });
  await transaction.save();

  await userWallet.save();
}

export async function addToUserWallet(userId: string, amount: number, betId: string): Promise<void> {
  let userWallet = await Wallet.findOne({ userId });

  if (!userWallet) {
    userWallet = new Wallet({ userId, balance: 0 });
  }

  userWallet.balance += amount;
  await userWallet.save();

  const transaction = new WalletTransaction({
    userId,
    amount,
    type: 'commission',
    description: `Bet Commission`,
    betId: betId,
    reference: reference
  });
  await transaction.save();
}

export async function fundWallet(userId: string, amount: number, callbackUrl: string): Promise<any> {
  try {
    const user = await User.findById(userId)

    if (!user) {
      throw new Error(StringConstants.USER_NOT_FOUND)
    }
    const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      email: user.email,
      amount: amount * 100,
      currency: 'NGN',
      callback_url: callbackUrl,
      first_name: user.firstName,
      reference: reference
    }, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('Error initializing Paystack transaction:', error);
    throw new Error('Error initializing Paystack transaction');
  }
}


export async function paystackCallback(reference: string): Promise<void> {
  try {
    // Verify transaction with Paystack
    const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    const transaction = response.data.data;
    const { email } = transaction.customer
    const { amount, status } = transaction;

    if (status === 'success') {
      const user = await User.findOne({ email });
      const wallet = await Wallet.findOne({ userId: user._id })

      if (!user || !wallet) {
        throw new Error('User not found');
      }

      const existingTransaction = await WalletTransaction.findOne({ reference });
      if (existingTransaction) {
        throw new Error('Transaction has already been processed.');
      }

      wallet.balance += amount / 100; // Convert kobo to Naira
      await user.save();
      await wallet.save();

      const walletTransaction = new WalletTransaction({
        userId: user._id,
        amount: amount / 100,
        reference: reference,
        type: 'fund'
      });
      await walletTransaction.save();
    } else {
      throw new Error('Transaction failed or incomplete');
    }
  } catch (error) {
    console.error('Error verifying transaction:', error);
    throw new Error('Error verifying transaction');
  }
}

export async function verifyAccountNumber(accountNumber: string, bankCode: string): Promise<any> {
  try {
    const response = await axios.get(`${PAYSTACK_BASE_URL}/bank/resolve`, {
      params: {
        account_number: accountNumber,
        bank_code: bankCode
      },
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('Error verifying account number:', error);
    throw new Error('Account verification failed');
  }
}


export async function withdrawFromWallet(walletId: string, amount: number, bankCode: string, accountNumber: string): Promise<void> {
  try {
    const wallet = await Wallet.findById(walletId).populate('userId');

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Initiate withdrawal through Paystack
    const transferRecipient = await createTransferRecipient(wallet.userId, bankCode, accountNumber);

    const withdrawalResponse = await axios.post(`${PAYSTACK_BASE_URL}/transfer`, {
      source: 'balance',
      amount: amount * 100, // Convert Naira to Kobo
      recipient: transferRecipient.recipient_code,
      reason: 'Wallet Withdrawal'
    }, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    // If successful, deduct the wallet balance
    if (withdrawalResponse.data.status === true) {
      wallet.balance -= amount;
      await wallet.save();

      // Log withdrawal
      const walletTransaction = new WalletTransaction({
        userId: wallet.users._id,
        amount,
        transactionType: 'withdrawal',
        reference: withdrawalResponse.data.data.reference,
      });
      await walletTransaction.save();
    } else {
      throw new Error('Withdrawal failed');
    }
  } catch (error) {
    console.error('Error during withdrawal:', error);
    throw new Error('Error during withdrawal');
  }
}


async function createTransferRecipient(user: any, bankCode: string, accountNumber: string): Promise<any> {
  try {
    const recipientResponse = await axios.post(`${PAYSTACK_BASE_URL}/transferrecipient`, {
      type: 'nuban',
      name: user.firstName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN'
    }, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    return recipientResponse.data.data;
  } catch (error) {
    console.error('Error creating transfer recipient:', error);
    throw new Error('Error creating transfer recipient');
  }
}
