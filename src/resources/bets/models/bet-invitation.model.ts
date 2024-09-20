import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBetInvitation extends Document {
  betId: Types.ObjectId;
  invitedUserId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
}

const BetInvitationSchema = new Schema<IBetInvitation>(
  {
    betId: { type: Schema.Types.ObjectId, ref: 'Bet', required: true },
    invitedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'rejected'] },
  },
  { timestamps: true }
);

export default mongoose.models.BetInvitation || mongoose.model<IBetInvitation>('BetInvitation', BetInvitationSchema);
