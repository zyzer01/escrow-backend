
import { StringConstants } from '../../common/strings';
import { reverseBetOutcome } from '../bets/bet.service';
import Bet from '../bets/models/bet.model';
import { refundFunds } from '../escrow/escrow.service';
import { createNotification } from '../notifications/notification.service';
import User from '../users/user.model';
import BetDispute, { IBetDispute } from './bet-dispute.model';

export async function logDispute(betId: string, userId: string, reason: string): Promise<void> {
    const bet = await Bet.findById(betId);
    const user = await User.findById(userId);

    if (!bet) throw new Error(StringConstants.BET_NOT_FOUND);
    if (!user) throw new Error(StringConstants.USER_NOT_FOUND);

    const existingDispute = await BetDispute.findOne({ betId, status: 'open' });
    if (existingDispute) {
        throw new Error(StringConstants.DISPUTE_ALREADY_OPEN);
    }

    const newDispute = new BetDispute({
        betId,
        reportedBy: userId,
        reason,
    });

    bet.status = 'disputed';
    await bet.save();

    await newDispute.save();
    console.log('Dispute logged successfully, and bet is frozen');

    await createNotification(
        bet.creatorId,
        "bet-dispute",
        StringConstants.NOTIFY_BET_DISPUTE_CREATE_TITLE,
        `A dispute has been filed for your bet - '${bet.title}'`
    );
    await createNotification(
        bet.opponentId,
        "bet-dispute",
        StringConstants.NOTIFY_BET_DISPUTE_CREATE_TITLE,
        `A dispute has been filed for your bet - '${bet.title}'`
    );

    return newDispute;
}


export async function resolveDispute(disputeId: string, resolution: 'resolved' | 'rejected', action: 'refund' | 'reverse' | 'confirm'): Promise<void> {
    const dispute = await BetDispute.findById(disputeId);
    const bet = await Bet.findById(dispute.betId);

    if (!dispute) {
        throw new Error(StringConstants.DISPUTE_NOT_FOUND);
    }
    if (!bet) {
        throw new Error(StringConstants.BET_NOT_FOUND);
    }

    dispute.status = resolution;
    dispute.resolvedAt = new Date();

    if (resolution === 'resolved') {
        switch (action) {
            case 'refund':
                await refundFunds(bet._id);
                bet.status = 'refunded';
                break;
            case 'reverse':
                await reverseBetOutcome(bet._id);
                bet.status = 'reversed';
                break;
            case 'confirm':
                bet.status = 'closed';
                break;
        }
    } else {
        bet.status = 'verified';
    }

    await bet.save();
    await dispute.save();
    console.log(`Dispute ${resolution} and action ${action} successfully applied`);
}


export async function getAllDisputes(): Promise<IBetDispute[]> {
    return await BetDispute.find().populate('betId').populate('reportedBy').sort({ createdAt: -1 });
}
