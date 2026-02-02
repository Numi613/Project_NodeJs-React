import { Request, Response, NextFunction } from "express";
import  jwt from "jsonwebtoken";
import { User } from "../Models_Service/User/userModel";


export function auth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as typeof User;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const decoded: any = jwt.verify(token, "secret_key");
    // const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = {
  user_id: decoded.user_id,
  role: decoded.role
};
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
       export default auth;

