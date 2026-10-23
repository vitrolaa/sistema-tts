import React from "react";

export const AudioWaveAnimation: React.FC<{ isPlaying: boolean; bars?: number }> = ({ isPlaying, bars = 14 }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-8 px-2">
      {Array.from({ length: bars }).map((_, i) => {
        const heightClass = isPlaying
          ? ["h-2", "h-5", "h-7", "h-4", "h-6", "h-8", "h-5", "h-3", "h-7", "h-4", "h-6", "h-2"][i % 12]
          : "h-1.5";

        const delay = (i * 0.09).toFixed(2);

        return (
          <span
            key={i}
            style={{
              animationDelay: `${delay}s`,
              transition: "height 0.18s ease",
            }}
            className={`w-1 rounded-full ${heightClass} ${
              isPlaying
                ? "bg-white animate-pulse"
                : "bg-zinc-600 opacity-30"
            }`}
          />
        );
      })}
    </div>
  );
};
