import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWitness extends Document {
  betId: Types.ObjectId;
  userId: Types.ObjectId;
  vote: 'creator' | 'opponent'
  type: 'user-designated' | 'neutral';
  status: 'pending' | 'accepted' | 'rejected';
}

const WitnessSchema = new Schema<IWitness>(
  {
    betId: { type: Schema.Types.ObjectId, ref: 'Bet', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vote: { type: String, enum: ['creator', 'opponent'], required: false },
    type: { type: String, enum: ['user-designated', 'neutral'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.models.Witness || mongoose.model<IWitness>('Witness', WitnessSchema);
