import { buildOfflineKey, getOfflineMediaBlobUrl } from './offlineMediaStore';
import { getOrCreateWavUrl } from './wavSynth';

export type PlaybackKind = 'music' | 'podcast' | 'radio';
export type RadioStatus = 'connecting' | 'live' | 'studio';

interface StartAudioOptions {
  id: string;
  kind: PlaybackKind;
  frequencies: number[];
  audioUrl?: string;
  streamUrl?: string;
  spokenText?: string;
  onStreamStatus?: (status: RadioStatus) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

class HtmlAudioPlayerEngine {
  private audio: HTMLAudioElement | null = null;
  private volume = 0.8;
  private isPlaying = false;
  private fallbackTimer: number | null = null;
  private activeSession = 0;

  private ensureAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.volume = this.volume;
    }
    return this.audio;
  }

  setVolume(nextVolume: number) {
    this.volume = Math.max(0, Math.min(1, nextVolume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  private clearFallbackTimer() {
    if (this.fallbackTimer !== null) {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private speakText(text: string) {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      utterance.volume = Math.min(1, this.volume + 0.1);

      const voices = window.speechSynthesis.getVoices();
      const ptVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('pt-br')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore if speechSynthesis unavailable
    }
  }

  private playGeneratedWav(options: StartAudioOptions, session: number) {
    if (session !== this.activeSession || !this.isPlaying) return;
    const audio = this.ensureAudio();
    const wavUrl = getOrCreateWavUrl({
      key: `${options.kind}-${options.id}`,
      frequencies: options.frequencies,
      style: options.kind,
    });
    audio.onerror = null;
    audio.onplaying = null;
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.loop = true;
    audio.volume = options.kind === 'podcast' ? this.volume * 0.45 : this.volume;
    audio.src = wavUrl;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay rejected only if outside user gesture
    });
    options.onStreamStatus?.('studio');
  }

  start(options: StartAudioOptions) {
    this.stop();
    const session = ++this.activeSession;
    this.isPlaying = true;
    const audio = this.ensureAudio();

    const playDirectOrRemoteUrl = (resolvedUrl: string, allowProxy: boolean) => {
      if (session !== this.activeSession || !this.isPlaying) return;
      const isLocal = resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('data:');
      const proxyUrl = `/api/podcast/audio?url=${encodeURIComponent(resolvedUrl)}`;
      let triedProxy = !isLocal && resolvedUrl.startsWith('http://');

      audio.loop = false;
      audio.volume = this.volume;
      audio.onplaying = null;
      audio.ontimeupdate = () => {
        if (session !== this.activeSession) return;
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          options.onTimeUpdate?.(audio.currentTime, audio.duration);
        }
      };
      audio.onended = () => {
        if (session === this.activeSession) {
          options.onEnded?.();
        }
      };

      const handleFailOrProxy = () => {
        if (session !== this.activeSession || !this.isPlaying) return;
        if (allowProxy && !isLocal && !triedProxy) {
          triedProxy = true;
          audio.src = proxyUrl;
          void audio.play().catch(() => {
            if (session === this.activeSession) {
              this.playGeneratedWav(options, session);
            }
          });
        } else {
          this.playGeneratedWav(options, session);
        }
      };

      audio.onerror = handleFailOrProxy;
      audio.src = allowProxy && triedProxy ? proxyUrl : resolvedUrl;
      void audio.play().catch(handleFailOrProxy);
    };

    // 1. Real Music, Podcast, or Recorded Offline Radio (preferring local IndexedDB Blob when downloaded)
    if (options.audioUrl || options.kind === 'music' || options.kind === 'podcast') {
      const storeKind =
        options.kind === 'music' ? 'music' : options.kind === 'podcast' ? 'podcast' : 'radio';
      const offlineKey = buildOfflineKey(storeKind, options.id);

      void getOfflineMediaBlobUrl(offlineKey).then((blobUrl) => {
        if (session !== this.activeSession || !this.isPlaying) return;
        if (blobUrl) {
          playDirectOrRemoteUrl(blobUrl, false);
          return;
        }
        if (options.audioUrl) {
          playDirectOrRemoteUrl(options.audioUrl, true);
          return;
        }
        this.playGeneratedWav(options, session);
        if (options.spokenText) {
          this.speakText(options.spokenText);
        }
      });

      return;
    }

    // 2. Real Live Radio stream (direct HTTPS, or backend proxy for HTTP/CORS streams)
    if (options.kind === 'radio' && options.streamUrl) {
      let settled = false;
      const rawUrl = options.streamUrl;
      const proxyUrl = `/api/radio/stream?url=${encodeURIComponent(rawUrl)}`;
      let triedProxy = false;

      options.onStreamStatus?.('connecting');
      audio.loop = false;
      audio.ontimeupdate = null;
      audio.onended = null;
      audio.volume = this.volume;

      const fallbackToStudio = () => {
        if (settled || session !== this.activeSession || !this.isPlaying) return;
        settled = true;
        this.clearFallbackTimer();
        this.playGeneratedWav(options, session);
        if (options.spokenText) {
          this.speakText(options.spokenText);
        }
      };

      const tryProxyOrFallback = () => {
        if (settled || session !== this.activeSession || !this.isPlaying) return;
        if (!triedProxy && audio.src !== new URL(proxyUrl, window.location.origin).href) {
          triedProxy = true;
          this.clearFallbackTimer();
          audio.src = proxyUrl;
          this.fallbackTimer = window.setTimeout(fallbackToStudio, 6000);
          void audio.play().catch(fallbackToStudio);
        } else {
          fallbackToStudio();
        }
      };

      audio.onplaying = () => {
        if (session !== this.activeSession) return;
        settled = true;
        this.clearFallbackTimer();
        options.onStreamStatus?.('live');
      };

      audio.onerror = tryProxyOrFallback;

      // HTTP streams must go through our HTTPS proxy immediately to avoid Mixed Content blocks
      if (rawUrl.startsWith('http://')) {
        triedProxy = true;
        audio.src = proxyUrl;
        this.fallbackTimer = window.setTimeout(fallbackToStudio, 6500);
      } else {
        audio.src = rawUrl;
        this.fallbackTimer = window.setTimeout(tryProxyOrFallback, 4500);
      }

      void audio.play().catch(tryProxyOrFallback);
      return;
    }

    // 3. Podcast or Studio fallback via native HTML5 <audio> WAV loop
    this.playGeneratedWav(options, session);

    if (options.spokenText) {
      this.speakText(options.spokenText);
    }
  }

  seekFraction(fraction: number, totalDurationSec: number) {
    if (!this.audio || !this.audio.duration || !Number.isFinite(this.audio.duration)) return;
    if (this.audio.loop) {
      this.audio.currentTime = (fraction * totalDurationSec) % this.audio.duration;
    } else {
      this.audio.currentTime = Math.max(
        0,
        Math.min(this.audio.duration, fraction * this.audio.duration)
      );
    }
  }

  stop() {
    this.activeSession += 1;
    this.isPlaying = false;
    this.clearFallbackTimer();

    if (this.audio) {
      try {
        this.audio.onplaying = null;
        this.audio.onerror = null;
        this.audio.ontimeupdate = null;
        this.audio.onended = null;
        this.audio.pause();
      } catch {
        // ignore
      }
    }

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  }
}

export const ambientAudio = new HtmlAudioPlayerEngine();
