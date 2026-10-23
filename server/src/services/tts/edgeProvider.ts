import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { TTSProvider, TTSOptions, TTSResult, VoiceInfo } from "./types.js";
import { chunkText, estimateDuration } from "./chunker.js";

export class EdgeTTSProvider implements TTSProvider {
  name = "edge";

  private supportedVoices: VoiceInfo[] = [
    {
      id: "pt-BR-FranciscaNeural",
      name: "Francisca (Brasileira - Natural & Expressiva)",
      gender: "Female",
      language: "pt-BR",
      provider: "edge",
      description: "Voz feminina padrão, calma, clara e acolhedora, ideal para audiolivros.",
    },
    {
      id: "pt-BR-AntonioNeural",
      name: "Antônio (Brasileiro - Firme & Envolvente)",
      gender: "Male",
      language: "pt-BR",
      provider: "edge",
      description: "Voz masculina natural, tom seguro e articulado para notícias e livros.",
    },
    {
      id: "pt-BR-ThalitaNeural",
      name: "Thalita (Brasileira - Dinâmica & Jovem)",
      gender: "Female",
      language: "pt-BR",
      provider: "edge",
      description: "Voz feminina com ritmo mais ágil e conversacional.",
    },
    {
      id: "pt-PT-RaquelNeural",
      name: "Raquel (Português de Portugal)",
      gender: "Female",
      language: "pt-PT",
      provider: "edge",
      description: "Voz feminina padrão para português europeu.",
    },
    {
      id: "pt-PT-DuarteNeural",
      name: "Duarte (Português de Portugal)",
      gender: "Male",
      language: "pt-PT",
      provider: "edge",
      description: "Voz masculina padrão para português europeu.",
    },
    {
      id: "en-US-JennyNeural",
      name: "Jenny (Inglês dos EUA)",
      gender: "Female",
      language: "en-US",
      provider: "edge",
      description: "Voz feminina neutra em inglês americano.",
    },
    {
      id: "en-US-GuyNeural",
      name: "Guy (Inglês dos EUA)",
      gender: "Male",
      language: "en-US",
      provider: "edge",
      description: "Voz masculina neutra em inglês americano.",
    },
    {
      id: "es-ES-ElviraNeural",
      name: "Elvira (Espanhol da Espanha)",
      gender: "Female",
      language: "es-ES",
      provider: "edge",
      description: "Voz feminina padrão em espanhol.",
    },
  ];

  async getVoices(): Promise<VoiceInfo[]> {
    return this.supportedVoices;
  }

  async generateAudio(text: string, outputDir: string, options?: TTSOptions): Promise<TTSResult> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const voice = options?.voice || "pt-BR-FranciscaNeural";
    const chunks = chunkText(text, 1200);

    const tempChunkFiles: string[] = [];
    const finalFileName = `${uuidv4()}.mp3`;
    const finalFilePath = path.join(outputDir, finalFileName);

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (options?.onProgress) {
          const percent = Math.round(((i + 1) / chunks.length) * 100);
          options.onProgress(percent, `Sintetizando bloco ${i + 1} de ${chunks.length}...`);
        }

        // Convert playback speed to prosody rate string (e.g. +20%, -10%)
        let prosodyRate: string | undefined = undefined;
        if (options?.rate && options.rate !== 1.0) {
          const delta = Math.round((options.rate - 1.0) * 100);
          prosodyRate = delta >= 0 ? `+${delta}%` : `${delta}%`;
        }

        const chunkDir = path.join(outputDir, `tmp_${uuidv4()}`);
        fs.mkdirSync(chunkDir, { recursive: true });

        const result = await tts.toFile(chunkDir, chunk, {
          rate: prosodyRate,
          pitch: options?.pitch,
        });

        tempChunkFiles.push(result.audioFilePath);
      }

      // Concatenate chunk files into final MP3
      if (tempChunkFiles.length === 1) {
        fs.copyFileSync(tempChunkFiles[0], finalFilePath);
      } else {
        const writeStream = fs.createWriteStream(finalFilePath);
        for (const chunkFile of tempChunkFiles) {
          const buffer = fs.readFileSync(chunkFile);
          writeStream.write(buffer);
        }
        writeStream.end();
        await new Promise((resolve, reject) => {
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });
      }

      const stats = fs.statSync(finalFilePath);
      const estimatedDurationSec = estimateDuration(text, options?.rate || 1.0);

      return {
        filePath: finalFilePath,
        fileSize: stats.size,
        duration: estimatedDurationSec,
        format: "mp3",
      };
    } finally {
      // Clean up temporary files & dirs
      for (const chunkFile of tempChunkFiles) {
        try {
          if (fs.existsSync(chunkFile)) {
            const dir = path.dirname(chunkFile);
            fs.rmSync(dir, { recursive: true, force: true });
          }
        } catch (e) {
          console.warn("Failed to clean up temp chunk:", e);
        }
      }
    }
  }
}
