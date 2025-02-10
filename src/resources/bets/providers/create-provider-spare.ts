// public async createBet(userId: string, input: ICreateBetInput) {
//     try {
//       if (input.witnesses.length > 0 && input.witnesses.length !== 3) {
//         throw new BadRequestException("Exactly 3 witnesses are required");
//       }

//       return await prisma.$transaction(async (tx) => {
//         // Fetch creator
//         const creator = await tx.user.findUnique({
//           where: { id: userId },
//           select: { id: true, email: true },
//         });

//         if (!creator) {
//           throw new NotFoundException("User not found");
//         }

//         // Handle opponent
//         const { opponentId, opponentEmail, isOpponentExistingUser } =
//           await this.processOpponent(tx, input.opponent, creator);

//         // Process witnesses
//         if (input.betType === "WITH_WITNESSES") {
//           await this.validateWitnesses(
//             tx,
//             input.witnesses,
//             creator,
//             opponentId,
//             opponentEmail
//           );
//         }

//         // Deduct stake from creator's wallet
//         await deductWalletBalanceTx(tx, userId, input.creatorStake, "STAKE");

//         // Create bet
//         const bet = await tx.bet.create({
//           data: {
//             title: input.title,
//             description: input.description,
//             creatorStake: input.creatorStake,
//             opponentStake: input.opponentStake,
//             deadline: input.deadline,
//             betType: input.betType,
//             creatorId: userId,
//             opponentId,
//             opponentEmail: opponentEmail,
//           }
//         });

//         // Create escrow
//         await tx.escrow.create({
//           data: {
//             betId: bet.id,
//             creatorId: userId,
//             creatorStake: input.creatorStake,
//           },
//         });

//         // Handle opponent invitation
//         await this.createOpponentInvitation(
//           tx,
//           bet.id,
//           userId,
//           opponentId,
//           opponentEmail,
//           isOpponentExistingUser
//         );

//         // Handle witnesses if required
//         if (input.betType === "WITH_WITNESSES") {
//           await this.createWitnessInvitations(tx, bet.id, input.witnesses);
//         }

//         return bet;
//       },
//       { timeout: 30000 } 
//     );
//     } catch (error) {
//       throw new Error(String(error));
//     }
//   }

//   private async processOpponent(
//     tx: Prisma.TransactionClient,
//     opponent: { type: string; value: string },
//     creator: { id: string; email: string }
//   ): Promise<{
//     opponentId: string | null;
//     opponentEmail: string | null;
//     isOpponentExistingUser: boolean;
//   }> {
//     let opponentId: string | null = null;
//     let opponentEmail: string | null = null;
//     let isOpponentExistingUser = false;

//     if (opponent.type === "user") {
//       const existingOpponent = await tx.user.findUnique({
//         where: { id: opponent.value },
//         select: { id: true, email: true },
//       });

//       if (!existingOpponent) {
//         throw new NotFoundException("Opponent user not found");
//       }

//       if (existingOpponent.id === creator.id) {
//         throw new BadRequestException("Cannot be your own opponent");
//       }

//       opponentId = existingOpponent.id;
//       opponentEmail = existingOpponent.email;
//       isOpponentExistingUser = true;
//     } else {
//       if (!validateEmail(opponent.value)) {
//         throw new BadRequestException("Invalid opponent email format");
//       }

//       if (opponent.value === creator.email) {
//         throw new BadRequestException("Cannot be your own opponent");
//       }

//       opponentEmail = opponent.value;

//       const existingUser = await tx.user.findUnique({
//         where: { email: opponentEmail },
//         select: { id: true },
//       });

//       if (existingUser) {
//         opponentId = existingUser.id;
//         isOpponentExistingUser = true;
//       }
//     }

//     return { opponentId, opponentEmail, isOpponentExistingUser };
//   }

//   private async validateWitnesses(
//     tx: Prisma.TransactionClient,
//     witnesses: Array<{ type: string; value: string }>,
//     creator: { id: string; email: string },
//     opponentId: string | null,
//     opponentEmail: string | null
//   ): Promise<void> {
//     const witnessUserIds = witnesses
//       .filter((w) => w.type === "user")
//       .map((w) => w.value);

//     const witnessEmails = witnesses
//       .filter((w) => w.type === "email")
//       .map((w) => w.value);

//     // Validate user-type witnesses exist
//     if (witnessUserIds.length > 0) {
//       const foundWitnessUsers = await tx.user.findMany({
//         where: { id: { in: witnessUserIds } },
//         select: { id: true },
//       });

//       const missingUserIds = witnessUserIds.filter(
//         (id) => !foundWitnessUsers.some((user) => user.id === id)
//       );

//       if (missingUserIds.length > 0) {
//         throw new NotFoundException(
//           `Witness users not found: ${missingUserIds.join(", ")}`
//         );
//       }
//     }

//     // Validate witnesses don't include creator or opponent
//     if (
//       [...witnessEmails, ...witnessUserIds].some(
//         (w) =>
//           w === creator.email ||
//           w === opponentEmail ||
//           w === creator.id ||
//           w === opponentId
//       )
//     ) {
//       throw new BadRequestException("Creator or opponent cannot be witnesses");
//     }
//   }

//   private async createOpponentInvitation(
//     tx: Prisma.TransactionClient,
//     betId: string,
//     creatorId: string,
//     opponentId: string | null,
//     opponentEmail: string | null,
//     isOpponentExistingUser: boolean
//   ) {
//     const invitation = await tx.betInvitation.create({
//       data: {
//         betId,
//         creatorId,
//         invitedUserId: opponentId,
//         invitedEmail: opponentId ? null : opponentEmail,
//         status: "PENDING",
//         token: nanoid(),
//         tokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
//       },
//     });

//     const inviteLink = `${process.env.CLIENT_BASE_URL}/bet/join/${invitation.token}`;

//     if (isOpponentExistingUser && opponentId && opponentEmail) {
//       await Promise.all([
//         createNotification({
//           userId: opponentId,
//           type: NotificationType.BET_INVITE,
//           title: "You have been invited to a bet",
//           message: "Join this bet using this link",
//           link: inviteLink,
//         }),
//         sendEmail({
//           to: opponentEmail,
//           subject: "You have been invited to a bet",
//           template: "bet-invite",
//           params: {
//             link: inviteLink,
//             expiresAt: invitation.tokenExpiresAt,
//           },
//         }),
//       ]);
//     } else if (opponentEmail) {
//       await sendEmail({
//         to: opponentEmail,
//         subject: "You have been invited to a bet",
//         template: "bet-invite",
//         params: {
//           link: inviteLink,
//           expiresAt: invitation.tokenExpiresAt,
//           registerLink: `${
//             process.env.CLIENT_BASE_URL
//           }/register?email=${encodeURIComponent(opponentEmail)}`,
//         },
//       });
//     }

//     return invitation;
//   }

//   private async createWitnessInvitations(
//     tx: Prisma.TransactionClient,
//     betId: string,
//     witnesses: Array<{ type: string; value: string }>
//   ): Promise<void> {
//     // First fetch all existing users in one query
//     const existingWitnessUsers = await tx.user.findMany({
//       where: {
//         OR: [
//           {
//             id: {
//               in: witnesses
//                 .filter((w) => w.type === "user")
//                 .map((w) => w.value),
//             },
//           },
//           {
//             email: {
//               in: witnesses
//                 .filter((w) => w.type === "email")
//                 .map((w) => w.value),
//             },
//           },
//         ],
//       },
//       select: { id: true, email: true },
//     });

//     for (const witness of witnesses) {
//       const existingUser = existingWitnessUsers.find(
//         (u) =>
//           (witness.type === "user" && u.id === witness.value) ||
//           (witness.type === "email" && u.email === witness.value)
//       );

//       const witnessRecord = await tx.witness.create({
//         data: {
//           betId,
//           userId:
//             witness.type === "user" ? witness.value : existingUser?.id || null,
//           email:
//             witness.type === "email"
//               ? witness.value
//               : existingUser?.email || null,
//           type: "USER_DESIGNATED",
//           status: "PENDING",
//           token: nanoid(),
//           tokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
//         },
//       });

//       const inviteLink = `${process.env.CLIENT_BASE_URL}/witness/join/${witnessRecord.token}`;
//       const recipientEmail =
//         witness.type === "email" ? witness.value : existingUser?.email;

//       if (existingUser) {
//         await Promise.all([
//           createNotification({
//             userId: existingUser.id,
//             type: "WITNESS_INVITE",
//             title: "You have been invited to witness a bet",
//             message: "Join this bet as a witness using this link",
//             link: inviteLink,
//           }),
//           sendEmail({
//             to: existingUser.email,
//             subject: "You have been invited as a witness",
//             template: "witness-invite",
//             params: {
//               link: inviteLink,
//               expiresAt: witnessRecord.tokenExpiresAt,
//             },
//           }),
//         ]);
//       } else if (recipientEmail) {
//         await sendEmail({
//           to: recipientEmail,
//           subject: "You have been invited as a witness",
//           template: "witness-invite",
//           params: {
//             link: inviteLink,
//             expiresAt: witnessRecord.tokenExpiresAt,
//             registerLink: `${
//               process.env.CLIENT_BASE_URL
//             }/register?email=${encodeURIComponent(recipientEmail)}`,
//           },
//         });
//       }
//     }
//   }

// }