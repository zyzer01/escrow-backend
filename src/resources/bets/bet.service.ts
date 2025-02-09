import { BetType } from "./../../../node_modules/.prisma/client/index.d";
import { Types } from "mongoose";
import BetInvitation from "./models/bet-invitation.model";
import { Bet } from "./models/bet.model";
import { lockFunds, refundFunds, releaseFunds } from "../escrow/escrow.service";
import User from "../users/user.model";
import { StringConstants } from "../../common/strings";
import { selectNeutralWitness } from "../../lib/utils/neutralWitness";
import { NotFoundException } from "../../common/errors/NotFoundException";
import { BadRequestException } from "../../common/errors/BadRequestException";
import { ConflictException } from "../../common/errors/ConflictException";
import { UnprocessableEntityException } from "../../common/errors/UnprocessableEntityException";
import { sendEmail } from "../../mail/mail.service";
import Escrow from "../escrow/escrow.model";
import { UnauthorizedException } from "../../common/errors";
import {
  createNotification,
  notificationService,
} from "./../notifications/notification.service";
import {
  deductWalletBalanceTx,
  subtractWalletBalance,
} from "../wallet/wallet.service";
import { BetPaginatedResponse } from "../../lib/types/bet";
import BetHistory, { IBetHistory } from "./models/bet-history.model";
import mongoose from "mongoose";
import { Witness } from "./witnesses/witness.model";
import { prisma } from "../../lib/db";
import { IBet, ICreateBetInput } from "./interfaces/bet";
import { validateEmail } from "../../lib/utils/validators";
import { nanoid } from "nanoid";

export const OPEN_STATUSES = [
  "pending",
  "accepted",
  "active",
  "verified",
] as const;
export const HISTORY_STATUSES = ["closed", "canceled", "settled"] as const;

export class BetService {
  // public async createBet(
  //   userId: string,
  //   betData: IBet & { opponentEmail: string },
  //   witnessEmails: string[]
  // ) {
  //   if (!betData.opponentEmail) {
  //     throw new BadRequestException(StringConstants.OPPONENT_EMAIL_MISSING);
  //   }

  //   if (witnessEmails.length > 0 && witnessEmails.length !== 3) {
  //     throw new BadRequestException(StringConstants.INSUFFICIENT_WITNESS_DESIGNATION);
  //   }

  //   return await prisma.$transaction(async (tx) => {
  //     const user = await tx.user.findUnique({ where: { id: userId } });
  //     if (!user) {
  //       throw new NotFoundException(StringConstants.USER_NOT_FOUND);
  //     }

  //     const opponent = await tx.user.findUnique({
  //       where: { email: betData.opponentEmail },
  //     });

  //     if (opponent && opponent.id === userId) {
  //       throw new BadRequestException(StringConstants.CANNOT_BE_OWN_OPPONENT);
  //     }

  //     const opponentId = opponent?.id ?? null;

  //     // Validate witness emails
  //     if (witnessEmails.includes(user.email) || witnessEmails.includes(betData.opponentEmail)) {
  //       throw new BadRequestException(StringConstants.INVALID_WITNESS_ASSIGNMENT);
  //     }

  //     // Fetch witness users in one query
  //     const witnessUsers = await tx.user.findMany({
  //       where: { email: { in: witnessEmails } },
  //       select: { id: true, email: true },
  //     });

  //     const witnessData = witnessEmails.map((email) => ({
  //       email,
  //       userId: witnessUsers.find((w) => w.email === email)?.id ?? null,
  //       betId: "",
  //       type: "user-designated",
  //       status: "pending",
  //     }));

  //     // Subtract wallet balance
  //     await tx.wallet.update({
  //       where: { userId },
  //       data: { balance: { decrement: betData.creatorStake } },
  //     });

  //     // Create bet
  //     const bet = await tx.bet.create({
  //       data: {
  //         ...betData,
  //         creatorId: userId,
  //         opponentId,
  //         betOpponentEmail: betData.opponentEmail,
  //       },
  //     });

  //     // Update witness data with betId
  //     witnessData.forEach((witness) => (witness.betId = bet.id));

  //     // Create escrow
  //     await tx.escrow.create({
  //       data: {
  //         betId: bet.id,
  //         creatorId: userId,
  //         creatorStake: betData.creatorStake,
  //       },
  //     });

  //     // Insert witnesses
  //     if (witnessData.length > 0) {
  //       await tx.witness.createMany({ data: witnessData });
  //     }

  //     // Create bet invitation
  //     const invitation = await tx.betInvitation.create({
  //       data: {
  //         betId: bet.id,
  //         creatorId: userId,
  //         invitedUserId: opponentId,
  //         invitedEmail: betData.opponentEmail,
  //       },
  //     });

  //     const opponentInviteLink = `${process.env.CLIENT_BASE_URL}/invite/${invitation.id}`;

  //     // Send email invitation to opponent
  //     await sendEmail({
  //       to: betData.opponentEmail,
  //       subject: "Bet Invite",
  //       template: "bet-invite",
  //       params: { inviteLink: opponentInviteLink },
  //     });

  //     // Send notifications
  //     if (opponentId) {
  //       await tx.notification.create({
  //         data: {
  //           userId: opponentId,
  //           type: "BET_INVITE",
  //           title: "Bet Invitation",
  //           message: `You have been invited to a bet by ${user.username}`,
  //           link: opponentInviteLink,
  //         },
  //       });
  //     }

  //     return bet;
  //   });
  // }

  public async createBet(userId: string, input: ICreateBetInput) {
    // Validate witness count
    try {
      if (input.witnesses.length > 0 && input.witnesses.length !== 3) {
        throw new BadRequestException("Exactly 3 witnesses are required");
      }

      return await prisma.$transaction(async (tx) => {
        // Fetch creator
        const creator = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true },
        });

        if (!creator) {
          throw new NotFoundException("User not found");
        }

        // Handle opponent
        let opponentId: string | null = null;
        let opponentEmail: string | null = null;
        let opponent = null

        if (input.opponent.type === "user") {
          opponent = await tx.user.findUnique({
            where: { id: input.opponent.value },
            select: { id: true, email: true },
          });

          if (!opponent) {
            throw new NotFoundException("Opponent user not found");
          }

          if (opponent.id === userId) {
            throw new BadRequestException("Cannot be your own opponent");
          }

          console.log('opponent email', opponent.email)

          opponentId = opponent.id;
          opponentEmail = opponent.email;
        } else {
          // Validate email format
          if (!validateEmail(input.opponent.value)) {
            throw new BadRequestException("Invalid opponent email format");
          }

          if (input.opponent.value === creator.email) {
            throw new BadRequestException("Cannot be your own opponent");
          }

          opponentEmail = input.opponent.value;
        }

        // Process witnesses
        const witnessEmails = input.witnesses.map((w) =>
          w.type === "email" ? w.value : ""
        );
        const witnessUserIds = input.witnesses.map((w) =>
          w.type === "user" ? w.value : ""
        );

        // Validate witness emails/ids don't include creator or opponent
        if (
          [...witnessEmails, ...witnessUserIds].some(
            (w) =>
              w === creator.email ||
              w === opponentEmail ||
              w === creator.id ||
              w === opponentId
          )
        ) {
          throw new BadRequestException(
            "Creator or opponent cannot be witnesses"
          );
        }

        // Fetch existing witness users
        const existingWitnessUsers = await tx.user.findMany({
          where: {
            OR: [
              { id: { in: witnessUserIds } },
              { email: { in: witnessEmails } },
            ],
          },
          select: { id: true, email: true },
        });

        // Deduct stake from creator's wallet

        await deductWalletBalanceTx(tx, userId, input.creatorStake, "STAKE");

        // Create bet
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
            opponentEmail: opponentEmail,
          },
        });

        // Create escrow
        await tx.escrow.create({
          data: {
            betId: bet.id,
            creatorId: userId,
            creatorStake: input.creatorStake,
          },
        });

        // Create bet invitation for opponent
        const opponentInvitation = await tx.betInvitation.create({
          data: {
            betId: bet.id,
            creatorId: userId,
            invitedUserId: opponentId,
            invitedEmail: opponentId ? null : opponentEmail,
            status: "PENDING",
            token: nanoid(),
            tokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          },
        });

        const opponentInviteLink = `${process.env.CLIENT_BASE_URL}/bet/join/${opponentInvitation.token}`;

        if (opponent?.email && opponentId) {
            // For existing users: Send both in-app notification and email
            await Promise.all([
              createNotification(
                [opponentId],
                "BET_INVITE",
                "You have been invited to a bet",
                "Join this bet using this link",
                opponentInviteLink,
                bet.id
              ),
              sendEmail({
                to: [opponentEmail!],
                subject: "You have been invited to a bet",
                template: "bet-invite",
                params: { 
                  link: opponentInviteLink,
                  expiresAt: opponentInvitation.tokenExpiresAt
                },
              })
            ]);
          } else if (opponentEmail) {
            await sendEmail({
              to: [opponentEmail],
              subject: "You have been invited to a bet",
              template: "bet-invitation-new-user",
              params: { 
                link: opponentInviteLink,
                expiresAt: opponentInvitation.tokenExpiresAt,
                registerLink: `${process.env.CLIENT_BASE_URL}/register?email=${encodeURIComponent(opponentEmail)}`
              },
            });
          }
        if (opponentEmail) {
            await sendEmail({
              to: [opponentEmail],
              subject: "You have been invited to a bet",
              template: "bet-invite",
              params: { 
                link: opponentInviteLink,
                expiresAt: opponentInvitation.tokenExpiresAt
              },
            });
          }
    
          if (opponentId) {
            await createNotification(
              [opponentId],
              "BET_INVITE",
              "You have been invited to a bet",
              "Join this bet using this link",
              opponentInviteLink,
              bet.id
            );
          }

        // Create witness records and invitations
        if (input.betType === "WITH_WITNESSES") {
          for (const witness of input.witnesses) {
            const existingUser = existingWitnessUsers.find(
              (u) =>
                (witness.type === "user" && u.id === witness.value) ||
                (witness.type === "email" && u.email === witness.value)
            );

            // Create witness record
            const witnessRecord = await tx.witness.create({
              data: {
                betId: bet.id,
                userId: existingUser?.id || null,
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

            const witnessInviteLink = `${process.env.CLIENT_BASE_URL}/witness/join/${witnessRecord.token}`;
            const recipientEmail =
              witness.type === "email" ? witness.value : existingUser?.email;

            if (recipientEmail) {
              await sendEmail({
                to: [recipientEmail],
                subject: "You have been invited as a witness",
                template: "witness-invite",
                params: { link: witnessInviteLink },
              });
            }

            console.log("existing user:", existingUser?.id)

            if (existingUser) {
              await createNotification(
                [existingUser.id],
                "WITNESS_INVITE",
                "You have been invited to witness a bet",
                "Join this bet as a witness using this link",
                witnessInviteLink,
                bet.id
              );
            }
          }
        }

        return bet;
      });
    } catch (error) {
      throw new Error(String(error));
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
  ): Promise<IBet | null> {
    if (!userId) {
      throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find invitation with session to ensure consistency
      const invitation = await BetInvitation.findById(invitationId)
        .populate({
          path: "betId",
          select: "title creatorId creatorStake opponentId opponentStake",
        })
        .populate({
          path: "creatorId",
          select: "email name",
        })
        .session(session);

      if (!invitation) {
        throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND);
      }

      if (invitation.status !== "pending") {
        throw new ConflictException(
          StringConstants.BET_ALREADY_ACCEPTED_REJECTED
        );
      }

      const bet = invitation.betId;
      if (!bet) {
        throw new NotFoundException(
          "Bet associated with the invitation not found"
        );
      }

      // Subtract wallet balance within transaction
      await subtractWalletBalance(userId, opponentStake, session);

      // Update bet
      bet.opponentStake = opponentStake;
      bet.predictions.opponentPrediction = opponentPrediction;
      bet.status = "accepted";
      bet.totalStake = opponentStake + bet.creatorStake;
      await bet.save({ session });

      invitation.status = "accepted";
      await invitation.save({ session });

      const user = invitation.creatorId;

      await lockFunds(
        {
          betId: bet._id,
          creatorId: bet.creatorId,
          creatorStake: bet.creatorStake,
          opponentId: bet.opponentId,
          opponentStake: bet.opponentStake,
          status: "locked",
        },
        session
      );

      const betLink = `${process.env.CLIENT_BASE_URL}/bets/${bet._id}`;

      // Create notification and send email before committing transaction
      try {
        await Promise.all([
          notificationService.createNotification(
            [bet.creatorId],
            "bet-invite",
            "Bet Accepted",
            `Your bet "${bet.title}" has been accepted`,
            betLink,
            bet._id,
            session
          ),
          sendEmail({
            to: user.email,
            subject: "Bet Accepted",
            template: "bet-accepted",
            params: {
              firstName: user.name,
              betTitle: bet.title,
              betId: bet._id.toString(),
            },
          }),
        ]);
      } catch (error) {
        await session.abortTransaction();
        throw new Error("Failed to send notification or email");
      }

      await session.commitTransaction();
      return invitation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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
        `${process.env.CLIENT_BASE_URL}/bets/${bet._id}`,
        bet._id
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
