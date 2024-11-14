import { NextFunction, Request, Response } from "express";
import { acceptBetInvitation, cancelBet, createBet, deleteBet, engageBet, getBet, getBetInvitation, getBets, rejectBetInvitation, settleBet, updateBet } from "./bet.service"
import { StringConstants } from '../../common/strings';

export async function createBetHandler(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.userId;
    const { designatedWitnesses, ...betData } = req.body;
    try {
        const bet = await createBet(userId, betData, designatedWitnesses);
        res.status(201).json(bet);
    } catch (error) {
        next(error)
    }
}
export async function getBetsHandler(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.userId;
    try {
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const bets = await getBets(userId);
        res.status(200).json(bets);
    } catch (error) {
        next(new Error(StringConstants.FAILED_BET_FETCH));
    }
}

export async function getBetHandler(req: Request, res: Response, next: NextFunction) {
    const { betId } = req.params
    try {
        const bet = await getBet(betId)
        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND })
        }
        res.status(200).json(bet)
    } catch (error) {
        next(new Error(StringConstants.FAILED_BET_FETCH))
    }
}


export async function updateBetHandler(req: Request, res: Response, next: NextFunction) {
    const userData = req.body
    const { id } = req.params
    try {
        const bet = await updateBet(id, userData);
        res.status(200).json(bet)
    } catch (error) {
        next(error)
    }
}

export async function deleteBetHandler(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
        const bet = await deleteBet(id);

        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
        }
        return res.status(204).send();
    } catch (error) {
        next(new Error(StringConstants.FAILED_BET_DELETE))
    }
}


export async function acceptBetInvitationHandler(req: Request, res: Response, next: NextFunction) {
    const { invitationId, opponentStake, opponentPrediction } = req.body
    try {
        const invitation = await acceptBetInvitation(invitationId, opponentStake, opponentPrediction)

        return res.status(200).json(invitation)
    } catch (error) {
        next(error)
    }
}

export async function rejectBetInvitationHandler(req: Request, res: Response, next: NextFunction) {
    const { invitationId } = req.params;
    try {
        const invitation = await rejectBetInvitation(invitationId)
        return res.status(200).json(invitation)
    } catch (error) {
        next(error)
    }
}

export async function getBetInvitationHandler(req: Request, res: Response, next: NextFunction) {
    const { invitationId } = req.params

    try {
        const invitation = await getBetInvitation(invitationId)
        return res.status(200).json(invitation)
    } catch (error) {
        next(error)
    }
}

export async function engageBetHandler(req: Request, res: Response, next: NextFunction) {
    const { betId } = req.params;
    try {
        const bet = await engageBet(betId);

        return res.status(200).json(bet);
    } catch (error) {
        next(error)
    }
}

export async function settleBetHandler(req: Request, res: Response, next: NextFunction) {
    const { id, winnerId } = req.body;
    try {
        const bet = await settleBet(id, winnerId);

        return res.status(200).json(bet);
    } catch (error) {
        next(error)
    }
}


export async function cancelBetHandler(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    try {
        const bet = await cancelBet(id)
        res.status(200).json(bet);
    } catch (error) {
        console.error(error)
        next(error)
    }
};

