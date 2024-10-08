import { Types } from 'mongoose';
import BetInvitation from './models/bet-invitation.model';
import Bet, { IBet } from './models/bet.model'
import Witness from './witnesses/witness.model';
import { lockFunds, refundFunds, releaseFunds } from '../escrow/escrow.service';
import User from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { createNotification } from '../notifications/notification.service';
import { selectNeutralWitness } from '../../lib/utils/neutralWitness';

export async function createBet(betData: IBet, designatedWitnesses: Types.ObjectId[]): Promise<IBet> {
    if (!betData.creatorId || !betData.opponentId) {
        throw new MissingIdError(StringConstants.CREATOR_OPPONENT_ID_MISSING);
    }
    // Allow bets without witnesses
    if (designatedWitnesses.length > 0 && (designatedWitnesses.length < 2 || designatedWitnesses.length > 3)) {
        throw new InsufficientError(StringConstants.INSUFFICIENT_WITNESS_DESIGNATION);
    }
    if (designatedWitnesses.length > 0 && (designatedWitnesses.includes(betData.creatorId) || designatedWitnesses.includes(betData.opponentId))) {
        throw new InvalidAssignmentError(StringConstants.INVALID_WITNESS_ASSIGNMENT);
    }

    if (designatedWitnesses.length > 0) {
        const validWitnessIds = await User.find({ _id: { $in: designatedWitnesses } }).distinct('_id');
        if (validWitnessIds.length !== designatedWitnesses.length) {
            throw new NotFoundError(StringConstants.WITNESS_DOES_NOT_EXIST);
        }
    }

    let neutralWitnessId = null;

    if (designatedWitnesses.length === 2) {
        const neutralWitness = await selectNeutralWitness();
        neutralWitnessId = neutralWitness._id;
        designatedWitnesses.push(neutralWitnessId);
    }

    const bet = new Bet(betData);
    bet.witnesses = designatedWitnesses;
    await bet.save();

    if (designatedWitnesses.length > 0) {
        for (const witnessId of designatedWitnesses) {
            const witnessType = witnessId === neutralWitnessId ? 'neutral' : 'user-designated';
            const witness = new Witness({
                betId: bet._id,
                userId: witnessId,
                type: witnessType,
            });
            await witness.save();
        }
    }

    const invitation = new BetInvitation({
        betId: bet._id,
        invitedUserId: betData.opponentId,
        creatorStake: betData.creatorStake,
    });

    await invitation.save();

    return bet;
}


/**
 * Updates a bet.
 * @param betId - The ID of the bet to update.
 * @param betData - The update data of the bet.
 */

export async function updateBet(betId: string, betData: Partial<IBet>): Promise<IBet | null> {
    const bet = await Bet.findById(betId)
    console.log(bet)
    if (!bet) {
        throw new NotFoundError(StringConstants.BET_NOT_FOUND)
    }
    if (bet.status !== 'pending') {
        throw new AlreadyDoneError(StringConstants.BET_ALREADY_ACCEPTED_ENGAGED)
    }
    return Bet.findByIdAndUpdate(betId, betData)
}

/**
 * Accepts a bet invitation.
 * @param betId - The ID of the bet to accept.
 */

export async function acceptBetInvitation(invitationId: string, opponentStake: number, opponentPrediction: string): Promise<IBet | null> {

    const invitation = await BetInvitation.findById(invitationId).populate('betId');

    if(!invitation) {
        throw new NotFoundError(StringConstants.BET_INVITATION_NOT_FOUND)
    }
    if (!invitation || invitation.status !== 'pending') {
        throw new AlreadyDoneError(StringConstants.BET_ALREADY_ACCEPTED_REJECTED)
    }

    const bet = invitation.betId;
    bet.opponentStake = opponentStake;
    bet.predictions.opponentPrediction = opponentPrediction;
    bet.status = "accepted";
    await bet.save();

    invitation.status = 'accepted';
    await invitation.save();

    await lockFunds({
        betId: bet._id,
        creatorId: bet.creatorId,
        creatorStake: bet.creatorStake,
        opponentId: bet.opponentId,
        opponentStake: bet.opponentStake,
        status: 'locked'
    });

    await createNotification([bet.opponentId], "bet-invite", "Bet Invite", `Your have been invited to a bet "${bet.title}"`);

    return invitation
}

/**
 * Rejects a bet invitation.
 * @param betId - The ID of the bet to reject.
 */

export async function rejectBetInvitation(invitationId: string): Promise<IBet | null> {
    const invitation = await BetInvitation.findById(invitationId)

    if (!invitation) {
        throw new NotFoundError(StringConstants.BET_INVITATION_NOT_FOUND)
    }
    if (invitation.status !== 'pending') {
        throw new AlreadyDoneError(StringConstants.BET_ALREADY_ACCEPTED_REJECTED)
    }

    invitation.status = 'rejected';
    await invitation.save();

    return invitation
}

/**
 * Engages the bet by setting the state to active.
 * @param betId - The ID of the bet to engage.
 */

export async function engageBet(betId: string): Promise<IBet | null> {

    const bet = await Bet.findById(betId);

    if (bet.status !== 'accepted') {
        throw new InvalidStateError(StringConstants.INVALID_BET_STATE)
    }
    if (bet.betType === 'with-witnesses') {
        const pendingWitnesses = await Witness.find({ betId: bet._id, status: { $ne: 'accepted' } });

        if (pendingWitnesses.length > 0) {
            throw new PendingError(StringConstants.PENDING_WITNESS);
        }
    }

    bet.status = 'active';
    await bet.save();
    
    await createNotification(
      [bet.creatorId, bet.opponentId],
      "bet-engaged",
      "Bet activated",
      `Your bet ${bet.title} has been activated`
    );

    return bet
}

/**
 * Settles the bet by determining the winner, releasing funds from escrow, and closing the bet.
 * @param betId - The ID of the bet to settle.
 * @param winnerId - The ID of the winner to settle.
 */

export async function settleBet(betId: string, winnerId: string): Promise<IBet | null> {
    const bet = await Bet.findById(betId);

    if (!bet) {
        throw new NotFoundError(StringConstants.BET_NOT_FOUND);
    }
    if (bet.betType === 'with-witnesses' && bet.status !== 'verified') {
        throw new InvalidStateError(StringConstants.INVALID_BET_STATE);
    }
    if (bet.betType === 'without-witnesses' && bet.status !== 'active') {
        throw new InvalidStateError(StringConstants.INVALID_BET_STATE);
    }
    if (!winnerId) {
        throw new NotImplementedError(StringConstants.BET_WINNER_NOT_DETERMINED);
    }

    await releaseFunds(bet._id, winnerId);

    await User.updateOne({ _id: bet.creatorId }, { $inc: { bets_participated: 1 } });

    if (bet.opponentId) {
        await User.updateOne({ _id: bet.opponentId }, { $inc: { bets_participated: 1 } });
    }

    const witnesses = bet.witnesses;
    for (const witness of witnesses) {
        await User.updateOne({ _id: witness.userId }, { $inc: { bets_witnessed: 1 } });
    }

    bet.status = 'closed';
    bet.winnerId = winnerId;
    await bet.save();

    await createNotification(
        [winnerId],
        "bet-settled",
        StringConstants.NOTIFY_BET_WINNER_TITLE,
        "You won! Congratulations"
    );
    const loserId = bet.creatorId.toString() === winnerId.toString() ? bet.opponentId.toString() : bet.creatorId.toString();
    await createNotification(
        [loserId],
        "bet-settled",
        StringConstants.NOTIFY_BET_LOSER_TITLE,
        "You lost the bet. What is cashout?"
    );

    return bet;
}



/**
 * Cancels the a bet.
 * @param betId - The ID of the bet to cancel.
 */
export async function cancelBet(betId: string): Promise<IBet | null> {

    const bet = await Bet.findById(betId);
    
    if (!bet || bet.status !== 'accepted') {
        throw new InvalidStateError(StringConstants.INVALID_BET_STATE)
    }

    await refundFunds(betId);

    bet.status = 'canceled';
    await bet.save();

    await createNotification([bet.creatorId, bet.opponentId], "bet-cancelled", "You cancelled a bet", `Your bet "${bet.title}" has been cancelled`);

    return bet;
};


/**
 * Reverses the outcome of a bet by paying out the new winner.
 * Reuses the releaseFunds function.
 * @param betId - The ID of the bet to reverse.
 */
export async function reverseBetOutcome(betId: string): Promise<void> {
    const bet = await Bet.findById(betId);
    if (!bet) {
        throw new Error('Bet not found.');
    }

    const originalWinnerId = bet.winnerId;
    if (!originalWinnerId) {
        throw new Error('Bet does not have a winner to reverse.');
    }

    const newWinnerId = (bet.creatorId.toString() === originalWinnerId.toString())
        ? bet.opponentId
        : bet.creatorId;

    if (!newWinnerId) {
        throw new Error('No opponent available to reverse outcome.');
    }

    await releaseFunds(betId, newWinnerId);

    bet.winnerId = newWinnerId;
    await bet.save();

    console.log(`Bet outcome reversed. New winner is user: ${newWinnerId}`);
}

export async function getBets(): Promise<IBet[]> {
    return Bet.find()
}

export async function getBet(id: string): Promise<IBet | null> {
    return Bet.findById(id);
}


export async function deleteBet(id: string): Promise<IBet | null> {
    return Bet.findByIdAndDelete(id).exec();
}




