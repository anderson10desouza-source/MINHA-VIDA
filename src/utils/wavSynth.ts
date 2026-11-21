// Synthesizes a seamless 8-second 16-bit stereo PCM WAV loop as a Blob URL
// so playback runs natively through HTML5 <audio> with warm polyphonic sound.

const wavCache = new Map<string, string>();

export interface WavPreset {
  key: string;
  frequencies: number[];
  style: 'music' | 'radio' | 'podcast';
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function getOrCreateWavUrl(preset: WavPreset): string {
  const cached = wavCache.get(preset.key);
  if (cached) return cached;

  const sampleRate = 22050;
  const durationSec = 8; // 4 bars of 2.0s each
  const numSamples = sampleRate * durationSec;
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const f0 = preset.frequencies[0] ?? 261.63;
  const f1 = preset.frequencies[1] ?? 329.63;
  const f2 = preset.frequencies[2] ?? 392.0;
  const f3 = preset.frequencies[3] ?? 493.88;

  // Musical I - V - vi - IV ratios
  const chordMults = [1.0, 0.74915, 0.8409, 0.8909];
  const arpOrder = [f0, f1, f2, f3, f2, f1, f2, f3];

  const isRadio = preset.style === 'radio';
  const isPodcast = preset.style === 'podcast';
  const masterLevel = isPodcast ? 0.35 : 0.75;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const barIdx = Math.floor(t / 2.0) % 4;
    const barTime = t % 2.0;
    const mult = chordMults[barIdx];

    // Beat / step envelopes (0.5s per beat, 0.25s for radio eighth-notes)
    const beatLen = 0.5;
    const beatPos = t % beatLen;
    const halfBarPos = t % 1.0;

    // Smooth pad envelope within each 2s bar (seamless at loop boundary)
    const barFade =
      Math.min(1, barTime / 0.08) * Math.min(1, (2.0 - barTime) / 0.08);

    // 1. Warm Bass
    const bassFreq = f0 * 0.5 * mult;
    const bassEnv = Math.exp(-halfBarPos * 1.4) * Math.min(1, halfBarPos / 0.02);
    const bass =
      (Math.sin(2 * Math.PI * bassFreq * t) * 0.8 +
        Math.sin(2 * Math.PI * bassFreq * 2 * t) * 0.2) *
      bassEnv *
      0.32;

    // 2. Stereo Warm Electric-Piano Pad
    const chordEnv = Math.exp(-barTime * 0.65) * barFade;
    const padL =
      (Math.sin(2 * Math.PI * (f0 * mult) * t) * 0.45 +
        Math.sin(2 * Math.PI * (f1 * mult) * t + 0.3) * 0.3 +
        Math.sin(2 * Math.PI * (f2 * mult) * t + 0.6) * 0.25) *
      chordEnv *
      0.34;
    const padR =
      (Math.sin(2 * Math.PI * (f0 * mult * 1.002) * t + 0.2) * 0.45 +
        Math.sin(2 * Math.PI * (f1 * mult * 0.998) * t + 0.5) * 0.3 +
        Math.sin(2 * Math.PI * (f2 * mult * 1.001) * t + 0.8) * 0.25) *
      chordEnv *
      0.34;

    // 3. Melodic Arpeggio / Motif
    const stepIdx = Math.floor(t / (isRadio ? 0.25 : 0.5)) % arpOrder.length;
    const stepTime = t % (isRadio ? 0.25 : 0.5);
    const arpFreq = arpOrder[stepIdx] * mult * (isRadio ? 1.0 : 1.0);
    const arpEnv =
      Math.min(1, stepTime / 0.015) *
      Math.exp(-stepTime * (isRadio ? 5.5 : 3.2));
    const melody =
      (Math.sin(2 * Math.PI * arpFreq * t) * 0.78 +
        Math.sin(2 * Math.PI * arpFreq * 2 * t) * 0.22) *
      arpEnv *
      (isPodcast ? 0.14 : 0.28);

    // 4. Subtle Soft Kick Pulse on beats for Music & Radio
    let perc = 0;
    if (!isPodcast) {
      const kickEnv = Math.exp(-beatPos * 22);
      const kickFreq = 52 + 75 * Math.exp(-beatPos * 35);
      perc = Math.sin(2 * Math.PI * kickFreq * beatPos) * kickEnv * (isRadio ? 0.26 : 0.16);
    }

    // Soft limit via tanh to avoid clipping
    const sampleL = Math.tanh((bass + padL + melody * 0.9 + perc) * masterLevel);
    const sampleR = Math.tanh((bass + padR + melody * 1.1 + perc) * masterLevel);

    view.setInt16(offset, Math.round(sampleL * 32767), true);
    view.setInt16(offset + 2, Math.round(sampleR * 32767), true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  wavCache.set(preset.key, url);
  return url;
}
