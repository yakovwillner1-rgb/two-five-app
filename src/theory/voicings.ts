import { letterIndex, mod, pcOf, spell } from './notes';
import type { Chord, Note, VoiceRole, Voicing } from './types';

type Slot = 'R' | '3' | '5' | '7' | '9';
/** Label for a chord degree by its semitones above the root. */
const IVN: Record<string, Record<number, string>> = {
  '3': { 3: '♭3', 4: '3' }, '5': { 6: '♭5', 7: '5', 8: '♯5' }, '7': { 9: '𝄫7', 10: '♭7', 11: '7' },
  '9': { 1: '♭9', 2: '9', 3: '♯9' }, '11': { 5: '11', 6: '♯11' },
};
export interface VoicingDef { group: 'Basic' | 'Jazz'; name: string; sub: string; slots: Slot[]; /** lowest MIDI note the bottom voice may take */ base: number }
export const VDEF: VoicingDef[] = [
  { group: 'Basic', name: 'Root position', sub: 'R 3 5 7', slots: ['R', '3', '5', '7'], base: 48 },
  { group: 'Basic', name: '1st inversion', sub: '3 on the bottom', slots: ['3', '5', '7', 'R'], base: 52 },
  { group: 'Basic', name: '2nd inversion', sub: '5 on the bottom', slots: ['5', '7', 'R', '3'], base: 52 },
  { group: 'Basic', name: '3rd inversion', sub: '7 on the bottom', slots: ['7', 'R', '3', '5'], base: 52 },
  { group: 'Jazz', name: 'Shell 1‑3‑7', sub: 'left hand', slots: ['R', '3', '7'], base: 41 },
  { group: 'Jazz', name: 'Shell 1‑7‑3', sub: 'left hand', slots: ['R', '7', '3'], base: 41 },
  { group: 'Jazz', name: 'Rootless A', sub: '3 5 7 9', slots: ['3', '5', '7', '9'], base: 50 },
  { group: 'Jazz', name: 'Rootless B', sub: '7 9 3 5', slots: ['7', '9', '3', '5'], base: 50 },
  { group: 'Jazz', name: 'Drop 2', sub: 'guitar-style spread', slots: ['5', 'R', '3', '7'], base: 48 },
  { group: 'Jazz', name: 'Two hands', sub: 'L: 1‑7 · R: 3‑5‑9', slots: ['R', '7', '3', '5', '9'], base: 36 },
];

/**
 * The note for each slot. The 9th is the 2nd note of the chord's mode, except that a ♭9
 * is only kept on dominant 7 chords; every other chord gets a natural 9.
 */
export function degNotes(c: Pick<Chord, 'tones' | 'quality' | 'mode'>): Record<Slot, Note> {
  const t = c.tones, r = pcOf(t[0]);
  let nine = c.mode.notes[1];
  if (mod(pcOf(nine) - r, 12) === 1 && c.quality !== '7') nine = spell((letterIndex(t[0]) + 1) % 7, (r + 2) % 12);
  return { R: t[0], '3': t[1], '5': t[2], '7': t[3], '9': nine };
}

/** Stack the slots upward from the lowest note at or above `def.base`. */
export function buildVoicing(c: Pick<Chord, 'tones' | 'quality' | 'mode'>, def: VoicingDef): Voicing {
  const D = degNotes(c), r = pcOf(c.tones[0]);
  let prev = -1;
  const out = def.slots.map((k, i) => {
    const n = D[k], pc = pcOf(n);
    let m: number;
    if (i === 0) m = def.base + mod(pc - def.base, 12);
    else { m = pc; while (m <= prev) m += 12; }
    prev = m;
    const semi = mod(pc - r, 12);
    const role: VoiceRole = k === 'R' ? 'root' : k === '3' || k === '7' ? 'guide' : 'color';
    return { midi: m, note: n, label: k === 'R' ? 'R' : IVN[k]?.[semi] ?? k, role };
  });
  return { group: def.group, name: def.name, sub: def.sub, notes: out };
}
export const allVoicings = (c: Pick<Chord, 'tones' | 'quality' | 'mode'>): Voicing[] => VDEF.map(d => buildVoicing(c, d));

/** The one voicing shown on hover and used by Play it: Rootless B for dominants, root position for °7, else Rootless A. */
export const defaultVoicingIndex = (c: Pick<Chord, 'quality'>): number => (c.quality === '7' ? 7 : /°7/.test(c.quality) ? 0 : 6);
export const defaultVoicing = (c: Pick<Chord, 'tones' | 'quality' | 'mode'>): Voicing => buildVoicing(c, VDEF[defaultVoicingIndex(c)]);

/** Playback voicing: root in the bass (C2–B2), upper tones each placed nearest to `ref`. Returns the new centre. */
export function playbackVoicing(tones: Note[], ref: number): { notes: number[]; ref: number } {
  const bass = 36 + pcOf(tones[0]);
  const up = tones.slice(1).map(n => {
    const pc = pcOf(n);
    let best = pc + 48, d = 1e9;
    for (let m = pc + 48; m <= pc + 72; m += 12) { const dd = Math.abs(m - ref); if (dd < d) { d = dd; best = m; } }
    return best;
  });
  return { notes: [bass, ...up], ref: up.reduce((a, b) => a + b, 0) / up.length };
}
