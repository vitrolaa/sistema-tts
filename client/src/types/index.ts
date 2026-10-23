export interface TextItem {
  id: string;
  userId?: string | null;
  title: string;
  content: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  audios?: AudioItem[];
}

export interface AudioItem {
  id: string;
  textId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  filePath?: string | null;
  fileSize?: number | null;
  duration: number; // in seconds
  voice: string;
  language: string;
  format: string;
  createdAt: string;
  text?: TextItem;
}

export interface Voice {
  id: string;
  name: string;
  gender: "Female" | "Male" | "Neutral";
  language: string;
  provider: string;
  description?: string;
}

export interface UserPreferences {
  id: string;
  userId?: string | null;
  defaultVoice: string;
  language: string;
  playbackSpeed: number;
  theme: string;
  updatedAt: string;
}

export interface AudioStatusResponse {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  duration: number;
  fileSize?: number;
  progressPercent: number;
  statusMessage: string;
  error?: string;
}
