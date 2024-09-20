// import { IBet } from './interfaces'; // Assuming you have an interface for Bet
// import Bet from './models/Bet'; // Assuming the Bet model is in a file named models/Bet.ts
// import BetInvitation from './models/BetInvitation'; // Assuming the BetInvitation model is in a file named models/BetInvitation.ts
// import Witness from './models/Witness'; // Assuming the Witness model is in a file named models/Witness.ts
// import { getNeutralWitness } from './utils/neutralWitnessPool'; // Assuming you have a utility function to get a neutral witness

// export async function createBet(betData: IBet, designatedWitnesses: Types.ObjectId[]): Promise<IBet> {
//     try {
//         const bet = new Bet(betData);
//         const newBet = await bet.save(); // Await the save operation

//         // Add user-designated witnesses
//         for (const userId of designatedWitnesses) {
//             const witness = new Witness({
//                 betId: newBet._id,
//                 userId,
//                 type: 'user-designated',
//             });
//             await witness.save();
//             newBet.witnesses.push(witness._id);
//         }

//         // Add a neutral witness if there are fewer than 3 total witnesses
//         if (newBet.witnesses.length < 3) {
//             const neutralWitness = await getNeutralWitness();
//             const witness = new Witness({
//                 betId: newBet._id,
//                 userId: neutralWitness._id,
//                 type: 'neutral',
//             });
//             await witness.save();
//             newBet.witnesses.push(witness._id);
//         }

//         await newBet.save(); // Save the updated bet with witnesses

//         const invitation = new BetInvitation({
//             betId: newBet._id,
//             invitedUserId: betData.opponentId,
//             creatorStake: betData.creatorStake,
//         });

//         await invitation.save();

//         return newBet;
//     } catch (error) {
//         console.error("Error creating bet:", error);
//         throw error;
//     }
// }
