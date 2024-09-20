import { systemCommissionPercentage, witnessCommissionPercentage } from '../../utils/config';
import Bet from '../bets/models/bet.model';
import { addToSystemWallet } from '../system-wallet/system-wallet.service';
import { addToUserWallet, payoutFunds, refund } from '../wallet/wallet.service';
import Escrow, { IEscrow } from './escrow.model';


/**
 * Get total stakes for a specific bet.
 * @param betId - The ID of the bet.
 * @returns Total stakes in the escrow.
 */
export async function getTotalStakes(betId: string): Promise<number> {
    const escrow = await Escrow.findOne({ betId });

    console.log(escrow)

    if (!escrow) {
        throw new Error('Escrow not found for the provided bet ID.');
    }
    const totalStakes = escrow.creatorStake + escrow.opponentStake;
    return totalStakes;
}

/**
 * Locks funds for a bet in escrow.
 * @param lockFundsData - The data to lock funds (creatorId, creatorStake, opponentId, opponentStake).
 */
export async function lockFunds(lockFundsData: Partial<IEscrow>) {
    const escrow = new Escrow(lockFundsData);
    return await escrow.save();
}

/**
 * Releases funds from escrow to the winner, distributes system fee and witness fee.
 * @param betId - 
 * @param winnerId -
 */
export async function releaseFunds(betId: string, winnerId: string): Promise<void> {
    const escrow = await Escrow.findOne({ betId });
    if (!escrow) {
        throw new Error('Escrow not found.');
    }

    const totalStake = escrow.creatorStake + escrow.opponentStake;
    const systemCommission = totalStake * systemCommissionPercentage;
    const witnessShare = totalStake * witnessCommissionPercentage;
    const winnerShare = totalStake - systemCommission - witnessShare;

    await addToSystemWallet(systemCommission);

    const bet = await Bet.findById(betId).populate('witnesses');
    const witnesses = bet?.witnesses || [];
    const witnessSharePerWitness = witnessShare / witnesses.length;

    for (const witness of witnesses) {
        await addToUserWallet(witness.userId, witnessSharePerWitness);
    }

    if (escrow.creatorId === winnerId) {
        await payoutFunds(escrow.creatorId, winnerShare, betId);
    } else if (escrow.opponentId === winnerId) {
        await payoutFunds(escrow.opponentId, winnerShare, betId);
    } else {
        throw new Error('Winner ID does not match any participant');
    }

    escrow.status = 'released';
    await escrow.save();
}

/**
 * Refunds funds to both participants of a bet if the bet is cancelled.
 * @param betId - The ID of the bet.
 */
export const refundFunds = async (betId: string) => {
    const escrow = await Escrow.findOne({ betId });
    if (!escrow) {
        throw new Error('Escrow not found.');
    }

    await refund(escrow.creatorId, escrow.creatorStake, betId);
    await refund(escrow.opponentId, escrow.opponentStake, betId);

    escrow.status = 'refunded';
    await escrow.save();

    console.log('Funds refunded to both participants');
};
