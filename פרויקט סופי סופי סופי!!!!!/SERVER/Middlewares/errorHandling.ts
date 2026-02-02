import { Request, Response, NextFunction } from "express";
import { logger } from '../Utils/Logger';

export function errorHandler(err: any,req: Request,res: Response,next: NextFunction) {
  console.error(err); 
  logger.error(`Server Error (${err.status || 500}): ${err.message} - Route: ${req.method} ${req.url}`);

  const status = err.status || 500;

  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
}
export default errorHandler;