import { Types } from 'mongoose';
import BetInvitation from './models/bet-invitation.model';
import Bet, { IBet } from './models/bet.model'
import Witness from './witnesses/witness.model';
import { lockFunds, refundFunds, releaseFunds } from '../escrow/escrow.service';
import { selectNeutralWitness } from '../../utils';
import User from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { createNotification } from '../notifications/notification.service';

export async function createBet(betData: IBet, designatedWitnesses: Types.ObjectId[]): Promise<IBet> {
    if (designatedWitnesses.length < 2 || designatedWitnesses.length > 3) {
        throw new Error('You must designate between 2 and 3 witnesses.');
    }

    // Validate witness IDs
    const validWitnessIds = await User.find({ _id: { $in: designatedWitnesses } }).distinct('_id');
    if (validWitnessIds.length !== designatedWitnesses.length) {
        throw new Error(StringConstants.WITNESS_DOES_NOT_EXIST);
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

    for (const witnessId of designatedWitnesses) {
        const witnessType = witnessId === neutralWitnessId ? 'neutral' : 'user-designated';
        const witness = new Witness({
            betId: bet._id,
            userId: witnessId,
            type: witnessType,
        });
        await witness.save();
    }

    const invitation = new BetInvitation({
        betId: bet._id,
        invitedUserId: betData.opponentId,
        creatorStake: betData.creatorStake,
    });

    await invitation.save();

    return bet;
}

export async function updateBet(id: string, betData: Partial<IBet>): Promise<IBet | null> {
    const bet = await Bet.findOne({ _id: Object(id) })

    return Bet.findByIdAndUpdate(bet._id, betData)
}

export async function acceptBetInvitation(invitationId: string, opponentStake: number, opponentPrediction: string): Promise<IBet | null> {

    const invitation = await BetInvitation.findById(invitationId).populate('betId');

    if(!invitation) {
        throw new Error(StringConstants.BET_INVITATION_NOT_FOUND)
    }

    if (!invitation || invitation.status !== 'pending') {
        throw new Error(StringConstants.BET_ALREADY_ACCEPTED_DECLINED)
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

    return invitation
}

export async function rejectBetInvitation(invitationId: string): Promise<IBet | null> {
    const invitation = await BetInvitation.findById(invitationId)

    invitation.status = 'rejected';
    await invitation.save();

    return invitation
}

export async function engageBet(betId: string): Promise<IBet | null> {

    const bet = await Bet.findById(betId);

    if (bet.status !== 'accepted') {
        throw new Error(StringConstants.INVALID_BET_STATE)
    }

    const pendingWitnesses = await Witness.find({ betId: bet._id, status: { $ne: 'accepted' } });

    if (pendingWitnesses.length > 0) {
        throw new Error('Pending witnesses');
    }

    bet.status = 'active';
    await bet.save();

    return bet
}

/**
 * Settles the bet by determining the winner, releasing funds from escrow, and closing the bet.
 * @param betId - The ID of the bet to settle.
 */

export async function settleBet(betId: string): Promise<IBet | null> {
    const bet = await Bet.findById(betId);
    const winnerId = bet.winnerId.toString();

    if (!bet || bet.status !== 'verified') {
        throw new Error(StringConstants.INVALID_BET_STATE)
    }

    if (!bet.winnerId) {
        throw new Error(StringConstants.BET_WINNER_NOT_DETERMINED)
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

    await createNotification(
      winnerId,
      "bet-settled",
      StringConstants.NOTIFY_BET_WINNER_TITLE,
      "You won! Congratulations"
    );
    const loserId = bet.creatorId.toString() === winnerId ? bet.opponentId.toString() : bet.creatorId.toString();
    await createNotification(
        loserId,
        "bet-settled",
        StringConstants.NOTIFY_BET_LOSER_TITLE,
        "You lost the bet. What is cashout?"
    );

    bet.status = 'closed';
    await bet.save();

    return bet;
}



export async function cancelBet(betId: string): Promise<IBet | null> {

    const bet = await Bet.findById(betId);
    if (!bet || bet.status !== 'accepted') {
        throw new Error(StringConstants.INVALID_BET_STATE)
    }

    await refundFunds(betId);

    bet.status = 'canceled';
    await bet.save();

    return bet;
};

export async function getBets(): Promise<IBet[]> {
    return Bet.find()
}

export async function getBet(id: string): Promise<IBet | null> {
    return Bet.findById(id);
}


export async function deleteBet(id: string): Promise<IBet | null> {
    return Bet.findByIdAndDelete(id).exec();
}




