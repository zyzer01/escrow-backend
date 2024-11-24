import { betService } from './bet.service';
import { NextFunction, Request, Response } from "express";
import { StringConstants } from '../../common/strings';


export class BetController {

public async createBet(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.data.user.id;
    const { designatedWitnesses, ...betData } = req.body;
    try {
        const bet = await betService.createBet(userId!, betData, designatedWitnesses);
        res.status(201).json(bet);
    } catch (error) {
        next(error)
    }
}
public async getBets(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.data.user.id;
    try {
        if (!userId) {
            return res.status(401).json({ message: StringConstants.UNAUTHORIZED });
        }

        const bets = await betService.getBets(userId);
        res.status(200).json(bets);
    } catch (error) {
        next(new Error(StringConstants.FAILED_BET_FETCH));
    }
}

public async getBet(req: Request, res: Response) {
  const userId = req.user?.data.user.id;
  const { betId } = req.params;
  
    try {
      const bet = await betService.getBet(userId, betId);
      res.status(200).json(bet);
    } catch (error) {
      res.status(500).json('Failed')
    }
  }

public async updateBet(req: Request, res: Response, next: NextFunction) {
    const userData = req.body
    const { id } = req.params
    try {
        const bet = await betService.updateBet(id, userData);
        res.status(200).json(bet)
    } catch (error) {
        next(error)
    }
}

public async deleteBet(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
        const bet = await betService.deleteBet(id);

        if (!bet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
        }
        return res.status(204).send();
    } catch (error) {
        next(new Error(StringConstants.FAILED_BET_DELETE))
    }
}


public async acceptBetInvitation(req: Request, res: Response, next: NextFunction) {
    const { invitationId, opponentStake, opponentPrediction } = req.body
    try {
        const invitation = await betService.acceptBetInvitation(invitationId, opponentStake, opponentPrediction)

        return res.status(200).json(invitation)
    } catch (error) {
        next(error)
    }
}

public async rejectBetInvitation(req: Request, res: Response, next: NextFunction) {
    const { invitationId } = req.params;
    try {
        const invitation = await betService.rejectBetInvitation(invitationId)
        return res.status(200).json(invitation)
    } catch (error) {
        next(error)
    }
}

public async getBetInvitation(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.data.user.id;
    const { invitationId } = req.params;
  
    try {
      const invitation = await betService.getBetInvitation(userId, invitationId);
      res.status(200).json(invitation);
    } catch (error) {
      next(error);
    }
  }

public async engageBet(req: Request, res: Response, next: NextFunction) {
    const { betId } = req.params;
    try {
        const bet = await betService.engageBet(betId);

        return res.status(200).json(bet);
    } catch (error) {
        next(error)
    }
}

public async settleBet(req: Request, res: Response, next: NextFunction) {
    const { id, winnerId } = req.body;
    try {
        const bet = await betService.settleBet(id, winnerId);

        return res.status(200).json(bet);
    } catch (error) {
        next(error)
    }
}


public async cancelBet(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    try {
        const bet = await betService.cancelBet(id)
        res.status(200).json(bet);
    } catch (error) {
        console.error(error)
        next(error)
    }
};

}

export const betController = new BetController();
