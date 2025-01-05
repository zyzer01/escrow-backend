import { Schema, model, Document, Types } from 'mongoose';

interface IProfile extends Document {
    userId: Types.ObjectId
    phone_number: string;
    country: string;
    government_id_verified: boolean;
    reputation_score: number;
    bets_participated: number;
    bets_witnessed: number;
    canWitness: boolean;
    isEligibleForNeutralWitness: boolean;
}

const ProfileSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phone_number: { type: String },
    country: { type: String },
    government_id_verified: { type: Boolean },
    reputation_score: { type: Number },
    bets_participated: { type: Number },
    bets_witnessed: { type: Number },
    canWitness: { type: Boolean, default: true },
    isEligibleForNeutralWitness: { type: Boolean }
});

const Profile = model<IProfile>('Profile', ProfileSchema);

export { IProfile, Profile };
