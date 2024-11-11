import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import session from "express-session";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import prisma from "./prismaClient";
import path from "path";
import fs from "fs";
import "./passportSetup";
import { getSound } from "./services/playHTService";
import { capitalizeWord } from "./utils/capitalize";
import { verifyToken } from "./utils/tokenVerification";
import { verifyWord } from "./services/dictionaryService";
import { isValidObjectId } from "./utils/mongoVerification";
import { User } from "./utils/interfaces";

dotenv.config();

const app = express();
// 1. Middleware de CORS
app.use(
  cors({
    origin: process.env.URL_FRONTEND, // URL de tu frontend
    credentials: true, // Permitir el envío de cookies
  })
);
app.options("*", cors());
// 2. Middleware para parsear cookies
app.use(cookieParser());
// 3. Middleware de sesión
app.use(
  session({
    secret: "secreto_de_sesion",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
// Middleware para analizar datos JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 4. Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());
app.use("/public", express.static(path.join(__dirname, "public")));

// Ruta para iniciar la autenticación con Google
app.get("/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));

// Ruta de callback después de la autenticación
// En src/app.ts, modifica la ruta de callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (req: Request, res: Response) => {
    // @ts-ignore
    const user = req.user as User; // Asegúrate de importar el tipo User de Prisma
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: "100y" });
    // Establece la cookie con opciones de seguridad
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.redirect(process.env.URL_FRONTEND ?? "");
  }
);

// Ruta en caso de fallo en la autenticación
app.get("/auth/failure", (req: Request, res: Response) => {
  res.send("Error en la autenticación");
});

app.get("/auth/user", verifyToken, (req: Request, res: Response) => {
  const user = req.user;
  res.json({ user });
});

app.get("/logout", (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  req.logout((err: any) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    } else {
      res.sendStatus(200);
      return;
    }
  });
  return;
});

app.get("/protected", verifyToken, (req: Request, res: Response) => {
  res.json({ message: "Ruta protegida" });
  res.status(200);
});

/////////// API REST ///////////

app.get("/getUser/:id", verifyToken, (req: Request, res: Response) => {
  const users = req.user;
  res.json({ users });
});

// Ruta para obtener el sonido de una palabra
app.get("/api/word/:id/sound", verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ error: "ID de palabra no válido" });
      return;
    }

    // Buscar la palabra en la base de datos
    const englishWord = await prisma.englishWords.findUnique({
      where: { id: id },
    });

    if (!englishWord || !englishWord.sound) {
      res.status(404).json({ error: "Sonido no encontrado para la palabra especificada" });
      return;
    }

    // Construir la ruta absoluta al archivo mp3
    const soundFilePath = path.join(__dirname, "public", englishWord.sound);

    // Verificar si el archivo existe
    if (!fs.existsSync(soundFilePath)) {
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
  } catch (error) {
    console.error("Error al obtener el sonido:", error);
    res.status(500).json({ error: "Error del servidor al obtener el sonido" });
  }
});

// Ruta para crear una palabra
app.post("/api/word", verifyToken, async (req: Request, res: Response) => {
  const { original, translation } = req.body;

  if (!original || !translation) {
    res.json({ message: "Debes proporcionar la palabra original y su traducción." });
    return;
  }
  const orig = capitalizeWord(original);
  const trans = capitalizeWord(translation);

  const validWord = await verifyWord(orig);
  if (!validWord) {
    res.json({ message: `La palabra "${orig}" no existe en el diccionario.` });
    return;
  }
  const type = capitalizeWord(validWord.meanings[0].partOfSpeech);
  const user = req.user as User;
  // Verificar en inglés existe en la base de datos
  let existingWord = await prisma.englishWords.findUnique({
    where: { word: orig },
  });

  // Si no existe, obtener el sonido y guardarlo
  if (!existingWord) {
    // Obtener el sonido como un Buffer
    const mp3Name = await getSound(original);

    // Guardar la palabra y el sonido en la base de datos
    existingWord = await prisma.englishWords.create({
      data: {
        word: original,
        sound: mp3Name,
      },
    });
  }
  let existingTranslation;
  // Verificar si la traducción ya existe
  if (existingWord) {
    existingTranslation = await prisma.words.findUnique({
      where: { original: existingWord.word },
    });
  }
  // Si no existe, crear la traducción
  if (!existingTranslation) {
    existingTranslation = await prisma.words.create({
      data: {
        original: existingWord.word,
        translation: trans,
        type: type,
      },
    });
  }
  // Verificar si la palabra ya existe en la lista de palabras del usuario
  if (existingTranslation) {
    const existingUserWord = await prisma.userWords.findUnique({
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
    } else {
      // Crear la relación entre el usuario y la palabra
      await prisma.userWords.create({
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
});

app.delete("/api/word/:id", verifyToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as User;
  const userWord = await prisma.userWords.findUnique({
    where: {
      id: id,
      user: user.id,
    },
  });
  if (userWord) {
    await prisma.userWords.delete({
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
});

app.get("/api/words", verifyToken, async (req: Request, res: Response) => {
  const user = req.user as User;
  const userWords = await prisma.userWords.findMany({
    where: {
      user: user.id,
    },
  });
  res.json(userWords);
  res.status(200);
});

app.delete("/api/words/:id", verifyToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as User;
  //Comprobamos que el usuario tiene la palabra
  const userWords = await prisma.userWords.findUnique({
    where: {
      user: user.id,
      id: id,
    },
  });
  if (userWords) {
    await prisma.userWords.delete({
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
});

app.listen(4000, () => {
  console.log("Servidor ejecutándose en http://localhost:4000");
});
