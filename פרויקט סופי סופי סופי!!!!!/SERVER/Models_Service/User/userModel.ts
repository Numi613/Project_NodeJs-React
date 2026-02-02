import mongoose, { Document, Schema, Model } from 'mongoose';

// ממשק עבור מסמך משתמש
export interface IUser extends Document {
  user_id: string;
  name?: string;
  email: string;
  password: string;
  role:string;
}

// סכמה עבור משתמש
export const userSchema = new Schema<IUser>(
  {
    user_id: { type: String, required: true, unique: true },
    name: { type: String },
    email: { type: String, required: true,unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, default: "student" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);