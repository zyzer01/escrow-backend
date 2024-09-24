import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  amount: number;
  type: 'fund' | 'payout' | 'refund' | 'commission' | 'withdrawal';
  reference: string;
  description: string;
  betId: Types.ObjectId;
}

const TransactionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['fund', 'payout', 'refund', 'commission', 'withdrawal'], required: true },
    reference: { type: String, required: true },
    description: { type: String },
    betId: { type: Schema.Types.ObjectId, ref: 'Bet' },
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model<ITransaction>('WalletTransaction', TransactionSchema);
