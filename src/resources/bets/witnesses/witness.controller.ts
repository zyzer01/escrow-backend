import { witnessService } from './witness.service';
import { NextFunction, Request, Response } from "express";
import { selectNeutralWitness } from "../../../lib/utils/neutralWitness";


export class WitnessController {

    public async getWitnessInvite(req: Request, res: Response, next: NextFunction) {
        const { invitationId } = req.params

        try {
            const witness = await witnessService.getWitnessInvite(invitationId)
            return res.status(200).json(witness)
        } catch (error) {
            next(error)
        }
    }

    public async witnessAcceptInvite(req: Request, res: Response, next: NextFunction) {
        const { witnessId } = req.params

        try {
            const acceptance = await witnessService.acceptWitnessInvite(witnessId)
            return res.status(200).json(acceptance)
        } catch (error) {
            next(error)
        }
    }

    public async witnessRejectInvite(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params

        try {
            const rejection = await witnessService.rejectWitnessInvite(id)
            return res.status(200).json(rejection)
        } catch (error) {
            next(error)
        }
    }


    public async castVote(req: Request, res: Response, next: NextFunction) {
        const { betId, witnessId, vote } = req.body

        try {
            const voteCount = await witnessService.castVote(betId, witnessId, vote)
            return res.status(200).json(voteCount)
        } catch (error) {
            next(error)
        }
    }


    public async determineWinner(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params

        try {
            const vote = await witnessService.determineWinner(id)
            return res.status(200).json(vote)
        } catch (error) {
            next(error)
        }
    }

    public async assignNeutralWitness(req: Request, res: Response, next: NextFunction) {
        try {
            const neutralWitness = await selectNeutralWitness()
            return res.status(200).json(neutralWitness)
        } catch (error) {
            console.error('Error assigning neutral witness:', error);
            next(error)
        }
    }

    public async getBetWitnesses(req: Request, res: Response, next: NextFunction) {
        const userId = req.user?.data.user.id;
        const { betId } = req.params;

        try {
            const witnesses = await witnessService.getBetWitnesses(betId);
            console.log(witnesses);
            res.status(200).json(witnesses);
        } catch (error) {
            next(error)
        }
    }

}


export const witnessController = new WitnessController()
