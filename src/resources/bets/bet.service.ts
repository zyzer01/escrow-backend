import { Types } from 'mongoose';
import BetInvitation from './models/bet-invitation.model';
import Bet, { IBet } from './models/bet.model'
import Witness from './witnesses/witness.model';
import { lockFunds, refundFunds, releaseFunds } from '../escrow/escrow.service';
import User from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { createNotification } from '../notifications/notification.service';
import { selectNeutralWitness } from '../../lib/utils/neutralWitness';
import { NotFoundException } from '../../common/errors/NotFoundException';
import { BadRequestException } from '../../common/errors/BadRequestException';
import { ConflictException } from '../../common/errors/ConflictException';
import { UnprocessableEntityException } from '../../common/errors/UnprocessableEntityException';
import { sendEmail } from '../../mail/mail.service';
import Escrow from '../escrow/escrow.model';
import { UnauthorizedException } from '../../common/errors';

export async function createBet(userId: string, betData: IBet, designatedWitnesses: Types.ObjectId[]): Promise<IBet> {

    if (!betData.opponentId) {
        throw new NotFoundException(StringConstants.OPPONENT_ID_MISSING);
    }
    if (betData.opponentId.toString() === userId) {
        throw new BadRequestException(StringConstants.CANNOT_BE_OWN_OPPONENT);
    }
    if (designatedWitnesses.length > 0 && (designatedWitnesses.length < 2 || designatedWitnesses.length > 3)) {
        throw new BadRequestException(StringConstants.INSUFFICIENT_WITNESS_DESIGNATION);
    }

    if (designatedWitnesses.length > 0) {
        const witnessStringIds = designatedWitnesses.map(id => id.toString());
        if (witnessStringIds.includes(userId) || witnessStringIds.includes(betData.opponentId.toString())) {
            throw new BadRequestException(StringConstants.INVALID_WITNESS_ASSIGNMENT);
        }

        const validWitnessIds = await User.find({ _id: { $in: designatedWitnesses } }).distinct('_id');
        if (validWitnessIds.length !== designatedWitnesses.length) {
            throw new NotFoundException(StringConstants.WITNESS_DOES_NOT_EXIST);
        }
    }

    let neutralWitnessId = null;

    if (designatedWitnesses.length === 2) {
        const neutralWitness = await selectNeutralWitness(designatedWitnesses);
        neutralWitnessId = neutralWitness._id;
        designatedWitnesses.push(neutralWitnessId);
    }

    const bet = new Bet({
        ...betData,
        creatorId: userId
    });
    bet.witnesses = designatedWitnesses;
    await bet.save();

    if (designatedWitnesses.length > 0) {
        for (const witnessId of designatedWitnesses) {
            const witnessType = witnessId === neutralWitnessId ? 'neutral' : 'user-designated';
            const witness = new Witness({
                betId: bet._id,
                userId: witnessId,
                type: witnessType,
            });
            await witness.save();
        }
    }

    const invitation = new BetInvitation({
        betId: bet._id,
        creatorId: userId,
        invitedUserId: betData.opponentId,
        creatorStake: betData.creatorStake,
    });
    await invitation.save();

    const escrow = new Escrow({
        betId: bet._id,
        creatorId: bet.creatorId,
        creatorStake: bet.creatorStake
    })
    await escrow.save();

    const opponentInviteLink = `${process.env.CLIENT_BASE_URL}/invite/${invitation._id}`;
    const witnessInviteLink = `${process.env.CLIENT_BASE_URL}/witness/invite/${invitation._id}`;

    await createNotification(
        [betData.opponentId.toString()],
        "bet-invite",
        "Bet Invitation",
        `You have been invited to a bet by ${userId}`,
        opponentInviteLink,
        bet._id,
    );

    await createNotification(
        designatedWitnesses.map(witnessId => witnessId.toString()),
        "witness-invite",
        "Witness Invitation",
        `You have been invited to witness a bet`,
        witnessInviteLink,
        bet._id
    );

    return bet;
}

/**
 * Updates a bet.
 * @param betId - The ID of the bet to update.
 * @param betData - The update data of the bet.
 */

export async function updateBet(betId: string, betData: Partial<IBet>): Promise<IBet | null> {
    const bet = await Bet.findById(betId)
    console.log(bet)
    if (!bet) {
        throw new NotFoundException(StringConstants.BET_NOT_FOUND)
    }
    if (bet.status !== 'pending') {
        throw new ConflictException(StringConstants.BET_ALREADY_ACCEPTED_ENGAGED)
    }
    return Bet.findByIdAndUpdate(betId, betData)
}

/**
 * Accepts a bet invitation.
 * @param betId - The ID of the bet to accept.
 */

export async function acceptBetInvitation(invitationId: string, opponentStake: number, opponentPrediction: string): Promise<IBet | null> {

    const invitation = await BetInvitation.findById(invitationId).populate('betId');

    console.log(invitation);

    if (!invitation) {
        throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND)
    }
    if (invitation.status !== 'pending') {
        throw new ConflictException(StringConstants.BET_ALREADY_ACCEPTED_REJECTED)
    }

    const bet = invitation.betId;
    if (!bet) {
        throw new NotFoundException('Bet associated with the invitation not found');
    }

    bet.opponentStake = opponentStake;
    bet.predictions.opponentPrediction = opponentPrediction;
    bet.status = "accepted";
    bet.totalStake = opponentStake + bet.creatorStake
    await bet.save();

    invitation.status = 'accepted';
    await invitation.save();

    await lockFunds({
        betId: bet._id,
        creatorId: bet.creatorId,
        creatorStake: bet.creatorStake,
        opponentId: bet.opponentId,
        opponentStake: bet.opponentStake,
        status: 'locked'
    });

    await createNotification([bet.opponentId], "bet-invite", "Bet Invite", `Your have been invited to a bet "${bet.title}"`, bet._id);

    return invitation
}

/**
 * Rejects a bet invitation.
 * @param betId - The ID of the bet to reject.
 */

export async function rejectBetInvitation(id: string): Promise<IBet | null> {
    const invitation = await BetInvitation.findById(id)
        .populate({
            path: 'betId',
            select: 'title'
        })
        .populate({
            path: 'creatorId',
            select: 'firstName email',
        });

    if (!invitation) {
        throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND);
    }
    if (invitation.status !== 'pending') {
        throw new ConflictException(StringConstants.BET_ALREADY_ACCEPTED_REJECTED);
    }

    invitation.status = 'rejected';
    await invitation.save();

    const bet = invitation.betId;
    const user = invitation.creatorId;

    try {
        await createNotification(
            [user._id.toString()],
            "bet-invite",
            "Bet Rejected",
            `Your bet "${bet.title}" to your opponent has been rejected.`,
            `${process.env.CLIENT_BASE_URL}/bets/${bet._id}`,
            bet._id
        );

        await sendEmail({
            to: user.email,
            subject: 'Your Opponent Rejected The Invite',
            template: 'bet-rejected',
            params: { firstName: user.firstName, betTitle: bet.title, betId: bet._id.toString() },
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

export async function getBetInvitation(userId: string, invitationId: string): Promise<Response> {

    const invitation = await BetInvitation.findOne({
        _id: invitationId,
        invitedUserId: userId
    }).populate('betId');

    if (!invitation) {
        throw new NotFoundException(StringConstants.BET_INVITATION_NOT_FOUND)
    }

    return invitation;
}


/**
 * Engages the bet by setting the state to active.
 * @param betId - The ID of the bet to engage.
 */

export async function engageBet(betId: string): Promise<IBet | null> {

    const bet = await Bet.findById(betId);

    if (bet.status !== 'accepted') {
        throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE)
    }
    if (bet.betType === 'with-witnesses') {
        const pendingWitnesses = await Witness.find({ betId: bet._id, status: { $ne: 'accepted' } });

        if (pendingWitnesses.length > 0) {
            throw new BadRequestException(StringConstants.PENDING_WITNESS);
        }
    }

    bet.status = 'active';
    await bet.save();

    await createNotification(
        [bet.creatorId, bet.opponentId],
        "bet-engaged",
        "Bet activated",
        `Your bet ${bet.title} has been activated`,
        bet._id
    );

    return bet
}

/**
 * Settles the bet by determining the winner, releasing funds from escrow, and closing the bet.
 * @param betId - The ID of the bet to settle.
 * @param winnerId - The ID of the winner to settle.
 */

export async function settleBet(betId: string, winnerId: string): Promise<IBet | null> {
    const bet = await Bet.findById(betId);

    if (!bet) {
        throw new NotFoundException(StringConstants.BET_NOT_FOUND);
    }
    if (bet.betType === 'with-witnesses' && bet.status !== 'verified') {
        throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
    }
    if (bet.betType === 'without-witnesses' && bet.status !== 'active') {
        throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE);
    }
    if (!winnerId) {
        throw new UnprocessableEntityException(StringConstants.BET_WINNER_NOT_DETERMINED);
    }

    await releaseFunds(bet._id, winnerId);

    await User.updateOne({ _id: bet.creatorId }, { $inc: { bets_participated: 1 } });

    if (bet.opponentId) {
        await User.updateOne({ _id: bet.opponentId }, { $inc: { bets_participated: 1 } });
    }

    const witnesses = bet.witnesses;
    for (const witness of witnesses) {
        await User.updateOne({ _id: witness.userId }, { $inc: { bets_witnessed: 1 } });
    }

    bet.status = 'settled';
    bet.winnerId = winnerId;
    await bet.save();

    await createNotification(
        [winnerId],
        "bet-settled",
        StringConstants.NOTIFY_BET_WINNER_TITLE,
        "You won! Congratulations",
        bet._id
    );
    const loserId = bet.creatorId.toString() === winnerId.toString() ? bet.opponentId.toString() : bet.creatorId.toString();
    await createNotification(
        [loserId],
        "bet-settled",
        StringConstants.NOTIFY_BET_LOSER_TITLE,
        "You lost the bet. What is cashout?",
        bet._id
    );

    return bet;
}



/**
 * Cancels the a bet.
 * @param betId - The ID of the bet to cancel.
 */
export async function cancelBet(betId: string): Promise<IBet | null> {

    const bet = await Bet.findById(betId);

    if (!bet || bet.status !== 'accepted') {
        throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE)
    }

    await refundFunds(betId);

    bet.status = 'canceled';
    await bet.save();

    await createNotification([bet.creatorId, bet.opponentId], "bet-cancelled", "You cancelled a bet", `Your bet "${bet.title}" has been cancelled`, bet._id);

    return bet;
};


/**
 * Reverses the outcome of a bet by paying out the new winner.
 * Reuses the releaseFunds function.
 * @param betId - The ID of the bet to reverse.
 */
export async function reverseBetOutcome(betId: string): Promise<void> {
    const bet = await Bet.findById(betId);
    if (!bet) {
        throw new NotFoundException('Bet not found.');
    }

    const originalWinnerId = bet.winnerId;
    if (!originalWinnerId) {
        throw new NotFoundException('Bet does not have a winner to reverse.');
    }

    const newWinnerId = (bet.creatorId.toString() === originalWinnerId.toString())
        ? bet.opponentId
        : bet.creatorId;

    if (!newWinnerId) {
        throw new NotFoundException('No opponent available to reverse outcome.');
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
export async function getBetHistory(userId: Types.ObjectId): Promise<IBet[]> {
    const bets = await Bet.find({
        $or: [
            { creatorId: userId },
            { opponentId: userId },
            { witnesses: userId }
        ],
        status: { $in: ['closed', 'canceled', 'settled'] }
    }).sort({ createdAt: -1 });

    return bets;
}

export async function getBets(userId: string): Promise<IBet[]> {
    return Bet.find({ $or: [{ creatorId: userId }, { opponentId: userId }] }).sort({ createdAt: -1 });
}

export async function getBet(userId: string, betId: string): Promise<IBet | null> {
    if (!userId) {
        throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
    }

    const bet = await Bet.findOne({
        _id: betId,
        $or: [
            { creatorId: userId },
            { opponentId: userId }
        ]
    });

    if (!bet) {
        throw new NotFoundException(StringConstants.BET_NOT_FOUND);
    }

    return bet;
}


export async function deleteBet(id: string): Promise<IBet | null> {
    return Bet.findByIdAndDelete(id).exec();
}




