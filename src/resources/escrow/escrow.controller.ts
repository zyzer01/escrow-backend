import { Request, Response } from "express";
import { lockFunds, refundFunds, releaseFunds } from "./escrow.service"
import Bet from "../bets/models/bet.model";

export async function lockFundsHandler(req: Request, res: Response) {
    const lockFundsData = req.body;
    try {
        await lockFunds(lockFundsData)
        res.status(200).json('Funds Locked in escrow')
    } catch (error) {
        res.status(500).json({ error: 'Failed to lock funds' })
    }
}

export const releaseFundsHandler = async (req: Request, res: Response) => {
    const { betId, winnerId } = req.body;
  
    try {
      const bet = await Bet.findById(betId);
  
      if (!bet || bet.status !== 'verified') {
        return res.status(400).json({ message: 'Bet cannot be released' });
      }
  
      await releaseFunds(betId, winnerId);
  
      bet.status = 'closed';
      await bet.save();
  
      res.status(200).json({ message: 'Bet closed and funds released' });
    } catch (error) {
      res.status(500).json({ message: 'Error releasing funds', error });
    }
  };




export const cancelBet = async (req: Request, res: Response) => {
    const { betId } = req.body;
  
    try {
      const bet = await Bet.findById(betId);
  
      if (!bet || bet.status !== 'PENDING') {
        return res.status(400).json({ message: 'Bet cannot be canceled' });
      }
  
      await refundFunds(betId);
  
      bet.status = 'canceled';
      await bet.save();
  
      res.status(200).json({ message: 'Bet canceled and funds refunded' });
    } catch (error) {
      res.status(500).json({ message: 'Error canceling bet', error });
    }
  };
