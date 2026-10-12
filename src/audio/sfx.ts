// Every sound is a bar sound, synthesised with Web Audio — zero audio assets, zero licences to track.
// Silent until the first gesture (autoplay policy); the Back Office lever mutes everything.

export type Sfx = 'tink' | 'shhk' | 'clack' | 'clink' | 'clunk' | 'feed' | 'zzzt' | 'kettle' | 'thunder';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let enabled = true;
let volume = 0.6;
let bedNodes: AudioNode[] = [];
let buzz: { osc: OscillatorNode[]; gain: GainNode } | null = null;

export function configureAudio(on: boolean, vol: number): void {
  enabled = on;
  volume = vol;
  if (master && ctx) master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.05);
  if (!on) stopBeds();
}

/** Call from the first pointer/key gesture. */
export function unlockAudio(): void {
  if (ctx || typeof AudioContext === 'undefined') {
    void ctx?.resume();
    return;
  }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = enabled ? volume : 0;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < d.length; i++) {
    // pink-ish noise (Paul Kellet's economy filter)
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq: number, t: number, peak: number, decay: number, type: OscillatorType = 'sine'): void {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  env(g, t, peak, 0.004, decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + decay + 0.05);
}

function noise(t: number, dur: number, peak: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 1): void {
  if (!ctx || !master || !noiseBuf) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const bq = ctx.createBiquadFilter();
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(f0, t);
  bq.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  env(g, t, peak, Math.min(0.02, dur / 4), dur);
  s.connect(bq).connect(g).connect(master);
  s.start(t, Math.random());
  s.stop(t + dur + 0.1);
}

export function play(name: Sfx, opts: { rate?: number; delay?: number } = {}): void {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + (opts.delay ?? 0);
  const r = opts.rate ?? 1;
  switch (name) {
    case 'tink': // brass pin
      tone(2350 * r, t, 0.22, 0.35);
      tone(3610 * r, t, 0.08, 0.2);
      break;
    case 'shhk': // paper on wood
      noise(t, 0.32, 0.35, 'bandpass', 2400, 900, 0.8);
      break;
    case 'clack': // sign flip
      noise(t, 0.05, 0.5, 'highpass', 1800);
      tone(180, t, 0.25, 0.08, 'triangle');
      break;
    case 'clink': // ice in glass, ±4 % pitch
      tone(3100 * r, t, 0.18, 0.28);
      tone(4870 * r, t, 0.07, 0.18);
      break;
    case 'clunk': // bottle on shelf
      tone(140, t, 0.35, 0.18, 'triangle');
      tone(1780, t + 0.06, 0.07, 0.4);
      break;
    case 'feed': // thermal printer
      for (let i = 0; i < 6; i++) noise(t + i * 0.035, 0.025, 0.12, 'bandpass', 5200, 5200, 4);
      break;
    case 'zzzt': // paper tear
      noise(t, 0.26, 0.4, 'bandpass', 900, 4200, 1.5);
      break;
    case 'kettle': // hot verdict
      noise(t, 0.6, 0.12, 'bandpass', 3000, 6000, 6);
      tone(220, t + 0.1, 0.06, 0.5, 'sine');
      break;
    case 'thunder': {
      // distance = delay + lowpass
      noise(t, 2.2, 0.55, 'lowpass', 420, 90, 0.7);
      tone(60, t, 0.25, 1.6, 'sine');
      break;
    }
  }
}

export function stopBeds(): void {
  for (const n of bedNodes) {
    try {
      if (n instanceof AudioScheduledSourceNode) n.stop();
      n.disconnect();
    } catch {
      // already stopped
    }
  }
  bedNodes = [];
  if (buzz) {
    for (const o of buzz.osc) {
      try {
        o.stop();
      } catch {
        // already stopped
      }
    }
    buzz.gain.disconnect();
    buzz = null;
  }
}

/** Rain/wind bed: pink noise through a lowpass whose cutoff follows the wind; neon buzz on the night shift. */
export function setBeds(opts: { rain: number; windKmh: number; neon: boolean; reduced: boolean }): void {
  stopBeds();
  if (!enabled || !ctx || !master || !noiseBuf) return;
  const t = ctx.currentTime;
  const loud = Math.max(opts.rain, Math.min(1, opts.windKmh / 70));
  if (loud > 0.05) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200 + Math.min(1, opts.windKmh / 80) * 2200 + opts.rain * 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 + loud * 0.12, t + 1.5);
    s.connect(lp).connect(g).connect(master);
    s.start();
    bedNodes.push(s, lp, g);
  }
  if (opts.neon) {
    const g = ctx.createGain();
    g.gain.value = 0.012; // ≈ −38 dB under the master: felt more than heard
    const osc = [50, 100, 150].map((f, i) => {
      const o = ctx!.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      o.connect(g);
      o.start();
      return o;
    });
    if (!opts.reduced) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 0.31;
      depth.gain.value = 0.004;
      lfo.connect(depth).connect(g.gain);
      lfo.start();
      osc.push(lfo);
    }
    g.connect(master);
    buzz = { osc, gain: g };
  }
}
