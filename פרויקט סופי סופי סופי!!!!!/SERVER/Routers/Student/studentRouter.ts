import express from "express";
import { auth } from '../../Middlewares/authenticationMid';
import { AssignmentService } from '../../Models_Service/Assignment/assignmentService';
import { getMySubmissions, submitAssignment } from "../../Models_Service/Submission/submissionService";
import { logger } from '../../Utils/Logger';

const router = express.Router();
const service = new AssignmentService();



router.get('/assignments', auth,async (req, res) => {
    try {
      const assignments = await service.getAllAssignments();
            res.status(200).json(assignments);
          } catch (err) {
            logger.error(`Server error (500) - Failed to get assignments: ${err}`);
            res.status(500).json({ message: 'Error returning assignments', error: err });
          }
        });


router.post('/submissions', auth, async (req, res) => {
    try {
        const user = (req as any).user;
        const student_id = user.user_id;
        
        if (!student_id) {
            return res.status(400).json({ error: 'Student ID missing from token' });
        }
        
        const submissionData = {
            ...req.body,               
            student_id: student_id,    
            assignment_id: req.body.assignment_id 
        };
        const submission = await submitAssignment(student_id, submissionData);
        logger.info(`New submission added - Student: ${student_id}, Assignment: ${req.body.assignment_id}`);
        res.status(201).json(submission);
    }  catch (err: any) {
    logger.error(`Server error (500) - Failed to submit assignment: ${err.message}`);
    res.status(500).json({ message: "error submitting assignment", error: err.message });
}
});



router.get('/mySubmisions', auth, async (req, res) => {
    try {
        const user = (req as any).user;
        const student_id = user.user_id;
        
        const mySubmisions = await getMySubmissions(student_id);
        res.status(200).json(mySubmisions);
    } catch (err: any) {
        res.status(500).json({ 
            message: 'error getting your submissions', 
            detail: err.message 
        });
    }
});

export default router;



