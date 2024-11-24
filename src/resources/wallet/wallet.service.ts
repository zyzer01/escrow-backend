import { notificationService } from './../notifications/notification.service';
import Wallet, { IWallet } from './models/wallet.model';
import WalletTransaction from './models/wallet-transaction.model';
import User from '../users/user.model';
import axios from 'axios'
import { StringConstants } from '../../common/strings';
import { PAYSTACK_BASE_URL, PAYSTACK_SECRET_KEY } from '../../config/payment';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '../../common/errors';
import { v4 as uuidv4 } from 'uuid';

const reference = `WD-${uuidv4()}`;

const headers = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
};

class WalletService {

  public async payoutFunds(userId: string, amount: number, betId: string): Promise<void> {
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


  public async refund(userId: string, amount: number, betId: string): Promise<void> {
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


  public async addToUserWallet(userId: string, amount: number, betId?: string): Promise<void> {
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

  public async fundWallet(userId: string, amount: number, callbackUrl: string): Promise<any> {
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

      await notificationService.createNotification(
        [user._id],
        'wallet-funding',
        'Wallet Funded',
        `Your wallet was funded with N${amount}`
      )

      return response.data.data;
    } catch (error) {
      console.error('Error initializing Paystack transaction:', error);
      throw new Error('Error initializing Paystack transaction');
    }
  }

  public async paystackCallback(reference: string): Promise<void> {
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

        if (!wallet) {
          throw new NotFoundException(StringConstants.WALLET_NOT_FOUND)
        }

        if (!user) {
          throw new NotFoundException(StringConstants.USER_NOT_FOUND);
        }

        const existingTransaction = await WalletTransaction.findOne({ reference });
        if (existingTransaction) {
          throw new ConflictException(StringConstants.TRANSACTION_PROCESSED);
        }

        wallet.balance += amount / 100; // Converts kobo to Naira
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
        throw new Error(StringConstants.FAILED_TRANSACTION);
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      throw new Error('Error verifying transaction');
    }
  }


  public async verifyAccountNumber(accountNumber: string, bankCode: string): Promise<any> {
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


  private async createTransferRecipient(user: any, bankCode: string, accountNumber: string): Promise<any> {

    //Remember to check if bank account for user exists, if not, ask them to create a bank account
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


  public async withdrawFromWallet(walletId: string, amount: number, bankCode: string, accountNumber: string): Promise<void> {
    try {
      const wallet = await Wallet.findById(walletId).populate('userId');

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Initiate withdrawal through Paystack
      const transferRecipient = await this.createTransferRecipient(wallet.userId, bankCode, accountNumber);

      // wallet.userId.transferRecipientCode = transferRecipient.recipient_code

      const withdrawalResponse = await axios.post(`${PAYSTACK_BASE_URL}/transfer`, {
        source: 'balance',
        amount: amount * 100, // Convert Naira to Kobo
        reference: reference,
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

        await notificationService.createNotification(
          [wallet.users._id],
          'wallet-withdrawal',
          'Withdrawal Successful',
          `Your withdrawal of N${amount} was successful`
        )
        await walletTransaction.save();
      } else {
        throw new Error(StringConstants.FAILED_WITHDRAWAL);
      }
    } catch (error) {
      console.error('Error during withdrawal:', error);
      throw new Error('Error during withdrawal');
    }
  }



  public async updateWalletBalance(userId: string, amount: number, betId?: string): Promise<void> {
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      throw new NotFoundException(StringConstants.WALLET_NOT_FOUND);
    }

    wallet.balance += amount;
    await wallet.save();

    const transaction = new WalletTransaction({
      userId,
      amount,
      type: 'fund',
      description: `Wallet Funded`,
      betId: betId,
      reference: reference
    });
    await transaction.save();
  }


  public async getWalletBalance(userId: string): Promise<number> {
    try {
      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = await new Wallet({
          userId: userId,
          balance: 10000
        }).save();
      }

      return wallet.balance;
    } catch (error) {
      throw new Error(`Error fetching wallet balance: ${error}`);
    }
  }


  public async subtractWalletBalance(userId: string, amount: number): Promise<IWallet> {
    try {
      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.balance < amount) {
        throw new UnprocessableEntityException('Insufficient balance');
      }

      wallet.balance -= amount;
      await wallet.save();

      return wallet;
    } catch (error) {
      throw new Error(`Error deducting wallet balance, ${error}`);
    }
  }

}

export const walletService = new WalletService();
export const {
  payoutFunds,
  refund,
  addToUserWallet,
  fundWallet,
  withdrawFromWallet,
  updateWalletBalance,
  getWalletBalance,
  subtractWalletBalance

} = new WalletService()
