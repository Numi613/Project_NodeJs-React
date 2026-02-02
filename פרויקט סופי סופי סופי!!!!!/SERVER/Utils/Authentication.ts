import jwt from "jsonwebtoken";

const SECRET_KEY = "secret_key"; 

export class AuthService {
  
  static generateToken(userId: string, role: string): string {
    const payload = { user_id: userId, role };
   
    return jwt.sign(payload, SECRET_KEY, { expiresIn: "1y" });
  }

  static verifyToken(token: string): any {
    return jwt.verify(token, SECRET_KEY);
  }
}