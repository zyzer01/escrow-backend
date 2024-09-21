import Wallet from './models/wallet.model';
import WalletTransaction from './models/wallet-transaction.model';

/**
 * Payout funds to a user's wallet
 * @param userId - ID of the user receiving the payout
 * @param amount - Amount to be paid out
 * @param betId - ID of the bet associated with the payout
 * @returns Promise<void>
 */
export async function payoutFunds (userId: string, amount: number, betId: string): Promise<void> {
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
      betId
    });
    await transaction.save();
  } catch (error) {
    console.error('Error during payout:', error);
    throw new Error('Payout failed');
  }
};


/**
 * Refund funds to a user's wallet.
 * @param userId - The ID of the user receiving the refund.
 * @param amount - The amount to be refunded.
 */
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
      betId: betId
  });
  await transaction.save();
}
