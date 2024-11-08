"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const express_session_1 = __importDefault(require("express-session"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const prismaClient_1 = __importDefault(require("./prismaClient"));
const PlayHT = __importStar(require("playht"));
require("./passportSetup");
PlayHT.init({
    userId: (_a = process.env.PLAY_HT_USERID) !== null && _a !== void 0 ? _a : "",
    apiKey: (_b = process.env.PLAY_HT_APIKEY) !== null && _b !== void 0 ? _b : "",
    defaultVoiceEngine: "Play3.0-mini",
    defaultVoiceId: "s3://voice-cloning-zero-shot/f6594c50-e59b-492c-bac2-047d57f8bdd8/susanadvertisingsaad/manifest.json",
});
dotenv_1.default.config();
const app = (0, express_1.default)();
// 1. Middleware de CORS
app.use((0, cors_1.default)({
    origin: process.env.URL_FRONTEND, // URL de tu frontend
    credentials: true, // Permitir el envío de cookies
}));
app.options("*", (0, cors_1.default)());
// 2. Middleware para parsear cookies
app.use((0, cookie_parser_1.default)());
// 3. Middleware de sesión
app.use((0, express_session_1.default)({
    secret: "secreto_de_sesion",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
}));
// Middleware para analizar datos JSON
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 4. Inicializar Passport
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Ruta para iniciar la autenticación con Google
app.get("/auth/google", passport_1.default.authenticate("google", { scope: ["email", "profile"] }));
// Ruta de callback después de la autenticación
// En src/app.ts, modifica la ruta de callback
app.get("/auth/google/callback", passport_1.default.authenticate("google", { failureRedirect: "/auth/failure" }), (req, res) => {
    var _a;
    // @ts-ignore
    const user = req.user; // Asegúrate de importar el tipo User de Prisma
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "100y" });
    // Establece la cookie con opciones de seguridad
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });
    res.redirect((_a = process.env.URL_FRONTEND) !== null && _a !== void 0 ? _a : "");
});
// Ruta en caso de fallo en la autenticación
app.get("/auth/failure", (req, res) => {
    res.send("Error en la autenticación");
});
function verifyToken(req, res, next) {
    const token = req.cookies["token"];
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.userId) {
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
app.get("/auth/user", verifyToken, (req, res) => {
    const user = req.user;
    res.json({ user });
});
app.get("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });
    req.logout((err) => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
        }
        else {
            res.sendStatus(200);
        }
    });
    res.sendStatus(200);
});
function getSound(text) {
    return __awaiter(this, void 0, void 0, function* () {
        const stream = yield PlayHT.stream(`${text}`, {
            voiceEngine: "Play3.0-mini",
        });
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer);
            });
            stream.on("error", (err) => {
                reject(err);
            });
        });
    });
}
function verifyWord(word) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = yield result.json();
        if (data[0] && data[0].word) {
            return data[0];
        }
        else {
            return false;
        }
    });
}
function wordType(meaning) {
    switch (meaning) {
        case "noun":
            return 1;
        case "pronoun":
            return 2;
        case "verb":
            return 3;
        case "adjective":
            return 4;
        case "adverb":
            return 5;
        case "preposition":
            return 6;
        case "conjunction":
            return 7;
        case "interjection":
            return 8;
        case "expression":
            return 9;
        case "phrasal verb":
            return 10;
        default:
            return 1;
    }
}
function capitalizeWord(word) {
    if (!word)
        return "";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
/////////// API REST ///////////
app.get("/getUser/:id", verifyToken, (req, res) => {
    const users = req.user;
    res.json({ users });
});
// Ruta para obtener el sonido de una palabra
app.get("/api/word/:id/sound", verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Buscar la palabra en la base de datos
        const englishWord = yield prismaClient_1.default.englishWords.findUnique({
            where: { id: Number(id) },
        });
        if (!englishWord || !englishWord.sound) {
            res.status(404).json({ error: "Sonido no encontrado para la palabra especificada" });
            return;
        }
        // Establecer el tipo de contenido adecuado
        res.setHeader("Content-Type", "audio/mpeg");
        // Enviar el archivo de audio
        res.send(englishWord.sound);
    }
    catch (error) {
        console.error("Error al obtener el sonido:", error);
        res.status(500).json({ error: "Error del servidor al obtener el sonido" });
    }
}));
// Ruta para crear una palabra
app.post("/api/word", verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { original, translation } = req.body;
    if (!original || !translation) {
        res.json({ message: "Debes proporcionar la palabra original y su traducción." });
        return;
    }
    const orig = capitalizeWord(original);
    const trans = capitalizeWord(translation);
    const validWord = yield verifyWord(orig);
    if (!validWord) {
        res.json({ message: `La palabra "${orig}" no existe en el diccionario.` });
        return;
    }
    const type = wordType(validWord[0].meanings[0].partOfSpeech);
    const user = req.user;
    // Verificar en inglés existe en la base de datos
    let existingWord = yield prismaClient_1.default.englishWords.findUnique({
        where: { word: orig },
    });
    // Si no existe, obtener el sonido y guardarlo
    if (!existingWord) {
        // Obtener el sonido como un Buffer
        const buffer = yield getSound(original);
        // Guardar la palabra y el sonido en la base de datos
        existingWord = yield prismaClient_1.default.englishWords.create({
            data: {
                word: original,
                sound: buffer,
            },
        });
    }
    let existingTranslation;
    // Verificar si la traducción ya existe
    if (existingWord) {
        existingTranslation = yield prismaClient_1.default.words.findUnique({
            where: {
                unique_original_translation: {
                    original: existingWord.id,
                    translation: trans,
                },
            },
        });
    }
    // Si no existe, crear la traducción
    if (!existingTranslation) {
        existingTranslation = yield prismaClient_1.default.words.create({
            data: {
                original: existingWord.id,
                translation: trans,
                type: type,
            },
        });
    }
    // Verificar si la palabra ya existe en la lista de palabras del usuario
    if (existingTranslation) {
        const existingUserWord = yield prismaClient_1.default.userWords.findUnique({
            where: {
                unique_user_word: {
                    userId: Number(user.id),
                    wordId: existingTranslation.id,
                },
            },
        });
        // Si no existe, crear la relación
        if (existingUserWord) {
            // La palabra ya existe en la lista de palabras del usuario
            res.json({ message: "La palabra ya existe en tu lista de palabras" });
            res.status(304);
            return;
        }
        else {
            // Crear la relación entre el usuario y la palabra
            yield prismaClient_1.default.userWords.create({
                data: {
                    userId: Number(user.id),
                    wordId: existingTranslation.id,
                },
            });
            res.json({ message: "Palabra creada", existingTranslation });
            res.status(200);
        }
    }
    res.json({ message: "Something went wrong" });
    res.status(304);
}));
app.listen(4000, () => {
    console.log("Servidor ejecutándose en http://localhost:4000");
});
