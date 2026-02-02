import express, { Request, Response,application,NextFunction }  from 'express';
import cors from 'cors';
import {logger} from './Utils/Logger';
import identificationRouter from './Routers/Identification/identificationRouter';
import studentRoutrer from './Routers/Student/studentRouter';
import teacherRouter from './Routers/Teacher/teacherRouter';
import{errorHandler} from './Middlewares/errorHandling';
import {logRequestToFile} from './Middlewares/loggerMid';
import { myDB } from './Utils/ConnectDB';

const app = express();
app.use(cors());
app.use(express.json());
myDB.getDB();

app.use('/identification',identificationRouter);
app.use('/auth',identificationRouter);
app.use('/student',studentRoutrer);
app.use('/teacher',teacherRouter);

app.use((req:Request,res:Response,next:NextFunction)=>{
    res.status(404).json({message:"Route not found"});
});

app.use(errorHandler)


export default app;











