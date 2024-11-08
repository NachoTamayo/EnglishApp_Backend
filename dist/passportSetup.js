"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const dotenv_1 = __importDefault(require("dotenv"));
const prismaClient_1 = __importDefault(require("./prismaClient"));
dotenv_1.default.config();
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Buscar si el usuario ya existe en la base de datos
        let user = yield prismaClient_1.default.user.findUnique({
            where: { googleId: profile.id },
        });
        if (!user) {
            // Si no existe, crear un nuevo usuario
            user = yield prismaClient_1.default.user.create({
                data: {
                    googleId: profile.id,
                    email: ((_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value) || "",
                    name: profile.displayName,
                    avatar: (_b = profile.photos) === null || _b === void 0 ? void 0 : _b[0].value,
                },
            });
        }
        // Continuar con la autenticación
        return done(null, user);
    }
    catch (err) {
        return done(err);
    }
})));
passport_1.default.serializeUser((user, done) => {
    done(null, user);
});
passport_1.default.deserializeUser((user, done) => __awaiter(void 0, void 0, void 0, function* () {
    const id = user.id;
    try {
        const ususario = yield prismaClient_1.default.user.findUnique({ where: { id } });
        if (ususario) {
            done(null, ususario);
        }
        else {
            done(null, false); // Cambiamos null por false
        }
    }
    catch (err) {
        done(err); // No es necesario pasar un segundo argumento en caso de error
    }
}));
