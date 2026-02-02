import mongoose, { Document, Schema, Model } from 'mongoose';

// ממשק עבור מסמך הגשה
export interface ISubmission extends Document {
  assignment_id: string;
  student_id: string;
  githubLink: String;
  partner?: string;
  grade?: number;
  feedback?: string;
  isGraded?:boolean;
}

// סכמה עבור הגשה
export const SubmissionSchema = new Schema<ISubmission>(
  {
    student_id: { type: String, ref: 'User', required: true },
    assignment_id: { type: String, ref: 'Assignment', required: false },
    githubLink: { type: String, required: true },
    partner: { type: String, ref:"User",required:false },
    grade: { type: Number,required:false },
    feedback:{type:String,required:false,default:""},
   
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },

  }
);


SubmissionSchema.index({ student_id: 1, assignment_id: 1 }, { unique: true });

SubmissionSchema.virtual('isGraded').get(function(this:{grade?:number}) {
  return this.grade !== undefined;
});

export const Submission: Model<ISubmission> = mongoose.model<ISubmission>('Submission', SubmissionSchema);