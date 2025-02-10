import { Types } from "mongoose";
import { EscrowService, lockFunds, refundFunds, releaseFunds } from "../escrow/escrow.service";
import { StringConstants } from "../../common/strings";
import { NotFoundException } from "../../common/errors/NotFoundException";
import { BadRequestException } from "../../common/errors/BadRequestException";
import { ConflictException } from "../../common/errors/ConflictException";
import { UnprocessableEntityException } from "../../common/errors/UnprocessableEntityException";
import { sendEmail } from "../../mail/mail.service";
import { UnauthorizedException } from "../../common/errors";
import {
  createNotification,
  notificationService,
} from "./../notifications/notification.service";
import { deductWalletBalanceTx } from "../wallet/wallet.service";
import { BetPaginatedResponse } from "../../lib/types/bet";
import BetHistory, { IBetHistory } from "./models/bet-history.model";
import mongoose from "mongoose";
import { Witness } from "./witnesses/witness.model";
import { prisma } from "../../lib/db";
import { IBet, ICreateBetInput } from "./interfaces/bet";
import { validateEmail } from "../../lib/utils/validators";
import { nanoid } from "nanoid";
import {
  Bet,
  BetInvitation,
  EscrowStatus,
  InvitationStatus,
  NotificationType,
  Prisma,
  User,
} from "@prisma/client";
import { RejectBetInvitationProvider } from "./providers/reject-bet-invitation.provider";
import { inject, injectable } from "inversify";
import { CreateBetProvider } from "./providers/create-bet.provider";
import { AcceptBetInvitationProvider } from "./providers/accept-bet-invitation.provider";
import { SettleBetProvider } from "./providers/settle-bet.provider";

export const OPEN_STATUSES = [
  "pending",
  "accepted",
  "active",
  "verified",
] as const;
export const HISTORY_STATUSES = ["closed", "canceled", "settled"] as const;

@injectable()
export class BetService {
  constructor(
    @inject(RejectBetInvitationProvider)
    private rejectBetInvitationProvider: RejectBetInvitationProvider,

    @inject(AcceptBetInvitationProvider)
    private acceptBetInvitationProvider: AcceptBetInvitationProvider,

    @inject(SettleBetProvider)
    private settleBetProvider: SettleBetProvider,

    @inject(EscrowService)
    private escrowService: EscrowService,

    @inject(CreateBetProvider) private createBetProvider: CreateBetProvider
  ) {}

  /**
   * Creates a bet.
   * @param user - The ID of the user.
   * @param input - The bet input data.
   */

  public async createBet(userId: string, input: ICreateBetInput) {
    return this.createBetProvider.createBet(userId, input);
  }

  /**
   * Updates a bet.
   * @param betId - The ID of the bet to update.
   * @param betData - The update data of the bet.
   */

  public async updateBet(
    betId: string,
    betData: Partial<Bet>
  ): Promise<Bet | null> {
    const bet = await prisma.bet.update({
      where: {
        id: betId,
      },
      data: betData,
    });
    console.log(bet);
    if (!bet) {
      throw new NotFoundException(StringConstants.BET_NOT_FOUND);
    }
    if (bet.status !== "PENDING") {
      throw new ConflictException(StringConstants.BET_ALREADY_ACCEPTED_ENGAGED);
    }
    return bet;
  }

  /**
   * Accepts a bet invitation.
   * @param userId - The ID of the user.
   * @param invitationId - The ID of the bet invitation.
   * @param opponentStake - The stake of the opponent.
   * @param opponentStake - The prediction of the opponent.
   */

  public async acceptBetInvitation(
    userId: string,
    invitationId: string,
    opponentStake: number,
    opponentPrediction: string
  ): Promise<Bet | null> {
    return this.acceptBetInvitationProvider.acceptBetInvitation(
      userId,
      invitationId,
      opponentStake,
      opponentPrediction
    );
  }

  /**
   * Rejects a bet invitation.
   * @param invitationId - The ID of the bet invitation to reject.
   */

  public async rejectBetInvitation(invitationId: string): Promise<any> {
    return this.rejectBetInvitationProvider.rejectBet(invitationId);
  }

  /**
   * Gets bet details from an invitation
   * @param invitationId - The ID of the invitation to fetch
   * @param userId - The ID of the invited user
   * @returns The bet associated with the invitation
   */

  public async getBetInvitation(userId: string, invitationId: string) {
    try {
      const invitation = await prisma.betInvitation.findUnique({
        where: { id: invitationId, invitedUserId: userId },
        include: { bet: true },
      });

      if (!invitation) {
        throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND);
      }
      if (!invitation.bet) {
        throw new NotFoundException(StringConstants.BET_NOT_FOUND);
      }

      return invitation;
    } catch (error) {
      throw new Error(`Failed to retrieve invitation: ${error}`);
    }
  }

  /**
   * Settles the bet by determining the winner, releasing funds from escrow, and closing the bet.
   * @param betId - The ID of the bet to settle.
   * @param winnerId - The ID of the winner to settle.
   */

  public async settleBet(betId: string, winnerId: string): Promise<Bet | null> {
    return this.settleBetProvider.settleBet(betId, winnerId);
  }

  /**
   * Cancels the a bet.
   * @param betId - The ID of the bet to cancel.
   */
  public async cancelBet(betId: string): Promise<any> {
    return prisma.$transaction(async (tx) => {
      // Update the bet status to "CANCELED"
      const bet = await tx.bet.update({
        where: { id: betId },
        data: { status: 'CANCELED' },
      });

      if (!bet || bet.status !== 'ACCEPTED') {
        throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
      }

      await this.escrowService.refundFunds(tx, betId);

      const betLink = `${process.env.CLIENT_BASE_URL}/bets/${bet.id}`;

      if (bet.opponentId) {
        await notificationService.createNotification({
          userId: bet.opponentId,
          type: NotificationType.BET_CANCELED,
          title: 'Bet Canceled',
          message: `Your bet "${bet.title}" has been canceled`,
          params: {
            link: betLink,
          },
        });
      }

      return bet;
    });
  }

  /**
   * Reverses the outcome of a bet by paying out the new winner.
   * Reuses the releaseFunds function.
   * @param betId - The ID of the bet to reverse.
   */
  public async reverseBetOutcome(betId: string): Promise<void> {
    const bet = await Bet.findById(betId);
    if (!bet) {
      throw new NotFoundException("Bet not found.");
    }

    const originalWinnerId = bet.winnerId;
    if (!originalWinnerId) {
      throw new NotFoundException("Bet does not have a winner to reverse.");
    }

    const newWinnerId =
      bet.creatorId.toString() === originalWinnerId.toString()
        ? bet.opponentId
        : bet.creatorId;

    if (!newWinnerId) {
      throw new NotFoundException("No opponent available to reverse outcome.");
    }

    await releaseFunds(betId, newWinnerId);

    bet.winnerId = newWinnerId;
    await bet.save();

    console.log(`Bet outcome reversed. New winner is user: ${newWinnerId}`);
  }

  /**
   * Retrieves the bet history for a user.
   * @param userId - The ID of the user to retrieve bet history for.
   * @returns - An array of bets the user has participated in.
   */
  public async getBetsHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    filters: {
      status?: string;
      betType?: string;
      deadline?: Date;
    } = {}
  ): Promise<BetPaginatedResponse<IBetHistory[]>> {
    if (!userId) {
      throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
    }

    const skip = (page - 1) * limit;

    // Build the query based on filters
    const query: any = {
      $or: [
        { creatorId: userId },
        { opponentId: userId },
        { witnesses: userId },
      ],
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.betType) {
      query.betType = filters.betType;
    }

    if (filters.deadline) {
      query.deadline = {
        $gte: new Date(filters.deadline),
        $lt: new Date(
          new Date(filters.deadline).setDate(
            new Date(filters.deadline).getDate() + 1
          )
        ),
      };
    }

    const [bets, total] = await Promise.all([
      BetHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit + 1),
      BetHistory.countDocuments(query),
    ]);

    const hasMore = bets.length > limit;
    const items = hasMore ? bets.slice(0, -1) : bets;

    return {
      items,
      hasMore,
      total,
    };
  }

  public async findAll() {
    return prisma.bet.findMany();
  }

  public async getBets(
    userId: string,
    page: number = 1,
    limit: number = 10,
    filters: {
      status?: string;
      betType?: string;
      deadline?: Date;
      q?: string;
    } = {}
  ): Promise<BetPaginatedResponse<IBet>> {
    if (!userId) {
      throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
    }

    const skip = (page - 1) * limit;

    // Build the query based on filters
    const query: any = {
      $or: [{ creatorId: userId }, { opponentId: userId }],
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.betType) {
      query.betType = filters.betType;
    }

    if (filters.deadline) {
      query.deadline = {
        $gte: new Date(filters.deadline),
        $lt: new Date(
          new Date(filters.deadline).setDate(
            new Date(filters.deadline).getDate() + 1
          )
        ),
      };
    }

    if (filters.q) {
      query.$and.push({
        $or: [
          { title: { $regex: filters.q, $options: "i" } },
          { description: { $regex: filters.q, $options: "i" } },
        ],
      });
    }

    const [bets, total] = await Promise.all([
      Bet.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit + 1),
      Bet.countDocuments(query),
    ]);

    const hasMore = bets.length > limit;
    const items = hasMore ? bets.slice(0, -1) : bets;

    return {
      items,
      hasMore,
      total,
    };
  }

  public async getBet(userId: string, betId: string) {
    if (!userId) {
      throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
    }

    const bet = await prisma.bet.findFirst({
      where: {
        id: betId,
        OR: [{ creatorId: userId }, { opponentId: userId }],
      },
      include: {
        predictions: {
          select: {
            creatorPrediction: true,
            opponentPrediction: true,
          },
        },
        witnesses: {
          select: {
            betId: true,
            userId: true,
            email: true,
          },
        },
      },
    });

    if (!bet) {
      throw new NotFoundException(StringConstants.BET_NOT_FOUND);
    }

    return bet;
  }

  private async pushBetToHistory(bet: IBet): Promise<IBetHistory> {
    const betHistoryData = {
      originalBetId: bet._id,
      creatorId: bet.creatorId,
      opponentId: bet.opponentId,
      winnerId: bet.winnerId,
      title: bet.title,
      description: bet.description,
      creatorStake: bet.creatorStake,
      opponentStake: bet.opponentStake,
      totalStake: bet.totalStake,
      deadline: bet.deadline,
      status: bet.status,
      witnesses: bet.witnesses,
      predictions: bet.predictions,
      betType: bet.betType,
    };

    const betHistory = await BetHistory.create(betHistoryData);

    return betHistory;
  }

  public async deleteBet(id: string) {
    return prisma.bet.delete({
      where: {
        id,
      },
    });
  }
}

export const betService = new BetService();
export const { reverseBetOutcome } = new BetService();
