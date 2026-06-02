// WebAudio 기반 효과음 (에셋 파일 없이 합성)
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { ensure(); }
export function setMuted(m: boolean) { muted = m; if (master) master.gain.value = m ? 0 : 0.4; }
export function isMuted() { return muted; }

function tone(freq: number, t0: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number) {
  const c = ensure(); if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(t0: number, dur: number, vol = 0.3, hp = 800) {
  const c = ensure(); if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

export const SFX = {
  click() { const c = ensure(); if (!c) return; tone(520, c.currentTime, 0.07, 'triangle', 0.18); },
  throw() { const c = ensure(); if (!c) return; noise(c.currentTime, 0.25, 0.25, 1200); tone(180, c.currentTime, 0.2, 'sawtooth', 0.12, 90); },
  land() { const c = ensure(); if (!c) return; const t = c.currentTime;
    tone(140, t, 0.12, 'square', 0.2, 80); noise(t, 0.1, 0.3, 500);
    tone(120, t + 0.06, 0.1, 'square', 0.15, 70); },
  coin() { const c = ensure(); if (!c) return; const t = c.currentTime;
    [880, 1100, 1320, 1660].forEach((f, i) => tone(f, t + i * 0.05, 0.12, 'triangle', 0.22)); },
  coinTick() { const c = ensure(); if (!c) return; tone(1200 + Math.random() * 400, c.currentTime, 0.05, 'triangle', 0.1); },
  jackpot() { const c = ensure(); if (!c) return; const t = c.currentTime;
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.2, 'triangle', 0.25)); },
  build() { const c = ensure(); if (!c) return; const t = c.currentTime;
    tone(330, t, 0.1, 'square', 0.2); tone(440, t + 0.08, 0.12, 'square', 0.2); tone(660, t + 0.18, 0.18, 'triangle', 0.22); },
  attack() { const c = ensure(); if (!c) return; const t = c.currentTime;
    noise(t, 0.3, 0.35, 300); tone(160, t, 0.3, 'sawtooth', 0.25, 60); },
  shield() { const c = ensure(); if (!c) return; const t = c.currentTime;
    tone(700, t, 0.25, 'sine', 0.2, 1200); },
  tax() { const c = ensure(); if (!c) return; const t = c.currentTime;
    tone(400, t, 0.25, 'sawtooth', 0.2, 160); },
  bonus() { const c = ensure(); if (!c) return; const t = c.currentTime;
    [660, 880, 1100].forEach((f, i) => tone(f, t + i * 0.06, 0.12, 'triangle', 0.2)); },
  cityClear() { const c = ensure(); if (!c) return; const t = c.currentTime;
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.12, 0.3, 'triangle', 0.28)); },
};
