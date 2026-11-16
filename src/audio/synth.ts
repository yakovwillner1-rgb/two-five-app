/* Built-in sound: two oscillators through a low-pass, with a light echo. */
let ctx: AudioContext | null = null, bus: GainNode | null = null, comp: DynamicsCompressorNode | null = null;

export function audio(): AudioContext {
  if (!ctx) {
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    newBus();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function newBus(): void {
  const c = ctx!;
  bus = c.createGain(); bus.gain.value = 0.5; bus.connect(comp!);
  const d = c.createDelay(); d.delayTime.value = 0.23;
  const fb = c.createGain(); fb.gain.value = 0.22;
  const wet = c.createGain(); wet.gain.value = 0.16;
  bus.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(comp!);
}
/** Fade out everything that is sounding and start a fresh bus. */
export function silence(): void {
  if (ctx && bus) { bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03); newBus(); }
}
export function synthTone(midi: number, t0: number, dur: number, vol: number): void {
  const c = ctx!, f = 440 * Math.pow(2, (midi - 69) / 12);
  const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(), lp = c.createBiquadFilter();
  o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2.001; g2.gain.value = 0.25;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(3000, t0); lp.frequency.exponentialRampToValueAtTime(800, t0 + Math.max(dur, 0.3));
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t0 + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(bus!);
  o1.start(t0); o2.start(t0); o1.stop(t0 + dur + 0.05); o2.stop(t0 + dur + 0.05);
}

/** A plucked string (Karplus-Strong): a burst of noise circulating in a short delay that loses a little each pass. */
let seed = 12345;
const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
export function pluckTone(midi: number, t0: number, dur: number, vol: number): void {
  const c = ctx!, sr = c.sampleRate, f = 440 * Math.pow(2, (midi - 69) / 12);
  const len = Math.floor(sr * Math.min(Math.max(dur + 0.4, 1.2), 3.6)), N = Math.max(2, Math.round(sr / f));
  const buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) { const x = rnd() * 2 - 1; prev = prev * 0.5 + x * 0.5; ring[i] = prev; } // softened burst: a warm pick, not a click
  const decay = 0.9965 - Math.min(0.002, 60 / f / 1000);
  for (let n = 0, i = 0; n < len; n++, i = (i + 1) % N) { const a = ring[i], b = ring[(i + 1) % N]; d[n] = a; ring[i] = (a + b) * 0.5 * decay; }
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(vol * 2.2, t0); g.gain.setValueAtTime(vol * 2.2, t0 + dur); g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.35);
  src.connect(g); g.connect(bus!);
  src.start(t0); src.stop(t0 + dur + 0.4);
}
