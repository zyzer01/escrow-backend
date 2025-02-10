import { BetInvitation, NotificationType, Prisma } from "@prisma/client";
import { BadRequestException, NotFoundException } from "../../../common/errors";
import { prisma } from "../../../lib/db";
import { validateEmail } from "../../../lib/utils/validators";
import { deductWalletBalanceTx } from "../../wallet/wallet.service";
import { ICreateBetInput } from "../interfaces/bet";
import { createNotification } from "../../notifications/notification.service";
import { sendEmail } from "../../../mail/mail.service";
import { nanoid } from "nanoid";

export class CreateBetProvider {
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
        ...input.witnesses.filter(w => w.type === "user").map(w => w.value),
      ];

      // Fetch all required users in a single query
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      });

      // Validate opponent and witnesses using pre-fetched data
      const { opponentId, opponentEmail, isOpponentExistingUser } =
        this.processOpponent(input.opponent, existingUsers, userId);

      if (input.betType === "WITH_WITNESSES") {
        this.validateWitnesses(
          input.witnesses,
          existingUsers,
          userId,
          opponentId,
          opponentEmail
        );
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
          opponentEmail,
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

      // Send emails and notifications after the transaction
    //   await this.sendPostTransactionEmailsAndNotifications(
    //     betResult.opponentInvitation,
    //     opponentId,
    //     opponentEmail,
    //     isOpponentExistingUser,
    //     input.witnesses,
    //     existingUsers
    //   );

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

  private validateWitnesses(
    witnesses: Array<{ type: string; value: string }>,
    existingUsers: Array<{ id: string; email: string }>,
    creatorId: string,
    opponentId: string | null,
    opponentEmail: string | null
  ): void {
    const witnessUserIds = witnesses
      .filter(w => w.type === "user")
      .map(w => w.value);
  
    // Check if witnesses include creator or opponent
    if (
      witnessUserIds.includes(creatorId) ||
      (opponentId && witnessUserIds.includes(opponentId))
    ) {
      throw new BadRequestException("Creator or opponent cannot be witnesses");
    }
  
    // Check if all user-type witnesses exist
    const missingWitnesses = witnessUserIds.filter(
      id => !existingUsers.some(u => u.id === id)
    );
  
    if (missingWitnesses.length > 0) {
      throw new NotFoundException(`Witness users not found: ${missingWitnesses.join(", ")}`);
    }
  }

  // Helper function to create opponent invitation
  private async createOpponentInvitation(
    tx: Prisma.TransactionClient,
    betId: string,
    creatorId: string,
    opponentId: string | null,
    opponentEmail: string | null,
  ) {
    return await tx.betInvitation.create({
      data: {
        betId,
        creatorId,
        invitedUserId: opponentId,
        invitedEmail: opponentId ? null : opponentEmail,
        status: "PENDING",
        token: nanoid(),
        tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Helper function to create witness invitations
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
          tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    await Promise.all(witnessCreations);
  }

  // Helper function to send emails and notifications after the transaction
  private async sendPostTransactionEmailsAndNotifications(
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
}

export const createBetProvider = new CreateBetProvider();