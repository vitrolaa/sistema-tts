import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { TextItem } from "../types";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import {
  Search,
  Star,
  Play,
  Pause,
  Trash2,
  Edit3,
  Download,
  Plus,
} from "lucide-react";

export const Library: React.FC = () => {
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "withAudio">("all");
  const { currentAudio, isPlaying, togglePlay, playAudio } = useAudioPlayer();
  const navigate = useNavigate();

  useEffect(() => {
    loadTexts();
  }, [search, activeTab]);

  const loadTexts = async () => {
    try {
      setLoading(true);
      const isFav = activeTab === "favorites" ? true : undefined;
      const res = await api.getTexts({ search, favorite: isFav });
      let list = res.texts;

      if (activeTab === "withAudio") {
        list = list.filter((t) => t.audios && t.audios.length > 0 && t.audios[0].status === "COMPLETED");
      }

      setTexts(list);
    } catch (err) {
      console.error("Failed to load library texts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, text: TextItem) => {
    e.stopPropagation();
    try {
      const updated = await api.updateText(text.id, { favorite: !text.favorite });
      setTexts((prev) => prev.map((t) => (t.id === text.id ? { ...t, favorite: updated.favorite } : t)));
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, textId: string) => {
    e.stopPropagation();
    if (!window.confirm("Excluir este texto e áudios associados?")) return;

    try {
      await api.deleteText(textId);
      setTexts((prev) => prev.filter((t) => t.id !== textId));
    } catch (err) {
      alert("Erro ao excluir");
    }
  };

  const handlePlayOrOpen = async (text: TextItem) => {
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

  return (
    <div className="pb-28 pt-6 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-white">Biblioteca</h1>
        <Link
          to="/novo"
          className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          title="Novo texto"
        >
          <Plus className="w-5 h-5 stroke-[1.8]" />
        </Link>
      </div>

      {/* Minimal Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/40 border border-white/[0.08] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-4 text-xs">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1 rounded-md transition-colors ${
            activeTab === "all"
              ? "bg-white text-zinc-950 font-medium"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Todos ({texts.length})
        </button>

        <button
          onClick={() => setActiveTab("favorites")}
          className={`px-3 py-1 rounded-md transition-colors ${
            activeTab === "favorites"
              ? "bg-white text-zinc-950 font-medium"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Favoritos
        </button>

        <button
          onClick={() => setActiveTab("withAudio")}
          className={`px-3 py-1 rounded-md transition-colors ${
            activeTab === "withAudio"
              ? "bg-white text-zinc-950 font-medium"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Com áudio
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 rounded-xl bg-zinc-900/40 animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      ) : texts.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          Nenhum texto encontrado.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl overflow-hidden bg-zinc-900/30">
          {texts.map((item) => {
            const audio = item.audios?.[0];
            const hasAudio = audio && audio.status === "COMPLETED";
            const isThisPlaying = isPlaying && currentAudio?.id === audio?.id;
            const durationMin = Math.round((audio?.duration || 0) / 60) || 1;

            return (
              <div
                key={item.id}
                onClick={() => handlePlayOrOpen(item)}
                className="p-3.5 hover:bg-zinc-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-zinc-100 truncate">{item.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleToggleFavorite(e, item)}
                    className="p-1 text-zinc-600 hover:text-amber-400 transition-colors shrink-0"
                    title="Favoritar"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        item.favorite ? "fill-amber-400 text-amber-400" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                  <span>
                    {hasAudio ? `${durationMin} min` : "Sem áudio"} • {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/novo?id=${item.id}`);
                      }}
                      className="p-1 text-zinc-500 hover:text-zinc-200"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {hasAudio && (
                      <a
                        href={api.getAudioDownloadUrl(audio.id)}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-zinc-500 hover:text-zinc-200"
                        title="Baixar MP3"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1 text-zinc-500 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {hasAudio && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayOrOpen(item);
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isThisPlaying
                            ? "bg-white text-zinc-950"
                            : "border border-white/20 text-zinc-300 hover:border-white"
                        }`}
                      >
                        {isThisPlaying ? (
                          <Pause className="w-2.5 h-2.5 fill-current" />
                        ) : (
                          <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
