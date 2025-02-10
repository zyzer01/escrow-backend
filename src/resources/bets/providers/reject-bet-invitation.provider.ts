import { InvitationStatus, NotificationType } from "@prisma/client";
import { ConflictException, NotFoundException } from "../../../common/errors";
import { StringConstants } from "../../../common/strings";
import { prisma } from "../../../lib/db";
import { notificationService } from "../../notifications/notification.service";
import { sendEmail } from "../../../mail/mail.service";
import { injectable } from "inversify";

@injectable()
export class RejectBetInvitationProvider {
  public async rejectBet(invitationId: string): Promise<any> {
    const invitation = await prisma.betInvitation.findUnique({
      where: { id: invitationId },
      include: {
        bet: { select: { id: true, title: true } },
        creator: { select: { id: true, name: true, email: true } },
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

    const updatedInvitation = await prisma.betInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REJECTED },
      include: {
        bet: { select: { id: true, title: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // Send notifications after successful transaction
    // try {
    //   if (!invitation.creator) {
    //     throw new NotFoundException("invitations");
    //   }
    //   const betLink = `${process.env.CLIENT_BASE_URL}/bets/${invitation.bet.id}`;
    //   const firstName = invitation.creator.name.split(" ")[0];

    //   await Promise.all([
    //     notificationService.createNotification({
    //       userId: invitation.creator.id,
    //       type: NotificationType.BET_INVITE,
    //       title: "Bet Rejected",
    //       message: `Your bet "${invitation.bet.title}" to your opponent has been rejected.`,
    //       params: { link: betLink },
    //     }),
    //     sendEmail({
    //       to: invitation.creator.email,
    //       subject: "Your Opponent Rejected The Invite",
    //       template: "bet-rejected",
    //       params: { firstName, betTitle: invitation.bet.title, betId: invitation.bet.id },
    //     }),
    //   ]);
    // } catch (error) {
    //   console.error("Failed to send notification or email:", error);
    // }

    return updatedInvitation;
  }
}
