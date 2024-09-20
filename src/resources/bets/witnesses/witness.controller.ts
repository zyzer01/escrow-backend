import { Request, Response } from "express";
import { acceptBet, recuseBet } from "./witness.service";

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

