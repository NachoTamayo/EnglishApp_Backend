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
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const express_session_1 = __importDefault(require("express-session"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const prismaClient_1 = __importDefault(require("./prismaClient"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
require("./passportSetup");
const playHTService_1 = require("./services/playHTService");
const capitalize_1 = require("./utils/capitalize");
const tokenVerification_1 = require("./utils/tokenVerification");
const dictionaryService_1 = require("./services/dictionaryService");
const mongoVerification_1 = require("./utils/mongoVerification");
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
app.use("/public", express_1.default.static(path_1.default.join(__dirname, "public")));
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
app.get("/auth/user", tokenVerification_1.verifyToken, (req, res) => {
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
            return;
        }
        else {
            res.sendStatus(200);
            return;
        }
    });
    return;
});
app.get("/protected", tokenVerification_1.verifyToken, (req, res) => {
    res.json({ message: "Ruta protegida" });
    res.status(200);
});
/////////// API REST ///////////
app.get("/getUser/:id", tokenVerification_1.verifyToken, (req, res) => {
    const users = req.user;
    res.json({ users });
});
// Ruta para obtener el sonido de una palabra
app.get("/api/word/:id/sound", tokenVerification_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!(0, mongoVerification_1.isValidObjectId)(id)) {
            res.status(400).json({ error: "ID de palabra no válido" });
            return;
        }
        // Buscar la palabra en la base de datos
        const englishWord = yield prismaClient_1.default.englishWords.findUnique({
            where: { id: id },
        });
        if (!englishWord || !englishWord.sound) {
            res.status(404).json({ error: "Sonido no encontrado para la palabra especificada" });
            return;
        }
        // Construir la ruta absoluta al archivo mp3
        const soundFilePath = path_1.default.join(__dirname, "public", englishWord.sound);
        // Verificar si el archivo existe
        if (!fs_1.default.existsSync(soundFilePath)) {
            res.status(404).json({ error: "Archivo de sonido no encontrado en el servidor" });
            return;
        }
        // Establecer el tipo de contenido adecuado
        res.setHeader("Content-Type", "audio/mpeg");
        // Enviar el archivo de audio
        res.sendFile(soundFilePath, (err) => {
            if (err) {
                console.error("Error al enviar el archivo de sonido:", err);
                res.status(500).json({ error: "Error al enviar el archivo de sonido" });
            }
        });
        console.log(`Archivo de sonido enviado: ${soundFilePath}`);
    }
    catch (error) {
        console.error("Error al obtener el sonido:", error);
        res.status(500).json({ error: "Error del servidor al obtener el sonido" });
    }
}));
// Ruta para crear una palabra
app.post("/api/word", tokenVerification_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { original, translation } = req.body;
    if (!original || !translation) {
        res.json({ message: "Debes proporcionar la palabra original y su traducción." });
        return;
    }
    const orig = (0, capitalize_1.capitalizeWord)(original);
    const trans = (0, capitalize_1.capitalizeWord)(translation);
    const validWord = yield (0, dictionaryService_1.verifyWord)(orig);
    if (!validWord) {
        res.json({ message: `La palabra "${orig}" no existe en el diccionario.` });
        return;
    }
    const type = (0, capitalize_1.capitalizeWord)(validWord.meanings[0].partOfSpeech);
    const user = req.user;
    // Verificar en inglés existe en la base de datos
    let existingWord = yield prismaClient_1.default.englishWords.findUnique({
        where: { word: orig },
    });
    // Si no existe, obtener el sonido y guardarlo
    if (!existingWord) {
        // Obtener el sonido como un Buffer
        const mp3Name = yield (0, playHTService_1.getSound)(original);
        // Guardar la palabra y el sonido en la base de datos
        existingWord = yield prismaClient_1.default.englishWords.create({
            data: {
                word: original,
                sound: mp3Name,
            },
        });
    }
    let existingTranslation;
    // Verificar si la traducción ya existe
    if (existingWord) {
        existingTranslation = yield prismaClient_1.default.words.findUnique({
            where: { original: existingWord.word },
        });
    }
    // Si no existe, crear la traducción
    if (!existingTranslation) {
        existingTranslation = yield prismaClient_1.default.words.create({
            data: {
                original: existingWord.word,
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
                    user: user.id,
                    word: existingTranslation.original,
                },
            },
        });
        // Si no existe, crear la relación
        if (existingUserWord) {
            // La palabra ya existe en la lista de palabras del usuario
            res.json({ message: "La palabra ya existe en tu lista de palabras" });
            res.status(200);
            return;
        }
        else {
            // Crear la relación entre el usuario y la palabra
            yield prismaClient_1.default.userWords.create({
                data: {
                    user: user.id,
                    word: existingTranslation.original,
                },
            });
            res.json({ message: "Palabra creada", existingTranslation });
            res.status(200);
            return;
        }
    }
    res.json({ message: "Something went wrong" });
    res.status(500);
}));
app.delete("/api/word/:id", tokenVerification_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = req.user;
    const userWord = yield prismaClient_1.default.userWords.findUnique({
        where: {
            id: id,
            user: user.id,
        },
    });
    if (userWord) {
        yield prismaClient_1.default.userWords.delete({
            where: {
                id: userWord.id,
            },
        });
        res.json({ message: "Palabra eliminada" });
        res.status(200);
        return;
    }
    res.json({ message: "Palabra no encontrada" });
    res.status(404);
}));
app.get("/api/words", tokenVerification_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const userWords = yield prismaClient_1.default.userWords.findMany({
        where: {
            user: user.id,
        },
    });
    res.json(userWords);
    res.status(200);
}));
app.delete("/api/words/:id", tokenVerification_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = req.user;
    //Comprobamos que el usuario tiene la palabra
    const userWords = yield prismaClient_1.default.userWords.findUnique({
        where: {
            user: user.id,
            id: id,
        },
    });
    if (userWords) {
        yield prismaClient_1.default.userWords.delete({
            where: {
                id: userWords.id,
            },
        });
        res.json({ message: "Palabra eliminada" });
        res.status(200);
        return;
    }
    res.json({ message: "Palabra no encontrada" });
    res.status(404);
}));
app.listen(4000, () => {
    console.log("Servidor ejecutándose en http://localhost:4000");
});
