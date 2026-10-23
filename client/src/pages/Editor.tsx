import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import type { Voice, TextItem } from "../types";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import {
  Trash2,
  RotateCcw,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

export const Editor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const textIdFromUrl = searchParams.get("id");
  const navigate = useNavigate();
  const { playAudio } = useAudioPlayer();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("pt-BR-FranciscaNeural");
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [savingText, setSavingText] = useState(false);
  const [currentTextId, setCurrentTextId] = useState<string | null>(textIdFromUrl);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    loadVoicesAndDefaults();
    if (textIdFromUrl) {
      loadExistingText(textIdFromUrl);
    }
  }, [textIdFromUrl]);

  const loadVoicesAndDefaults = async () => {
    try {
      const [voicesList, prefs] = await Promise.all([api.getVoices(), api.getPreferences()]);
      setVoices(voicesList);
      if (prefs.defaultVoice) setSelectedVoice(prefs.defaultVoice);
      if (prefs.playbackSpeed) setPlaybackSpeed(prefs.playbackSpeed);
    } catch (err) {
      console.warn("Failed to load voices/preferences:", err);
    }
  };

  const loadExistingText = async (id: string) => {
    try {
      const text = await api.getText(id);
      setTitle(text.title);
      setContent(text.content);
      setCurrentTextId(text.id);
    } catch (err) {
      console.error("Failed to load text:", err);
    }
  };

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.round((wordCount / (2.5 * playbackSpeed)) || 0);
  const estimatedMinutes = (estimatedSeconds / 60).toFixed(1);

  const handleClear = () => {
    if (content.length > 50 && !window.confirm("Deseja limpar todo o texto?")) {
      return;
    }
    setContent("");
    setTitle("");
    setCurrentTextId(null);
  };

  const handleSaveTextOnly = async () => {
    if (!content.trim()) return;

    try {
      setSavingText(true);
      const textTitle = title.trim() || `Texto ${new Date().toLocaleDateString("pt-BR")}`;
      let savedText: TextItem;

      if (currentTextId) {
        savedText = await api.updateText(currentTextId, { title: textTitle, content });
      } else {
        savedText = await api.createText({ title: textTitle, content });
        setCurrentTextId(savedText.id);
      }

      alert("Texto salvo!");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar");
    } finally {
      setSavingText(false);
    }
  };

  const handleTransformToAudio = async (force = false) => {
    if (!content.trim()) return;

    setIsGenerating(true);
    setProgressPercent(10);
    setStatusMessage("Preparando narração...");
    setGenerationError(null);

    try {
      const textTitle = title.trim() || `Texto ${new Date().toLocaleDateString("pt-BR")}`;
      let textItem: TextItem;

      if (currentTextId) {
        textItem = await api.updateText(currentTextId, { title: textTitle, content });
      } else {
        textItem = await api.createText({ title: textTitle, content });
        setCurrentTextId(textItem.id);
      }

      const audioReq = await api.requestAudioGeneration(textItem.id, {
        voice: selectedVoice,
        rate: playbackSpeed,
        forceRegenerate: force,
      });

      const audioId = audioReq.audio.id;

      if (audioReq.reused) {
        setProgressPercent(100);
        await playAudio(audioReq.audio, textItem);
        setIsGenerating(false);
        navigate("/player");
        return;
      }

      let isDone = false;
      let attempts = 0;

      while (!isDone && attempts < 90) {
        await new Promise((r) => setTimeout(r, 1000));
        attempts++;

        const statusRes = await api.getAudioStatus(audioId);
        setProgressPercent(statusRes.progressPercent || Math.min(90, attempts * 5));
        setStatusMessage(statusRes.statusMessage || "Sintetizando áudio...");

        if (statusRes.status === "COMPLETED") {
          isDone = true;
          setProgressPercent(100);

          const fullAudio = {
            ...audioReq.audio,
            status: "COMPLETED" as const,
            duration: statusRes.duration || estimatedSeconds,
            fileSize: statusRes.fileSize,
          };

          await playAudio(fullAudio, textItem);
          setIsGenerating(false);
          navigate("/player");
          return;
        } else if (statusRes.status === "FAILED") {
          throw new Error(statusRes.error || "A síntese falhou.");
        }
      }
    } catch (err: any) {
      setGenerationError(err.message || "Erro ao sintetizar áudio.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="pb-28 pt-6 px-4 max-w-md mx-auto">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-white">Escrever</h1>

        <div className="flex items-center gap-1.5">
          {content && (
            <button
              onClick={handleClear}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Limpar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleSaveTextOnly}
            disabled={savingText || !content.trim()}
            className="px-2.5 py-1 text-xs text-zinc-300 hover:text-white border border-white/[0.08] rounded-md transition-colors disabled:opacity-30"
          >
            {savingText ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          className="w-full px-3 py-2 bg-transparent border-b border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
        />
      </div>

      {/* Editor Content Area */}
      <div className="mb-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={11}
          placeholder="Cole ou escreva seu texto aqui..."
          className="w-full p-3.5 bg-zinc-900/40 border border-white/[0.08] rounded-xl text-sm text-zinc-200 placeholder-zinc-600 leading-relaxed focus:outline-none focus:border-white/20 transition-colors resize-none"
        />

        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 py-1">
          <span>{wordCount} palavras • {charCount} carac.</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-400" />
            ~{estimatedMinutes} min
          </span>
        </div>
      </div>

      {/* Clean Voice & Speed Settings */}
      <div className="p-3.5 rounded-xl border border-white/[0.08] bg-zinc-900/20 mb-5 space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Voz
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full px-3 py-1.5 bg-zinc-900 border border-white/[0.08] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-white/20"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name.replace("Neural", "").replace(" (Brasileira - Natural & Expressiva)", "")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1">
            <span>Velocidade</span>
            <span className="text-zinc-200 font-mono">{playbackSpeed}x</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackSpeed(rate)}
                className={`py-1 text-xs rounded-md transition-colors ${
                  playbackSpeed === rate
                    ? "bg-white text-zinc-950 font-medium"
                    : "bg-zinc-900/80 text-zinc-400 border border-white/[0.04] hover:text-white"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Status */}
      {isGenerating && (
        <div className="mb-4 p-3 rounded-xl border border-white/[0.08] bg-zinc-900/50">
          <div className="flex items-center justify-between text-xs text-zinc-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {statusMessage}
            </span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {generationError && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-950/20 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{generationError}</span>
        </div>
      )}

      {/* Main Action Button */}
      <button
        onClick={() => handleTransformToAudio(false)}
        disabled={isGenerating || !content.trim()}
        className="w-full py-3 bg-white text-zinc-950 font-medium text-sm rounded-xl active:scale-[0.99] transition-transform disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Gerando áudio...</span>
          </>
        ) : (
          <span>Gerar áudio</span>
        )}
      </button>

      {currentTextId && (
        <button
          onClick={() => handleTransformToAudio(true)}
          disabled={isGenerating || !content.trim()}
          className="w-full mt-2 py-1.5 text-zinc-500 hover:text-zinc-300 text-xs flex items-center justify-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Regerar áudio do início</span>
        </button>
      )}
    </div>
  );
};
