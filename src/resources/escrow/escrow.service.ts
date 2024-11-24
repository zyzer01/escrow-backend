import { NotFoundException, UnprocessableEntityException } from '../../common/errors';
import { StringConstants } from '../../common/strings';
import { systemCommissionPercentage, witnessCommissionPercentage } from '../../config';
import Bet from '../bets/models/bet.model';
import { distributeWitnessCommission } from '../bets/witnesses/witness.service';
import { addToSystemWallet } from '../system-wallet/system-wallet.service';
import { payoutFunds, refund } from '../wallet/wallet.service';
import Escrow, { IEscrow } from './escrow.model';


export class EscrowService {

    public async getEscrow(betId: string): Promise<Response> {

        const escrow = await Escrow.findOne({ betId })
            .populate({
                path: 'betId', select: 'title description creatorStake opponentStake totalStake status createdAt updatedAt'
            });

        if (!escrow) {
            throw new NotFoundException(StringConstants.ESCROW_NOT_FOUND)
        }

        return escrow;
    }

    
    /**
     * Get total stakes for a specific bet.
     * @param betId - The ID of the bet.
     * @returns Total stakes in the escrow.
     */
    public async getTotalStakes(betId: string): Promise<number> {
        const escrow = await Escrow.findOne({ betId });

        if (!escrow) {
            throw new NotFoundException(StringConstants.ESCROW_NOT_FOUND)
        }

        const totalStakes = escrow.creatorStake + escrow.opponentStake;
        return totalStakes;
    }

    /**
     * Locks funds for a bet in escrow.
     * @param lockFundsData - The data to lock funds (creatorId, creatorStake, opponentId, opponentStake).
     */
    public async lockFunds(lockFundsData: Partial<IEscrow>) {
        const escrow = new Escrow(lockFundsData);
        return await escrow.save();
    }


    /**
     * Releases funds from escrow to the winner, distributes system fee and witness fee.
     * @param betId - 
     * @param winnerId -
     */
    public async releaseFunds(betId: string, winnerId: string): Promise<IEscrow | null> {
        const escrow = await Escrow.findOne({ betId });

        const bet = await Bet.findById(betId);

        if (!bet) {
            throw new NotFoundException(StringConstants.BET_NOT_FOUND)
        }

        if (bet.betType === 'with-witness') {
            if (bet.status !== 'verified' && bet.status !== 'disputed') {
                throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
            }
        }

        const totalStake = (escrow.creatorStake || 0) + (escrow.opponentStake || 0);
        const systemCommission = totalStake * systemCommissionPercentage;
        const witnessCommission = totalStake * witnessCommissionPercentage;
        const winnerShare = totalStake - systemCommission - witnessCommission;

        await addToSystemWallet(systemCommission);
        await distributeWitnessCommission(betId, witnessCommission);

        if (escrow.creatorId.toString() === winnerId.toString()) {
            await payoutFunds(escrow.creatorId, winnerShare, betId);
        } else if (escrow.opponentId.toString() === winnerId.toString()) {
            await payoutFunds(escrow.opponentId, winnerShare, betId);
        } else {
            throw new Error(StringConstants.INVALID_WINNER);
        }

        escrow.status = 'released';
        await escrow.save();

        return escrow;
    }


    /**
     * Refunds funds to both participants of a bet if the bet is cancelled.
     * @param betId - The ID of the bet.
     */
    public async refundFunds(betId: string) {
        try {
            const escrow = await Escrow.findOne({ betId });
            console.log(escrow)
            if (!escrow) {
                throw new NotFoundException(StringConstants.ESCROW_NOT_FOUND);
            }

            await refund(escrow.creatorId, escrow.creatorStake, betId);
            await refund(escrow.opponentId, escrow.opponentStake, betId);

            escrow.status = "refunded";
            await escrow.save();
        } catch (error) {
            console.error(error);
            throw new Error(StringConstants.FAILED_STAKES_REFUND);
        }

        return 'Refunded'

    };

}


export const escrowService = new EscrowService()
export const {
    lockFunds,
    releaseFunds,
    refundFunds,
} = new EscrowService()
