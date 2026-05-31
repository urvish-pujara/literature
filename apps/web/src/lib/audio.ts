// Tiny Web Audio synth for game cues. No file assets — every sound is a few
// oscillator triggers with quick envelopes. Total: < 1 KB of code, zero net I/O.
//
// All public functions are no-ops if the AudioContext can't be created (server
// rendering, very old browsers) or if muted. The first user interaction —
// typically the Create/Join button — calls unlock(), which is required by
// browser autoplay policy.

export type SoundKey =
  | 'deal'
  | 'card_take'
  | 'card_miss'
  | 'claim_win'
  | 'claim_lose'
  | 'your_turn';

const STORAGE_KEY = 'literature-audio-muted';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

function readMutedFromStorage(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistMuted(value: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  muted = readMutedFromStorage();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  persistMuted(value);
}

export function unlock(): void {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const AudioCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    ctx = new AudioCtor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = 'sine',
  peak = 0.18,
): void {
  if (!ctx || !masterGain) return;
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
  osc.connect(g).connect(masterGain);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function sweep(
  fromFreq: number,
  toFreq: number,
  startOffset: number,
  duration: number,
  peak = 0.14,
): void {
  if (!ctx || !masterGain) return;
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(fromFreq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), t + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
  osc.connect(g).connect(masterGain);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

const SOUNDS: Record<SoundKey, () => void> = {
  // Riffle: descending sweep + small click pattern.
  deal: () => {
    sweep(1200, 400, 0, 0.35, 0.1);
    [0, 0.06, 0.12, 0.18].forEach((dt) => tone(800, dt, 0.05, 'square', 0.05));
  },
  // Bright two-note up.
  card_take: () => {
    tone(523.25, 0, 0.1, 'sine', 0.2);
    tone(783.99, 0.07, 0.18, 'sine', 0.22);
  },
  // Soft downward "thud".
  card_miss: () => {
    tone(220, 0, 0.12, 'sine', 0.16);
    tone(165, 0.08, 0.22, 'sine', 0.18);
  },
  // Bright ascending arpeggio.
  claim_win: () => {
    tone(523.25, 0, 0.14, 'triangle', 0.2);
    tone(659.25, 0.09, 0.14, 'triangle', 0.2);
    tone(783.99, 0.18, 0.14, 'triangle', 0.2);
    tone(1046.5, 0.27, 0.35, 'triangle', 0.22);
  },
  // Minor descending — defeat.
  claim_lose: () => {
    tone(440, 0, 0.18, 'sawtooth', 0.14);
    tone(349.23, 0.13, 0.18, 'sawtooth', 0.14);
    tone(261.63, 0.26, 0.4, 'sawtooth', 0.16);
  },
  // Gentle bell.
  your_turn: () => {
    tone(880, 0, 0.5, 'sine', 0.12);
    tone(1318.5, 0.02, 0.4, 'sine', 0.08);
  },
};

export function play(key: SoundKey): void {
  if (muted) return;
  unlock();
  if (!ctx) return;
  SOUNDS[key]();
}
