import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstname?: string;
  lastname?: string;
  phone_number?: string;
  role: string;
  government_id_verified: boolean;
  reputation_score: number;
  bets_participated: number;
  bets_witnessed: number;
  is_active: boolean;
  isEmailVerified: boolean,
  emailVerificationCode: number | null,
  emailVerificationCodeExpiry: Date | null,
  created_at: Date;
  updated_at: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String },
  lastname: { type: String },
  phone_number: { type: String },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' }, 
  reputation_score: { type: Number, default: 0 },
  bets_participated: { type: Number, default: 0 },
  bets_witnessed: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  isEmailVerified: {type: Boolean, default: false},
  emailVerificationCode: {type: Number},
  emailVerificationCodeExpiry: {type: Date},
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
