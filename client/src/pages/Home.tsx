import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { TextItem } from "../types";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import { PWAInstallPrompt } from "../components/PWAInstallPrompt";
import { AudioWaveAnimation } from "../components/AudioWaveAnimation";
import {
  Plus,
  Play,
  Pause,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

export const Home: React.FC = () => {
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentAudio, currentText, isPlaying, togglePlay, playAudio } = useAudioPlayer();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getTexts();
      setTexts(res.texts);
    } catch (err) {
      console.error("Failed to load texts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPlay = async (text: TextItem) => {
    const audio = text.audios?.[0];
    if (audio && audio.status === "COMPLETED") {
      if (currentAudio?.id === audio.id) {
        togglePlay();
      } else {
        await playAudio(audio, text);
        navigate("/player");
      }
    } else {
      navigate(`/novo?id=${text.id}`);
    }
  };

  const totalAudios = texts.filter((t) => t.audios && t.audios.length > 0 && t.audios[0].status === "COMPLETED").length;
  const totalDurationMinutes = Math.round(
    texts.reduce((acc, t) => acc + (t.audios?.[0]?.duration || 0), 0) / 60
  );

  return (
    <div className="pb-28 pt-6 px-4 max-w-md mx-auto">
      {/* Brand Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">VozLivre</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Leitor em áudio com tela bloqueada</p>
        </div>

        <Link
          to="/novo"
          className="px-3 py-1.5 bg-white text-zinc-950 font-medium text-xs rounded-lg active:scale-95 transition-all flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Escrever</span>
        </Link>
      </header>

      {/* PWA Prompt */}
      <PWAInstallPrompt />

      {/* Currently Playing Card */}
      {currentAudio && currentText && (
        <div className="mb-6 p-4 rounded-xl bg-zinc-900/60 border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
              Ouvindo agora
            </span>
            <button
              onClick={() => navigate("/player")}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-0.5"
            >
              Player <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 mt-1">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-white truncate">{currentText.title}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {currentAudio.voice.replace("Neural", "").replace("pt-BR-", "")} • {Math.round(currentAudio.duration / 60)} min
              </p>
            </div>

            <div className="flex items-center gap-2">
              <AudioWaveAnimation isPlaying={isPlaying} bars={4} />
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white text-zinc-950 flex items-center justify-center active:scale-95 transition-transform shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Counter */}
      <div className="flex items-center gap-4 text-xs text-zinc-400 mb-6 px-1">
        <span>{texts.length} {texts.length === 1 ? "texto" : "textos"}</span>
        <span>•</span>
        <span>{totalAudios} {totalAudios === 1 ? "áudio pronto" : "áudios prontos"}</span>
        {totalDurationMinutes > 0 && (
          <>
            <span>•</span>
            <span>~{totalDurationMinutes} min</span>
          </>
        )}
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Recentes
        </h2>
        {texts.length > 0 && (
          <Link to="/biblioteca" className="text-xs text-zinc-400 hover:text-white flex items-center gap-0.5">
            Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 rounded-xl bg-zinc-900/40 animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      ) : texts.length === 0 ? (
        <div className="py-12 px-4 rounded-xl border border-dashed border-zinc-800 text-center">
          <p className="text-xs text-zinc-400">Nenhum texto salvo ainda.</p>
          <Link
            to="/novo"
            className="inline-block mt-3 text-xs font-medium text-white underline underline-offset-4 hover:text-zinc-300"
          >
            Adicionar seu primeiro texto
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl overflow-hidden bg-zinc-900/30">
          {texts.slice(0, 6).map((item) => {
            const audio = item.audios?.[0];
            const hasAudio = audio && audio.status === "COMPLETED";
            const isThisPlaying = isPlaying && currentAudio?.id === audio?.id;

            return (
              <div
                key={item.id}
                onClick={() => handleQuickPlay(item)}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-zinc-100 truncate">{item.title}</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                    <span>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                    <span>•</span>
                    <span>{item.content.length} caracteres</span>
                    {hasAudio && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-300">{Math.round((audio.duration || 0) / 60) || 1} min</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="shrink-0">
                  {hasAudio ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickPlay(item);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isThisPlaying
                          ? "bg-white text-zinc-950"
                          : "border border-white/20 text-zinc-300 hover:border-white hover:text-white"
                      }`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-500">Sem áudio</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
