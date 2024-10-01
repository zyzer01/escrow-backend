import { Request, Response } from "express";
import { getTotalStakes, lockFunds, refundFunds, releaseFunds } from "./escrow.service"
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
    res.status(200).json(escrow);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
    }
    if (error instanceof InvalidStateError) {
      return res.status(403).json({ error: StringConstants.INVALID_BET_STATE });
    }
    return res
      .status(500)
      .json({ error: StringConstants.FAILED_FUNDS_RELEASE });
  }
};


export async function getTotalStakesHandler(req: Request, res: Response) {
  const { id } = req.params

  try {
    const escrow = await getTotalStakes(id);
    return res.status(200).json(escrow)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: StringConstants.ESCROW_NOT_FOUND })
    }
    res.status(500).json({ error: StringConstants.FAILED_STAKES_FETCH })
  }
};
