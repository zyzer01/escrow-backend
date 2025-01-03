import mongoose, { Schema, Document } from 'mongoose';

export interface IVerification extends Document {
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema: Schema = new Schema({
  identifier: { type: String, required: true },
  value: { type: String, required: true },
  expiresAt: { type: Date, required: true }, 
}, {
  timestamps: true,
  collection: 'verification',
});

export const Verification = mongoose.model<IVerification>('Verification', VerificationSchema);
