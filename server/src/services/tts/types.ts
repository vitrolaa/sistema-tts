export interface VoiceInfo {
  id: string;
  name: string;
  gender: "Female" | "Male" | "Neutral";
  language: string;
  provider: string;
  description?: string;
}

export interface TTSOptions {
  voice?: string;
  language?: string;
  rate?: number; // e.g. 0.75, 1.0, 1.25, 1.5, 2.0
  pitch?: string; // e.g. "+0Hz", "+5Hz"
  onProgress?: (progressPercent: number, statusMessage: string) => void;
}

export interface TTSResult {
  filePath: string;
  fileSize: number;
  duration: number; // in seconds (estimated or calculated)
  format: string;
}

export interface TTSProvider {
  name: string;
  generateAudio(text: string, outputDir: string, options?: TTSOptions): Promise<TTSResult>;
  getVoices(): Promise<VoiceInfo[]>;
}
