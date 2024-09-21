import { Request, Response } from "express";
import { getTotalStakes, lockFunds, refundFunds, releaseFunds } from "./escrow.service"
import Bet from "../bets/models/bet.model";
import { StringConstants } from "../../common/strings";

export async function lockFundsHandler(req: Request, res: Response) {
    const lockFundsData = req.body;
    try {
        await lockFunds(lockFundsData)
        res.status(200).json('Funds Locked in escrow')
    } catch (error) {
        res.status(500).json({ error: 'Failed to lock funds' })
    }
}

  export async function releaseFundsHandler(req: Request, res: Response) {
    const { betId, winnerId } = req.body;
  
    try {
        const escrow = await releaseFunds(betId, winnerId);

        if (!escrow) {
            throw new Error(StringConstants.ESCROW_NOT_FOUND);
        }

      res.status(200).json({ message: 'Bet closed and funds released' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error releasing funds', error });
    }
  };


  export async function getTotalStakesHandler(req: Request, res: Response) {
    const { betId } = req.body;
  
    try {
        const escrow = await getTotalStakes(betId);
        if (!escrow) {
            return res.status(404).json({ error: StringConstants.ESCROW_NOT_FOUND })
        }
        return res.status(200).json(escrow)
    } catch (error: any) {
        res.status(500).json({ error: StringConstants.FAILED_STAKES_FETCH })
    }
  };
