import { Request, Response } from "express";
import { acceptBet, castVote, determineWinner, distributeToWitnesses, recuseBet } from "./witness.service";

export async function witnessAcceptBetHandler(req: Request, res: Response): Promise<Response> {
    const {witnessId} = req.body

    try {
        const acceptance = await acceptBet(witnessId)
        return res.status(200).json(acceptance)
    } catch (error) {
        console.error('Error accepting bet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function witnessRecuseBetHandler(req: Request, res: Response): Promise<Response> {
    const {witnessId} = req.body

    try {
        const recusal = await recuseBet(witnessId)
        return res.status(200).json(recusal)
    } catch (error) {
        console.error('Error recusing bet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


export async function castVoteHandler(req: Request, res: Response) {
    const {betId, witnessId, vote} = req.body

    try {
        const voteCount = await castVote(betId, witnessId, vote)
        return res.status(200).json(voteCount)
    } catch (error) {
        console.error('Error casting vote:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


export async function determineWinnerHandler(req: Request, res: Response) {
    const {betId} = req.body

    try {
        const vote = await determineWinner(betId)
        return res.status(200).json(vote)
    } catch (error) {
        console.error('Error determining winner:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


export async function distributeToWitnessesHandler(req: Request, res: Response) {
    const {betId, witnessFee} = req.body
    
    try {
        const vote = await distributeToWitnesses(betId, witnessFee)
        return res.status(200).json(vote)
    } catch (error) {
        console.error('Error distributing funds to witnesses::', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
