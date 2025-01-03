import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone_number?: string;
  role: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: number;
  government_id_verified: boolean;
  reputation_score: number;
  bets_participated: number;
  bets_witnessed: number;
  is_active: boolean;
  profilePicture?: string;
  isEmailVerified: boolean;
  isEligibleForNeutralWitness: boolean;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, unique: true, sparse: true, min: [3, 'Username cannot be less than 3 characters'] },
  email: { type: String, required: true, unique: true, match: [/.+\@.+\..+/, 'Invalid email'] },
  password: { type: String, min: [6, 'Password cannot be less than 6 characters'] },
  firstName: { type: String },
  lastName: { type: String },
  phone_number: { type: String },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  banned: { type: Boolean, default: false },
  banReason: { type: String },
  banExpires: { type: Number },
  reputation_score: { type: Number, default: 0 },
  bets_participated: { type: Number, default: 0, min: [0, 'Value cannot be less than 0'] },
  bets_witnessed: { type: Number, default: 0, min: [0, 'Value cannot be less than 0'] },
  is_active: { type: Boolean, default: true },
  isEligibleForNeutralWitness: { type: Boolean, default: false },
}, { timestamps: true, collection: 'user', });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
