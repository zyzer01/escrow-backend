import { Request, Response } from "express";
import { acceptBet, castVote, determineWinner, recuseBet } from "./witness.service";
import { selectNeutralWitness } from "../../../utils";

export async function witnessAcceptBetHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    try {
        const acceptance = await acceptBet(id)
        return res.status(200).json(acceptance)
    } catch (error) {
        console.error('Error accepting bet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function witnessRecuseBetHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    try {
        const recusal = await recuseBet(id)
        return res.status(200).json(recusal)
    } catch (error) {
        console.error('Error recusing bet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


export async function castVoteHandler(req: Request, res: Response) {
    const { betId, witnessId, vote } = req.body

    try {
        const voteCount = await castVote(betId, witnessId, vote)
        return res.status(200).json(voteCount)
    } catch (error) {
        console.error('Error casting vote:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


export async function determineWinnerHandler(req: Request, res: Response) {
    const { id } = req.params

    try {
        const vote = await determineWinner(id)
        return res.status(200).json(vote)
    } catch (error) {
        console.error('Error determining winner:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function assignNeutralWitnessHandler(req: Request, res: Response) {
    try {
        const neutralWitness = await selectNeutralWitness()
        return res.status(200).json(neutralWitness)
    } catch (error) {
        console.error('Error assigning neutral witness:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
