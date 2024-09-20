import { Types } from 'mongoose';
import BetInvitation from './models/bet-invitation.model';
import Bet, { IBet } from './models/bet.model'
import Witness from './witnesses/witness.model';
import { determineWinner, distributeToWitnesses, selectNeutralWitness } from './witnesses/witness.service';
import { lockFunds } from '../escrow/escrow.service';
import { payoutFunds } from '../wallet/wallet.service';
import { addToSystemWallet } from '../system-wallet/system-wallet.service';


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


export async function acceptBetInvitation(invitationId: string, opponentStake: number) {

    const invitation = await BetInvitation.findById(invitationId).populate('betId');

    if (!invitation) {
        throw new Error('Invitation not found')
    }

    if (invitation.status !== 'pending') {
        throw new Error('Bet already accepted or declined')
    }

    const bet = invitation.betId;
    bet.opponentStake = opponentStake;
    bet.status = "accepted";
    await bet.save();

    invitation.status = 'accepted';
    await invitation.save();

    return bet
}

export async function rejectBetInvitation(invitationId: string) {
    const invitation = await BetInvitation.findById(invitationId)

    if (!invitation) {
        throw new Error('Invitation not found')
    }

    if (invitation.status !== 'pending') {
        throw new Error('Bet already accepted or declined')
    }

    invitation.status = 'rejected';
    await invitation.save();
}

export async function finalizeBet(betId: string) {

    const bet = await Bet.findById(betId);

    if (!bet || bet.status !== 'accepted') {
        throw new Error('Invalid bet finalization')
    }

    await lockFunds({
        betId: bet._id,
        creatorId: bet.creatorId,
        creatorStake: bet.creatorStake,
        opponentId: bet.opponentId,
        opponentStake: bet.opponentStake,
        status: 'locked'
    });

    bet.status = 'active'
    await bet.save()
}

export async function settleBet(betId: string) {

    const bet = await Bet.findById(betId);
    if (!bet || bet.status !== 'verified') {
        throw new Error('Bet is not in a valid state to be settled.')
    }

    const winner = await determineWinner(betId);
    if (!winner) {
        throw new Error('Unable to determine a winner.')
    }

    const winnerId = winner === 'creator' ? bet.creatorId : bet.opponentId;

    const totalStake = (bet.creatorStake || 0) + (bet.opponentStake || 0);

    // Deduct 10% for the system
    const systemFee = totalStake * 0.10;
    await addToSystemWallet(systemFee);

    const payoutAmount = totalStake - systemFee;
    
    // Payout 5% to witnesses
    const witnessFee = totalStake * 0.05;
    await distributeToWitnesses(betId, witnessFee);
    
    await payoutFunds(winnerId.toString(), payoutAmount - witnessFee, betId.toString())

    bet.status = 'closed';
    bet.winnerId = winnerId;
    await bet.save();
};



export async function getBets(): Promise<IBet[]> {
    return Bet.find()
}

export async function getBet(id: string): Promise<IBet | null> {
    return Bet.findById(id);
}

export async function updateBet(id: string, betData: Partial<IBet>): Promise<IBet | null> {
    return Bet.findByIdAndUpdate(id, betData)
}

export async function deleteBet(id: string): Promise<IBet | null> {
    return Bet.findByIdAndDelete(id).exec();
}




