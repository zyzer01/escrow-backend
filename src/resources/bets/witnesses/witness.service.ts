import User from "../../users/user.model";
import { addToUserWallet, payoutFunds } from "../../wallet/wallet.service";
import Bet from "../models/bet.model";
import Witness from './witness.model'; // Assuming the Witness model is in a file named models/Witness.ts

/**
 * Accepts witness role for bet
 */

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

/**
 * Steps user down as a witness
 */

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

/**
 * Casts vote for betters
 */

export async function castVote(betId: string, witnessId: string, vote: string) {

    const witness = await Witness.findOne({ betId, userId: witnessId });

    if (!witness || witness.status !== 'accepted') {
        throw new Error('Witness is not eligible to vote or has already been recused.')
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

    let winner: string | null = null;

    if (voteCount.creator > voteCount.opponent) {
        winner = 'creator';
    } else if (voteCount.opponent > voteCount.creator) {
        winner = 'opponent';
    }

    if (winner) {
        const bet = await Bet.findById(betId);
        if (!bet) {
            throw new Error('Bet not found.');
        }

        if (winner === 'creator') {
            bet.winnerId = bet.creatorId;
        } else if (winner === 'opponent') {
            bet.winnerId = bet.opponentId;
        }

        bet.status = 'verified';
        await bet.save();
    }

    return winner;
}
