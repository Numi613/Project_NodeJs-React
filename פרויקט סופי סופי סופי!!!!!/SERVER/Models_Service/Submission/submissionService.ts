import { Submission } from "./submissionModel";
import { ISubmission } from "./submissionModel";


export const getAllSubmissions = async () => {
  try {
    return await Submission.find({})
      .populate('assignment_id')
      .populate('student_id'); 
  } catch (error) {
    console.error("Populate failed, returning raw data:", error);
    return await Submission.find({}); 
  }
};

export const submissionMarking = async (studentId: string, assignmentId: string, data: any) => {

  const submissions = await Submission.find({}); 
console.log("Total in DB:", submissions.length);


  const updated = await Submission.findOneAndUpdate(
    { student_id: studentId, assignment_id: assignmentId }, 
    { 
      grade: data.grade, 
      feedback: data.comment, 
      isGraded: true 
    },
    { new: true }
  );
  return updated;
};


export const submissionAverageGrade = async (): Promise<number> => {
  const submissions = await Submission.find({ grade: { $exists: true, $ne: null } });

  let sum = 0;
  let count = 0;

  submissions.forEach((submission) => {
    const gradeValue = Number(submission.grade);
    
    if (!isNaN(gradeValue)) {
      sum += gradeValue;
      count++;
    }
  });
  return count > 0 ? sum / count : 0;
};

export const submitAssignment = async (student_id: string, assignmentData: any) => {
    const newSubmission = new Submission({
        student_id,
        assignment_id: assignmentData.assignment_id,
        githubLink: assignmentData.githubLink,
        partner: assignmentData.partner || null,
    });
    return newSubmission.save();
};

export const getMySubmissions = async (student_id:string): Promise<ISubmission[]> => {
  const allSubmissions = await Submission.find({})
    .populate({
    path: 'assignment_id',
    model: 'Assignment'
});
  const mySubmissions = allSubmissions.filter(sub => {
    console.log('Checking submission:', sub.student_id, 'vs', student_id);
    return sub.student_id === student_id;
  });
  return mySubmissions;
};

    