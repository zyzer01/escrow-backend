import User, { IUser } from "../../users/user.model";
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




export async function selectNeutralWitness() {
    // Select a random neutral witness from the pool of eligible users
    const eligibleUsers = await User.find({ isEligibleForNeutralWitness: true });
    if (eligibleUsers.length === 0) {
      throw new Error('No eligible neutral witnesses found.');
    }
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
    return eligibleUsers[randomIndex];
  }
