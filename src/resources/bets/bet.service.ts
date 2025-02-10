import { Types } from "mongoose";
import { lockFunds, refundFunds, releaseFunds } from "../escrow/escrow.service";
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

export const OPEN_STATUSES = [
  "pending",
  "accepted",
  "active",
  "verified",
] as const;
export const HISTORY_STATUSES = ["closed", "canceled", "settled"] as const;

export class BetService {
  public async createBet(userId: string, input: ICreateBetInput) {
    try {
      // Pre-validate input outside the transaction
      if (input.witnesses.length > 0 && input.witnesses.length !== 3) {
        throw new BadRequestException("Exactly 3 witnesses are required");
      }

      if (!validateEmail(input.opponent.value)) {
        throw new BadRequestException("Invalid opponent email format");
      }

      // Collect all user IDs (for type "user")
      const userIds = [
        ...(input.opponent.type === "user" ? [input.opponent.value] : []),
        ...input.witnesses.filter((w) => w.type === "user").map((w) => w.value),
      ];

      const [creator, existingUsers] = await Promise.all([
        await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true },
        }),
        await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        }),
      ]);

      if (!creator) {
        throw new NotFoundException("User not found");
      }

      // Validate opponent and witnesses using pre-fetched data
      const { opponentId, opponentEmail, isOpponentExistingUser } =
        this.processOpponent(input.opponent, existingUsers, userId);

      // Process witnesses
      if (input.betType === "WITH_WITNESSES") {
        await this.validateWitnesses(
          input.witnesses,
          creator,
          opponentId,
          opponentEmail,
          existingUsers
        );
      }

      if (!input.predictions) {
        throw new BadRequestException("Creator prediction is required");
      }

      const betResult = await prisma.$transaction(async (tx) => {
        // Deduct stake from creator's wallet
        await deductWalletBalanceTx(tx, userId, input.creatorStake, "STAKE");

        const bet = await tx.bet.create({
          data: {
            title: input.title,
            description: input.description,
            creatorStake: input.creatorStake,
            opponentStake: input.opponentStake,
            deadline: input.deadline,
            betType: input.betType,
            creatorId: userId,
            opponentId,
            opponentEmail,
          },
          include: {
            predictions: {
              select: {
                creatorPrediction: true,
              },
            },
          },
        });

        await tx.predictions.create({
          data: {
            betId: bet.id,
            creatorPrediction: input.predictions.creatorPrediction,
          },
        });

        await tx.escrow.create({
          data: {
            betId: bet.id,
            creatorId: userId,
            creatorStake: input.creatorStake,
          },
        });

        const opponentInvitation = await this.createOpponentInvitation(
          tx,
          bet.id,
          userId,
          opponentId,
          opponentEmail
        );

        // Create witness invitations (if required)
        if (input.betType === "WITH_WITNESSES") {
          await this.createWitnessInvitations(
            tx,
            bet.id,
            input.witnesses,
            existingUsers
          );
        }

        return { bet, opponentInvitation };
      });

      //  Send emails and notifications after the transaction
      // await this.sendEmailsAndNotifications(
      //   betResult.opponentInvitation,
      //   opponentId,
      //   opponentEmail,
      //   isOpponentExistingUser,
      //   input.witnesses,
      //   existingUsers
      // );

      return betResult.bet;
    } catch (error) {
      throw new Error(String(error));
    }
  }

  private processOpponent(
    opponent: { type: string; value: string },
    existingUsers: Array<{ id: string; email: string }>,
    creatorId: string
  ): {
    opponentId: string | null;
    opponentEmail: string | null;
    isOpponentExistingUser: boolean;
  } {
    const existingOpponent = existingUsers.find(
      (u) => u.id === opponent.value || u.email === opponent.value
    );

    if (opponent.type === "user" && !existingOpponent) {
      throw new NotFoundException("Opponent user not found");
    }

    if (
      existingOpponent?.id === creatorId ||
      existingOpponent?.email === creatorId
    ) {
      throw new BadRequestException("Cannot be your own opponent");
    }

    return {
      opponentId: existingOpponent?.id || null,
      opponentEmail: existingOpponent?.email || opponent.value,
      isOpponentExistingUser: !!existingOpponent,
    };
  }

  private async validateWitnesses(
    witnesses: Array<{ type: string; value: string }>,
    creator: { id: string; email: string },
    opponentId: string | null,
    opponentEmail: string | null,
    existingUsers: Array<{ id: string; email: string }>
  ): Promise<void> {
    // Normalize witnesses to ensure no duplicates across ID and email
    const normalizedWitnesses = witnesses
      .map((witness) => {
        // If it's a user type, try to find the corresponding email
        if (witness.type === "user") {
          const user = existingUsers.find((u) => u.id === witness.value);
          return user ? [witness.value, user.email] : [witness.value];
        }
        return [witness.value];
      })
      .flat();

    // Check for duplicate witnesses
    const uniqueWitnesses = new Set(normalizedWitnesses);
    if (uniqueWitnesses.size !== normalizedWitnesses.length) {
      throw new BadRequestException("Witnesses must be unique");
    }

    const witnessUserIds = witnesses
      .filter((w) => w.type === "user")
      .map((w) => w.value);

    const witnessEmails = witnesses
      .filter((w) => w.type === "email")
      .map((w) => w.value);

    // Validate user-type witnesses exist (using existingUsers)
    const foundWitnessUserIds = existingUsers
      .filter((user) => witnessUserIds.includes(user.id))
      .map((user) => user.id);

    const missingUserIds = witnessUserIds.filter(
      (id) => !foundWitnessUserIds.includes(id)
    );

    if (missingUserIds.length > 0) {
      throw new NotFoundException(
        `Witness users not found: ${missingUserIds.join(", ")}`
      );
    }

    // Validate witnesses don't include creator or opponent
    if (
      [...witnessEmails, ...witnessUserIds].some(
        (w) =>
          w === creator.email ||
          w === opponentEmail ||
          w === creator.id ||
          w === opponentId
      )
    ) {
      throw new BadRequestException("Creator or opponent cannot be witnesses");
    }
  }

  private async createOpponentInvitation(
    tx: Prisma.TransactionClient,
    betId: string,
    creatorId: string,
    opponentId: string | null,
    opponentEmail: string | null
  ) {
    return await tx.betInvitation.create({
      data: {
        betId,
        creatorId,
        invitedUserId: opponentId,
        invitedEmail: opponentId ? null : opponentEmail,
        status: "PENDING",
        token: nanoid(),
        tokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private async createWitnessInvitations(
    tx: Prisma.TransactionClient,
    betId: string,
    witnesses: Array<{ type: string; value: string }>,
    existingUsers: Array<{ id: string; email: string }>
  ): Promise<void> {
    const witnessCreations = witnesses.map(async (witness) => {
      const existingUser = existingUsers.find(
        (u) => u.id === witness.value || u.email === witness.value
      );

      return tx.witness.create({
        data: {
          betId,
          userId:
            witness.type === "user" ? witness.value : existingUser?.id || null,
          email:
            witness.type === "email"
              ? witness.value
              : existingUser?.email || null,
          type: "USER_DESIGNATED",
          status: "PENDING",
          token: nanoid(),
          tokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
      });
    });

    await Promise.all(witnessCreations);
  }

  // Helper function to send emails and notifications after the transaction
  private async sendEmailsAndNotifications(
    opponentInvitation: BetInvitation,
    opponentId: string | null,
    opponentEmail: string | null,
    isOpponentExistingUser: boolean,
    witnesses: Array<{ type: string; value: string }>,
    existingUsers: Array<{ id: string; email: string }>
  ): Promise<void> {
    const inviteLink = `${process.env.CLIENT_BASE_URL}/bet/join/${opponentInvitation.token}`;

    // Send opponent invitation
    if (isOpponentExistingUser && opponentId && opponentEmail) {
      await Promise.all([
        createNotification({
          userId: opponentId,
          type: NotificationType.BET_INVITE,
          title: "You have been invited to a bet",
          message: "Join this bet using this link",
          link: inviteLink,
        }),
        sendEmail({
          to: opponentEmail,
          subject: "You have been invited to a bet",
          template: "bet-invite",
          params: {
            link: inviteLink,
            expiresAt: opponentInvitation.tokenExpiresAt,
          },
        }),
      ]);
    } else if (opponentEmail) {
      await sendEmail({
        to: opponentEmail,
        subject: "You have been invited to a bet",
        template: "bet-invite",
        params: {
          link: inviteLink,
          expiresAt: opponentInvitation.tokenExpiresAt,
          registerLink: `${
            process.env.CLIENT_BASE_URL
          }/register?email=${encodeURIComponent(opponentEmail)}`,
        },
      });
    }

    // Send witness invitations
    for (const witness of witnesses) {
      const existingUser = existingUsers.find(
        (u) => u.id === witness.value || u.email === witness.value
      );

      const witnessInviteLink = `${
        process.env.CLIENT_BASE_URL
      }/witness/join/${nanoid()}`;

      if (witness.type === "user" && existingUser) {
        await Promise.all([
          createNotification({
            userId: existingUser.id,
            type: "WITNESS_INVITE",
            title: "You have been invited to witness a bet",
            message: "Join this bet as a witness using this link",
            link: inviteLink,
          }),
          sendEmail({
            to: existingUser.email,
            subject: "You have been invited as a witness",
            template: "witness-invite",
            params: {
              link: inviteLink,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          }),
        ]);
      } else if (witness.type === "email") {
        await sendEmail({
          to: witness.value,
          subject: "You have been invited as a witness",
          template: "witness-invite",
          params: {
            link: witnessInviteLink,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            registerLink: `${
              process.env.CLIENT_BASE_URL
            }/register?email=${encodeURIComponent(witness.value)}`,
          },
        });
      }
    }
  }

  /**
   * Updates a bet.
   * @param betId - The ID of the bet to update.
   * @param betData - The update data of the bet.
   */

  public async updateBet(
    betId: string,
    betData: Partial<IBet>
  ): Promise<IBet | null> {
    const bet = await prisma.bet.findUnique({
      where: {
        id: betId,
      },
    });
    console.log(bet);
    if (!bet) {
      throw new NotFoundException(StringConstants.BET_NOT_FOUND);
    }
    if (bet.status !== "PENDING") {
      throw new ConflictException(StringConstants.BET_ALREADY_ACCEPTED_ENGAGED);
    }
    return Bet.findByIdAndUpdate(betId, betData);
  }

  /**
   * Accepts a bet invitation.
   * @param betId - The ID of the bet to accept.
   */

  public async acceptBetInvitation(
    userId: string,
    invitationId: string,
    opponentStake: number,
    opponentPrediction: string
  ): Promise<Bet | null> {
    if (!userId) {
      throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
    }

    return await prisma.$transaction(async (tx) => {
      // Find invitation with complete bet and creator details
      const invitation = await tx.betInvitation.findUnique({
        where: { id: invitationId },
        include: {
          bet: {
            select: {
              id: true,
              title: true,
              creatorId: true,
              creatorStake: true,
              opponentId: true,
              opponentStake: true,
              status: true,
              predictions: true,
            },
          },
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND);
      }

      if (invitation.status !== "PENDING") {
        throw new ConflictException(
          StringConstants.BET_ALREADY_ACCEPTED_REJECTED
        );
      }

      const bet = invitation.bet;
      if (!bet) {
        throw new NotFoundException(
          "Bet associated with the invitation not found"
        );
      }

      if (bet.creatorId === userId) {
        throw new ConflictException("You cannot accept your own bet.");
      }

      // Deduct wallet balance within transaction
      await deductWalletBalanceTx(tx, userId, opponentStake, "STAKE");

      // Update bet
      const updatedBet = await tx.bet.update({
        where: { id: bet.id },
        data: {
          opponentStake: opponentStake,
          opponentId: userId,
          status: "ACCEPTED",
          totalStake: opponentStake + bet.creatorStake,
        },
      });

      await tx.predictions.update({
        where: { betId: bet.id },
        data: {
          opponentPrediction: opponentPrediction,
        },
      });

      await tx.betInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED },
      });

      await tx.escrow.update({
        where: {
          betId: bet.id
        },
        data: {
          opponentId: userId,
          opponentStake: opponentStake,
          status: EscrowStatus.LOCKED,
        },
      });

      return updatedBet;
    });
  }

  // Separate function to handle notifications and emails after transaction
  public async handleBetAcceptanceNotifications(
    invitation: BetInvitation & {
      bet: Bet;
      creator: User;
    }
  ) {
    const betLink = `${process.env.CLIENT_BASE_URL}/bets/${invitation.bet.id}`;

    try {
      await Promise.all([
        notificationService.createNotification({
          userId: invitation.bet.creatorId,
          type: NotificationType.BET_ENGAGED,
          title: "Bet Accepted",
          message: `Your bet "${invitation.bet.title}" has been accepted`,
          params: {
            link: betLink,
          },
        }),
        sendEmail({
          to: invitation.creator.email,
          subject: "Bet Accepted",
          template: "bet-accepted",
          params: {
            firstName: invitation.creator.name,
            betTitle: invitation.bet.title,
            betId: invitation.bet.id,
          },
        }),
      ]);
    } catch (error) {
      console.error("Failed to send notification or email:", error);
    }
  }

  /**
   * Rejects a bet invitation.
   * @param betId - The ID of the bet to reject.
   */

  public async rejectBetInvitation(invitationId: string): Promise<IBet | null> {
    const invitation = await BetInvitation.findById(invitationId)
      .populate({
        path: "betId",
        select: "title",
      })
      .populate({
        path: "creatorId",
        select: "name email",
      });

    if (!invitation) {
      throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND);
    }
    if (invitation.status !== "pending") {
      throw new ConflictException(
        StringConstants.BET_ALREADY_ACCEPTED_REJECTED
      );
    }

    invitation.status = "rejected";
    await invitation.save();

    const bet = invitation.betId;
    const user = invitation.creatorId;

    try {
      await notificationService.createNotification(
        [user._id.toString()],
        "bet-invite",
        "Bet Rejected",
        `Your bet "${bet.title}" to your opponent has been rejected.`,
        `${process.env.CLIENT_BASE_URL}/bets/${bet._id}`
      );

      const firstName = user.name.split(" ")[0];
      await sendEmail({
        to: user.email,
        subject: "Your Opponent Rejected The Invite",
        template: "bet-rejected",
        params: {
          firstName: firstName,
          betTitle: bet.title,
          betId: bet._id.toString(),
        },
      });
    } catch (error) {
      console.error("Failed to send email:", error);
    }

    return invitation;
  }

  /**
   * Gets bet details from an invitation
   * @param invitationId - The ID of the invitation to fetch
   * @param userId - The ID of the invited user
   * @returns The bet associated with the invitation
   */

  public async getBetInvitation(userId: string, invitationId: string) {
    try {
      const invitation = await BetInvitation.findOne({
        _id: invitationId,
        invitedUserId: userId,
      }).populate("betId");

      if (!invitation) {
        throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND);
      }
      if (!invitation.betId) {
        throw new NotFoundException(StringConstants.BET_NOT_FOUND);
      }
      return invitation;
    } catch (error) {
      throw new Error(`Failed to retrieve invitation: ${error}`);
    }
  }

  /**
   * Engages the bet by setting the state to active.
   * @param betId - The ID of the bet to engage.
   */

  public async engageBet(betId: string): Promise<IBet | null> {
    const bet = await Bet.findById(betId);

    if (bet.status !== "accepted") {
      throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
    }
    if (bet.betType === "with-witnesses") {
      const pendingWitnesses = await Witness.find({
        betId: bet._id,
        status: { $ne: "accepted" },
      });

      if (pendingWitnesses.length > 0) {
        throw new BadRequestException(StringConstants.PENDING_WITNESS);
      }
    }

    bet.status = "active";
    await bet.save();

    await notificationService.createNotification(
      [bet.creatorId, bet.opponentId],
      "bet-engaged",
      "Bet activated",
      `Your bet ${bet.title} has been activated`,
      bet._id
    );

    return bet;
  }

  /**
   * Settles the bet by determining the winner, releasing funds from escrow, and closing the bet.
   * @param betId - The ID of the bet to settle.
   * @param winnerId - The ID of the winner to settle.
   */

  public async settleBet(
    betId: string,
    winnerId: string
  ): Promise<IBet | null> {
    const bet = await Bet.findById(betId);

    if (!bet) {
      throw new NotFoundException(StringConstants.BET_NOT_FOUND);
    }
    if (bet.betType === "with-witnesses" && bet.status !== "verified") {
      throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
    }
    if (bet.betType === "without-witnesses" && bet.status !== "active") {
      throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
    }
    if (!winnerId) {
      throw new UnprocessableEntityException(
        StringConstants.BET_WINNER_NOT_DETERMINED
      );
    }

    await releaseFunds(bet._id, winnerId);

    await User.updateOne(
      { _id: bet.creatorId },
      { $inc: { bets_participated: 1 } }
    );

    if (bet.opponentId) {
      await User.updateOne(
        { _id: bet.opponentId },
        { $inc: { bets_participated: 1 } }
      );
    }

    const witnesses = bet.witnesses;
    for (const witness of witnesses) {
      await User.updateOne(
        { _id: witness.userId },
        { $inc: { bets_witnessed: 1 } }
      );
    }

    bet.status = "settled";
    bet.winnerId = winnerId;
    await bet.save();

    await notificationService.createNotification(
      [winnerId],
      "bet-settled",
      StringConstants.NOTIFY_BET_WINNER_TITLE,
      "You won! Congratulations",
      bet._id
    );
    const loserId =
      bet.creatorId.toString() === winnerId.toString()
        ? bet.opponentId.toString()
        : bet.creatorId.toString();
    await notificationService.createNotification(
      [loserId],
      "bet-settled",
      StringConstants.NOTIFY_BET_LOSER_TITLE,
      "You lost the bet. What is cashout?",
      bet._id
    );

    await this.pushBetToHistory(bet);

    return bet;
  }

  /**
   * Cancels the a bet.
   * @param betId - The ID of the bet to cancel.
   */
  public async cancelBet(betId: string): Promise<IBet | null> {
    const bet = await Bet.findById(betId);

    if (!bet || bet.status !== "accepted") {
      throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
    }

    await refundFunds(betId);

    bet.status = "canceled";
    await bet.save();

    await notificationService.createNotification(
      [bet.creatorId, bet.opponentId],
      "bet-cancelled",
      "You cancelled a bet",
      `Your bet "${bet.title}" has been cancelled`,
      bet._id
    );

    return bet;
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
