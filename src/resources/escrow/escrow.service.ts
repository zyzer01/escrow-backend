import Escrow, { IEscrow } from './escrow.model';


export async function lockFunds (lockFundsData: Partial<IEscrow>) {
    const escrow = new Escrow(lockFundsData)
    return await escrow.save()
}
