import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWitness extends Document {
  betId: Types.ObjectId;
  userId: Types.ObjectId;
  email: string;
  vote: 'creator' | 'opponent' | 'draw' | 'invalid';
  type: 'user-designated' | 'neutral';
  status: 'pending' | 'accepted' | 'rejected';
}

const WitnessSchema = new Schema<IWitness>(
  {
    betId: { type: Schema.Types.ObjectId, ref: 'Bet', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    vote: { type: String, enum: ['creator', 'opponent', 'draw', 'invalid'], required: false },
    type: { type: String, enum: ['user-designated', 'neutral'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

WitnessSchema.index({ betId: 1 });
WitnessSchema.index({ email: 1 });

export const Witness = mongoose.model<IWitness>('Witness', WitnessSchema);

