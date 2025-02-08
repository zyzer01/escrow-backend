import mongoose from "mongoose";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from "../../../common/errors";
import { GoneException } from "../../../common/errors/GoneException";
import { StringConstants } from "../../../common/strings";
import User from "../../users/user.model";
import { walletService } from "../../wallet/wallet.service";
import Bet from "../models/bet.model";
import Witness from './witness.model';


export class WitnessService {


    public async getWitnessInvite(witnessId: string) {

        try {
            const witness = await Witness.findById(witnessId)
                .populate({
                    path: 'betId',
                    select: 'title description creatorStake totalStake deadline status'
                });

            if (!witness) {
                throw new Error('Witness invitation not found');
            }

            if (witness.status !== 'pending') {
                throw new GoneException('This invitation has already been responded to');
            }

            return witness;
        } catch (error) {
            console.error("Failed to get witness invite:", error);
        }

    }

    /**
     * Accepts witness role for bet
     */

    public async acceptWitnessInvite(witnessId: string): Promise<Response> {

        const witness = await Witness.findById(witnessId);

        if (!witness) {
            throw new NotFoundException(StringConstants.WITNESS_NOT_FOUND)
        }
        if (witness.status !== 'pending') {
            throw new GoneException(StringConstants.BET_ALREADY_ACCEPTED_REJECTED)
        }

        const bet = await Bet.findById(witness.betId);
        
        if (!bet) {
            throw new NotFoundException(StringConstants.BET_NOT_FOUND);
        }
        if (bet.status !== 'accepted') {
            throw new UnprocessableEntityException(StringConstants.OPPONENT_YET_TO_ACCEPT);
        }

        witness.status = 'accepted';
        await witness.save();

        return witness
    }

    /**
     * Steps user down as a witness
     */

    public async rejectWitnessInvite(witnessId: string): Promise<Response> {

        const witness = await Witness.findOne({ witnessId });

        if (!witness) {
            throw new NotFoundException(StringConstants.WITNESS_NOT_FOUND)
        }
        if (witness.status !== 'pending') {
            throw new ConflictException(StringConstants.BET_ALREADY_ACCEPTED_REJECTED)
        }

        witness.status = 'rejected';
        await witness.save();

        return witness
    }

    /**
     * Casts vote for betters
     */

    public async castVote(betId: string, witnessId: string, vote: string) {

        const witness = await Witness.findOne({ betId, userId: witnessId });

        if (!witness) {
            throw new NotFoundException(StringConstants.WITNESS_NOT_FOUND)
        }
        if (witness.status !== 'accepted') {
            throw new ForbiddenException(StringConstants.WITNESS_INVITE_REJECTED)
        }

        witness.vote = vote;
        witness.status = 'accepted';
        await witness.save();

        return vote
    }

    /**
     * Determines winner from the vote outcome
     * @returns Promise<string | null>
     */

    public async determineWinner(betId: string): Promise<string | null> {
        const witnesses = await Witness.find({ betId, status: 'accepted' });

        if (witnesses.length < 3) {
            throw new UnprocessableEntityException(StringConstants.INSUFFICIENT_VOTES);
        }

        const voteCount = { creator: 0, opponent: 0 };

        witnesses.forEach((witness) => {
            if (witness.vote === 'creator') {
                voteCount.creator++;
            } else if (witness.vote === 'opponent') {
                voteCount.opponent++;
            }
        });

        let winner: string | null = null;

        if (voteCount.creator > voteCount.opponent) {
            winner = 'creator';
        } else if (voteCount.opponent > voteCount.creator) {
            winner = 'opponent';
        }

        await Promise.all(witnesses.map(async (witness) => {
            const correctVote = (winner === 'creator' && witness.vote === 'creator') ||
                (winner === 'opponent' && witness.vote === 'opponent');

            if (correctVote) {
                const user = await User.findById(witness.userId);
                if (user) {
                    user.reputation_score = (user.reputation_score || 0) + 10;
                    await user.save();
                }
            }
        }));

        const bet = await Bet.findById(betId);
        if (winner) {
            if (!bet) {
                throw new NotFoundException(StringConstants.BET_NOT_FOUND);
            }
            if (winner === 'creator') {
                bet.winnerId = bet.creatorId;
            } else if (winner === 'opponent') {
                bet.winnerId = bet.opponentId;
            } else {
                throw new ForbiddenException(StringConstants.INVALID_WINNER);
            }

            bet.status = 'verified';
            await bet.save();
        }

        return winner;
    }


    public async distributeWitnessCommission(betId: string, witnessCommission: number): Promise<void> {
        const witnesses = await Witness.find({ betId, status: 'accepted' });
        const bet = await Bet.findById(betId)

        if (bet.betType === 'with-witnesses') {
            if (witnesses.length === 0) {
                throw new UnprocessableEntityException(StringConstants.NO_WITNESSES_FOR_COMMISSION)
            }

            const witnessShare = witnessCommission / witnesses.length;

            for (const witness of witnesses) {
                await walletService.addToUserWallet(witness.userId, witnessShare, betId);
            }
        }
    }

    public async getBetWitnesses(betId: string) {

        try {
            const witnesses = await Witness.find({
                betId,
            }).populate('userId', 'username name') // Assuming `userId` is the correct reference field in the `Witness` schema.
                .lean();

            if (!witnesses) {
                throw new Error(StringConstants.WITNESS_NOT_FOUND)
            }

            return witnesses;
        } catch (error) {
            throw new Error(`Failed to retrieve witnesses: ${error}`)
        }

    }

}


export const witnessService = new WitnessService()
export const {
    distributeWitnessCommission,

} = new WitnessService()
