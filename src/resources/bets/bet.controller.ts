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
                return res.status(400).json({ error: StringConstants.WITNESS_DOES_NOT_EXIST });
            case StringConstants.NO_NEUTRAL_WITNESS_FOUND:
                return res.status(400).json({ error: StringConstants.NO_NEUTRAL_WITNESS_FOUND });
            default:
                return res.status(500).json({ error: StringConstants.FAILED_BET_CREATION });
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
        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
        }
        if (bet.status !== 'pending') {
            return res.status(403).json({ error: StringConstants.BET_ALREADY_ACCEPTED_ENGAGED })
        }
        res.status(200).json(bet)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: StringConstants.FAILED_BET_UPDATE })
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
        if (error.message === StringConstants.BET_ALREADY_ACCEPTED_DECLINED) {
            return res.status(401).json({ error: StringConstants.BET_ALREADY_ACCEPTED_DECLINED })
        } 
        else if (error.message === StringConstants.BET_INVITATION_NOT_FOUND) {
            return res.status(404).json({ error: StringConstants.BET_INVITATION_NOT_FOUND });
        }
        return res.status(500).json({ error: StringConstants.FAILED_BET_ACCEPTANCE });
    }
}

export async function rejectBetHandler(req: Request, res: Response): Promise<Response> {
    const { invitationId } = req.body
    try {
        const invitation = await rejectBetInvitation(invitationId)
        if (!invitation) {
            return res.status(404).json({ error: StringConstants.BET_INVITATION_NOT_FOUND });
        }
        if (invitation.status !== 'pending') {
            return res.status(403).json({ error: StringConstants.BET_ALREADY_ACCEPTED_DECLINED });
        }
        return res.status(200).json(invitation)
    } catch (error) {
        return res.status(500).json({ error: StringConstants.FAILED_BET_REJECTION });
    }
}


export async function engageBetHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params
    try {
        const bet = await engageBet(id)

        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
        }

        return res.status(200).json(bet)
    } catch (error: any) {
        if (error.message === StringConstants.INVALID_BET_STATE) {
            return res.status(403).json({ error: StringConstants.INVALID_BET_STATE });
        }
        else if (error.message === 'Pending witnesses') {
            return res.status(400).json({ error: StringConstants.PENDING_WITNESS });
        }
        else {
            return res.status(500).json({ error: StringConstants.FAILED_BET_ENGAGEMENT });
        }
    }
}

export async function settleBetHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params
    try {
        const bet = await settleBet(id)

        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
        }
        
        return res.status(200).json(bet)
    } catch (error: any) {
        switch(error.message) {
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
        if(error.message === StringConstants.INVALID_BET_STATE) {
            return res
              .status(403)
              .json({ error: StringConstants.INVALID_BET_STATE });
        }
        res.status(500).json({ error: StringConstants.FAILED_BET_CANCELATION });
    }
};
