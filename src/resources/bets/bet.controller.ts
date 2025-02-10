import { BetService } from "./bet.service";
import { NextFunction, Request, Response } from "express";
import { StringConstants } from "../../common/strings";
import { createBetProvider } from "./providers/create-bet.provider";
import { container } from "../../inversify.config";

const betService = container.get<BetService>(BetService);

export class BetController {
  public async createBet(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id;
    const { betData } = req.body;
    console.log(betData);
    try {
      const bet = await betService.createBet(userId!, betData);
      res.status(201).json(bet);
    } catch (error) {
      next(error);
    }
  }
  public async getBets(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { status, betType, deadline } = req.query;

    try {
      const paginatedBets = await betService.getBets(userId, page, limit, {
        status: status as string,
        betType: betType as string,
        deadline: deadline ? new Date(deadline as string) : undefined,
      });
      res.status(200).json(paginatedBets);
    } catch (error) {
      next(error);
    }
  }

  public async getBetsHistory(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { status, betType, deadline } = req.query;

    try {
      const paginatedBets = await betService.getBetsHistory(
        userId,
        page,
        limit,
        {
          status: status as string,
          betType: betType as string,
          deadline: deadline ? new Date(deadline as string) : undefined,
        }
      );
      res.status(200).json(paginatedBets);
    } catch (error) {
      next(error);
    }
  }

  public async getBet(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id;
    const { betId } = req.params;

    try {
      const bet = await betService.getBet(userId, betId);
      res.status(200).json(bet);
    } catch (error) {
      next(error);
    }
  }

  public async getAllBets(req: Request, res: Response, next: NextFunction) {
    try {
      const bets = await betService.findAll();
      res.status(200).json(bets);
    } catch (error) {
      next(error);
    }
  }
  public async updateBet(req: Request, res: Response, next: NextFunction) {
    const userData = req.body;
    const { id } = req.params;
    try {
      const bet = await betService.updateBet(id, userData);
      res.status(200).json(bet);
    } catch (error) {
      next(error);
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
      next(new Error(StringConstants.FAILED_BET_DELETE));
    }
  }

  public async acceptBetInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const userId = req.user?.id;
    const { invitationId, opponentStake, opponentPrediction } = req.body;
    try {
      const invitation = await betService.acceptBetInvitation(
        userId,
        invitationId,
        opponentStake,
        opponentPrediction
      );

      return res.status(200).json(invitation);
    } catch (error) {
      next(error);
    }
  }

  public async rejectBetInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { invitationId } = req.params;
    try {
      const invitation = await betService.rejectBetInvitation(invitationId);
      return res.status(200).json(invitation);
    } catch (error) {
      next(error);
    }
  }

  public async getBetInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const userId = req.user?.id;
    const { invitationId } = req.params;

    try {
      const invitation = await betService.getBetInvitation(
        userId,
        invitationId
      );
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
      next(error);
    }
  }

  public async settleBet(req: Request, res: Response, next: NextFunction) {
    const { id, winnerId } = req.body;
    try {
      const bet = await betService.settleBet(id, winnerId);

      return res.status(200).json(bet);
    } catch (error) {
      next(error);
    }
  }

  public async cancelBet(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    try {
      const bet = await betService.cancelBet(id);
      res.status(200).json(bet);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}

export const betController = new BetController();
