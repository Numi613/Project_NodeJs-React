import { User} from "./userModel";
import { AuthService as auth } from "../../Utils/Authentication";
import bcrypt from "bcryptjs";

export class UserService {
     
   async Register(userData: any) {
  try {
    if (!userData.password || !userData.name || !userData.email) {
      throw new Error("Missing required fields");
    }

    const hashedPassword: string = await bcrypt.hash(userData.password, 10);
    const newUser = new User({ ...userData, password: hashedPassword });

    const savedUser = await newUser.save();
    console.log("User registered:", savedUser.user_id); 
    return savedUser;

  } catch (err) {
    console.error("Register error:", err); 
    throw err; 
  }
}


     async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    async Login(name: string, password: string) {
    const user = await User.findOne({ name });
    if (!user) {
      throw new Error("User not found");
    }    
    
     const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }
                                 
    const token = auth.generateToken(user.user_id, user.role);

    return {
        user: { id: user.user_id, email: user.email },
        token
    };
};
}
export default new UserService();   