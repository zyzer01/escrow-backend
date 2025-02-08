import { Types } from 'mongoose';
import BetInvitation from './models/bet-invitation.model';
import { Bet, IBet } from './models/bet.model'
import { lockFunds, refundFunds, releaseFunds } from '../escrow/escrow.service';
import User from '../users/user.model';
import { StringConstants } from '../../common/strings';
import { selectNeutralWitness } from '../../lib/utils/neutralWitness';
import { NotFoundException } from '../../common/errors/NotFoundException';
import { BadRequestException } from '../../common/errors/BadRequestException';
import { ConflictException } from '../../common/errors/ConflictException';
import { UnprocessableEntityException } from '../../common/errors/UnprocessableEntityException';
import { sendEmail } from '../../mail/mail.service';
import Escrow from '../escrow/escrow.model';
import { UnauthorizedException } from '../../common/errors';
import { notificationService } from './../notifications/notification.service';
import { subtractWalletBalance } from '../wallet/wallet.service';
import { BetPaginatedResponse } from '../../lib/types/bet';
import BetHistory, { IBetHistory } from './models/bet-history.model';
import { Verification } from '../auth/verification/verification.model';
import { Account } from '../auth/account/account.model';
import { Session } from '../auth/session/session.model';
import mongoose from 'mongoose';
import { Witness } from './witnesses/witness.model';
import { prisma } from '../../lib/db';

export const OPEN_STATUSES = ["pending", "accepted", "active", "verified"] as const;
export const HISTORY_STATUSES = ["closed", "canceled", "settled"] as const;

export class BetService {

    
    public async createBet(
        userId: string, 
        betData: IBet & { opponentEmail: string }, 
        witnessEmails: string[]
    ): Promise<IBet> {
        if (!betData.opponentEmail) {
            throw new BadRequestException(StringConstants.OPPONENT_EMAIL_MISSING);
        }
    
        if (witnessEmails.length > 0 && witnessEmails.length !== 3) {
            throw new BadRequestException(StringConstants.INSUFFICIENT_WITNESS_DESIGNATION);
        }
    
        // Check if opponent exists in database
        let opponentId: Types.ObjectId | null = null;
        const opponent = await User.findOne({ email: betData.opponentEmail });
        if (opponent) {
            opponentId = opponent._id;
            if (opponentId?.toString() === userId) {
                throw new BadRequestException(StringConstants.CANNOT_BE_OWN_OPPONENT);
            }
        }
    
        // Process witness emails
        const witnessUsers: Array<{ id?: Types.ObjectId, email: string }> = [];
        if (witnessEmails.length > 0) {
            // Validate that no witness email matches opponent or creator
            const creatorUser = await User.findById(userId);
            if (!creatorUser) {
                throw new NotFoundException(StringConstants.USER_NOT_FOUND);
            }
    
            if (witnessEmails.includes(creatorUser.email) || witnessEmails.includes(betData.opponentEmail)) {
                throw new BadRequestException(StringConstants.INVALID_WITNESS_ASSIGNMENT);
            }
    
            // Find existing users and prepare witness data
            for (const email of witnessEmails) {
                const witnessUser = await User.findOne({ email });
                witnessUsers.push({
                    id: witnessUser?._id,
                    email
                });
            }
        }
    
        // Subtract wallet balance
        await subtractWalletBalance(userId, betData.creatorStake);
    
        // Create bet
        const bet = new Bet({
            ...betData,
            creatorId: userId,
            opponentId // This might be null if opponent doesn't exist yet
        });
        
        await bet.save();
    
        // Create escrow
        const escrow = new Escrow({
            betId: bet._id,
            creatorId: bet.creatorId,
            creatorStake: bet.creatorStake
        });
        await escrow.save();
    
        // Handle witness invitations
        if (witnessUsers.length > 0) {
            const witnessPromises = witnessUsers.map(async (witness) => {
                try {
                    const witnessRecord = new Witness({
                        betId: bet._id,
                        userId: witness.id, // Might be undefined for non-existing users
                        email: witness.email,
                        type: 'user-designated',
                        status: 'pending'
                    });
    
                    const savedWitness = await witnessRecord.save();
                    const witnessInviteLink = `${process.env.CLIENT_BASE_URL}/witness/${savedWitness._id}`;
    
                    // Send email invitation
                    await sendEmail({
                        to: witness.email,
                        subject: 'Witness Invite',
                        template: 'witness-invite',
                        params: {
                            betTitle: bet.title,
                            inviteLink: witnessInviteLink
                        }
                    });
    
                    // Create in-app notification for existing users
                    if (witness.id) {
                        await notificationService.createNotification(
                            [witness.id.toString()],
                            "witness-invite",
                            "Witness Invitation",
                            `You have been invited to witness a bet: ${bet.title}`,
                            witnessInviteLink,
                        );
                    }
                } catch (error) {
                    console.error(`Failed to process witness invite for ${witness.email}:`, error);
                }
            });
    
            await Promise.all(witnessPromises);
        }
    
        // Create bet invitation
        const invitation = new BetInvitation({
            betId: bet._id,
            creatorId: userId,
            invitedUserId: opponentId,
            invitedEmail: betData.opponentEmail,
            creatorStake: betData.creatorStake,
        });
        await invitation.save();
    
        const opponentInviteLink = `${process.env.CLIENT_BASE_URL}/invite/${invitation._id}`;
    
        // Send email invitation to opponent
        await sendEmail({
            to: betData.opponentEmail,
            subject: "Bet Invite",
            template: "bet-invite",
            params: {
                inviteLink: opponentInviteLink
            }
        });
    
        // Create in-app notification for existing opponent
        if (opponentId) {
            await notificationService.createNotification(
                [opponentId.toString()],
                "bet-invite",
                "Bet Invitation",
                `You have been invited to a bet by ${userId}`,
                opponentInviteLink,
            );
        }
    
        return bet;
    }

    /**
     * Updates a bet.
     * @param betId - The ID of the bet to update.
     * @param betData - The update data of the bet.
     */

    public async updateBet(betId: string, betData: Partial<IBet>): Promise<IBet | null> {
        const bet = await prisma.bet.findUnique({
            where: {
                id: betId
            }
        })
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

    public async acceptBetInvitation(userId: string, invitationId: string, opponentStake: number, opponentPrediction: string): Promise<IBet | null> {
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
    
            if (invitation.status !== 'pending') {
                throw new ConflictException(StringConstants.BET_ALREADY_ACCEPTED_REJECTED);
            }
    
            const bet = invitation.betId;
            if (!bet) {
                throw new NotFoundException('Bet associated with the invitation not found');
            }
    
            // Subtract wallet balance within transaction
            await subtractWalletBalance(userId, opponentStake, session);
    
            // Update bet
            bet.opponentStake = opponentStake;
            bet.predictions.opponentPrediction = opponentPrediction;
            bet.status = "accepted";
            bet.totalStake = opponentStake + bet.creatorStake;
            await bet.save({ session });
    
            invitation.status = 'accepted';
            await invitation.save({ session });
    
            const user = invitation.creatorId;
    
            await lockFunds({
                betId: bet._id,
                creatorId: bet.creatorId,
                creatorStake: bet.creatorStake,
                opponentId: bet.opponentId,
                opponentStake: bet.opponentStake,
                status: 'locked'
            }, session);
    
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
                        subject: 'Bet Accepted',
                        template: 'bet-accepted',
                        params: {
                            firstName: user.name,
                            betTitle: bet.title,
                            betId: bet._id.toString()
                        },
                    })
                ]);
            } catch (error) {
                await session.abortTransaction();
                throw new Error('Failed to send notification or email');
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
                path: 'betId',
                select: 'title'
            })
            .populate({
                path: 'creatorId',
                select: 'name email',
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
                subject: 'Your Opponent Rejected The Invite',
                template: 'bet-rejected',
                params: { firstName: firstName, betTitle: bet.title, betId: bet._id.toString() },
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

        await notificationService.createNotification(
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

    public async settleBet(betId: string, winnerId: string): Promise<IBet | null> {
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

        await notificationService.createNotification(
            [winnerId],
            "bet-settled",
            StringConstants.NOTIFY_BET_WINNER_TITLE,
            "You won! Congratulations",
            bet._id
        );
        const loserId = bet.creatorId.toString() === winnerId.toString() ? bet.opponentId.toString() : bet.creatorId.toString();
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

        if (!bet || bet.status !== 'accepted') {
            throw new UnprocessableEntityException(StringConstants.INVALID_BET_STATE)
        }

        await refundFunds(betId);

        bet.status = 'canceled';
        await bet.save();

        await notificationService.createNotification([bet.creatorId, bet.opponentId], "bet-cancelled", "You cancelled a bet", `Your bet "${bet.title}" has been cancelled`, bet._id);

        return bet;
    };


    /**
     * Reverses the outcome of a bet by paying out the new winner.
     * Reuses the releaseFunds function.
     * @param betId - The ID of the bet to reverse.
     */
    public async reverseBetOutcome(betId: string): Promise<void> {
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
    public async getBetsHistory(
        userId: string,
        page: number = 1,
        limit: number = 10,
        filters: {
            status?: string;
            betType?: string;
            deadline?: Date;
        } = {}): Promise<BetPaginatedResponse<IBetHistory[]>> {

        if (!userId) {
            throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
        }

        const skip = (page - 1) * limit;

        // Build the query based on filters
        const query: any = {
            $or: [
                { creatorId: userId },
                { opponentId: userId },
                { witnesses: userId }
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
                $lt: new Date(new Date(filters.deadline).setDate(new Date(filters.deadline).getDate() + 1))
            };
        }

        const [bets, total] = await Promise.all([
            BetHistory.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit + 1),
            BetHistory.countDocuments(query)
        ]);

        const hasMore = bets.length > limit;
        const items = hasMore ? bets.slice(0, -1) : bets;

        return {
            items,
            hasMore,
            total
        };
    }

    public async getAllBets() {

        // const newVerification = new Verification({
        //     identifier: 'exampleIdentifier',
        //     value: 'someValue',
        //     expiresAt: new Date('2024-12-31T23:59:59'),
        //   });

        //   newVerification.save()
        //     .then((result) => {
        //       console.log('Verification saved:', result);
        //     })
        //     .catch((error) => {
        //       console.error('Error saving verification:', error);
        //     });

        // const newUser = new User({
        //     name: "John Doe",
        //     email: "john.doe@exampless.com",
        //     password: "hashedpassword123", // Use a library like bcrypt to hash passwords
        //     isVerified: true,
        //   });

        //   newUser.save()
        // .then((result) => {
        // console.log('Account saved:', result);
        // })
        // .catch((error) => {
        //     console.error('Error saving account:', error);
        // });

        //     const newSession = new Session({
        //         userId: "6773f6c1b139a14e86ee95d3", // Replace with actual user ID
        //         token: "secureRandomToken12345", // Generate a secure token
        //         expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Set expiration 1 hour from now
        //         ipAddress: "192.168.1.1", // Replace with actual IP address
        //         userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36", // Replace with actual user agent
        //         impersonatedBy: null, // If this session was created by another user, replace with their user ID
        //       });
        //   newSession.save()
        //     .then((result) => {
        //       console.log('Account saved:', result);
        //     })
        //     .catch((error) => {
        //       console.error('Error saving account:', error);
        //     });

        // const newUser = new User({
        //     username: "john_doe", // Unique and must be at least 3 characters
        //     name: "John Doe", // Required
        //     email: "johndoe@example.com", // Required, unique, and must be a valid email format
        //     emailVerified: false, // Default is false
        //     image: "https://example.com/avatar.jpg", // Optional profile image
        //     role: "user", // Default role is 'user'
        //     banned: false, // Default is false
        //     banReason: null, // Only set if the user is banned
        //     banExpires: null, // Only set if the user is banned temporarily
        //   });

        //   // Save the user to the database
        //   newUser.save()
        //     .then((result) => {
        //       console.log('User saved:', result);
        //     })
        //     .catch((error) => {
        //       console.error('Error saving user:', error);
        //     });


        return Bet.find()
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
            $or: [
                { creatorId: userId },
                { opponentId: userId }
            ]
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
                $lt: new Date(new Date(filters.deadline).setDate(new Date(filters.deadline).getDate() + 1))
            };
        }

        if (filters.q) {
            query.$and.push({
                $or: [
                    { title: { $regex: filters.q, $options: 'i' } },
                    { description: { $regex: filters.q, $options: 'i' } }
                ]
            });
        }

        const [bets, total] = await Promise.all([
            Bet.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit + 1),
            Bet.countDocuments(query)
        ]);

        const hasMore = bets.length > limit;
        const items = hasMore ? bets.slice(0, -1) : bets;

        return {
            items,
            hasMore,
            total
        };
    }


    public async getBet(userId: string, betId: string): Promise<IBet | null> {
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

    public async deleteBet(id: string): Promise<IBet | null> {
        return Bet.findByIdAndDelete(id).exec();
    }

}


export const betService = new BetService()
export const {
    reverseBetOutcome
} = new BetService()
