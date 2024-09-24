import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBankAccount extends Document {
  userId: Types.ObjectId;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isPrimary: boolean;
}

const BankAccountSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bankName: { type: String, required: true },
  bankCode: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
}, {
  timestamps: true,
});

export const BankAccount = mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);
