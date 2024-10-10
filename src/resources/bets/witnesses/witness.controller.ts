import { Request, Response } from "express";
import { acceptWitnessInvite, castVote, determineWinner, rejectWitnessInvite } from "./witness.service";
import { selectNeutralWitness } from "../../../lib/utils/auth";
import { StringConstants } from "../../../common/strings";

export async function witnessAcceptInviteHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    try {
        const acceptance = await acceptWitnessInvite(id)
        return res.status(200).json(acceptance)
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            return res
                .status(404)
                .json({ error: StringConstants.WITNESS_NOT_FOUND });
        }
        if (error instanceof AlreadyDoneError) {
            return res.status(409).json({ error: StringConstants.BET_ALREADY_ACCEPTED_REJECTED });
        }
        if (error instanceof InvalidStateError) {
            return res
                .status(403)
                .json({ error: StringConstants.OPPONENT_YET_TO_ACCEPT });
        }
        return res.status(500).json({ error: StringConstants.FAILED_WITNESS_ACCEPTANCE });
    }
}

export async function witnessRejectInviteHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    try {
        const recusal = await rejectWitnessInvite(id)
        return res.status(200).json(recusal)
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            return res
                .status(404)
                .json({ error: StringConstants.WITNESS_NOT_FOUND });
        }
        if (error instanceof AlreadyDoneError) {
            return res.status(409).json({ error: StringConstants.BET_ALREADY_ACCEPTED_REJECTED });
        }
        return res
            .status(500)
            .json({ error: StringConstants.FAILED_WITNESS_REJECTION });
    }
}


export async function castVoteHandler(req: Request, res: Response) {
    const { betId, witnessId, vote } = req.body

    try {
        const voteCount = await castVote(betId, witnessId, vote)
        return res.status(200).json(voteCount)
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            return res
                .status(404)
                .json({ error: StringConstants.WITNESS_NOT_FOUND });
        }
        if (error instanceof InvalidStateError) {
            return res.status(409).json({ error: StringConstants.WITNESS_INVITE_REJECTED });
        }
        return res
            .status(500)
            .json({ error: StringConstants.FAILED_VOTE_CAST });
    }
}


export async function determineWinnerHandler(req: Request, res: Response) {
    const { id } = req.params

    try {
        const vote = await determineWinner(id)
        return res.status(200).json(vote)
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            return res
                .status(404)
                .json({ error: StringConstants.BET_NOT_FOUND });
        }
        if (error instanceof InsufficientVotesError) {
            return res
                .status(409)
                .json({ error: StringConstants.INSUFFICIENT_VOTES });
        }
        if (error instanceof InvalidStateError) {
            return res.status(403).json({ error: StringConstants.INVALID_WINNER });
        }
        return res
            .status(500)
            .json({ error: StringConstants.FAILED_TO_DETERMINE_WINNER });
    }
}

export async function assignNeutralWitnessHandler(req: Request, res: Response) {
    try {
        const neutralWitness = await selectNeutralWitness()
        return res.status(200).json(neutralWitness)
    } catch (error) {
        console.error('Error assigning neutral witness:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
