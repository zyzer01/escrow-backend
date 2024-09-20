import Wallet from './models/wallet.model';
import Transaction from './models/transaction.model';

/**
 * Payout funds to a user's wallet
 * @param userId - ID of the user receiving the payout
 * @param amount - Amount to be paid out
 * @param betId - ID of the bet associated with the payout
 * @returns Promise<void>
 */
export async function payoutFunds (userId: string, amount: number, betId: string): Promise<void> {
  try {
    // Fetch user's wallet
    let wallet = await Wallet.findOne({ userId });

    // If wallet does not exist, create one
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
    }

    // Update the wallet balance
    wallet.balance += amount;
    await wallet.save();

    // Log the transaction
    const transaction = new Transaction({
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

