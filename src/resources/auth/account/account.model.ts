import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAccount extends Document {
  userId: Types.ObjectId;
  accountId: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: String, required: true },
  providerId: { type: String, required: true },
  accessToken: { type: String, default: null },
  refreshToken: { type: String, default: null },
  accessTokenExpiresAt: { type: Date, default: null },
  refreshTokenExpiresAt: { type: Date, default: null },
  scope: { type: String, default: null },
  password: { type: String, default: null },
}, {
  timestamps: true,
  collection: 'account',
});

export const Account = mongoose.model<IAccount>('Account', AccountSchema);
