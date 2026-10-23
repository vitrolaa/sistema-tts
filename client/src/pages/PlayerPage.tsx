import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import { AudioWaveAnimation } from "../components/AudioWaveAnimation";
import { api } from "../services/api";
import type { TextItem } from "../types";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Repeat,
  Moon,
  Download,
  FileText,
  ArrowLeft,
  Check,
  Headphones,
} from "lucide-react";

export const PlayerPage: React.FC = () => {
  const {
    currentAudio,
    currentText,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isRepeating,
    sleepTimerRemaining,
    sleepTimerMinutes,
    isOfflineAvailable,
    isLoadingAudio,
    togglePlay,
    playAudio,
    seekTo,
    seekRelative,
    setRate,
    toggleRepeat,
    setSleepTimer,
    toggleOfflineCache,
  } = useAudioPlayer();

  const navigate = useNavigate();
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [availableTexts, setAvailableTexts] = useState<TextItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // If no audio is currently selected, fetch saved texts so user can pick one immediately
  useEffect(() => {
    if (!currentAudio) {
      setLoadingList(true);
      api.getTexts()
        .then((res) => {
          const withAudio = res.texts.filter(
            (t) => t.audios && t.audios.length > 0 && t.audios[0].status === "COMPLETED"
          );
          setAvailableTexts(withAudio);
        })
        .catch(console.warn)
        .finally(() => setLoadingList(false));
    }
  }, [currentAudio]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const handleToggleOffline = async () => {
    setIsCaching(true);
    await toggleOfflineCache();
    setIsCaching(false);
  };

  const sleepOptions = [
    { label: "Desativado", value: null },
    { label: "5 min", value: 5 },
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "45 min", value: 45 },
    { label: "60 min", value: 60 },
  ];

  if (!currentAudio || !currentText) {
    return (
      <div className="pb-28 pt-8 px-4 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-zinc-300">
            <Headphones className="w-6 h-6 stroke-[1.6]" />
          </div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Seção de Ouvir</h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            Selecione um texto com áudio pronto para ouvir ou crie um novo.
          </p>
        </div>

        {loadingList ? (
          <div className="space-y-2">
            {[1, 2].map((n) => (
              <div key={n} className="h-16 rounded-xl bg-zinc-900/40 animate-pulse border border-white/[0.04]" />
            ))}
          </div>
        ) : availableTexts.length > 0 ? (
          <div className="space-y-2 mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1 mb-2">
              Textos com áudio pronto
            </h2>
            <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl overflow-hidden bg-zinc-900/30">
              {availableTexts.map((item) => {
                const audio = item.audios?.[0];
                return (
                  <div
                    key={item.id}
                    onClick={() => audio && playAudio(audio, item)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {Math.round((audio?.duration || 0) / 60) || 1} min • {audio?.voice.replace("Neural", "").replace("pt-BR-", "")}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (audio) playAudio(audio, item);
                      }}
                      className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center active:scale-95 transition-transform shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-zinc-800 text-center mb-6">
            <p className="text-xs text-zinc-400">Nenhum áudio gerado ainda.</p>
          </div>
        )}

        <Link
          to="/novo"
          className="w-full py-3 bg-white text-zinc-950 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
        >
          Escrever novo texto
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28 pt-6 px-4 max-w-md mx-auto min-h-screen flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          title="Voltar"
        >
          <ArrowLeft className="w-5 h-5 stroke-[1.6]" />
        </button>

        <span className="text-xs text-zinc-400 font-medium truncate max-w-[200px]">
          {currentAudio.voice.replace("Neural", "").replace("pt-BR-", "")}
        </span>

        <button
          onClick={() => setShowTextModal(true)}
          className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          title="Ver texto"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      {/* Center Display / Soundwave */}
      <div className="my-auto flex flex-col items-center text-center px-2">
        <div className="w-48 h-48 rounded-2xl bg-zinc-900 border border-white/[0.08] flex flex-col items-center justify-center p-6 shadow-sm mb-6 relative">
          <AudioWaveAnimation isPlaying={isPlaying} bars={12} />
          {isOfflineAvailable && (
            <span className="absolute bottom-3 text-[10px] text-zinc-400 flex items-center gap-1">
              <Check className="w-3 h-3 text-zinc-300" /> Salvo offline
            </span>
          )}
        </div>

        <h2 className="text-lg font-medium text-white max-w-xs truncate">
          {currentText.title}
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {currentAudio.language} • {formatTime(currentTime)} / {formatTime(duration)}
        </p>
      </div>

      {/* Controls Container */}
      <div className="mt-auto space-y-6 pt-4">
        {/* Scrubber */}
        <div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full"
          />
          <div className="flex justify-between text-[11px] font-mono text-zinc-400 mt-1 px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Row (-15s, Play/Pause, +15s) */}
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => seekRelative(-15)}
            className="p-2 text-zinc-400 hover:text-white active:scale-95 transition-transform relative"
            title="Voltar 15 segundos"
          >
            <RotateCcw className="w-5 h-5 stroke-[1.8]" />
            <span className="absolute text-[8px] font-bold bottom-0 left-1/2 -translate-x-1/2">15</span>
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoadingAudio}
            className="w-16 h-16 rounded-full bg-white text-zinc-950 flex items-center justify-center active:scale-95 transition-transform shadow-md cursor-pointer"
            aria-label={isPlaying ? "Pausar" : "Tocar"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => seekRelative(15)}
            className="p-2 text-zinc-400 hover:text-white active:scale-95 transition-transform relative"
            title="Avançar 15 segundos"
          >
            <RotateCw className="w-5 h-5 stroke-[1.8]" />
            <span className="absolute text-[8px] font-bold bottom-0 left-1/2 -translate-x-1/2">15</span>
          </button>
        </div>

        {/* Secondary Controls (Speed, Repeat, Sleep, Offline) */}
        <div className="flex items-center justify-between pt-2 px-6 border-t border-white/[0.06] text-xs">
          <button
            onClick={() => {
              const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
              const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
              setRate(speeds[nextIndex]);
            }}
            className="font-mono text-zinc-400 hover:text-white px-2 py-1 rounded"
          >
            {playbackRate}x
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-1.5 rounded transition-colors ${
              isRepeating ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Repetir"
          >
            <Repeat className="w-4 h-4 stroke-[1.8]" />
          </button>

          {/* Sleep Timer */}
          <div className="relative">
            <button
              onClick={() => setShowSleepMenu(!showSleepMenu)}
              className={`p-1.5 rounded flex items-center gap-1 transition-colors ${
                sleepTimerRemaining !== null ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Temporizador"
            >
              <Moon className="w-4 h-4 stroke-[1.8]" />
              {sleepTimerRemaining !== null && (
                <span className="text-[10px] font-mono">
                  {Math.ceil(sleepTimerRemaining / 60)}m
                </span>
              )}
            </button>

            {showSleepMenu && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 bg-zinc-900 border border-white/[0.1] rounded-xl p-1.5 shadow-xl z-50">
                {sleepOptions.map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => {
                      setSleepTimer(opt.value);
                      setShowSleepMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 text-[11px] rounded transition-colors ${
                      sleepTimerMinutes === opt.value
                        ? "bg-white text-zinc-950 font-medium"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleToggleOffline}
            disabled={isCaching}
            className={`p-1.5 rounded transition-colors ${
              isOfflineAvailable ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title={isOfflineAvailable ? "Disponível offline" : "Baixar offline"}
          >
            {isOfflineAvailable ? <Check className="w-4 h-4 stroke-[2]" /> : <Download className="w-4 h-4 stroke-[1.8]" />}
          </button>
        </div>
      </div>

      {/* Text Excerpt Drawer Modal */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-950 border border-white/[0.1] w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <h3 className="text-sm font-medium text-white truncate">{currentText.title}</h3>
              <button
                onClick={() => setShowTextModal(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1"
              >
                Fechar
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {currentText.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
