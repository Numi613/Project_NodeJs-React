import { Request, Response, NextFunction } from "express";
import { logger } from "../Utils/Logger";


export function logRequestToFile(req: Request, res: Response, next: NextFunction) {
  next();
}