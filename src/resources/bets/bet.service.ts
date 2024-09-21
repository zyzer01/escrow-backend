import { Types } from 'mongoose';
import BetInvitation from './models/bet-invitation.model';
import Bet, { IBet } from './models/bet.model'
import Witness from './witnesses/witness.model';
import { lockFunds, refundFunds, releaseFunds } from '../escrow/escrow.service';
import { selectNeutralWitness } from '../../utils';
import User from '../users/user.model';

export async function createBet(betData: IBet, designatedWitnesses: Types.ObjectId[]): Promise<IBet> {
    if (designatedWitnesses.length < 2 || designatedWitnesses.length > 3) {
        throw new Error('You must designate between 2 and 3 witnesses.');
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

    const bet = invitation.betId;
    bet.opponentStake = opponentStake;
    bet.predictions.opponentPrediction = opponentPrediction;
    bet.status = "accepted";
    await bet.save();

    invitation.status = 'accepted';
    await invitation.save();

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
    const pendingWitnesses = await Witness.find({ betId: bet._id, status: { $ne: 'accepted' } });

    if (pendingWitnesses.length > 0) {
        throw new Error('Bet cannot be engaged. Some witnesses have not accepted the bet.');
    }

    await lockFunds({
        betId: bet._id,
        creatorId: bet.creatorId,
        creatorStake: bet.creatorStake,
        opponentId: bet.opponentId,
        opponentStake: bet.opponentStake,
        status: 'locked'
    });

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
    await bet.save();

    return bet;
}



export async function cancelBet(betId: string): Promise<IBet | null> {

    const bet = await Bet.findById(betId);

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




