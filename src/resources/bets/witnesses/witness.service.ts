import User, { IUser } from "../../users/user.model";
import { payoutFunds } from "../../wallet/wallet.service";
import Witness from './witness.model'; // Assuming the Witness model is in a file named models/Witness.ts

export async function acceptBet(witnessId: string): Promise<Response> {

    const witness = await Witness.findById(witnessId);

    if (!witness) {
        throw new Error('Witness not found')
    }

    if (witness.status !== 'pending') {
        throw new Error('Bet already accepted or recused')
    }

    witness.status = 'accepted';
    await witness.save();

    return witness
}

export async function recuseBet(witnessId: string): Promise<Response> {

    const witness = await Witness.findById(witnessId);

    if (!witness) {
        throw new Error('Witness not found')
    }

    if (witness.status !== 'pending') {
        throw new Error('Bet already accepted or recused')
    }

    witness.status = 'recused';
    await witness.save();

    return witness
}


export async function castVote(betId: string, witnessId: string, vote: string) {

    const witness = await Witness.findOne({ betId, userId: witnessId });

    if (!witness || witness.status !== 'accepted') {
        throw new Error('Witness is not eligible to vote or has already recused.')
    }

    witness.vote = vote;
    witness.status = 'accepted';
    await witness.save();

}


export async function determineWinner(betId: string): Promise<string | null> {
    const witnesses = await Witness.find({ betId, status: 'accepted' });

    if (witnesses.length < 3) {
        throw new Error('Not enough votes to determine a winner.');
    }

    const voteCount = { creator: 0, opponent: 0 };

    witnesses.forEach((witness) => {
        if (witness.vote === 'creator') {
            voteCount.creator++;
        } else if (witness.vote === 'opponent') {
            voteCount.opponent++;
        }
    });

    if (voteCount.creator > voteCount.opponent) {
        return 'creator';
    } else if (voteCount.opponent > voteCount.creator) {
        return 'opponent';
    } else {
        return null;
    }
};

export const distributeToWitnesses = async (betId: string, witnessFee: number) => {
    const witnesses = await Witness.find({ betId, status: 'accepted' });

    const individualPayout = witnessFee / witnesses.length;

    for (const witness of witnesses) {
        await payoutFunds(witness.userId, individualPayout, betId);
    }

    return;
};

export async function selectNeutralWitness() {
    const eligibleUsers = await User.find({ isEligibleForNeutralWitness: true });
    if (eligibleUsers.length === 0) {
        throw new Error('No eligible neutral witnesses found.');
    }
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
    return eligibleUsers[randomIndex];
}

