import { NextFunction, Request, Response } from "express";
import { acceptWitnessInvite, castVote, determineWinner, getWitnessInvite, rejectWitnessInvite } from "./witness.service";
import { selectNeutralWitness } from "../../../lib/utils/neutralWitness";


export async function getWitnessInviteHandler(req: Request, res: Response, next: NextFunction) {
    const { witnessId } = req.params

    try {
        const witness = await getWitnessInvite(witnessId)
        return res.status(200).json(witness)
    } catch (error) {
        next(error)
    }
}

export async function witnessAcceptInviteHandler(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params

    try {
        const acceptance = await acceptWitnessInvite(id)
        return res.status(200).json(acceptance)
    } catch (error) {
        next(error)
    }
}

export async function witnessRejectInviteHandler(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params

    try {
        const rejection = await rejectWitnessInvite(id)
        return res.status(200).json(rejection)
    } catch (error) {
        next(error)
    }
}


export async function castVoteHandler(req: Request, res: Response, next: NextFunction) {
    const { betId, witnessId, vote } = req.body

    try {
        const voteCount = await castVote(betId, witnessId, vote)
        return res.status(200).json(voteCount)
    } catch (error) {
        next(error)
    }
}


export async function determineWinnerHandler(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params

    try {
        const vote = await determineWinner(id)
        return res.status(200).json(vote)
    } catch (error) {
        next(error)
    }
}

export async function assignNeutralWitnessHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const neutralWitness = await selectNeutralWitness()
        return res.status(200).json(neutralWitness)
    } catch (error) {
        console.error('Error assigning neutral witness:', error);
        next(error)
    }
}
