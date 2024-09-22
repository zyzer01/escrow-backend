import { Request, Response } from "express";
import BetDispute, { IBetDispute } from "./bet-dispute.model";
import { getAllDisputes, logDispute, resolveDispute } from "./bet-dispute.service";
import { StringConstants } from "../../common/strings";


export async function logDisputeHandler(req: Request, res: Response) {
    const { betId, userId, reason } = req.body;

    try {
        const dispute = await logDispute(betId, userId, reason);
        return res.status(200).json(dispute);
    } catch (error: any) {
        switch (error.message) {
            case StringConstants.BET_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
            case StringConstants.USER_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.USER_NOT_FOUND });
            case StringConstants.DISPUTE_ALREADY_OPEN:
                return res.status(403).json({ error: StringConstants.DISPUTE_ALREADY_OPEN });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_DISPUTE_CREATION });
        }
    }
}

export async function resolveDisputeHandler(req: Request, res: Response) {
    const { disputeId, resolution, action } = req.body;

    try {
        const dispute = await resolveDispute(disputeId, resolution, action);
        return res.status(200).json(dispute);
    } catch (error: any) {
        console.error(error)
        switch (error.message) {
          case StringConstants.DISPUTE_NOT_FOUND:
            return res
              .status(404)
              .json({ error: StringConstants.DISPUTE_NOT_FOUND });
          case StringConstants.BET_NOT_FOUND:
            return res
              .status(404)
              .json({ error: StringConstants.BET_NOT_FOUND });
          case StringConstants.INVALID_BET_STATE:
            return res
              .status(403)
              .json({ error: StringConstants.INVALID_BET_STATE });
          default:
            return res
              .status(500)
              .json({ error: StringConstants.FAILED_DISPUTE_RESOLUTION });
        }
    }
}

export async function getAllDisputesHandler(req: Request, res: Response) {

    try {
        const disputes = await getAllDisputes();
        if(!disputes) {
            return res.status(404).json({ error: StringConstants.DISPUTE_NOT_FOUND });
        }
        return res.status(200).json(disputes);
    } catch (error: any) {
        res.status(500).json({error: StringConstants.FAILED_DISPUTE_FETCH})
    }
}
