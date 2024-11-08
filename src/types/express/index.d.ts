// src/types/express/index.d.ts
import { User } from "@prisma/client";

declare namespace Express {
  interface ExpressUser extends User {}

  interface Request {
    user?: ExpressUser;
    authData?: any;
  }
}
