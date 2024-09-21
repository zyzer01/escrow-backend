import { Request, Response } from "express";
import { acceptBetInvitation, cancelBet, createBet, deleteBet, engageBet, getBet, getBets, rejectBetInvitation, settleBet, updateBet } from "./bet.service"
import { StringConstants } from '../../common/strings';


export async function createBetHandler(req: Request, res: Response) {
    const { designatedWitnesses, ...betData } = req.body;
    try {
        const bet = await createBet(betData, designatedWitnesses);
        res.status(201).json(bet);
    } catch (error) {
        console.error('Error creating bet:', error);
        res.status(500).json({ error: 'Failed to create bet' });
    }
}
export async function getBetsHandler(req: Request, res: Response) {
    try {
        const bets = await getBets()
        res.status(200).json(bets)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bets' })
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
        res.status(500).json({ error: 'Internal Server Error' })
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

        if (!invitation) {
            return res.status(404).json({ error: StringConstants.BET_INVITATION_NOT_FOUND });
        }
        if (invitation.status !== 'pending') {
            return res.status(403).json({ error: StringConstants.BET_ALREADY_ACCEPTED_DECLINED });
        }
        return res.status(200).json(invitation)
    } catch (error) {
        console.error('Error accepting bet:', error);
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
        console.error('Error rejecting bet:', error);
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

        if (bet.status !== 'accepted') {
            return res.status(403).json({ error: StringConstants.INVALID_BET_STATE });
        }

        return res.status(200).json(bet)
    } catch (error) {
        return res.status(500).json({ error: StringConstants.FAILED_BET_ENGAGEMENT });
    }
}

export async function settleBetHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params
    try {
        const bet = await settleBet(id)

        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
        }

        if (!bet || bet.status !== 'verified') {
            return res.status(403).json({ error: StringConstants.INVALID_BET_STATE });
        }

        if (!bet.winnerId) {
            return res.status(403).json({ error: StringConstants.BET_WINNER_NOT_DETERMINED });
        }

        return res.status(200).json(bet)
    } catch (error) {
        return res.status(500).json({ error: StringConstants.FAILED_BET_SETTLEMENT });
    }
}


export async function cancelBetHandler(req: Request, res: Response) {
    const { betId } = req.body;

    try {
        const bet = await cancelBet(betId)

        if (!bet || bet.status !== 'pending') {
            return res.status(403).json({ error: StringConstants.INVALID_BET_STATE });
        }

        res.status(200).json(StringConstants.BET_CANCELED_AND_REFUNDED);
    } catch (error) {
        res.status(500).json({ error: StringConstants.FAILED_BET_CANCELATION });
    }
};
