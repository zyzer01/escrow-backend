import BetInvitation from './models/bet-invitation.model';
import Bet, { IBet } from './models/bet.model'


export async function createBet(betData: IBet): Promise<IBet> {
    try {
        const bet = new Bet(betData)
        const newBet = await bet.save()
        
        const invitation = new BetInvitation({
            betId: newBet._id,
            invitedUserId: betData.opponentId,
        });
        await invitation.save();
        
        return newBet

    } catch (error) {
      console.error("Error creating bet:", error);
      throw error;
    }
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




