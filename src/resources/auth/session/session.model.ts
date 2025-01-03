import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  impersonatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  impersonatedBy: { types: String }, 
}, {
  timestamps: true,
  collection: 'session',
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);
