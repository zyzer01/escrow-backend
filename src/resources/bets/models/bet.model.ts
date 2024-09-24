import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBet extends Document {
  creatorId: Types.ObjectId;
  opponentId?: Types.ObjectId;
  winnerId: Types.ObjectId;
  title: string;
  description: string;
  creatorStake: number;
  opponentStake?: number;
  deadline: Date;
  status: 'pending' | 'accepted' | 'active' | 'verified' | 'closed' | 'canceled' | 'disputed' | 'reversed' | 'refunded';
  witnesses: Types.ObjectId[];
  predictions: {
    creatorPrediction: string;
    opponentPrediction?: string;
  };
  betType: 'with-witnesses' | 'without-witnesses'; 
}

const BetSchema: Schema = new Schema(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    opponentId: { type: Schema.Types.ObjectId, ref: "User" },
    winnerId: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    description: { type: String },
    creatorStake: { type: Number, required: true },
    opponentStake: { type: Number },
    deadline: { type: Date },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "accepted",
        "active",
        "verified",
        "closed",
        "canceled",
        "disputed",
        "reversed",
        "refunded",
      ],
      default: "pending",
    },
    witnesses: [{ type: Schema.Types.ObjectId, ref: "Witness" }],
    predictions: {
      creatorPrediction: { type: String, required: true },
      opponentPrediction: { type: String },
    },
    betType: { type: String, enum: ['with-witnesses', 'without-witnesses'], required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Bet || mongoose.model<IBet>('Bet', BetSchema);
