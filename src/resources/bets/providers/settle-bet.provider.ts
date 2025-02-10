import { Bet, NotificationType } from "@prisma/client";
import {
  NotFoundException,
  UnprocessableEntityException,
} from "../../../common/errors";
import { StringConstants } from "../../../common/strings";
import { prisma } from "../../../lib/db";
import { notificationService } from "../../notifications/notification.service";
import { EscrowService } from "../../escrow/escrow.service";
import { inject, injectable } from "inversify";

@injectable()
export class SettleBetProvider {
  constructor(@inject(EscrowService) private escrowService: EscrowService) {}

  public async settleBet(betId: string, winnerId: string): Promise<Bet | null> {
    if (!winnerId) {
      throw new UnprocessableEntityException(
        StringConstants.BET_WINNER_NOT_DETERMINED
      );
    }

    try {
      const updatedBet = await prisma.$transaction(async (tx) => {
        // Fetch the bet with witnesses
        const bet = await tx.bet.findUnique({
          where: { id: betId },
          include: {
            witnesses: {
              select: {
                userId: true,
              },
            },
          },
        });

        if (!bet) {
          throw new NotFoundException(StringConstants.BET_NOT_FOUND);
        }

        // Validate bet state based on bet type
        if (
          (bet.betType === "WITH_WITNESSES" && bet.status !== "VERIFIED") ||
          (bet.betType === "WITHOUT_WITNESSES" && bet.status !== "ACTIVE")
        ) {
          throw new UnprocessableEntityException(
            StringConstants.INVALID_BET_STATE
          );
        }

        await tx.profile.update({
          where: { userId: bet.creatorId },
          data: { totalBets: { increment: 1 } },
        });

        if (bet.opponentId) {
          await tx.profile.update({
            where: { userId: bet.opponentId },
            data: { totalBets: { increment: 1 } },
          });
        }

        for (const witness of bet.witnesses) {
          if (witness.userId) {
            await tx.profile.update({
              where: { userId: witness.userId },
              data: { betsWitnessed: { increment: 1 } },
            });
          }
        }

        // Identify loser
        const loserId =
          bet.creatorId === winnerId ? bet.opponentId : bet.creatorId;

        await tx.profile.update({
          where: { userId: winnerId },
          data: { betsWon: { increment: 1 } },
        });

        if (loserId) {
          await tx.profile.update({
            where: { userId: loserId },
            data: { betsLost: { increment: 1 } },
          });
        }

        const updatedBet = await tx.bet.update({
          where: { id: bet.id },
          data: {
            status: "SETTLED",
            winnerId,
          },
        });

        // Release funds from escrow
        await this.escrowService.releaseFunds(tx, betId, winnerId);

        await notificationService.createNotification({
          userId: winnerId,
          type: NotificationType.BET_SETTLED,
          title: StringConstants.NOTIFY_BET_WINNER_TITLE,
          message: "You won! Congratulations",
          params: { betId: bet.id },
        });

        if (loserId) {
          await notificationService.createNotification({
            userId: loserId,
            type: NotificationType.BET_SETTLED,
            title: StringConstants.NOTIFY_BET_LOSER_TITLE,
            message: "You lost the bet. What is cashout?",
            params: { betId: bet.id },
          });
        }

        return updatedBet;
      });

      return updatedBet;
    } catch (error) {
      console.error("Failed to settle bet:", error);
      throw new Error(`Failed to settle bet: ${error}`);
    }
  }
}
