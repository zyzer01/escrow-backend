import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBetHistory extends Document {
  originalBetId: Types.ObjectId;
  creatorId: Types.ObjectId;
  opponentId: Types.ObjectId;
  winnerId: Types.ObjectId;
  title: string;
  description: string;
  creatorStake: number;
  opponentStake?: number;
  totalStake?: number;
  deadline: Date;
  status: 'settled' | 'canceled' | 'disputed' | 'reversed' | 'refunded' | 'closed';
  witnesses: Types.ObjectId[];
  predictions: {
    creatorPrediction: string;
    opponentPrediction?: string;
  };
  betType: 'with-witnesses' | 'without-witnesses';
  movedToHistoryAt: Date;
}

const BetHistorySchema: Schema = new Schema(
  {
    originalBetId: { type: Schema.Types.ObjectId, ref: "Bet", required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    opponentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
      enum: ['settled', 'canceled', 'disputed', 'reversed', 'refunded', 'closed'],
    },
    witnesses: [{ type: Schema.Types.ObjectId, ref: "Witness" }],
    predictions: {
      creatorPrediction: { type: String, required: true },
      opponentPrediction: { type: String },
    },
    betType: { type: String, enum: ['with-witnesses', 'without-witnesses'], required: true },
    movedToHistoryAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.BetHistory || mongoose.model<IBetHistory>('BetHistory', BetHistorySchema);
