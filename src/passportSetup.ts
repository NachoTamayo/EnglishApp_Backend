import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import prisma from "./prismaClient";

dotenv.config();

interface User {
  id: string;
  googleId?: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Buscar si el usuario ya existe en la base de datos
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (!user) {
          // Si no existe, crear un nuevo usuario
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              email: profile.emails?.[0].value || "",
              name: profile.displayName,
              avatar: profile.photos?.[0].value,
            },
          });
        }

        // Continuar con la autenticación
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (user: User, done) => {
  const id = user.id;
  try {
    const ususario = await prisma.user.findUnique({ where: { id } });
    if (ususario) {
      done(null, ususario);
    } else {
      done(null, false); // Cambiamos null por false
    }
  } catch (err) {
    done(err); // No es necesario pasar un segundo argumento en caso de error
  }
});
