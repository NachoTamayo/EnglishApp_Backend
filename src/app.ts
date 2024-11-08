import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import session from "express-session";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import prisma from "./prismaClient";
import * as PlayHT from "playht";
import fs from "fs";
import "./passportSetup";

interface DecodedToken {
  userId: string;
  iat: number;
  exp: number;
}

interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

interface WordResponse {
  word: string;
  phonetics: string;
  meanings: {
    partOfSpeech: string;
  }[];
}

PlayHT.init({
  userId: process.env.PLAY_HT_USERID ?? "",
  apiKey: process.env.PLAY_HT_APIKEY ?? "",
  defaultVoiceEngine: "Play3.0-mini",
  defaultVoiceId:
    "s3://voice-cloning-zero-shot/f6594c50-e59b-492c-bac2-047d57f8bdd8/susanadvertisingsaad/manifest.json",
});

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

// Middleware para verificar el token JWT
interface TokenPayload extends JwtPayload {
  userId: string;
}

function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies["token"];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
      if (decoded && decoded.userId) {
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
    } else {
      res.sendStatus(200);
    }
  });
  res.sendStatus(200);
});

async function getSound(text: string): Promise<Buffer> {
  const stream = await PlayHT.stream(`${text}`, {
    voiceEngine: "Play3.0-mini",
  });
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });

    stream.on("error", (err: Error) => {
      reject(err);
    });
  });
}

async function verifyWord(word: String) {
  const result = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  const data = await result.json();
  if (data[0] && data[0].word) {
    return data[0];
  } else {
    return false;
  }
}

function wordType(meaning: String) {
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

function capitalizeWord(word: String) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/////////// API REST ///////////

app.get("/getUser/:id", verifyToken, (req: Request, res: Response) => {
  const users = req.user;
  res.json({ users });
});

// Ruta para obtener el sonido de una palabra
app.get("/api/word/:id/sound", verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar la palabra en la base de datos
    const englishWord = await prisma.englishWords.findUnique({
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
  const type = wordType(validWord.meanings[0].partOfSpeech);
  const user = req.user as User;
  // Verificar en inglés existe en la base de datos
  let existingWord = await prisma.englishWords.findUnique({
    where: { word: orig },
  });

  // Si no existe, obtener el sonido y guardarlo
  if (!existingWord) {
    // Obtener el sonido como un Buffer
    const buffer = await getSound(original);

    // Guardar la palabra y el sonido en la base de datos
    existingWord = await prisma.englishWords.create({
      data: {
        word: original,
        sound: buffer,
      },
    });
  }
  let existingTranslation;
  // Verificar si la traducción ya existe
  if (existingWord) {
    existingTranslation = await prisma.words.findUnique({
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
    existingTranslation = await prisma.words.create({
      data: {
        original: existingWord.id,
        translation: trans,
        type: type,
      },
    });
  }
  // Verificar si la palabra ya existe en la lista de palabras del usuario
  if (existingTranslation) {
    console.log(user.id);
    const existingUserWord = await prisma.userWords.findUnique({
      where: {
        unique_user_word: {
          userId: user.id,
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
    } else {
      // Crear la relación entre el usuario y la palabra
      await prisma.userWords.create({
        data: {
          userId: user.id,
          wordId: existingTranslation.id,
        },
      });
      res.json({ message: "Palabra creada", existingTranslation });
      res.status(200);
      return;
    }
  }
  res.json({ message: "Something went wrong" });
  res.status(304);
});

app.delete("/api/word/:id", verifyToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user as User;
  const userWord = await prisma.userWords.findUnique({
    where: {
      unique_user_word: {
        userId: user.id,
        wordId: Number(id),
      },
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
      userId: user.id,
    },
    include: {
      Word: {
        include: {
          word: true,
        },
      },
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
      unique_user_word: {
        userId: user.id,
        wordId: Number(id),
      },
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
