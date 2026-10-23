import * as googleTTS from "google-tts-api";
import fs from "fs";
import path from "path";
import https from "https";
import { v4 as uuidv4 } from "uuid";
import { TTSProvider, TTSOptions, TTSResult, VoiceInfo } from "./types.js";
import { chunkText, estimateDuration } from "./chunker.js";

export class GoogleTTSProvider implements TTSProvider {
  name = "google";

  private supportedVoices: VoiceInfo[] = [
    {
      id: "google-pt-BR",
      name: "Google Tradutor (Português Brasileiro)",
      gender: "Female",
      language: "pt-BR",
      provider: "google",
      description: "Voz clássica e confiável do Google Tradutor.",
    },
    {
      id: "google-en-US",
      name: "Google Tradutor (Inglês)",
      gender: "Female",
      language: "en-US",
      provider: "google",
      description: "Voz padrão do Google Tradutor em inglês.",
    },
    {
      id: "google-es-ES",
      name: "Google Tradutor (Espanhol)",
      gender: "Female",
      language: "es-ES",
      provider: "google",
      description: "Voz padrão do Google Tradutor em espanhol.",
    },
  ];

  async getVoices(): Promise<VoiceInfo[]> {
    return this.supportedVoices;
  }

  private downloadUrlToBuffer(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Google TTS request failed with status ${res.statusCode}`));
        }
        const data: Buffer[] = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => resolve(Buffer.concat(data)));
        res.on("error", reject);
      }).on("error", reject);
    });
  }

  async generateAudio(text: string, outputDir: string, options?: TTSOptions): Promise<TTSResult> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const lang = options?.language?.split("-")[0] || "pt";
    // Google TTS has a 200-char limit per request
    const chunks = chunkText(text, 180);

    const finalFileName = `${uuidv4()}.mp3`;
    const finalFilePath = path.join(outputDir, finalFileName);
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (options?.onProgress) {
        const percent = Math.round(((i + 1) / chunks.length) * 100);
        options.onProgress(percent, `Processando bloco ${i + 1} de ${chunks.length}...`);
      }

      const url = googleTTS.getAudioUrl(chunk, {
        lang,
        slow: (options?.rate ?? 1.0) < 0.9,
        host: "https://translate.google.com",
        timeout: 10000,
      });

      const buffer = await this.downloadUrlToBuffer(url);
      writeStream.write(buffer);

      // Brief throttle to prevent rate-limits from Google Translate
      if (i < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    const stats = fs.statSync(finalFilePath);
    const estimatedDurationSec = estimateDuration(text, options?.rate || 1.0);

    return {
      filePath: finalFilePath,
      fileSize: stats.size,
      duration: estimatedDurationSec,
      format: "mp3",
    };
  }
}
