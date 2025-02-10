import { ClientSession } from "mongoose";
import {
  NotFoundException,
  UnprocessableEntityException,
} from "../../common/errors";
import { StringConstants } from "../../common/strings";
import {
  systemCommissionPercentage,
  witnessCommissionPercentage,
} from "../../config";
import { payoutFunds, refund, WalletService } from "../wallet/wallet.service";
import Escrow, { IEscrow } from "./escrow.model";
import { prisma } from "../../lib/db";
import { injectable } from "inversify";
import { Prisma } from "@prisma/client";

@injectable()
export class EscrowService {
  constructor(private walletService: WalletService) {}

  public async getEscrow(betId: string): Promise<Response> {
    const escrow = await Escrow.findOne({ betId }).populate({
      path: "betId",
      select:
        "title description creatorStake opponentStake totalStake status createdAt updatedAt",
    });

    if (!escrow) {
      throw new NotFoundException(StringConstants.ESCROW_NOT_FOUND);
    }

    return escrow;
  }

  /**
   * Get total stakes for a specific bet.
   * @param betId - The ID of the bet.
   * @returns Total stakes in the escrow.
   */
  public async getTotalStakes(betId: string): Promise<number> {
    const escrow = await Escrow.findOne({ betId });

    if (!escrow) {
      throw new NotFoundException(StringConstants.ESCROW_NOT_FOUND);
    }

    const totalStakes = escrow.creatorStake + escrow.opponentStake;
    return totalStakes;
  }

  /**
   * Locks funds for a bet in escrow.
   * @param lockFundsData - The data to lock funds (creatorId, creatorStake, opponentId, opponentStake).
   */
  public async lockFunds(
    lockFundsData: Partial<IEscrow>,
    session?: ClientSession
  ) {
    const lockedFunds = new Escrow(lockFundsData);
    await lockedFunds.save({ session });
  }

  /**
   * Releases funds from escrow to the winner, distributes system fee and witness fee.
   * @param betId -
   * @param winnerId -
   */
  private systemCommissionPercentage = systemCommissionPercentage; // Example: 10%
  private witnessCommissionPercentage = witnessCommissionPercentage; // Example: 5%

  public async releaseFunds(
    tx: Prisma.TransactionClient,
    betId: string,
    winnerId: string
  ): Promise<any> {
    const escrow = await tx.escrow.findUnique({ where: { betId } });
    if (!escrow) {
      throw new NotFoundException(StringConstants.ESCROW_NOT_FOUND);
    }

    const bet = await tx.bet.findUnique({ where: { id: betId } });
    if (!bet) {
      throw new NotFoundException(StringConstants.BET_NOT_FOUND);
    }

    if (
      bet.betType === "WITH_WITNESSES" &&
      !["verified", "disputed"].includes(bet.status)
    ) {
      throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
    }

    const totalStake = (escrow.creatorStake || 0) + (escrow.opponentStake || 0);
    const systemCommission = totalStake * this.systemCommissionPercentage;
    const witnessCommission = totalStake * this.witnessCommissionPercentage;
    const winnerShare = totalStake - systemCommission - witnessCommission;

    await this.addToSystemWallet(tx, systemCommission);
    await this.distributeWitnessCommission(tx, betId, witnessCommission);

    if (escrow.creatorId === winnerId) {
      await this.payoutFunds(tx, escrow.creatorId, winnerShare, betId);
    } else if (escrow.opponentId === winnerId) {
      await this.payoutFunds(tx, escrow.opponentId, winnerShare, betId);
    } else {
      throw new Error(StringConstants.INVALID_WINNER);
    }

    await tx.escrow.update({
      where: { betId },
      data: { status: "RELEASED" },
    });

    return escrow;
  }

  private async addToSystemWallet(tx: any, systemShare: number): Promise<void> {
    const systemWallet = await tx.wallet.upsert({
      where: { userId: "system" },
      update: { balance: { increment: systemShare } },
      create: { userId: "system", balance: systemShare },
    });

    await tx.walletTransaction.create({
      data: {
        userId: "system",
        amount: systemShare,
        type: "revenue",
        description: "System commission from bet",
        reference: "system-commission",
      },
    });
  }

  private async distributeWitnessCommission(
    tx: any,
    betId: string,
    witnessCommission: number
  ): Promise<void> {
    const witnesses = await tx.witness.findMany({
      where: { betId, status: "ACCEPTED" },
    });

    if (witnesses.length === 0) {
      throw new UnprocessableEntityException(
        StringConstants.NO_WITNESSES_FOR_COMMISSION
      );
    }

    const witnessShare = witnessCommission / witnesses.length;

    for (const witness of witnesses) {
      await this.payoutFunds(tx, witness.userId, witnessShare, betId);
    }
  }

  private async payoutFunds(
    tx: any,
    userId: string,
    amount: number,
    betId: string
  ): Promise<void> {
    await tx.wallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        amount,
        type: "payout",
        description: `Payout from Bet ID: ${betId}`,
        reference: `payout-${betId}`,
        betId,
      },
    });
  }

  /**
   * Refunds funds to both participants of a bet if the bet is cancelled.
   * @param betId - The ID of the bet.
   */
  public async refundFunds(tx: Prisma.TransactionClient, betId: string): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const escrow = await tx.escrow.findUnique({
        where: { betId },
      });

      if (!escrow) {
        throw new NotFoundException(StringConstants.ESCROW_NOT_FOUND);
      }

      // Refund the creator's stake
      if (escrow.creatorStake !== null && escrow.creatorStake > 0) {
        await this.walletService.refund(tx, escrow.creatorId, escrow.creatorStake, betId);
      }

      // Refund the opponent's stake (if it exists)
      if (escrow.opponentId && escrow.opponentStake !== null && escrow.opponentStake > 0) {
        await this.walletService.refund(tx, escrow.opponentId, escrow.opponentStake, betId);
      }

      // Update escrow status to "refunded"
      await tx.escrow.update({
        where: { betId },
        data: { status: "REFUNDED" },
      });

      return "Refunded";
    });
  }
}

export const escrowService = new EscrowService();
export const { lockFunds, releaseFunds, refundFunds } = new EscrowService();
