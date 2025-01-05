import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
  role: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: number;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, unique: true, sparse: true, min: [3, 'Username cannot be less than 3 characters'] },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: [/.+\@.+\..+/, 'Invalid email'] },
  emailVerified: { type: Boolean, default: false },
  image: { type: String },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  banned: { type: Boolean },
  banReason: { type: String, default: null },
  banExpires: { type: Number, default: null },
}, { timestamps: true, collection: 'user', });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
