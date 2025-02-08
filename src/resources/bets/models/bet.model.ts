import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBet extends Document {
  creatorId: Types.ObjectId;
  opponentId?: Types.ObjectId;
  opponentEmail: string;
  winnerId?: Types.ObjectId;
  title: string;
  description: string;
  creatorStake: number;
  opponentStake?: number;
  totalStake?: number;
  deadline: Date;
  status: 'pending' | 'accepted' | 'active' | 'verified' | 'settled' | 'canceled' | 'disputed' | 'reversed' | 'refunded' | 'closed';
  predictions: {
    creatorPrediction: string;
    opponentPrediction?: string;
  };
  betType: 'with-witnesses' | 'without-witnesses';
}

const BetSchema: Schema = new Schema(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "User" },
    opponentId: { type: Schema.Types.ObjectId, ref: "User" },
    opponentEmail: { type: String, required: true },
    winnerId: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    description: { type: String },
    creatorStake: { type: Number, required: true },
    opponentStake: { type: Number },
    totalStake: { type: Number },
    deadline: { type: Date },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "accepted",
        "active",
        "verified",
        "settled",
        "canceled",
        "disputed",
        "reversed",
        "refunded",
        "closed",
      ],
      default: "pending",
    },
    predictions: {
      creatorPrediction: { type: String, required: true },
      opponentPrediction: { type: String },
    },
    betType: { type: String, enum: ['with-witnesses', 'without-witnesses'], required: true },
  },
  { timestamps: true }
);

BetSchema.index({ opponentEmail: 1 });
BetSchema.index({ 'witnesses.email': 1 });

export const Bet = mongoose.model<IBet>('Bet', BetSchema);

