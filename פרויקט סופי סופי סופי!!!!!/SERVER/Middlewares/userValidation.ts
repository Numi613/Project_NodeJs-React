
import { Request, Response, NextFunction } from "express";
import { User } from "../Models_Service/User/userModel";

export async function userValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const { password, email } = req.body;

   
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).+$/;
    if (!password || password.length < 8 || !passwordRegex.test(password)) {
      return res.status(400).json({ error: "Invalid password format" });
    }

   
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }

    next(); 
  } catch (err) {
    next(err); 
  }
}