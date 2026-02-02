import { Request, Response, NextFunction } from "express";
import { User } from "../Models_Service/User/userModel";

export function autho(req: Request, res: Response, next: NextFunction) {

  if (!(req as any).user)
     { return res.status(401).json({ error: "no user found" }); }
  const userRole = (req as any).user.role;

  if (userRole !== "teacher")

     { return res.status(403).json({ error: "User role not allowed" }); }

  next();

} 
export default autho;
