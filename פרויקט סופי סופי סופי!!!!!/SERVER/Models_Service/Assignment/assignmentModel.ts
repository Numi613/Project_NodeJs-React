import mongoose, { Document, Schema, Model } from 'mongoose';

// ממשק עבור מסמך מטלה
export interface IAssignment extends Document {
  title: string;
  descreption?: string;
  dueDate: Date;
  createdDate?: Date;
  isOpen?: boolean;
}

// סכמה עבור מטלה
const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    descreption: { type: String },
    dueDate: { type: Date, required: true },
    createdDate: { type: Date, default: Date.now },
   
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AssignmentSchema.virtual('isOpen').get(function(this:{dueDate:Date}) {
const dueDate = this.dueDate;
return this.dueDate>=new Date();
});

export const Assignment: Model<IAssignment> = mongoose.model<IAssignment>('Assignment', AssignmentSchema);