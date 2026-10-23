import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AudioPlayerProvider } from "./context/AudioPlayerContext";
import { Home } from "./pages/Home";
import { Editor } from "./pages/Editor";
import { PlayerPage } from "./pages/PlayerPage";
import { Library } from "./pages/Library";
import { Settings } from "./pages/Settings";
import { BottomNav } from "./components/BottomNav";
import { MiniPlayer } from "./components/MiniPlayer";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AudioPlayerProvider>
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
          <main className="flex-1 w-full max-w-lg mx-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/novo" element={<Editor />} />
              <Route path="/player" element={<PlayerPage />} />
              <Route path="/biblioteca" element={<Library />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Routes>
          </main>

          {/* Persistent Mini Audio Bar */}
          <MiniPlayer />

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </div>
      </AudioPlayerProvider>
    </BrowserRouter>
  );
};

export default App;
