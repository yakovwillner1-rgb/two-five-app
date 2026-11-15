import { midi } from '../midi/input';
import { S } from '../state';

/* MIDI out: send the app's notes to Logic (or any synth) instead of the built-in sound. */
/** note → how many note-ons are sounding on the output */
export const outOn = new Map<number, number>();
/** notes held on the on-screen piano (never cut by stop) */
export const screenOn = new Set<number>();

export function getOut(): MIDIOutput | null {
  if (!S.soundOut || !midi.acc) return null;
  let o: MIDIOutput | null = null;
  midi.acc.outputs.forEach(x => { if (x.name === S.soundOut && x.state !== 'disconnected') o = x; });
  return o;
}
export const vel = (v: number): number => Math.max(35, Math.min(110, Math.round(v * 450)));
export function sendOn(out: MIDIOutput, m: number, v: number): void {
  try { out.send([0x90, m, v]); outOn.set(m, (outOn.get(m) || 0) + 1); } catch (e) { /* port went away */ }
}
export function sendOff(out: MIDIOutput, m: number): void {
  try {
    out.send([0x80, m, 0]);
    const c = (outOn.get(m) || 1) - 1;
    if (c > 0) outOn.set(m, c); else outOn.delete(m);
  } catch (e) { /* port went away */ }
}
/** Note-off for everything the app started (no stuck notes), plus sustain pedal up. */
export function midiPanic(): void {
  const out = getOut();
  if (!out) return;
  outOn.forEach((_c, m) => { if (!screenOn.has(m)) try { out.send([0x80, m, 0]); } catch (e) { /* ignore */ } });
  [...outOn.keys()].forEach(m => { if (!screenOn.has(m)) outOn.delete(m); });
  try { out.send([0xb0, 64, 0]); } catch (e) { /* ignore */ }
}
