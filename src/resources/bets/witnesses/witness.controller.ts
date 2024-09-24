import { Request, Response } from "express";
import { acceptWitnessInvite, castVote, determineWinner, rejectWitnessInvite } from "./witness.service";
import { selectNeutralWitness } from "../../../utils";
import { StringConstants } from "../../../common/strings";

export async function witnessAcceptInviteHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    try {
        const acceptance = await acceptWitnessInvite(id)
        return res.status(200).json(acceptance)
    } catch (error: any) {
        switch (error.message) {
            case StringConstants.WITNESS_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.WITNESS_NOT_FOUND });
            case StringConstants.BET_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
            case StringConstants.BET_ALREADY_ACCEPTED_REJECTED:
                return res.status(403).json({ error: StringConstants.BET_ALREADY_ACCEPTED_REJECTED });
            case StringConstants.OPPONENT_YET_TO_ACCEPT:
                return res
                  .status(403)
                  .json({ error: StringConstants.OPPONENT_YET_TO_ACCEPT });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_WITNESS_ACCEPTANCE });
        }
    }
}

export async function witnessRejectInviteHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params

    try {
        const recusal = await rejectWitnessInvite(id)
        return res.status(200).json(recusal)
    } catch (error: any) {
        switch (error.message) {
          case StringConstants.WITNESS_NOT_FOUND:
            return res
              .status(404)
              .json({ error: StringConstants.WITNESS_NOT_FOUND });
          case StringConstants.BET_ALREADY_ACCEPTED_REJECTED:
            return res
              .status(403)
              .json({ error: StringConstants.BET_ALREADY_ACCEPTED_REJECTED });
          default:
            return res
              .status(500)
              .json({ error: StringConstants.FAILED_WITNESS_REJECTION });
        }
    }
}


export async function castVoteHandler(req: Request, res: Response) {
    const { betId, witnessId, vote } = req.body

    try {
        const voteCount = await castVote(betId, witnessId, vote)
        return res.status(200).json(voteCount)
    } catch (error: any) {
        console.error('Error casting vote:', error);
        switch (error.message) {
            case StringConstants.WITNESS_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.WITNESS_NOT_FOUND });
            case StringConstants.WITNESS_INVITE_REJECTED:
                return res.status(403).json({ error: StringConstants.WITNESS_INVITE_REJECTED });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_VOTE_CAST });
        }
    }
}


export async function determineWinnerHandler(req: Request, res: Response) {
    const { id } = req.params

    try {
        const vote = await determineWinner(id)
        return res.status(200).json(vote)
    } catch (error: any) {
        switch (error.message) {
            case StringConstants.BET_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
            case StringConstants.INSUFFICIENT_VOTES:
                return res.status(403).json({ error: StringConstants.INSUFFICIENT_VOTES });
                case StringConstants.INVALID_WINNER:
                    return res
                      .status(403)
                      .json({ error: StringConstants.INVALID_WINNER });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_TO_DETERMINE_WINNER });
        }
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
