import type { TextItem, AudioItem, Voice, UserPreferences, AudioStatusResponse } from "../types";

const API_BASE = "/api";

export const api = {
  // Texts
  async getTexts(params?: { search?: string; favorite?: boolean }): Promise<{ texts: TextItem[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.favorite) searchParams.set("favorite", "true");

    const url = `${API_BASE}/texts?${searchParams.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro ao carregar textos");
    return res.json();
  },

  async getText(id: string): Promise<TextItem> {
    const res = await fetch(`${API_BASE}/texts/${id}`);
    if (!res.ok) throw new Error("Erro ao obter o texto");
    return res.json();
  },

  async createText(data: { title: string; content: string; favorite?: boolean }): Promise<TextItem> {
    const res = await fetch(`${API_BASE}/texts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erro ao salvar texto");
    }
    return res.json();
  },

  async updateText(id: string, data: Partial<{ title: string; content: string; favorite: boolean }>): Promise<TextItem> {
    const res = await fetch(`${API_BASE}/texts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao atualizar texto");
    return res.json();
  },

  async deleteText(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/texts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erro ao excluir texto");
  },

  // Audio & TTS
  async requestAudioGeneration(
    textId: string,
    options?: { voice?: string; language?: string; rate?: number; forceRegenerate?: boolean }
  ): Promise<{ audio: AudioItem; message: string; reused?: boolean }> {
    const res = await fetch(`${API_BASE}/texts/${textId}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erro ao solicitar geração de áudio");
    }
    return res.json();
  },

  async getAudioStatus(audioId: string): Promise<AudioStatusResponse> {
    const res = await fetch(`${API_BASE}/audio/${audioId}/status`);
    if (!res.ok) throw new Error("Erro ao verificar status do áudio");
    return res.json();
  },

  getAudioStreamUrl(audioId: string): string {
    return `${API_BASE}/audio/${audioId}/stream`;
  },

  getAudioDownloadUrl(audioId: string): string {
    return `${API_BASE}/audio/${audioId}/download`;
  },

  async getVoices(): Promise<Voice[]> {
    const res = await fetch(`${API_BASE}/tts/voices`);
    if (!res.ok) throw new Error("Erro ao obter lista de vozes");
    return res.json();
  },

  // Preferences & Progress
  async getPreferences(): Promise<UserPreferences> {
    const res = await fetch(`${API_BASE}/user/preferences`);
    if (!res.ok) throw new Error("Erro ao obter preferências");
    return res.json();
  },

  async updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    const res = await fetch(`${API_BASE}/user/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao salvar preferências");
    return res.json();
  },

  async saveProgress(audioId: string, currentTime: number): Promise<void> {
    try {
      await fetch(`${API_BASE}/user/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioId, currentTime }),
      });
    } catch (e) {
      // Non-blocking sync error
      console.warn("Failed to sync progress to server:", e);
    }
  },

  async getProgress(audioId: string): Promise<number> {
    try {
      const res = await fetch(`${API_BASE}/user/progress/${audioId}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.currentTime || 0;
    } catch {
      return 0;
    }
  },
};
