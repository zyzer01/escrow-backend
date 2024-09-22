import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBetDispute extends Document {
  betId: Types.ObjectId;
  reportedBy: Types.ObjectId;
  reason: string;
  status: 'open' | 'in-review' | 'resolved' | 'rejected';
  createdAt: Date;
  resolvedAt?: Date;
}

const BetDisputeSchema: Schema<IBetDispute> = new Schema({
  betId: { type: Schema.Types.ObjectId, ref: 'Bet', required: true },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['open', 'in-review', 'resolved', 'rejected'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

export default mongoose.models.BetDispute || mongoose.model<IBetDispute>('BetDispute', BetDisputeSchema);
