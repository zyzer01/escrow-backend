import { Types } from 'mongoose';
import BetInvitation from './models/bet-invitation.model';
import Bet, { IBet } from './models/bet.model'
import Witness from './witnesses/witness.model';
import { selectNeutralWitness } from './witnesses/witness.service';


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
  
    // Assuming you want to save the invitation as well
    await invitation.save();
  
    return bet;
  }
  

export async function acceptBetInvitation(invitationId: string, opponentStake: number) {

    const invitation = await BetInvitation.findById(invitationId).populate('betId');

    if(!invitation) {
        throw new Error('Invitation not found')
    }

    if (invitation.status !== 'pending') {
        throw new Error('Bet already accepted or declined')
    }

    const bet = invitation.betId;
        bet.opponentStake = opponentStake;
        bet.status = "active";
        await bet.save();

        invitation.status = 'accepted';
        await invitation.save();
    
    return bet   
}

export async function rejectBetInvitation(invitationId: string) {
    const invitation = await BetInvitation.findById(invitationId)

    if(!invitation) {
        throw new Error('Invitation not found')
    }

    if (invitation.status !== 'pending') {
        throw new Error('Bet already accepted or declined')
    }

    invitation.status = 'rejected';
        await invitation.save();

}


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




