import Bet, { IBet } from './models/bet.model'


export async function createBet(betData: IBet): Promise<IBet> {
    const newBet = new Bet(betData)
    return newBet.save()
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




