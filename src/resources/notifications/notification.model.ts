import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type:
    | 'bet-invite'
    | 'bet-engaged'
    | 'bet-settled'
    | 'bet-verified'
    | 'bet-dispute'
    | 'witness-invite'
    | 'wallet-withdrawal'
    | 'wallet-funding'
    | 'system-alert';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  betId?: Types.ObjectId;
  walletTransactionId?: Types.ObjectId;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'bet-invite',
        'bet-engaged',
        'bet-settled',
        'bet-verified',
        'bet-dispute',
        'witness-invite',
        'wallet-withdrawal',
        'wallet-funding',
        'system-alert'
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    betId: { type: Schema.Types.ObjectId, ref: "Bet" },
    walletTransactionId: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
