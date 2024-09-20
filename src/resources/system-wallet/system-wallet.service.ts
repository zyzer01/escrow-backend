import SystemWallet, { ISystemWallet } from './system-wallet.model';


/**
 * Get the system wallet, or create it if it doesn't exist.
 * @returns Promise<ISystemWallet>
 */
export async function getOrCreateSystemWallet (): Promise<ISystemWallet> {
    try {
      let systemWallet = await SystemWallet.findOne({ type: 'system' });
  
      if (!systemWallet) {
        systemWallet = new SystemWallet({
          type: 'system',
          balance: 0,
          transactionHistory: []
        });
        await systemWallet.save();
      }
  
      return systemWallet;
    } catch (error) {
      console.error('Error retrieving or creating system wallet:', error);
      throw new Error('Failed to retrieve system wallet');
    }
  };


export async function addToSystemWallet(systemShare: number): Promise<void> {
    try {
      const systemWallet = await getOrCreateSystemWallet();
  
      // Update the system wallet balance
      systemWallet.balance += systemShare;
  
      // Add transaction to the system wallet's history
      systemWallet.transactionHistory.push({
        transactionType: 'revenue',
        amount: systemShare,
        createdAt: new Date()
      });
  
      await systemWallet.save();
    } catch (error) {
      console.error('Error updating system wallet:', error);
      throw new Error('System wallet update failed');
    }
  };
