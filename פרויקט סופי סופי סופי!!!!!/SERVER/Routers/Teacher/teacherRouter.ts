import express from 'express';
import { auth } from '../../Middlewares/authenticationMid';
import { autho } from '../../Middlewares/authorizationMid';
import { AssignmentService } from '../../Models_Service/Assignment/assignmentService';
import { getAllSubmissions, submissionMarking, submissionAverageGrade } from '../../Models_Service/Submission/submissionService';  
import { logger } from '../../Utils/Logger';

const router = express.Router();
const service = new AssignmentService();

router.post('/Addassignments', auth, autho, async (req, res) => {
    try {
      const assignment = await service.createAssigmnet(req.body);
      logger.info(`New assignment added: "${req.body.title || req.body.name || 'Untitled'}"`); 
      res.status(201).json(assignment);
    } catch (err) {
      logger.error(`Server error (500) - Failed to create assignment: ${err}`);
      res.status(500).json({ message: 'Error creating assignment', error: err });
    }
});

router.get('/submissions', auth, autho, async (req, res) => {
    try {
      const submissions = await getAllSubmissions();
      logger.info('Teacher viewed all submissions');
      res.status(200).json(submissions);
    } catch (err) {
      logger.error(`Server error (500) - Failed to get submissions: ${err}`);
      res.status(500).json({ message: 'Error returning submissions', error: err });
    }
});



router.put('/markSubmission/:studentId/:assignmentId', auth, autho, async (req, res) => {
    try {
      const { studentId, assignmentId } = req.params;  
      const markSubmission = await submissionMarking(studentId, assignmentId, req.body);
      res.status(200).json(markSubmission);
    } catch (err) {
      logger.error(`Server error (500) - Failed to mark submission: ${err}`);
      res.status(500).json({ message: 'Error marking submission', error: err });
    } 
});

router.get('/stats/averages', auth, autho, async (req, res) => {
    try {
      const averageGrade = await submissionAverageGrade(); 
      logger.info('Teacher viewed average grades');
      res.status(200).json({ averageGrade });
    } catch (err) {
      logger.error(`Server error (500) - Failed to calculate average: ${err}`);
      res.status(500).json({ message: 'Error calculating average grade', error: err });
    } 
});

export default router;