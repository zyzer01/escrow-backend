import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  amount: number;
  type: 'payout' | 'refund' | 'commission';
  description: string;
  betId: Types.ObjectId;
}

const TransactionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['payout', 'refund'], required: true },
    description: { type: String, required: true },
    betId: { type: Schema.Types.ObjectId, ref: 'Bet', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model<ITransaction>('WalletTransaction', TransactionSchema);
