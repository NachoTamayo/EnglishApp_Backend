import fs from "fs";
import path from "path";
import * as PlayHT from "playht";

PlayHT.init({
  userId: process.env.PLAY_HT_USERID ?? "",
  apiKey: process.env.PLAY_HT_APIKEY ?? "",
  defaultVoiceEngine: "Play3.0-mini",
  defaultVoiceId:
    "s3://voice-cloning-zero-shot/f6594c50-e59b-492c-bac2-047d57f8bdd8/susanadvertisingsaad/manifest.json",
});

export async function getSound(text: string): Promise<string> {
  const sanitizedText = text.replace(/[^a-z0-9_\-]/gi, "_");
  const soundsDir = path.join(__dirname, "..", "public", "sounds");

  if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
  }

  const filePath = path.join(soundsDir, `${sanitizedText}.mp3`);
  const writeStream = fs.createWriteStream(filePath);

  const stream = await PlayHT.stream(text, { voiceEngine: "Play3.0-mini" });

  return new Promise<string>((resolve, reject) => {
    stream
      .pipe(writeStream)
      .on("finish", () => resolve(`/sounds/${sanitizedText}.mp3`))
      .on("error", reject);
  });
}
