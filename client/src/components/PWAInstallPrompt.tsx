import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="mb-4 p-3 bg-zinc-900/60 border border-white/[0.08] rounded-xl flex items-center justify-between text-xs">
      <div className="pr-2 flex-1">
        <p className="font-medium text-zinc-200">
          {isIOS
            ? "Instalar no iPhone: Toque em Compartilhar (⎋) e 'Adicionar à Tela de Início'."
            : "Instale o app para ouvir com a tela bloqueada."}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="px-2.5 py-1 bg-white text-zinc-950 font-medium text-[11px] rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Download className="w-3 h-3" />
            <span>Instalar</span>
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar"
          className="p-1 text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
