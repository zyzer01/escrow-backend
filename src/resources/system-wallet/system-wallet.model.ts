import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemWallet extends Document {
  balance: number;
  type: 'system'; // Unique identifier for the system wallet
  transactionHistory: Array<{
    transactionType: 'revenue';
    amount: number;
    createdAt: Date;
  }>;
}

const SystemWalletSchema = new Schema<ISystemWallet>(
  {
    type: { type: String, enum: ['system'], required: true, unique: true }, // System wallet type
    balance: { type: Number, default: 0 },
    transactionHistory: [
      {
        transactionType: { type: String, enum: ['revenue'], required: true },
        amount: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.SystemWallet || mongoose.model<ISystemWallet>('SystemWallet', SystemWalletSchema);
