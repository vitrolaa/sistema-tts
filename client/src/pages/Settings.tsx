import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Voice, UserPreferences } from "../types";
import { getCacheStats, clearAllOfflineCache } from "../services/offlineStorage";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import {
  Trash2,
  Check,
} from "lucide-react";

export const Settings: React.FC = () => {
  const { setRate } = useAudioPlayer();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    id: "default",
    defaultVoice: "pt-BR-FranciscaNeural",
    language: "pt-BR",
    playbackSpeed: 1.0,
    theme: "dark",
    updatedAt: new Date().toISOString(),
  });

  const [cacheStats, setCacheStats] = useState<{ count: number; totalBytes: number }>({
    count: 0,
    totalBytes: 0,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // First check local cache for immediate display
      const localPrefs = localStorage.getItem("user_preferences");
      if (localPrefs) {
        try {
          const parsed = JSON.parse(localPrefs);
          setPreferences((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }

      const [vList, prefs, stats] = await Promise.all([
        api.getVoices(),
        api.getPreferences(),
        getCacheStats(),
      ]);
      setVoices(vList);
      if (prefs) {
        setPreferences(prefs);
        localStorage.setItem("user_preferences", JSON.stringify(prefs));
      }
      setCacheStats(stats);
    } catch (err) {
      console.warn("Failed to load settings:", err);
    }
  };

  const handleSavePreferences = async (updated: Partial<UserPreferences>) => {
    const next = { ...preferences, ...updated };
    setPreferences(next);
    localStorage.setItem("user_preferences", JSON.stringify(next));

    // If speed was updated, also update current audio player speed immediately
    if (updated.playbackSpeed !== undefined) {
      setRate(updated.playbackSpeed);
    }

    try {
      await api.updatePreferences(next);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error("Erro ao salvar no servidor, mantido localmente:", err);
      // Still show success because it was saved locally
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm("Limpar áudios salvos offline?")) return;
    await clearAllOfflineCache();
    const stats = await getCacheStats();
    setCacheStats(stats);
  };

  const cacheSizeMB = (cacheStats.totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="pb-28 pt-6 px-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">Ajustes</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Preferências de narração e armazenamento</p>
      </div>

      {savedSuccess && (
        <div className="p-2.5 rounded-lg border border-white/[0.1] bg-zinc-900 text-zinc-200 text-xs flex items-center gap-2 transition-all">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Preferências salvas com sucesso!</span>
        </div>
      )}

      {/* Voice & Speed */}
      <div className="space-y-4 border-t border-white/[0.08] pt-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Voz padrão
          </label>
          <select
            value={preferences.defaultVoice}
            onChange={(e) => handleSavePreferences({ defaultVoice: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-900 border border-white/[0.08] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-white/20"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name.replace("Neural", "").replace(" (Brasileira - Natural & Expressiva)", "")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-medium text-zinc-300 mb-1.5">
            <span>Velocidade padrão</span>
            <span className="font-mono text-zinc-400">{preferences.playbackSpeed}x</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleSavePreferences({ playbackSpeed: rate })}
                className={`py-1.5 text-xs rounded-md transition-colors ${
                  preferences.playbackSpeed === rate
                    ? "bg-white text-zinc-950 font-medium"
                    : "bg-zinc-900 text-zinc-400 border border-white/[0.04] hover:text-white"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Offline Storage */}
      <div className="border-t border-white/[0.08] pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-zinc-300">Memória offline</h2>
          <span className="text-xs font-mono text-zinc-400">{cacheSizeMB} MB</span>
        </div>

        <p className="text-xs text-zinc-400">
          {cacheStats.count} {cacheStats.count === 1 ? "áudio salvo" : "áudios salvos"} para ouvir sem internet.
        </p>

        {cacheStats.count > 0 && (
          <button
            onClick={handleClearCache}
            className="mt-2 text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar cache offline</span>
          </button>
        )}
      </div>

      {/* Background Playback Instructions */}
      <div className="border-t border-white/[0.08] pt-4 space-y-2">
        <h2 className="text-xs font-medium text-zinc-300">Tela desligada & Segundo plano</h2>
        <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
          <p>
            • <strong>Android:</strong> Instale pelo menu do Chrome ("Instalar aplicativo"). Ao dar play, bloqueie o celular com o botão físico normalmente.
          </p>
          <p>
            • <strong>iPhone (Safari):</strong> Toque no ícone Compartilhar (⎋) &gt; "Adicionar à Tela de Início".
          </p>
        </div>
      </div>
    </div>
  );
};
