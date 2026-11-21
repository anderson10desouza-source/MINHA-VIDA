import React, { useEffect, useRef } from 'react';

interface YouTubePlayerHostProps {
  videoId: string | undefined;
  isPlaying: boolean;
  volume: number;
  visibleInMusicView: boolean;
  showMiniPip: boolean;
  onToggleMinimizePip: () => void;
  onStateChange?: (ytState: number) => void;
  onProgressTick?: (seconds: number, duration: number) => void;
}

export const YouTubePlayerHost: React.FC<YouTubePlayerHostProps> = ({
  videoId,
  isPlaying,
  volume,
  visibleInMusicView,
  showMiniPip,
  onToggleMinimizePip,
  onStateChange,
  onProgressTick,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastCommandId = useRef<string | null>(null);

  const sendCommand = (func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*'
      );
    } catch {
      // ignore cross-origin postMessage errors
    }
  };

  // Subscribe to YouTube IFrame API events once loaded
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.origin !== 'string' || !event.origin.includes('youtube.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.event === 'onStateChange' && typeof data.info === 'number') {
          onStateChange?.(data.info);
        } else if (data?.event === 'infoDelivery' && data.info) {
          if (typeof data.info.playerState === 'number') {
            onStateChange?.(data.info.playerState);
          }
          if (
            typeof data.info.currentTime === 'number' &&
            typeof data.info.duration === 'number' &&
            data.info.duration > 0
          ) {
            onProgressTick?.(data.info.currentTime, data.info.duration);
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStateChange, onProgressTick]);

  // Sync play/pause state
  useEffect(() => {
    if (!videoId) return;
    if (lastCommandId.current !== videoId) {
      lastCommandId.current = videoId;
      return;
    }
    sendCommand(isPlaying ? 'playVideo' : 'pauseVideo');
  }, [isPlaying, videoId]);

  // Sync volume
  useEffect(() => {
    if (!videoId) return;
    sendCommand('setVolume', [Math.round(volume * 100)]);
  }, [volume, videoId]);

  if (!videoId) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(
    origin
  )}`;

  const handleIframeLoad = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
        '*'
      );
      sendCommand('setVolume', [Math.round(volume * 100)]);
      if (!isPlaying) {
        sendCommand('pauseVideo');
      }
    } catch {
      // ignore
    }
  };

  const wrapperClass = visibleInMusicView
    ? showMiniPip
      ? 'fixed bottom-36 lg:bottom-24 right-4 lg:right-8 w-72 sm:w-80 aspect-video rounded-xl overflow-hidden border border-light-primary dark:border-dark-primary bg-black shadow-2xl z-20 transition-all'
      : 'fixed bottom-0 right-0 w-px h-px opacity-0 pointer-events-none overflow-hidden'
    : showMiniPip
      ? 'fixed bottom-36 lg:bottom-24 right-4 lg:right-8 w-44 aspect-video rounded-lg overflow-hidden border border-light-primary dark:border-dark-primary bg-black shadow-xl z-20 transition-all'
      : 'fixed bottom-0 right-0 w-px h-px opacity-0 pointer-events-none overflow-hidden';

  return (
    <div className={wrapperClass}>
      {showMiniPip && (
        <button
          type="button"
          onClick={onToggleMinimizePip}
          aria-label="Minimizar vídeo"
          className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-black"
        >
          <span className="material-symbols-outlined text-[16px]">close_fullscreen</span>
        </button>
      )}
      <iframe
        ref={iframeRef}
        src={embedSrc}
        onLoad={handleIframeLoad}
        title="Player de música completa"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
};
