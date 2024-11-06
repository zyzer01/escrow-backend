import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: 'bet-invite' | 'bet-settled' | 'bet-created' | 'bet-engaged' | 'new-witness' | 'bet-recused' | 'bet-dispute' | 'system-alert';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "bet-invite",
        "bet-settled",
        "bet-created",
        "bet-verified",
        "bet-engaged",
        "new-witness",
        "bet-recused",
        "bet-dispute",
        "wallet-withdrawal",
        "wallet-funding",
        "system-alert",
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
