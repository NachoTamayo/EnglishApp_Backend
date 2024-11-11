import { JwtPayload } from "jsonwebtoken";
export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}
// Middleware para verificar el token JWT
export interface TokenPayload extends JwtPayload {
  userId: string;
}
