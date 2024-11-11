import express, { Request, Response, NextFunction } from "express";
import prisma from "../prismaClient";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { TokenPayload } from "./interfaces";

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies["token"];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
      if (decoded && decoded.userId) {
        console.log(decoded);
        const userId = decoded.userId;
        prisma.user
          .findUnique({ where: { id: userId } })
          .then((user) => {
            if (user) {
              req.user = user;
              next();
            } else {
              res.sendStatus(403); // Usuario no encontrado
            }
          })
          .catch((err) => {
            console.error(err);
            res.sendStatus(500); // Error del servidor
          });
      } else {
        res.sendStatus(403); // Token inválido
      }
    } catch (err) {
      console.error(err);
      res.sendStatus(403); // Token inválido o error de verificación
    }
  } else {
    res.sendStatus(403); // No se encontró el token
  }
}
