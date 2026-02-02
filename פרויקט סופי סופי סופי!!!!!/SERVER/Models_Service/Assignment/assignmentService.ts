import { Assignment } from "./assignmentModel";
import { AuthService } from "../../Utils/Authentication";
import mongoose from "mongoose";    


export class AssignmentService {
    async createAssigmnet({title,dscription,dueDate,createdDate,isOpen}:any){
        const newAssignment=new Assignment({title,dscription,dueDate,createdDate,isOpen});
        return newAssignment.save();
    }

    async getAllAssignments(){
        return await Assignment.find();
    }
    

}

  

