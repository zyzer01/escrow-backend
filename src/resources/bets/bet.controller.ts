import { Request, Response } from "express";
import { acceptBetInvitation, cancelBet, createBet, deleteBet, engageBet, getBet, getBets, rejectBetInvitation, settleBet, updateBet } from "./bet.service"
import { StringConstants } from '../../common/strings';


export async function createBetHandler(req: Request, res: Response) {
    const { designatedWitnesses, ...betData } = req.body;
    try {
        const bet = await createBet(betData, designatedWitnesses);
        res.status(201).json(bet);
    } catch (error: any) {
        console.error(error)
        switch (error.message) {
          case StringConstants.WITNESS_DOES_NOT_EXIST:
            return res
              .status(404)
              .json({ error: StringConstants.WITNESS_DOES_NOT_EXIST });
          case StringConstants.CREATOR_OPPONENT_ID_MISSING:
            return res
              .status(404)
              .json({ error: StringConstants.CREATOR_OPPONENT_ID_MISSING });
          case StringConstants.WITNESS_DESIGNATION_COUNT:
            return res
              .status(403)
              .json({ error: StringConstants.WITNESS_DESIGNATION_COUNT });
          case StringConstants.INVALID_WITNESS_ASSIGNMENT:
            return res
              .status(403)
              .json({ error: StringConstants.INVALID_WITNESS_ASSIGNMENT });
          case StringConstants.NO_NEUTRAL_WITNESS_FOUND:
            return res
              .status(404)
              .json({ error: StringConstants.NO_NEUTRAL_WITNESS_FOUND });
          default:
            return res
              .status(500)
              .json({ error: StringConstants.FAILED_BET_CREATION });
        }
    }
}
export async function getBetsHandler(req: Request, res: Response) {
    try {
        const bets = await getBets()
        res.status(200).json(bets)
    } catch (error) {
        res.status(500).json({ error: StringConstants.FAILED_BET_FETCH })
    }
}

export async function getBetHandler(req: Request, res: Response) {
    const { id } = req.params
    try {
        const bet = await getBet(id)
        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND })
        }
        res.status(200).json(bet)
    } catch (error) {
        res.status(500).json({ error: StringConstants.FAILED_BET_FETCH })
    }
}


export async function updateBetHandler(req: Request, res: Response) {
    const userData = req.body
    const { id } = req.params
    try {
        const bet = await updateBet(id, userData);

        res.status(200).json(bet)
    } catch (error: any) {
        console.error(error)
        switch (error.message) {
            case StringConstants.BET_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
            case StringConstants.BET_ALREADY_ACCEPTED_ENGAGED:
                return res.status(403).json({ error: StringConstants.BET_ALREADY_ACCEPTED_ENGAGED });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_BET_UPDATE });
        }
    }
}

export async function deleteBetHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    try {
        const bet = await deleteBet(id);

        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting bet:', error);
        return res.status(500).json({ error: StringConstants.FAILED_BET_DELETE });
    }
}


export async function acceptBetHandler(req: Request, res: Response): Promise<Response> {
    const { invitationId, opponentStake, opponentPrediction } = req.body
    try {
        const invitation = await acceptBetInvitation(invitationId, opponentStake, opponentPrediction)

        return res.status(200).json(invitation)
    } catch (error: any) {
        console.error(error)
        switch (error.message) {
            case StringConstants.BET_INVITATION_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.BET_INVITATION_NOT_FOUND });
            case StringConstants.BET_ALREADY_ACCEPTED_REJECTED:
                return res.status(403).json({ error: StringConstants.BET_ALREADY_ACCEPTED_REJECTED });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_BET_ACCEPTANCE });
        }
    }
}

export async function rejectBetHandler(req: Request, res: Response): Promise<Response> {
    const { invitationId } = req.body
    try {
        const invitation = await rejectBetInvitation(invitationId)
        return res.status(200).json(invitation)
    } catch (error: any) {
        console.error(error)
        switch (error.message) {
            case StringConstants.BET_INVITATION_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.BET_INVITATION_NOT_FOUND });
            case StringConstants.BET_ALREADY_ACCEPTED_REJECTED:
                return res.status(403).json({ error: StringConstants.BET_ALREADY_ACCEPTED_REJECTED });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_BET_REJECTION });
        }
    }
}



export async function engageBetHandler(req: Request, res: Response): Promise<Response> {
    const { betId } = req.params;
    try {
        const bet = await engageBet(betId);

        return res.status(200).json(bet);
    } catch (error: any) {
        console.error(error)
        switch (error.message) {
            case StringConstants.BET_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
            case StringConstants.INVALID_BET_STATE:
                return res.status(403).json({ error: StringConstants.INVALID_BET_STATE });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_BET_ENGAGEMENT });
        }
    }
}

export async function settleBetHandler(req: Request, res: Response): Promise<Response> {
    const { id, winnerId } = req.body;
    try {
        const bet = await settleBet(id, winnerId);

        return res.status(200).json(bet);
    } catch (error: any) {
        console.error(error)
        switch (error.message) {
            case StringConstants.BET_NOT_FOUND:
                return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
            case StringConstants.INVALID_BET_STATE:
                return res.status(403).json({ error: StringConstants.INVALID_BET_STATE });
            case StringConstants.BET_WINNER_NOT_DETERMINED:
                return res.status(403).json({ error: StringConstants.BET_WINNER_NOT_DETERMINED });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_BET_SETTLEMENT });
        }
    }
}


export async function cancelBetHandler(req: Request, res: Response) {
    const { id } = req.params;

    try {
        const bet = await cancelBet(id)
        res.status(200).json(bet);
    } catch (error: any) {
        console.error(error)
        if (error.message === StringConstants.INVALID_BET_STATE) {
            return res
                .status(403)
                .json({ error: StringConstants.INVALID_BET_STATE });
        }
        res.status(500).json({ error: StringConstants.FAILED_BET_CANCELATION });
    }
};
