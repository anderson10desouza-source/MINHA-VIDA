import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap"
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
        <span>Instalar App Offline</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm"
        >
          <span className="material-symbols-outlined text-[18px]">ios_share</span>
          <span>Instalar no iPhone/iPad</span>
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex flex-col gap-3 shadow-xl">
              <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Instalar para usar Offline
              </h3>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                1. Toque no botão <strong>Compartilhar</strong> no Safari.
                <br />
                2. Selecione <strong>Adicionar à Tela de Início</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="min-h-[40px] w-full rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineBanner: React.FC<{
  isOffline: boolean;
  isManualOffline: boolean;
  onExitManualOffline?: () => void;
}> = ({ isOffline, isManualOffline, onExitManualOffline }) => {
  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="mx-4 lg:mx-8 mt-3 rounded-lg bg-accent-gold/15 border border-accent-gold/50 px-3.5 py-2.5 flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="material-symbols-outlined text-[18px] text-accent-gold shrink-0">
          cloud_off
        </span>
        <span className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface truncate">
          {isManualOffline
            ? 'Modo Offline ativo — exibindo apenas conteúdos salvos no dispositivo.'
            : 'Sem conexão — Modo Offline ativo com seus dados e devocionais salvos.'}
        </span>
      </div>
      {isManualOffline && onExitManualOffline && (
        <button
          type="button"
          onClick={onExitManualOffline}
          className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline whitespace-nowrap shrink-0"
        >
          Voltar online
        </button>
      )}
    </div>
  );
};
