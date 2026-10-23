import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import { Play, Pause } from "lucide-react";

export const MiniPlayer: React.FC = () => {
  const { currentAudio, currentText, isPlaying, togglePlay, currentTime, duration } = useAudioPlayer();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentAudio || location.pathname === "/player") {
    return null;
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 max-w-md mx-auto pointer-events-none">
      <div className="pointer-events-auto bg-[#141417]/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-lg shadow-black/30 overflow-hidden transition-all duration-200">
        {/* Subtle Progress Bar */}
        <div className="w-full bg-white/[0.06] h-[2px]">
          <div
            className="bg-white h-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-3.5 py-2.5 gap-3">
          <div
            onClick={() => navigate("/player")}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <h4 className="text-xs font-medium text-zinc-100 truncate">
              {currentText?.title || "Sem título"}
            </h4>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {currentAudio.voice.replace("Neural", "").replace("pt-BR-", "")}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            aria-label={isPlaying ? "Pausar" : "Tocar"}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-medium active:scale-95 transition-transform cursor-pointer shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
