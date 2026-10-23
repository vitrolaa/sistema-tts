import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AudioItem, TextItem } from "../types";
import { api } from "../services/api";
import { getOfflineAudio, saveAudioToOfflineCache, isAudioCached, removeOfflineAudio } from "../services/offlineStorage";

interface AudioPlayerContextType {
  currentAudio: AudioItem | null;
  currentText: TextItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isRepeating: boolean;
  sleepTimerRemaining: number | null; // in seconds
  sleepTimerMinutes: number | null;
  isOfflineAvailable: boolean;
  isLoadingAudio: boolean;
  error: string | null;

  playAudio: (audio: AudioItem, text: TextItem, startPosition?: number) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (time: number) => void;
  seekRelative: (delta: number) => void;
  setRate: (rate: number) => void;
  toggleRepeat: () => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleOfflineCache: () => Promise<boolean>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentAudio, setCurrentAudio] = useState<AudioItem | null>(null);
  const [currentText, setCurrentText] = useState<TextItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isRepeating, setIsRepeating] = useState<boolean>(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mutable refs to prevent audio recreation and re-mounting on state changes
  const isRepeatingRef = useRef<boolean>(false);
  isRepeatingRef.current = isRepeating;

  const currentAudioRef = useRef<AudioItem | null>(null);
  currentAudioRef.current = currentAudio;

  const currentTextRef = useRef<TextItem | null>(null);
  currentTextRef.current = currentText;

  const lastSavedTimeRef = useRef<number>(0);
  const objectUrlRef = useRef<string | null>(null);

  // Restore last played audio from localStorage on initial load
  useEffect(() => {
    try {
      const storedAudio = localStorage.getItem("last_played_audio");
      const storedText = localStorage.getItem("last_played_text");
      if (storedAudio && storedText) {
        const parsedAudio = JSON.parse(storedAudio);
        const parsedText = JSON.parse(storedText);
        setCurrentAudio(parsedAudio);
        setCurrentText(parsedText);
        if (parsedAudio.duration) {
          setDuration(parsedAudio.duration);
        }

        const savedPos = localStorage.getItem(`progress_${parsedAudio.id}`);
        if (savedPos) {
          setCurrentTime(parseFloat(savedPos));
        }

        // Check if cached offline
        isAudioCached(parsedAudio.id).then((cached) => {
          setIsOfflineAvailable(cached);
        });
      }
    } catch (e) {
      console.warn("Could not load last played audio from localStorage:", e);
    }
  }, []);

  // Initialize Audio element ONCE on mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audio) return;
      const cur = audio.currentTime;
      setCurrentTime(cur);

      if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        try {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate,
              position: Math.min(cur, audio.duration),
            });
          }
        } catch (e) {
          // Ignore transient position state errors
        }
      }

      // Sync progress every 4 seconds
      const curAudio = currentAudioRef.current;
      if (curAudio && Math.abs(cur - lastSavedTimeRef.current) >= 4) {
        lastSavedTimeRef.current = cur;
        localStorage.setItem(`progress_${curAudio.id}`, String(cur));
        api.saveProgress(curAudio.id, cur);
      }
    };

    const handleDurationChange = () => {
      if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    };

    const handleEnded = () => {
      if (isRepeatingRef.current) {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        setIsPlaying(false);
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "none";
        }
      }
    };

    const handleError = (e: any) => {
      console.error("Audio error event:", e);
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setError("Erro ao reproduzir o arquivo de áudio.");
    };

    const handleCanPlay = () => {
      setIsLoadingAudio(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("loadedmetadata", handleDurationChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    // Setup MediaSession Action Handlers once
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", () => {
          if (audioRef.current) audioRef.current.play().catch(console.warn);
        });

        navigator.mediaSession.setActionHandler("pause", () => {
          if (audioRef.current) audioRef.current.pause();
        });

        navigator.mediaSession.setActionHandler("seekbackward", (details) => {
          const delta = details.seekOffset || 15;
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - delta);
          }
        });

        navigator.mediaSession.setActionHandler("seekforward", (details) => {
          const delta = details.seekOffset || 15;
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(audioRef.current.duration || 999999, audioRef.current.currentTime + delta);
          }
        });

        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
          }
        });

        navigator.mediaSession.setActionHandler("stop", () => {
          if (audioRef.current) audioRef.current.pause();
        });
      } catch (err) {
        console.warn("MediaSession action handlers registration note:", err);
      }
    }

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []); // Run ONCE on mount, NEVER destroy on audio change!

  // Update Media Session Metadata when current track changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentAudio || !currentText) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentText.title || "VozLivre — Áudio",
        artist: "VozLivre",
        album: currentAudio.voice ? `Voz: ${currentAudio.voice.replace("Neural", "").replace("pt-BR-", "")}` : "Leitor de Textos",
        artwork: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      });
    } catch (e) {
      console.warn("MediaMetadata setup warning:", e);
    }
  }, [currentAudio?.id, currentText?.title]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerRemaining === null || sleepTimerRemaining <= 0) return;

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemaining]);

  // Main playback starter
  const playAudio = async (audio: AudioItem, text: TextItem, startPosition?: number) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    setError(null);
    setIsLoadingAudio(true);
    setCurrentAudio(audio);
    setCurrentText(text);

    // Save as last played
    try {
      localStorage.setItem("last_played_audio", JSON.stringify(audio));
      localStorage.setItem("last_played_text", JSON.stringify(text));
    } catch (e) {
      // Ignore quota error
    }

    // Check offline cache
    const cached = await getOfflineAudio(audio.id);
    setIsOfflineAvailable(!!cached);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    let sourceUrl = "";
    if (cached) {
      objectUrlRef.current = URL.createObjectURL(cached.blob);
      sourceUrl = objectUrlRef.current;
    } else {
      sourceUrl = api.getAudioStreamUrl(audio.id);
    }

    // Assign source & playback rate
    audioElement.src = sourceUrl;
    audioElement.playbackRate = playbackRate;
    audioElement.load();

    // Determine initial playback point
    let initialPosition = startPosition;
    if (initialPosition === undefined) {
      const localPos = localStorage.getItem(`progress_${audio.id}`);
      if (localPos) {
        initialPosition = parseFloat(localPos);
      } else {
        const serverPos = await api.getProgress(audio.id);
        initialPosition = serverPos;
      }
    }

    // Wait for metadata loaded to set position safely
    const onLoadedMetadata = () => {
      if (initialPosition && initialPosition > 0 && initialPosition < (audio.duration || 999999)) {
        try {
          audioElement.currentTime = initialPosition;
          setCurrentTime(initialPosition);
        } catch (e) {
          console.warn("Could not set initial position:", e);
        }
      }
    };
    audioElement.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });

    try {
      await audioElement.play();
      setIsPlaying(true);
      setIsLoadingAudio(false);
    } catch (err: any) {
      console.warn("Autoplay was prevented by browser:", err);
      setIsLoadingAudio(false);
      setIsPlaying(false);
    }
  };

  const resume = async () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    try {
      await audioElement.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Resume failed:", err);
    }
  };

  const pause = () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    audioElement.pause();
    setIsPlaying(false);
    if (currentAudio) {
      localStorage.setItem(`progress_${currentAudio.id}`, String(audioElement.currentTime));
      api.saveProgress(currentAudio.id, audioElement.currentTime);
    }
  };

  const togglePlay = () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    if (isPlaying) {
      pause();
    } else {
      // If src is empty but we have currentAudio, re-attach source
      if (!audioElement.src || audioElement.src === window.location.href) {
        if (currentAudio && currentText) {
          playAudio(currentAudio, currentText, currentTime);
          return;
        }
      }
      resume();
    }
  };

  const seekTo = (seconds: number) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    const maxDur = duration || audioElement.duration || 999999;
    const clamped = Math.max(0, Math.min(seconds, maxDur));
    audioElement.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const seekRelative = (delta: number) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    seekTo(audioElement.currentTime + delta);
  };

  const setRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleRepeat = () => {
    setIsRepeating((prev) => !prev);
  };

  const setSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    if (minutes === null) {
      setSleepTimerRemaining(null);
    } else {
      setSleepTimerRemaining(minutes * 60);
    }
  };

  const toggleOfflineCache = async (): Promise<boolean> => {
    if (!currentAudio || !currentText) return false;

    const alreadyCached = await isAudioCached(currentAudio.id);
    if (alreadyCached) {
      await removeOfflineAudio(currentAudio.id);
      setIsOfflineAvailable(false);
      return false;
    } else {
      try {
        const streamUrl = api.getAudioStreamUrl(currentAudio.id);
        const res = await fetch(streamUrl);
        const blob = await res.blob();
        await saveAudioToOfflineCache(
          currentAudio.id,
          blob,
          currentText.title,
          currentAudio.duration || duration
        );
        setIsOfflineAvailable(true);
        return true;
      } catch (e) {
        console.error("Failed to download audio for offline:", e);
        return false;
      }
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentAudio,
        currentText,
        isPlaying,
        currentTime,
        duration: duration || currentAudio?.duration || 0,
        playbackRate,
        isRepeating,
        sleepTimerRemaining,
        sleepTimerMinutes,
        isOfflineAvailable,
        isLoadingAudio,
        error,
        playAudio,
        togglePlay,
        pause,
        resume,
        seekTo,
        seekRelative,
        setRate,
        toggleRepeat,
        setSleepTimer,
        toggleOfflineCache,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
};
