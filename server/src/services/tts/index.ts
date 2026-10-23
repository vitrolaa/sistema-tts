import { TTSProvider, TTSOptions, TTSResult, VoiceInfo } from "./types.js";
import { EdgeTTSProvider } from "./edgeProvider.js";
import { GoogleTTSProvider } from "./googleProvider.js";

// In-memory active progress store for real-time status polling
const progressMap = new Map<string, { percent: number; message: string; error?: string }>();

export class TTSManager {
  private providers: Map<string, TTSProvider> = new Map();
  private defaultProviderName: string = "edge";

  constructor() {
    const edge = new EdgeTTSProvider();
    const google = new GoogleTTSProvider();

    this.providers.set(edge.name, edge);
    this.providers.set(google.name, google);
  }

  getProvider(name?: string): TTSProvider {
    const providerName = name || this.defaultProviderName;
    const provider = this.providers.get(providerName);
    if (!provider) {
      // Fallback to first available
      return this.providers.values().next().value!;
    }
    return provider;
  }

  async getAllVoices(): Promise<VoiceInfo[]> {
    const allVoices: VoiceInfo[] = [];
    for (const provider of this.providers.values()) {
      try {
        const voices = await provider.getVoices();
        allVoices.push(...voices);
      } catch (err) {
        console.warn(`Failed to fetch voices for provider ${provider.name}:`, err);
      }
    }
    return allVoices;
  }

  setProgress(audioId: string, percent: number, message: string, error?: string) {
    progressMap.set(audioId, { percent, message, error });
  }

  getProgress(audioId: string) {
    return progressMap.get(audioId) || { percent: 0, message: "Aguardando início..." };
  }

  clearProgress(audioId: string) {
    progressMap.delete(audioId);
  }

  async generate(
    audioId: string,
    text: string,
    outputDir: string,
    options?: TTSOptions
  ): Promise<TTSResult> {
    const requestedVoice = options?.voice;
    // Determine provider based on voice id or default
    let chosenProviderName = "edge";
    if (requestedVoice?.startsWith("google-")) {
      chosenProviderName = "google";
    }

    const provider = this.getProvider(chosenProviderName);
    this.setProgress(audioId, 5, "Iniciando conversão...");

    try {
      const result = await provider.generateAudio(text, outputDir, {
        ...options,
        onProgress: (percent, message) => {
          this.setProgress(audioId, percent, message);
        },
      });

      this.setProgress(audioId, 100, "Áudio gerado com sucesso!");
      return result;
    } catch (primaryError) {
      console.warn(`Primary TTS provider (${provider.name}) failed, attempting fallback...`, primaryError);
      this.setProgress(audioId, 20, "Tentando sintetizador secundário de contingência...");

      const fallbackProvider = chosenProviderName === "edge" ? this.getProvider("google") : this.getProvider("edge");
      try {
        const fallbackResult = await fallbackProvider.generateAudio(text, outputDir, {
          ...options,
          onProgress: (percent, message) => {
            this.setProgress(audioId, percent, message);
          },
        });
        this.setProgress(audioId, 100, "Áudio gerado com sucesso (modo contingência)!");
        return fallbackResult;
      } catch (fallbackError) {
        this.setProgress(audioId, 0, "Falha na síntese de áudio.", String(fallbackError));
        throw fallbackError;
      }
    }
  }
}

export const ttsManager = new TTSManager();
export * from "./types.js";
export * from "./chunker.js";
