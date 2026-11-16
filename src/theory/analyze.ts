import type { Bar } from '../midi/smf';
import { homeKey } from './home';
import { mod, pcOf } from './notes';
import { spellRoot } from './recognize';
import { KINDS, makeChord, type KindId, type PChord } from './symbols';
import type { HomeMode, Key } from './types';

/*
 * Reading a MIDI recording: key, melody, grid and chords. Pure: notes in, analysis out.
 * Rules and sources: docs/THEORY_SOURCES.md rules 31–34. Everything here is a first reading that
 * the user can correct (key, harmonic rhythm, any chord).
 */
export interface ANote { tick: number; dur: number; midi: number; /** index of the track it came from */ track: number }

/* ---------- key: Krumhansl–Schmuckler ---------- */
/** Krumhansl–Kessler key profiles: how well each scale degree (in semitones above the tonic) fits a major / minor key. */
export const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
export const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
export interface KeyGuess { pc: number; mode: HomeMode; /** correlation, −1 to 1 */ r: number }

/** Total sounding time of each pitch class (index 0 = C). */
export function pcDurations(notes: Pick<ANote, 'midi' | 'dur'>[]): number[] {
  const w = new Array<number>(12).fill(0);
  notes.forEach(n => { w[mod(n.midi, 12)] += n.dur; });
  return w;
}
function pearson(a: number[], b: number[]): number {
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0, da = 0, db = 0;
  a.forEach((x, i) => { num += (x - ma) * (b[i] - mb); da += (x - ma) ** 2; db += (b[i] - mb) ** 2; });
  return da && db ? num / Math.sqrt(da * db) : 0;
}
/** All 24 keys, best first: the correlation of the piece's pitch-class durations with each key's profile. */
export function detectKey(notes: Pick<ANote, 'midi' | 'dur'>[]): KeyGuess[] {
  const w = pcDurations(notes), out: KeyGuess[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const rot = (p: number[]): number[] => w.map((_x, i) => p[mod(i - pc, 12)]);
    out.push({ pc, mode: 'major', r: pearson(w, rot(KK_MAJOR)) }, { pc, mode: 'minor', r: pearson(w, rot(KK_MINOR)) });
  }
  return out.sort((a, b) => b.r - a.r);
}
export const keyOfGuess = (g: KeyGuess): Key => homeKey(g.pc, g.mode);

/* ---------- melody: skyline ---------- */
/**
 * The skyline: a note is melody when it is the highest note sounding at its own start
 * (notes starting within `window` ticks count as starting together).
 */
export function skyline(notes: ANote[], window: number): ANote[] {
  const s = [...notes].sort((a, b) => a.tick - b.tick || b.midi - a.midi);
  return s.filter(n => !s.some(o => o !== n && o.midi > n.midi && o.tick <= n.tick + window && o.tick + o.dur > n.tick + window));
}
/** The melody note to voice under at a tick: the one sounding then, else the next one starting before `end`. */
export function melodyAt(melody: ANote[], tick: number, end: number): ANote | null {
  const on = melody.filter(n => n.tick <= tick && n.tick + n.dur > tick).sort((a, b) => b.midi - a.midi)[0];
  if (on) return on;
  return melody.filter(n => n.tick >= tick && n.tick < end).sort((a, b) => a.tick - b.tick || b.midi - a.midi)[0] ?? null;
}

/* ---------- chords ---------- */
export interface ChordGuess { chord: PChord; /** higher is better; about 1 for a clean, complete chord with its root in the bass */ score: number }
/** How much of [a, b) a note covers, in ticks. */
const overlap = (n: ANote, a: number, b: number): number => Math.max(0, Math.min(n.tick + n.dur, b) - Math.max(n.tick, a));
const KIND_IDS = Object.keys(KINDS) as KindId[];
const TEMPLATES = KIND_IDS.map(kind => {
  const c = makeChord({ letter: 'C', acc: 0 }, kind), fifth = c.labels.indexOf('5');
  return { kind, pcs: c.tones.map(pcOf), fifth: fifth < 0 ? -1 : pcOf(c.tones[fifth]) };
});
/** Weights of the chord score. Tunable guesses, like the style weights. */
export const CHORD_SCORE = { outside: 1, missing: 0.5, bassRoot: 0.2, bassTone: 0.05, size: 0.02, /** a pitch class sounding for less than this share of the time is a passing note: it is left out */ passing: 0.05 };

/**
 * The chords that best explain the notes sounding in [start, end), best first.
 * Each chord type on each root is scored: the share of sounding time on its chord tones, minus
 * the share on other notes, minus a penalty for chord tones that never sound (the 5th may be
 * missing), plus a bonus when the lowest note is the root. Simpler chords win ties. Notes that
 * sound for less than 5% of the time (passing notes in a melody) are left out.
 */
export function detectChord(notes: ANote[], start: number, end: number, key: Key): ChordGuess[] {
  const w = new Array<number>(12).fill(0);
  let total = 0, longest = 0;
  const live = notes.filter(n => overlap(n, start, end) > 0);
  live.forEach(n => { const o = overlap(n, start, end); w[mod(n.midi, 12)] += o; total += o; longest = Math.max(longest, o); });
  /* passing notes: too short to be part of the chord */
  for (let p = 0; p < 12; p++) if (w[p] > 0 && w[p] < total * CHORD_SCORE.passing) { total -= w[p]; w[p] = 0; }
  if (!total || w.filter(x => x > 0).length < 2) return [];
  /* the bass: the lowest note that lasts at least a quarter as long as the longest one */
  const solid = live.filter(n => overlap(n, start, end) >= longest / 4);
  const bass = mod(Math.min(...(solid.length ? solid : live).map(n => n.midi)), 12);
  const out: ChordGuess[] = [];
  for (let r = 0; r < 12; r++) {
    for (const t of TEMPLATES) {
      const pcs = t.pcs.map(p => mod(p + r, 12));
      if (!pcs.includes(bass) && w[r] === 0) continue; /* neither the root nor the bass is there */
      let inside = 0, missing = 0;
      pcs.forEach(p => { inside += w[p]; if (w[p] === 0 && p !== mod(t.fifth + r, 12)) missing++; });
      if (inside === 0) continue;
      const outside = total - inside;
      const score = inside / total - CHORD_SCORE.outside * (outside / total) - CHORD_SCORE.missing * (missing / pcs.length)
        + (bass === r ? CHORD_SCORE.bassRoot : pcs.includes(bass) ? CHORD_SCORE.bassTone : 0) - CHORD_SCORE.size * (pcs.length - 3);
      const root = spellRoot(r, t.kind, key), c = makeChord(root, t.kind);
      const bassNote = bass !== r ? c.tones.find(n => pcOf(n) === bass) : undefined;
      out.push({ chord: bassNote ? makeChord(root, t.kind, bassNote) : c, score });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

/* ---------- grid and chart ---------- */
export type Rhythm = 'auto' | 'bar' | 'half' | 'beat';
export interface Seg { start: number; end: number; bar: number; chord: PChord | null; /** other readings of the same notes, best first */ alts: PChord[]; score: number }

/** Ticks of one felt beat: the denominator's note, or three of them in compound time (6/8, 9/8, 12/8). */
export const feltBeat = (b: Bar): number => (b.den === 8 && b.num % 3 === 0 && b.num > 3 ? b.beat * 3 : b.beat);
/** Split points of a bar for a harmonic rhythm. Half a bar only exists when the bar has an even number of felt beats. */
export function slices(b: Bar, rhythm: Exclude<Rhythm, 'auto'>): [number, number][] {
  const fb = feltBeat(b), n = Math.round((b.end - b.start) / fb);
  if (rhythm === 'beat') return Array.from({ length: n }, (_x, i): [number, number] => [b.start + i * fb, b.start + (i + 1) * fb]);
  if (rhythm === 'half' && n % 2 === 0 && n >= 2) { const mid = b.start + (n / 2) * fb; return [[b.start, mid], [mid, b.end]]; }
  return [[b.start, b.end]];
}
const sameChord = (a: PChord | null, b: PChord | null): boolean => !!a && !!b && a.symbol === b.symbol;

/**
 * The chord chart of a recording. `auto` reads each bar as one chord unless its two halves are
 * two different chords that each fit their half better than one chord fits the whole bar.
 * A slice with nothing to read (silence, a single note) has `chord: null`: the chord before it carries on.
 */
export function detectChart(notes: ANote[], bars: Bar[], key: Key, rhythm: Rhythm): Seg[] {
  const read = (a: number, b: number, bar: number): Seg => {
    const g = detectChord(notes, a, b, key);
    return { start: a, end: b, bar, chord: g[0]?.chord ?? null, alts: g.slice(1).map(x => x.chord), score: g[0]?.score ?? 0 };
  };
  const out: Seg[] = [];
  bars.forEach(b => {
    if (rhythm !== 'auto') { slices(b, rhythm).forEach(([x, y]) => out.push(read(x, y, b.index))); return; }
    const whole = read(b.start, b.end, b.index), halves = slices(b, 'half');
    if (halves.length === 2) {
      const [h1, h2] = halves.map(([x, y]) => read(x, y, b.index));
      if (h1.chord && h2.chord && pcOf(h1.chord.root) !== pcOf(h2.chord.root) && Math.min(h1.score, h2.score) > whole.score) { out.push(h1, h2); return; }
    }
    out.push(whole);
  });
  return out;
}
/** The chart with empty slices filled by the chord before them, and repeats of one chord joined into one stretch. */
export function joinChart(segs: Seg[]): { start: number; end: number; chord: PChord; bar: number }[] {
  const out: { start: number; end: number; chord: PChord; bar: number }[] = [];
  segs.forEach(s => {
    const last = out[out.length - 1];
    if (last && (!s.chord || sameChord(s.chord, last.chord))) { last.end = s.end; return; }
    if (s.chord) out.push({ start: s.start, end: s.end, chord: s.chord, bar: s.bar });
  });
  return out;
}
