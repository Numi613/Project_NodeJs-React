import  express  from "express";
import {  userValidation} from '../../Middlewares/userValidation';
import { UserService } from '../../Models_Service/User/userService';
import { logger } from '../../Utils/Logger';

const router = express.Router();

const service = new UserService();

router.post('/register', userValidation, async (req, res) => {
  try {
    const userInfo = req.body;
    const newUser = await service.Register(userInfo);
    res.status(201).json(newUser);
  } catch (err: any) {
    console.error("Register endpoint error:", err); 
    logger.error(`Registration failed: ${err.message}`);
    res.status(500).json({ message: err.message || "Error registering user" });
  }
});


router.post('/login',async(req,res)=>{
    try{
        const{name,password}=req.body;
        const logInResponse=await service.Login(name,password);
        res.status(200).json(logInResponse)
    }
    catch(err){
        if((err as Error).message==="User not found" || (err as Error).message==="Invalid password"){
            logger.info(`Login failed - User: ${req.body.name}, Reason: ${(err as Error).message}`);
            return res.status(401).json({message:(err as Error).message});
        
        }
            logger.error(`Login error for user: ${req.body.name} - ${(err as Error).message}`);
            res.status(500).json({message:"error logging in user"})
        
    }
    }
)

export default router;


