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

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
const pwaListeners = new Set<() => void>();

function notifyPwaListeners() {
  pwaListeners.forEach((cb) => cb());
}

if (typeof window !== 'undefined') {
  globalIsInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPwaListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    notifyPwaListeners();
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      globalIsInstalled ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const syncState = () => {
      const standalone =
        globalIsInstalled ||
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
      setDeferredPrompt(globalDeferredPrompt);
    };

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    syncState();

    pwaListeners.add(syncState);
    return () => {
      pwaListeners.delete(syncState);
    };
  }, []);

  const install = async () => {
    const promptEvent = deferredPrompt || globalDeferredPrompt;
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      globalIsInstalled = true;
      globalDeferredPrompt = null;
      notifyPwaListeners();
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

export const PWAInstallButton: React.FC<{
  label?: string;
  fullWidth?: boolean;
}> = ({ label = 'Baixar App', fullWidth = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void handleClick();
        }}
        className={`min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap hover:opacity-90 transition-opacity ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          download
        </span>
        <span>{label}</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false);
          }}
        >
          <div className="w-full max-w-sm rounded-xl bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex flex-col gap-3.5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <img
                  src="/icon.svg"
                  alt="Meu Mundo Minha Vida"
                  className="w-9 h-9 rounded-lg border border-accent-gold/40"
                />
                <h3
                  id="pwa-guide-title"
                  className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface"
                >
                  Baixar Aplicativo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Fechar"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {isIOS ? (
              <div className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant flex flex-col gap-2">
                <p>Para instalar no iPhone ou iPad:</p>
                <p>
                  1. Abra este link no navegador <strong>Safari</strong>.
                  <br />
                  2. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta).
                  <br />
                  3. Role e toque em <strong>Adicionar à Tela de Início</strong>.
                </p>
              </div>
            ) : (
              <div className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant flex flex-col gap-2">
                <p>Para instalar o aplicativo no celular ou computador:</p>
                <p>
                  • <strong>Android (Chrome):</strong> toque no menu <strong>⋮</strong> no canto superior direito e selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                </p>
                <p>
                  • <strong>Computador (Chrome / Edge):</strong> clique no ícone de instalação <strong>⊕</strong> na barra de endereço do navegador.
                </p>
                <p className="text-xs opacity-85">
                  Se abriu o link dentro do WhatsApp ou Instagram, toque em <strong>⋮ → Abrir no navegador</strong> primeiro.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="min-h-[42px] w-full rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg hover:opacity-90 transition-opacity"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const PWAInstallBanner: React.FC = () => {
  const { isInstalled } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('pwa_banner_closed') === '1';
    } catch {
      return false;
    }
  });

  if (isInstalled || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('pwa_banner_closed', '1');
    } catch {
      // ignore storage errors
    }
  };

  return (
    <section
      aria-label="Baixar aplicativo"
      className="mx-4 lg:mx-8 mb-3 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-accent-gold/50 p-3.5 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src="/icon.svg"
          alt="Meu Mundo Minha Vida"
          className="w-10 h-10 rounded-xl border border-accent-gold/40 shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
            Baixar o Aplicativo
          </span>
          <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
            Instale no celular ou PC para abrir rápido e usar offline.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <PWAInstallButton label="Baixar App" />
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar aviso de instalação"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </section>
  );
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
