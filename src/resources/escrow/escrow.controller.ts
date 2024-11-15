import { NextFunction, Request, Response } from "express";
import { getEscrow, getTotalStakes, lockFunds, releaseFunds } from "./escrow.service"

export async function getEscrowHandler(req: Request, res: Response, next: NextFunction) {
  const { betId } = req.params

  try {
    const witness = await getEscrow(betId)
    return res.status(200).json(witness)
  } catch (error) {
    next(error)
  }
}


export async function lockFundsHandler(req: Request, res: Response, next: NextFunction) {
  const lockFundsData = req.body;
  try {
    await lockFunds(lockFundsData)
    res.status(200).json('Funds Locked in escrow')
  } catch (error) {
    next(error)
  }
}

export async function releaseFundsHandler(req: Request, res: Response, next: NextFunction) {
  const { betId, winnerId } = req.body;

  try {
    const escrow = await releaseFunds(betId, winnerId);
    res.status(200).json(escrow);
  } catch (error) {
    next(error)
  }
};

export async function getTotalStakesHandler(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params

  try {
    const escrow = await getTotalStakes(id);
    return res.status(200).json(escrow)
  } catch (error) {
    next(error)
  }
};
