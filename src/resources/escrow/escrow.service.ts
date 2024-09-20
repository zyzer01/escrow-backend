import Escrow, { IEscrow } from './escrow.model';


export async function lockFunds (lockFundsData: Partial<IEscrow>) {
    const escrow = new Escrow(lockFundsData)
    return await escrow.save()
}

export async function releaseFunds(betId: string, winnerId: string): Promise<void> {
    const escrow = await Escrow.findOne({ betId });
    const bet = await Escrow.findById(escrow).populate('betId');

    console.log(bet)


    if (!escrow) {
        throw new Error('Escrow not found');
    }

    const totalStake = escrow.creatorStake + escrow.opponentStake;
    const systemCommission = totalStake * 0.10; // 10% commission for the system
    const witnessShare = totalStake * 0.05; // 5% share for witnesses
    const winnerShare = totalStake - systemCommission - witnessShare; // Remaining amount for the winner

    // Transfer system commission (implement the actual transfer logic)
    // e.g., payoutSystem.transferFunds('system', systemCommission);

    // Distribute witness share (implement the actual transfer logic)
    const witnesses = bet.witnesses;
    const witnessSharePerWitness = witnessShare / witnesses.length;
    // witnesses.forEach(witnessId => {
    //     // e.g., payoutSystem.transferFunds(witnessId, witnessSharePerWitness);
    // });

    // Transfer winner share (implement the actual transfer logic)
    if (escrow.creatorId === winnerId) {
        // e.g., payoutSystem.transferFunds(winnerId, winnerShare);
    } else if (escrow.opponentId === winnerId) {
        // e.g., payoutSystem.transferFunds(winnerId, winnerShare);
    } else {
        throw new Error('Winner ID does not match any participant');
    }

    escrow.status = 'released';
    await escrow.save();
}


export const refundFunds = async (betId: string) => {
      const escrow = await Escrow.findOne({ betId });
  
      if (!escrow) {
        throw new Error('Escrow not found');
      }
  
      // Logic to refund stakes to both parties
      // Example: refundSystem.refund(escrow.creatorId, escrow.creatorStake);
      // Example: refundSystem.refund(escrow.opponentId, escrow.opponentStake);
  
      // Update escrow status
      escrow.status = 'refunded';
      await escrow.save();
  
      console.log('Funds refunded to both participants');
  };
  