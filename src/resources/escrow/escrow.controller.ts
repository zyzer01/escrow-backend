import { escrowService } from './escrow.service';
import { NextFunction, Request, Response } from "express";


export class EscrowController {

  public async getEscrow(req: Request, res: Response, next: NextFunction) {
    const { betId } = req.params

    try {
      const witness = await escrowService.getEscrow(betId)
      return res.status(200).json(witness)
    } catch (error) {
      next(error)
    }
  }


  public async lockFunds(req: Request, res: Response, next: NextFunction) {
    const lockFundsData = req.body;
    try {
      await escrowService.lockFunds(lockFundsData)
      res.status(200).json('Funds Locked in escrow')
    } catch (error) {
      next(error)
    }
  }

  public async releaseFunds(req: Request, res: Response, next: NextFunction) {
    const { betId, winnerId } = req.body;

    try {
      const escrow = await escrowService.releaseFunds(betId, winnerId);
      res.status(200).json(escrow);
    } catch (error) {
      next(error)
    }
  };

  public async getTotalStakes(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params

    try {
      const escrow = await escrowService.getTotalStakes(id);
      return res.status(200).json(escrow)
    } catch (error) {
      next(error)
    }
  };


}

export const escrowController = new EscrowController()
