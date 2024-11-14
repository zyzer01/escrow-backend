import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IEscrow extends Document {
  betId: Types.ObjectId;
  creatorId: string;
  creatorStake: number;
  opponentId: string;
  opponentStake: number;
  status: 'pending' | 'locked' | 'released' | 'refunded';
  createdAt?: Date;
  updatedAt?: Date;
}

const EscrowSchema = new Schema<IEscrow>(
  {
    betId: { type: Schema.Types.ObjectId, ref: 'Bet', required: true },
    creatorId: { type: String, required: true },
    creatorStake: { type: Number, required: true },
    opponentId: { type: String },
    opponentStake: { type: Number },
    status: { type: String, default: 'pending', enum: ['pending', 'locked', 'released', 'refunded'] },
  },
  { timestamps: true }
);

export default mongoose.models.Escrow || mongoose.model<IEscrow>('Escrow', EscrowSchema);

