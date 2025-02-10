import { Bet, EscrowStatus, InvitationStatus, NotificationType } from "@prisma/client";
import { ConflictException, NotFoundException, UnauthorizedException } from "../../../common/errors";
import { StringConstants } from "../../../common/strings";
import { prisma } from "../../../lib/db";
import { notificationService } from "../../notifications/notification.service";
import { sendEmail } from "../../../mail/mail.service";
import { injectable } from "inversify";
import { deductWalletBalanceTx } from "../../wallet/wallet.service";

@injectable()
export class AcceptBetInvitationProvider {
  public async acceptBetInvitation(
    userId: string,
    invitationId: string,
    opponentStake: number,
    opponentPrediction: string
  ): Promise<Bet | null> {
    if (!userId) {
      throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
    }

    try {
      const updatedBet = await prisma.$transaction(async (tx) => {
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
                betType: true,
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
          throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND);
        }

        if (bet.creatorId === userId) {
          throw new ConflictException(StringConstants.CANNOT_ACCEPT_OWN_BET);
        }

        // Deduct wallet balance within transaction
        await deductWalletBalanceTx(tx, userId, opponentStake, "STAKE");

        // Update bet
        const updatedBet = await tx.bet.update({
          where: { id: bet.id },
          data: {
            opponentStake: opponentStake,
            opponentId: userId,
            status: bet.betType === "WITHOUT_WITNESSES" ? "ACTIVE" : "ACCEPTED",
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
            betId: bet.id,
          },
          data: {
            opponentId: userId,
            opponentStake: opponentStake,
            status: EscrowStatus.LOCKED,
          },
        });

        // Send notifications after the transaction is complete
        this.sendBetAcceptanceNotifications(invitation);

        return updatedBet;
      });

      return updatedBet;
    } catch (error) {
      console.error("Failed to accept bet:", error);
      throw new Error(`Failed to accept bet: ${String(error)}`);
    }
  }

  // Handle notifications and emails after transaction
  private async sendBetAcceptanceNotifications(
    invitation: {
      bet: {
        id: string;
        title: string;
        creatorId: string;
      };
      creator: {
        id: string;
        email: string;
        name: string;
      } | null;
    }
  ) {
    const betLink = `${process.env.CLIENT_BASE_URL}/bets/${invitation.bet.id}`;

    try {
      await Promise.all([
        notificationService.createNotification({
          userId: invitation.bet.creatorId,
          type: NotificationType.BET_INVITE,
          title: "Bet Accepted",
          message: `Your bet "${invitation.bet.title}" has been accepted`,
          params: {
            link: betLink,
          },
        }),
        sendEmail({
          to: invitation.creator?.email || "",
          subject: "Bet Accepted",
          template: "bet-accepted",
          params: {
            firstName: invitation.creator?.name || "Chief",
            betTitle: invitation.bet.title,
            betId: invitation.bet.id,
          },
        }),
      ]);
    } catch (error) {
      console.error("Failed to send notification or email:", error);
    }
  }
}
