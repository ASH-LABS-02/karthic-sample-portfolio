// Recorded foley, served locally. Sources and CC0 licenses: public/audio/CREDITS.md.
// Audio is created/resumed only from a user gesture; loading never blocks entry.
let ctx;
let master;
let muted = false;
let loading;
let step = 0;
const buffers = new Map();
const active = new Set();
const lastPlayed = new Map();
const files = ['door-open', 'door-close', 'chair', 'switch', 'step-left', 'step-right', 'page'];
try { muted = localStorage.getItem('room-muted') === '1'; } catch { /* private mode */ }

export function preloadSounds() {
  if (!ctx) return Promise.resolve();
  if (!loading) {
    loading = Promise.allSettled(files.map(async (name) => {
      const response = await fetch(`/audio/${name}.wav`);
      if (!response.ok) throw new Error(`Audio unavailable: ${name}`);
      buffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()));
    }));
  }
  return loading;
}

export function unlock() {
  try {
    if (!ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      ctx = new Audio();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.65;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 10;
      limiter.ratio.value = 6;
      master.connect(limiter).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    preloadSounds();
    return true;
  } catch { return false; }
}

export const isMuted = () => muted;
export function setMuted(value) {
  muted = Boolean(value);
  try { localStorage.setItem('room-muted', muted ? '1' : '0'); } catch { /* private mode */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.65, ctx.currentTime, 0.035);
  if (muted) stopSounds();
}

export function stopSounds() {
  active.forEach((source) => { try { source.stop(); } catch { /* already stopped */ } });
  active.clear();
}

function play(name, { gain = 0.55, delay = 0, offset = 0, duration, rate = 1, cooldown = 0, pan = 0 } = {}) {
  if (!ctx || ctx.state !== 'running' || muted || document.hidden) return;
  const buffer = buffers.get(name);
  if (!buffer || offset >= buffer.duration) return;
  const time = ctx.currentTime;
  if (cooldown && time - (lastPlayed.get(name) ?? -Infinity) < cooldown) return;
  lastPlayed.set(name, time);
  const source = ctx.createBufferSource();
  const level = ctx.createGain();
  const length = Math.min(duration ?? buffer.duration - offset, buffer.duration - offset);
  const start = time + delay;
  const end = start + length / rate;
  source.buffer = buffer;
  source.playbackRate.value = rate;
  level.gain.setValueAtTime(0, start);
  level.gain.linearRampToValueAtTime(gain, start + 0.008);
  level.gain.setValueAtTime(gain, Math.max(start + 0.008, end - 0.04));
  level.gain.linearRampToValueAtTime(0, end);
  const panner = ctx.createStereoPanner?.();
  source.connect(level);
  if (panner) { panner.pan.value = Math.max(-1, Math.min(1, pan)); level.connect(panner).connect(master); }
  else level.connect(master);
  active.add(source);
  source.onended = () => { active.delete(source); source.disconnect(); level.disconnect(); panner?.disconnect(); };
  source.start(start, offset, length);
}

export const sound = {
  doorOpen: () => play('door-open', { gain: 0.55, cooldown: 0.4 }),
  doorClose: (delay = 0) => play('door-close', { gain: 0.4, delay }),
  footstep: (gain = 0.25) => { const left = step++ % 2; play(left ? 'step-left' : 'step-right', { gain, pan: left ? -0.09 : 0.09, rate: 0.97 + Math.random() * 0.06, cooldown: 0.1 }); },
  footsteps(count, gap, delay = 0) {
    for (let i = 0; i < count; i++) { const left = step++ % 2; play(left ? 'step-left' : 'step-right', { gain: 0.22, pan: left ? -0.09 : 0.09, delay: delay + i * gap, rate: 0.97 + Math.random() * 0.06 }); }
  },
  chairRoll: (duration = 1.8) => play('chair', { duration, gain: 0.34, cooldown: 0.35 }),
  switch: () => play('switch', { gain: 0.45, cooldown: 0.12 }),
  page: () => play('page', { gain: 0.25, cooldown: 0.15 }),
  acBeep: () => play('switch', { gain: 0.3, rate: 1.1, cooldown: 0.12 }),
};

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) { stopSounds(); ctx.suspend().catch(() => {}); }
  else if (ctx.state === 'suspended') ctx.resume().catch(() => {});
});
['pointerdown', 'keydown'].forEach((event) => window.addEventListener(event, () => {
  if (ctx?.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
}, { passive: true }));
