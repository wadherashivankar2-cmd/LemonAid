/**
 * Synthesized Web Audio sound engine for LemonAid.
 * Zero external audio files. Gracefully handles unsupported environments,
 * autoplay policies, and user mute preference in localStorage.
 */

let audioCtx: AudioContext | null = null;
let lastTickTime = 0;
const STORAGE_KEY = "mr_roast_muted";

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
  } catch {
    // Ignore storage quota or security exceptions
  }
}

/**
 * 0.12s subtle sine blip (520 to 700 Hz, gain 0.04), throttled to at most once per 90ms.
 */
export function playTick(): void {
  if (isMuted()) return;
  const now = performance.now();
  if (now - lastTickTime < 90) return;
  lastTickTime = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const t = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.12);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  } catch {
    // Ignore Web Audio errors if audio device is unavailable
  }
}

/**
 * Dramatic roast reveal:
 * 140 Hz to 40 Hz sine drop over 0.6s (gain 1.0, 0.9s decay) plus 0.25s noise burst (gain 0.75).
 */
export function playBoom(): void {
  if (isMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;

    // 1. Low frequency sine sweep drop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.6);

    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.9);

    // 2. White noise burst for sub-impact texture
    const bufferSize = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(300, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.75, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.25);
  } catch {
    // Ignore audio failures
  }
}
