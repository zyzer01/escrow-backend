import { betDisputeService } from './bet-dispute.service';
import { NextFunction, Request, Response } from "express";
import { StringConstants } from "../../common/strings";


export class BetDisputeController {

    public async logDispute(req: Request, res: Response, next: NextFunction) {
        const { betId, userId, reason } = req.body;

        try {
            const dispute = await betDisputeService.logDispute(betId, userId, reason);
            return res.status(200).json(dispute);
        } catch (error) {
            next(error)
        }
    }

    public async resolveDispute(req: Request, res: Response, next: NextFunction) {
        const { disputeId, resolution, action } = req.body;

        try {
            const dispute = await betDisputeService.resolveDispute(disputeId, resolution, action);
            return res.status(200).json(dispute);
        } catch (error) {
            console.error(error)
            next(error)
        }
    }

    public async getAllDisputes(req: Request, res: Response, next: NextFunction) {

        try {
            const disputes = await betDisputeService.getAllDisputes();
            if (!disputes) {
                return res.status(404).json({ error: StringConstants.DISPUTE_NOT_FOUND });
            }
            return res.status(200).json(disputes);
        } catch (error) {
            next(error)
        }
    }

    public async getDisputes(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const disputes = await betDisputeService.getDisputes(userId)
            if (!disputes) {
                return res.status(404).json({ error: StringConstants.DISPUTE_NOT_FOUND });
            }
            return res.status(200).json(disputes);
        } catch (error) {
            next(new Error(StringConstants.FAILED_DISPUTE_FETCH))
        }
    }

    public async getDispute(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const disputes = await betDisputeService.getDispute(userId)
            if (!disputes) {
                return res.status(404).json({ error: StringConstants.DISPUTE_NOT_FOUND });
            }
            return res.status(200).json(disputes);
        } catch (error) {
            next(error)
        }
    }

}

export const betDisputeController = new BetDisputeController();
