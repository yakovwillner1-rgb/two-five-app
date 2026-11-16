import { letterIndex, mod, pcOf, spell } from './notes';
import type { Note, VoiceRole } from './types';

/*
 * Guitar chord grips. Pure functions, no DOM. Rules, sources and the choices we made: docs/THEORY_SOURCES.md (rules 37-44).
 *
 * Strings are numbered by index 0 to 5, LOW to HIGH (index 0 = the thick low E, "6th string"; index 5 = the thin high E, "1st string").
 * Pitches are SOUNDING pitches in MIDI numbers (a guitar is written an octave higher than it sounds; we always use what you hear).
 */
export const TUNING = [40, 45, 50, 55, 59, 64] as const; // E2 A2 D3 G3 B3 E4
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'] as const;
/** Highest fret we use. */
export const MAX_FRET = 15;

export type GripType = 'open' | 'barre' | 'shell' | 'triad' | 'drop2' | 'drop3' | 'rootless' | 'quartal';
export type GuitarStyle = 'jazz' | 'pop';

/** What a grip needs to know about a chord: its tones (root first) and a degree label for each ("R", "3", "♭7" ...). */
export interface GChord { symbol: string; tones: Note[]; labels: string[] }

export interface GuitarNote { string: number; fret: number; midi: number; note: Note; label: string; role: VoiceRole }
export interface Grip {
  type: GripType;
  /** short name, e.g. "Drop 2" */
  name: string;
  /** which strings, plain words, e.g. "strings 4–3–2–1" */
  sub: string;
  /** one plain sentence: why you would play it */
  why: string;
  /** fret per string, low to high: a number, or null for a muted (not played) string */
  frets: (number | null)[];
  /** the notes that sound, low to high */
  notes: GuitarNote[];
  /** lowest and highest fretted fret (open strings ignored); 0 when nothing is fretted */
  lo: number; hi: number;
  /** how many frets the hand covers: 1 to 5 */
  span: number;
  /** fingers needed (a barre counts as one) */
  fingers: number;
  /** harder than usual: wide stretch */
  stretch: boolean;
  /** lower is easier / better for the style */
  score: number;
}

/* ---------- chord degrees ---------- */
const STEP: Record<string, number> = { R: 0, '2': 1, '♭9': 1, '9': 1, '♯9': 1, '3': 2, '♭3': 2, '4': 3, '11': 3, '♯11': 3, '5': 4, '♭5': 4, '♯5': 4, '6': 5, '13': 5, '♭13': 5, '7': 6, '♭7': 6, '𝄫7': 6 };
const LABEL_BY_SEMIS: Record<string, Record<number, string>> = {
  '3': { 3: '♭3', 4: '3' }, '5': { 6: '♭5', 7: '5', 8: '♯5' }, '7': { 9: '𝄫7', 10: '♭7', 11: '7' },
  '9': { 1: '♭9', 2: '9', 3: '♯9' }, '11': { 5: '11', 6: '♯11' }, '13': { 8: '♭13', 9: '13' },
};
export const labelFor = (slot: '3' | '5' | '7' | '9' | '11' | '13', semis: number): string => LABEL_BY_SEMIS[slot][semis] ?? slot;
const THIRDS = ['3', '♭3', '4'], FIFTHS = ['5', '♭5', '♯5'], SEVENTHS = ['7', '♭7', '𝄫7', '6'], EXTS = ['♭9', '9', '♯9', '11', '♯11', '♭13', '13'];

interface Deg { pc: number; semis: number; note: Note; label: string }
interface Parts { root: Deg; third?: Deg; fifth?: Deg; seventh?: Deg; ext?: Deg; all: Deg[] }
function parts(c: GChord): Parts {
  const r = pcOf(c.tones[0]);
  const all: Deg[] = c.tones.map((n, i) => ({ pc: pcOf(n), semis: mod(pcOf(n) - r, 12), note: n, label: c.labels[i] ?? 'R' }));
  const pick = (L: string[]) => all.find((d, i) => i > 0 && L.includes(d.label));
  const exts = all.filter((d, i) => i > 0 && EXTS.includes(d.label));
  return { root: all[0], third: pick(THIRDS), fifth: pick(FIFTHS), seventh: pick(SEVENTHS), ext: exts.length ? exts[exts.length - 1] : undefined, all };
}
/** Spell a degree of the chord (9, 13 ...) on the right letter. */
function degreeNote(c: GChord, label: string, semis: number): Note {
  const root = c.tones[0];
  return spell((letterIndex(root) + (STEP[label] ?? 0)) % 7, mod(pcOf(root) + semis, 12));
}
const roleOf = (label: string): VoiceRole => (label === 'R' ? 'root' : THIRDS.includes(label) || ['7', '♭7', '𝄫7'].includes(label) ? 'guide' : 'color');

/**
 * The notes a full grip plays (rule 38). Always the root, the third (or 4th on a sus chord) and the seventh (or 6th).
 * The 4th note is the 5th, except when the chord has an extension (9, 11, 13 ...): then the extension is played and the 5th is dropped.
 * A chord with no seventh (a plain triad) uses root, third, fifth.
 */
export function core(c: GChord): Deg[] {
  const p = parts(c);
  if (!p.third) return [];
  if (!p.seventh) return p.fifth ? [p.root, p.third, p.fifth] : [];
  const fourth = p.ext ?? p.fifth;
  const d = [p.root, p.third, p.seventh];
  if (fourth) d.push(fourth);
  return d;
}

/* ---------- placing notes on the neck ---------- */
interface Recipe { type: GripType; name: string; sub: string; why: string; degs: Deg[]; offsets: number[]; sets: number[][] }

const setText = (s: number[]): string => 'strings ' + s.map(i => 6 - i).join('–');

/** Every way to put a recipe on the neck: the bottom note on each string of each set, all other notes at exact distances above it. */
function place(c: GChord, r: Recipe, style: GuitarStyle): Grip[] {
  const out: Grip[] = [];
  for (const set of r.sets) {
    const s0 = set[0];
    for (let f0 = 0; f0 <= MAX_FRET; f0++) {
      if (mod(TUNING[s0] + f0 - r.degs[0].pc, 12) !== 0) continue;
      const frets: (number | null)[] = [null, null, null, null, null, null];
      let ok = true;
      set.forEach((s, i) => {
        const f = TUNING[s0] + f0 + r.offsets[i] - TUNING[s];
        if (f < 0 || f > MAX_FRET) ok = false; else frets[s] = f;
      });
      if (!ok) continue;
      /* 6-5-4-3 sounds muddy and is the least used drop 2 set (rule 39) */
      const g = makeGrip(c, r, frets, style, setText(set), r.type === 'drop2' && set[0] === 0 ? 1.2 : 0);
      if (g) out.push(g);
    }
  }
  return out;
}

function fretInfo(frets: (number | null)[]): { lo: number; hi: number; span: number; fingers: number } {
  const f = frets.filter((x): x is number => x != null && x > 0);
  if (!f.length) return { lo: 0, hi: 0, span: 1, fingers: 0 };
  const lo = Math.min(...f), hi = Math.max(...f);
  /* fingers: everything on the lowest fret can be one barre; every other fretted note needs its own finger */
  const atLo = f.filter(x => x === lo).length;
  const fingers = (atLo ? 1 : 0) + f.filter(x => x !== lo).length;
  return { lo, hi, span: hi - lo + 1, fingers };
}

/** Score: lower is better. Plain, tunable numbers (rule 42). */
const TYPE_COST: Record<GuitarStyle, Record<GripType, number>> = {
  /* rootless and fourths cost more: on its own, a guitar chord should have its root (rule 40) */
  jazz: { drop2: 0, shell: 0.5, drop3: 0.9, barre: 1.8, open: 1.8, triad: 2.2, quartal: 2.8, rootless: 3.2 },
  pop: { open: 0, barre: 0.3, triad: 1.2, shell: 2.4, drop2: 2.8, drop3: 3.2, rootless: 3.6, quartal: 3.6 },
};
function makeGrip(c: GChord, r: Recipe, frets: (number | null)[], style: GuitarStyle, sub: string, extraCost = 0): Grip | null {
  const info = fretInfo(frets);
  if (info.span > 5 || info.fingers > 4) return null;
  const notes: GuitarNote[] = [];
  frets.forEach((f, s) => {
    if (f == null) return;
    const midi = TUNING[s] + f, pc = mod(midi, 12);
    const d = r.degs.find(x => x.pc === pc) ?? c.tones.map((n, i) => ({ pc: pcOf(n), semis: 0, note: n, label: c.labels[i] ?? '' })).find(x => x.pc === pc);
    if (!d) { notes.length = 0; return; }
    notes.push({ string: s, fret: f, midi, note: d.note, label: d.label, role: roleOf(d.label) });
  });
  if (!notes.length || notes.length !== frets.filter(x => x != null).length) return null;
  if (!notes.every((n, i) => i === 0 || n.midi > notes[i - 1].midi)) return null;
  const openCount = frets.filter(x => x === 0).length;
  const sounding = frets.map((f, i) => (f == null ? -1 : i)).filter(i => i >= 0);
  const interiorMutes = sounding.length ? sounding[sounding.length - 1] - sounding[0] + 1 - sounding.length : 0;
  const designedGap = r.type === 'drop3' || r.type === 'shell' ? 1 : 0;
  const score = TYPE_COST[style][r.type]
    + Math.max(0, info.span - 3) * 1.4
    + Math.max(0, interiorMutes - designedGap) * 3
    + (r.type === 'open' || r.type === 'barre' ? 0 : openCount * 0.9)
    + info.lo * 0.05
    + extraCost;
  return { type: r.type, name: r.name, sub: sub || r.sub, why: r.why, frets, notes, lo: info.lo, hi: info.hi, span: info.span, fingers: info.fingers, stretch: info.span >= 5, score };
}

/* ---------- recipes ---------- */
const ADJ4 = [[0, 1, 2, 3], [1, 2, 3, 4], [2, 3, 4, 5]];
const SKIP4 = [[0, 2, 3, 4], [1, 3, 4, 5]];
const ADJ3 = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5]];
const SHELL3 = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [0, 2, 3], [1, 3, 4], [2, 4, 5]];

/** The four notes in close position (lowest first) and every inversion of them, as notes with absolute distances above the lowest. */
function closeInversions(degs: Deg[]): { notes: Deg[]; abs: number[] }[] {
  const sorted = [...degs].sort((a, b) => a.semis - b.semis);
  return sorted.map((_, k) => {
    const notes: Deg[] = [], abs: number[] = [];
    sorted.forEach((_d, j) => {
      const idx = (k + j) % sorted.length;
      notes.push(sorted[idx]);
      abs.push(sorted[idx].semis + (k + j >= sorted.length ? 12 : 0));
    });
    return { notes, abs: abs.map(a => a - abs[0]) };
  });
}
/** Drop 2: the 2nd note from the top moves down an octave. Drop 3: the 3rd from the top does. */
function dropped(inv: { notes: Deg[]; abs: number[] }, which: 2 | 3): { degs: Deg[]; offsets: number[] } {
  const n = inv.notes.length, i = n - which, base = inv.abs[i] - 12;
  const order = [i, ...inv.notes.map((_x, j) => j).filter(j => j !== i)];
  return { degs: order.map(j => inv.notes[j]), offsets: order.map(j => (j === i ? 0 : inv.abs[j] - base)) };
}
const INV_NAME = ['root position', '1st inversion', '2nd inversion', '3rd inversion'];

function recipes(c: GChord): Recipe[] {
  const R: Recipe[] = [];
  const p = parts(c), k = core(c);
  if (k.length === 4) {
    closeInversions(k).forEach((inv, i) => {
      const d2 = dropped(inv, 2), d3 = dropped(inv, 3);
      R.push({ type: 'drop2', name: 'Drop 2', sub: INV_NAME[i], why: 'Four notes on four strings next to each other. Full sound, and the shape slides easily from chord to chord.', degs: d2.degs, offsets: d2.offsets, sets: ADJ4 });
      R.push({ type: 'drop3', name: 'Drop 3', sub: INV_NAME[i], why: 'Skips a string after the bass note, so the low note stands apart from the rest. Good with a bass player or on its own.', degs: d3.degs, offsets: d3.offsets, sets: SKIP4 });
    });
  }
  if (k.length === 3) {
    closeInversions(k).forEach((inv, i) => {
      R.push({ type: 'triad', name: 'Triad', sub: INV_NAME[i], why: 'Just three notes: simple, clear, and easy to play.', degs: inv.notes, offsets: inv.abs, sets: ADJ3 });
    });
  }
  if (p.third && p.seventh) {
    const s3 = p.third.semis, s7 = p.seventh.semis;
    R.push({ type: 'shell', name: '3-note chord', sub: 'root, 3rd, 7th', why: 'Only the notes that say what kind of chord it is. Light, and leaves room for a bass or piano.', degs: [p.root, p.third, p.seventh], offsets: [0, s3, s7], sets: SHELL3 });
    R.push({ type: 'shell', name: '3-note chord', sub: 'root, 7th, 3rd', why: 'The same three notes, with the 7th lower down. The classic rhythm-guitar sound.', degs: [p.root, p.seventh, p.third], offsets: [0, s7, s3 + 12], sets: SHELL3 });
  }
  /* no root (rule 40): 3rd, 5th (13th on a dominant), 7th, 9th, drop 2 shape */
  if (p.third && p.seventh && p.seventh.label !== '6' && !THIRDS.slice(2).includes(p.third.label)) {
    const dominant = p.third.label === '3' && p.seventh.label === '♭7';
    const ninthLabel = p.all.find(d => ['♭9', '♯9'].includes(d.label) && dominant)?.label ?? '9';
    const ninthSemis = ninthLabel === '♭9' ? 1 : ninthLabel === '♯9' ? 3 : 2;
    const fifthDeg: Deg = dominant
      ? { pc: mod(pcOf(c.tones[0]) + 9, 12), semis: 9, note: degreeNote(c, '13', 9), label: '13' }
      : (p.fifth ?? { pc: mod(pcOf(c.tones[0]) + 7, 12), semis: 7, note: degreeNote(c, '5', 7), label: '5' });
    const nine: Deg = { pc: mod(pcOf(c.tones[0]) + ninthSemis, 12), semis: ninthSemis, note: degreeNote(c, ninthLabel, ninthSemis), label: ninthLabel };
    const set = [p.third, fifthDeg, p.seventh, nine];
    closeInversions(set).forEach((inv, i) => {
      const d2 = dropped(inv, 2);
      R.push({ type: 'rootless', name: 'No root', sub: INV_NAME[i], why: 'The root is left out on purpose: a bass player (or your other hand) plays it. Color notes on top.', degs: d2.degs, offsets: d2.offsets, sets: ADJ4 });
    });
  }
  /* So What / fourths (rule 41): minor 7th family only */
  if (p.third?.label === '♭3' && p.seventh?.label === '♭7' && (!p.fifth || p.fifth.label === '5')) {
    const a = (semis: number, label: string): Deg => ({ pc: mod(pcOf(c.tones[0]) + semis, 12), semis, note: degreeNote(c, label, semis), label });
    const r0 = p.root, e11 = a(5, '11'), b7 = p.seventh, b3 = p.third, f5 = a(7, '5');
    R.push({ type: 'quartal', name: 'So What', sub: 'stacked fourths', why: 'Three fourths with a major third on top. The sound of "So What" and a lot of modern jazz.', degs: [r0, e11, b7, b3, f5], offsets: [0, 5, 10, 15, 19], sets: [[0, 1, 2, 3, 4]] });
    R.push({ type: 'quartal', name: 'Fourths', sub: 'stacked fourths', why: 'Notes a fourth apart: open, modern, not tied to one chord shape.', degs: [r0, e11, b7, b3], offsets: [0, 5, 10, 15], sets: [[0, 1, 2, 3]] });
  }
  return R;
}

/* ---------- open and barre chords (pop, folk, beginners) ---------- */
type Canon = 'maj' | 'min' | '7' | 'maj7' | 'm7';
/** Which of the five basic qualities a chord is, from its degree labels; null for anything else. */
export function canon(c: GChord): Canon | null {
  const L = c.labels.slice(1).join(',');
  return ({ '3,5': 'maj', '♭3,5': 'min', '3,5,♭7': '7', '3,5,7': 'maj7', '♭3,5,♭7': 'm7' } as Record<string, Canon>)[L] ?? null;
}
/** Open shapes: root note name → frets low to high (-1 = muted). Standard shapes found in every chord book (rule 43; checked note by note in tests). */
export const OPEN: Record<Canon, Record<string, number[]>> = {
  maj: { C: [-1, 3, 2, 0, 1, 0], A: [-1, 0, 2, 2, 2, 0], G: [3, 2, 0, 0, 0, 3], E: [0, 2, 2, 1, 0, 0], D: [-1, -1, 0, 2, 3, 2] },
  min: { A: [-1, 0, 2, 2, 1, 0], E: [0, 2, 2, 0, 0, 0], D: [-1, -1, 0, 2, 3, 1] },
  '7': { C: [-1, 3, 2, 3, 1, 0], A: [-1, 0, 2, 0, 2, 0], G: [3, 2, 0, 0, 0, 1], E: [0, 2, 0, 1, 0, 0], D: [-1, -1, 0, 2, 1, 2], B: [-1, 2, 1, 2, 0, 2] },
  maj7: { C: [-1, 3, 2, 0, 0, 0], A: [-1, 0, 2, 1, 2, 0], G: [3, 2, 0, 0, 0, 2], F: [-1, -1, 3, 2, 1, 0], D: [-1, -1, 0, 2, 2, 2], E: [0, 2, 1, 1, 0, 0] },
  m7: { A: [-1, 0, 2, 0, 1, 0], E: [0, 2, 0, 0, 0, 0], D: [-1, -1, 0, 2, 1, 1] },
};
/** Movable barre shapes: frets relative to the barre fret, per root string (0 = low E shape, 1 = A shape). */
export const BARRE: Record<Canon, { E: number[]; A: number[] }> = {
  maj: { E: [0, 2, 2, 1, 0, 0], A: [-1, 0, 2, 2, 2, 0] },
  min: { E: [0, 2, 2, 0, 0, 0], A: [-1, 0, 2, 2, 1, 0] },
  '7': { E: [0, 2, 0, 1, 0, 0], A: [-1, 0, 2, 0, 2, 0] },
  maj7: { E: [0, 2, 1, 1, 0, 0], A: [-1, 0, 2, 1, 2, 0] },
  m7: { E: [0, 2, 0, 0, 0, 0], A: [-1, 0, 2, 0, 1, 0] },
};
const rootName = (c: GChord): string => c.tones[0].letter + (c.tones[0].acc === 0 ? '' : c.tones[0].acc > 0 ? '#' : 'b');

function shapeGrip(c: GChord, type: 'open' | 'barre', name: string, sub: string, why: string, fr: number[], style: GuitarStyle, extra = 0): Grip | null {
  const frets = fr.map(x => (x < 0 ? null : x));
  const degs: Deg[] = c.tones.map((n, i) => ({ pc: pcOf(n), semis: mod(pcOf(n) - pcOf(c.tones[0]), 12), note: n, label: c.labels[i] }));
  return makeGrip(c, { type, name, sub, why, degs, offsets: [], sets: [] }, frets, style, sub, extra);
}
function shapes(c: GChord, style: GuitarStyle): Grip[] {
  const q = canon(c);
  if (!q) return [];
  const out: Grip[] = [];
  const open = OPEN[q][rootName(c)];
  if (open) {
    const g = shapeGrip(c, 'open', 'Open chord', 'ringing strings, no barre', 'The easy way. Open strings ring out and you only press a few strings.', open, style);
    if (g) out.push(g);
  }
  const r = pcOf(c.tones[0]);
  (['E', 'A'] as const).forEach(shape => {
    const s = shape === 'E' ? 0 : 1, rf = mod(r - TUNING[s], 12);
    for (const barre of rf === 0 ? [12] : [rf]) {
      if (barre < 1 || barre > MAX_FRET - 2) continue;
      const fr = BARRE[q][shape].map(x => (x < 0 ? -1 : x + barre));
      const g = shapeGrip(c, 'barre', `Barre chord (${shape} shape)`, shape === 'E' ? 'root on the low E string' : 'root on the A string', 'One finger lies across the neck. The same shape works for any chord: slide it up and down.', fr, style, shape === 'A' ? 0.15 : 0);
      if (g) out.push(g);
    }
  });
  return out;
}

/* ---------- public: grips for a chord ---------- */
export function gripsFor(c: GChord, style: GuitarStyle = 'jazz'): Grip[] {
  const all = [...recipes(c).flatMap(r => place(c, r, style)), ...shapes(c, style)];
  /* the same fret pattern can come from two recipes (e.g. a shell and a triad): keep the better-scored one */
  const best = new Map<string, Grip>();
  all.forEach(g => { const k = g.frets.join(','); const o = best.get(k); if (!o || g.score < o.score) best.set(k, g); });
  return [...best.values()].sort((a, b) => a.score - b.score || a.lo - b.lo);
}
/** The note names of a grip, low to high, e.g. "G C E B". */
export const gripNames = (g: Grip): string => g.notes.map(n => n.note.letter + (n.note.acc > 0 ? '♯'.repeat(n.note.acc) : n.note.acc < 0 ? '♭'.repeat(-n.note.acc) : '')).join(' ');
/** The frets as text, e.g. "x-3-2-0-1-0". */
export const gripText = (g: Grip): string => g.frets.map(f => (f == null ? 'x' : String(f))).join('-');
export const gripMidis = (g: Grip): number[] => g.notes.map(n => n.midi);

/** The grip's centre on the neck: where the hand sits. */
const center = (g: Grip): number => (g.lo === 0 ? 0 : (g.lo + g.hi) / 2);

/**
 * Smoothest way through a list of chords (rule 44): hand moves little, notes that can stay put do, other notes move by small steps.
 * Dynamic programming over the best few grips of each chord.
 */
export function voiceLead(chords: GChord[], style: GuitarStyle = 'jazz', keep = 12): Grip[] {
  const cands = chords.map(c => { const all = gripsFor(c, style); return all.slice(0, keep); });
  if (cands.some(a => !a.length)) return chords.map(c => gripsFor(c, style)[0]).filter(Boolean);
  const cost = (a: Grip, b: Grip): number => {
    const stay = a.notes.filter(n => b.notes.some(m => m.string === n.string && m.fret === n.fret)).length;
    const am = a.notes.map(n => n.midi), bm = b.notes.map(n => n.midi), k = Math.min(am.length, bm.length);
    let move = 0;
    for (let i = 0; i < k; i++) move += Math.abs(bm[bm.length - 1 - i] - am[am.length - 1 - i]);
    const hand = a.lo === 0 || b.lo === 0 ? 0 : Math.abs(center(a) - center(b));
    return 0.7 * hand + 0.25 * move - 0.6 * stay;
  };
  let prev = cands[0].map(g => ({ g, c: g.score, from: -1 }));
  const trail: { g: Grip; c: number; from: number }[][] = [prev];
  for (let i = 1; i < cands.length; i++) {
    const cur = cands[i].map(g => {
      let bestC = Infinity, from = 0;
      prev.forEach((p, j) => { const t = p.c + cost(p.g, g); if (t < bestC) { bestC = t; from = j; } });
      return { g, c: bestC + g.score, from };
    });
    trail.push(cur); prev = cur;
  }
  let j = prev.reduce((bi, x, i, a) => (x.c < a[bi].c ? i : bi), 0);
  const out: Grip[] = [];
  for (let i = trail.length - 1; i >= 0; i--) { out.unshift(trail[i][j].g); j = trail[i][j].from; }
  return out;
}

/**
 * Grips with a given melody note on top (chord melody, rule 45): the highest sounding note has the same pitch class,
 * and the nearest octave to `topMidi` when one is given. Top notes on the three highest strings are favoured.
 */
export function gripsWithTop(c: GChord, topMidi: number, style: GuitarStyle = 'jazz'): Grip[] {
  const pc = mod(topMidi, 12);
  return gripsFor(c, style)
    .filter(g => mod(g.notes[g.notes.length - 1].midi, 12) === pc)
    .map(g => ({ ...g, score: g.score + (g.notes[g.notes.length - 1].string >= 3 ? 0 : 1.5) + Math.abs(g.notes[g.notes.length - 1].midi - topMidi) * 0.05 }))
    .sort((a, b) => a.score - b.score);
}

/** Style from the genre the app is set to. */
export const styleForGenre = (genre: string): GuitarStyle => (genre === 'pop' ? 'pop' : 'jazz');

/** A chart chord (root, 3rd, 5th, 7th) as something grips can be built for. */
export function fromChord(c: { symbol: string; tones: Note[] }): GChord {
  const r = pcOf(c.tones[0]);
  const slots = ['3', '5', '7'] as const;
  return { symbol: c.symbol, tones: c.tones, labels: ['R', ...c.tones.slice(1).map((n, i) => labelFor(slots[i] ?? '7', mod(pcOf(n) - r, 12)))] };
}
