"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function verifyToken(req, res, next) {
    const token = req.cookies["token"];
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.userId) {
                console.log(decoded);
                const userId = decoded.userId;
                prismaClient_1.default.user
                    .findUnique({ where: { id: userId } })
                    .then((user) => {
                    if (user) {
                        req.user = user;
                        next();
                    }
                    else {
                        res.sendStatus(403); // Usuario no encontrado
                    }
                })
                    .catch((err) => {
                    console.error(err);
                    res.sendStatus(500); // Error del servidor
                });
            }
            else {
                res.sendStatus(403); // Token inválido
            }
        }
        catch (err) {
            console.error(err);
            res.sendStatus(403); // Token inválido o error de verificación
        }
    }
    else {
        res.sendStatus(403); // No se encontró el token
    }
}
