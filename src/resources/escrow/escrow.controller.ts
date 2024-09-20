import { Request, Response } from "express";
import { lockFunds } from "./escrow.service"

export async function lockFundsHandler(req: Request, res: Response) {
    const lockFundsData = req.body;
    try {
        const lock = await lockFunds(lockFundsData)
        res.status(200).json(lock)
    } catch (error) {
        res.status(500).json({error: 'Failed to lock funds'})
    }
}
