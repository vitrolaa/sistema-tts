import React from "react";
import { NavLink } from "react-router-dom";
import { Compass, PenLine, Headphones, Bookmark, SlidersHorizontal } from "lucide-react";
import { useAudioPlayer } from "../context/AudioPlayerContext";

export const BottomNav: React.FC = () => {
  const { currentAudio, isPlaying } = useAudioPlayer();

  const navItems = [
    { to: "/", label: "Início", icon: Compass },
    { to: "/novo", label: "Escrever", icon: PenLine },
    {
      to: "/player",
      label: "Ouvir",
      icon: Headphones,
      badge: currentAudio ? (isPlaying ? "pulsing" : "active") : null,
    },
    { to: "/biblioteca", label: "Textos", icon: Bookmark },
    { to: "/configuracoes", label: "Ajustes", icon: SlidersHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-[#09090b]/95 backdrop-blur-md border-t border-white/[0.08]">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="w-5 h-5 stroke-[1.6]" />
                    {item.badge === "pulsing" && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                    )}
                    {item.badge === "active" && (
                      <span className="absolute -top-0.5 -right-0.5 inline-block w-1 h-1 rounded-full bg-zinc-400" />
                    )}
                  </div>
                  <span className="text-[10px] mt-1 font-medium tracking-tight">{item.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 w-3 h-0.5 bg-white rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
