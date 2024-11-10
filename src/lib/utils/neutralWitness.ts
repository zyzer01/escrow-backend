import { Types } from "mongoose";
import User from "../../resources/users/user.model";

export async function selectNeutralWitness(designatedWitnesses: Types.ObjectId[]) {
    const eligibleUsers = await User.find({
        isEligibleForNeutralWitness: true,
        _id: { $nin: designatedWitnesses }
    });

    if (eligibleUsers.length === 0) {
        throw new Error('No eligible neutral witnesses found.');
    }

    const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
    return eligibleUsers[randomIndex];
}
