import { homeChords } from './home';
import { fmt, mod, pcOf, transpose } from './notes';
import { IV, degreeLabel, famOfKind, fromChart, makeChord, simplifyRoot, type KindId, type PChord } from './symbols';
import { ORD, chordTensions, extensionOptions, plainOf, scaleChoices, type ChordScale, type ToneRole } from './tensions';
import type { Interval, Key, Note } from './types';

/*
 * Melody on top (lead voicing). Pure: chord + melody note (+ key, + the chord that follows) → voicings
 * with that note as the highest note. Rules and sources: docs/THEORY_SOURCES.md rules 19–24.
 * The melody never moves: every voicing is built downward from it.
 */
const { m2, M2, A2, m3, M3, P4, A4, d5, P5, A5, m6, M6, d7, m7, M7 } = IV;

export type Hand = 'L' | 'R';
export interface LNote { midi: number; note: Note; label: string; hand: Hand }
export type LeadType =
  | 'close' | 'drop2' | 'drop3' | 'drop24' | 'rootlessA' | 'rootlessB' | 'block' | 'sixthDim'
  | 'soWhat' | 'quartal' | 'upper' | 'spread17' | 'spread110' | 'cluster';
export interface LeadVoicing {
  type: LeadType;
  /** unique within one list: the type, plus the triad for upper structures */
  id: string;
  name: string;
  /** degrees bottom to top, e.g. "5 7 R 3" */
  formula: string;
  /** low to high; the last note is the melody */
  notes: LNote[];
  why: string;
  /** the chord these notes really spell, when the voicing adds color the symbol does not have */
  sounds?: string;
}

/* ---------- the scale the chord is heard in ---------- */
/**
 * The chord's first scale (THEORY_SOURCES rule 9). A dominant with no next chord given is read as
 * going down a fifth to the chord of the key on that root, when the key has one.
 */
export function leadScale(c: PChord, next: PChord | null, key: Key): ChordScale {
  return scaleChoices(plainOf(c), impliedNext(c, next, key), key)[0].scale;
}
/** The chord that follows, or for a dominant with none given, the chord of the key a fifth below it. */
export function impliedNext(c: PChord, next: PChord | null, key: Key): PChord | null {
  if (next || famOfKind(c) !== 'dom') return next;
  const target = homeChords(key).find(h => mod(pcOf(h.root) - pcOf(c.root), 12) === 5);
  return target ? fromChart(target) : null;
}

/* ---------- naming any note against a chord ---------- */
/** How a note that is neither a chord tone nor a scale note is spelled above the root. */
const FALLBACK: Interval[] = [{ steps: 0, semis: 0 }, m2, M2, m3, M3, P4, A4, P5, m6, M6, m7, M7];
interface Palette { at: (semis: number) => { note: Note; label: string; role: ToneRole | 'outside' } }
function palette(c: PChord, scale: ChordScale): Palette {
  const map = new Map<number, { note: Note; label: string; role: ToneRole | 'outside' }>();
  const rel = (n: Note): number => mod(pcOf(n) - pcOf(c.root), 12);
  scale.notes.forEach(s => map.set(rel(s.note), { note: s.note, label: s.label, role: s.role }));
  /* the chord's own notes win: an extension written in the symbol is part of the chord */
  c.tones.forEach((n, i) => map.set(rel(n), { note: n, label: c.labels[i], role: 'chord' }));
  const dom = famOfKind(c) === 'dom';
  return {
    at: (semis: number) => {
      const s = mod(semis, 12), hit = map.get(s);
      if (hit) return hit;
      const iv = dom && s === 3 ? A2 : dom && s === 8 ? m6 : s === 6 && map.has(7) ? A4 : s === 6 ? d5 : s === 8 && !map.has(7) ? A5 : s === 9 && c.kind === '°7' ? d7 : FALLBACK[s];
      return { note: transpose(c.root, iv), label: degreeLabel(iv), role: 'outside' };
    },
  };
}
const rel = (c: PChord, midi: number): number => mod(midi - pcOf(c.root), 12);

/* ---------- the four notes of a close voicing ---------- */
interface Slots { root: number; third: number | null; fifth: number | null; seventh: number | null }
/** Semitones above the root of the chord's root, 3rd (or sus 4th), 5th and 7th (or 6th). */
function slots(c: PChord): Slots {
  const at = (want: string[]): number | null => { const i = c.labels.findIndex(l => want.includes(l)); return i < 0 ? null : mod(pcOf(c.tones[i]) - pcOf(c.root), 12); };
  return { root: 0, third: at(['3', '♭3', '4']), fifth: at(['5', '♭5', '♯5']), seventh: at(['7', '♭7', '𝄫7', '6']) };
}
const NINES = new Set(['9', '♭9', '♯9']);
/**
 * Four-way close: root, 3rd, 5th, 7th, where a tension takes the place of a chord tone:
 * a 9 (♭9, ♯9) replaces the root; an 11, ♯11, 13 or ♭13 replaces the 5th. The 3rd and 7th always stay.
 * The chord's own extensions are put in first, then the melody (the melody always wins its slot).
 * With the root on top of a major 7 chord the 6th takes the place of the 7th (see `sixthForSeventh`).
 * Returns semitones above the root, or null when the melody cannot sit on this chord.
 */
/** Root in the melody of a major 7 chord: the 7th would sit a half step under it, so the 6th is used. */
export const sixthForSeventh = (c: PChord, melody: number): boolean =>
  rel(c, melody) === 0 && famOfKind(c) === 'maj' && slots(c).seventh === 11;
export function fourWay(c: PChord, melody: number): number[] | null {
  const s = slots(c), mel = rel(c, melody);
  if (s.third === null) return null;
  let rootSlot = s.root, fifthSlot = s.fifth;
  let fifthTaken = false;
  chordTensions(c).forEach(t => {
    const x = mod(pcOf(t.note) - pcOf(c.root), 12);
    if (NINES.has(t.label)) rootSlot = x;
    else if (t.label !== '6' && !fifthTaken) { fifthSlot = x; fifthTaken = true; }
  });
  const fixed = [s.third, s.seventh].filter((x): x is number => x !== null);
  if (!fixed.includes(mel)) {
    if (mel === 0) rootSlot = 0;
    else if (mel === s.fifth) fifthSlot = mel;
    else if (mel <= 3) rootSlot = mel;
    else if (mel >= 5 && mel <= 9) fifthSlot = mel; /* 11, ♯11, 5 (on a chord written without one), ♭13, 13 */
    else return null; /* a different 3rd or 7th: the melody belongs to another chord */
  }
  const seventh = sixthForSeventh(c, melody) ? 9 : s.seventh;
  const out = [rootSlot, s.third, ...(fifthSlot === null ? [] : [fifthSlot]), ...(seventh === null ? [] : [seventh])];
  return [...new Set(out)];
}

/* ---------- placing notes ---------- */
/** Put each pitch (semitones above the root) as high as it goes below the melody; melody on top. Low to high. */
function under(c: PChord, set: number[], melody: number): number[] {
  const mel = rel(c, melody);
  const below = set.filter(x => x !== mel).map(x => melody - mod(mel - x, 12));
  return [...below.sort((a, b) => a - b), melody];
}
/** Lowest MIDI note with this pitch (semitones above the root) at or above `floor`. */
const atOrAbove = (c: PChord, semis: number, floor: number): number => floor + mod(pcOf(c.root) + semis - floor, 12);
/** Highest MIDI note with this pitch strictly below `ceil`. */
const justBelow = (c: PChord, semis: number, ceil: number): number => ceil - 1 - mod(ceil - 1 - pcOf(c.root) - semis, 12);

/** Low-interval limit used here: a 3rd (3 or 4 semitones) between neighbours needs its lower note at E2 or higher. */
export const E2 = 40;
export function rangeOk(midis: number[]): boolean {
  const s = [...midis].sort((a, b) => a - b);
  if (s[0] < 24) return false;
  return s.every((m, i) => i === 0 || !([3, 4].includes(m - s[i - 1]) && s[i - 1] < E2));
}

/* ---------- the voicing types ---------- */
interface Ctx { c: PChord; melody: number; pal: Palette; scale: ChordScale; key: Key }
type Draft = Omit<LeadVoicing, 'notes' | 'formula'> & { midis: number[]; left?: number[]; label?: (midi: number) => { note: Note; label: string }; /** the 6th stands in for the major 7th: label it 6, not 13 */ sixth?: boolean };
const an = (s: string): string => (/^[AEF]/.test(s) ? 'an' : 'a');

function closeFamily(x: Ctx): Draft[] {
  const set = fourWay(x.c, x.melody);
  if (!set) return [];
  const cl = under(x.c, set, x.melody), out: Draft[] = [];
  const sub = set.map(s => x.pal.at(s)).filter(p => p.role !== 'chord' || !['R', '3', '♭3', '4', '5', '♭5', '♯5', '7', '♭7', '𝄫7', '6'].includes(p.label)).map(p => p.label);
  const subText = sub.length ? ` The ${sub.join(' and ')} take${sub.length === 1 ? 's' : ''} the place of ${sub.some(l => NINES.has(l)) ? 'the root' : ''}${sub.some(l => NINES.has(l)) && sub.some(l => !NINES.has(l)) ? ' and ' : ''}${sub.some(l => !NINES.has(l)) ? 'the 5th' : ''}.` : '';
  const sixth = sixthForSeventh(x.c, x.melody);
  const sixText = sixth ? ' The root is on top, so the 6th takes the place of the 7th: the 7th would rub a half step under the melody.' : '';
  out.push({ type: 'close', id: 'close', name: 'Close', midis: cl, sixth, why: `Every note as near as it goes under the melody, all inside one octave.${subText}${sixText}` });
  if (cl.length === 4) {
    const drop = (idx: number[]): number[] => cl.map((m, i) => (idx.includes(i) ? m - 12 : m)).sort((a, b) => a - b);
    out.push({ type: 'drop2', id: 'drop2', name: 'Drop 2', midis: drop([2]), sixth, why: `The close voicing with its second note from the top dropped an octave: more open, the melody stands out.${sixText}` });
    out.push({ type: 'drop3', id: 'drop3', name: 'Drop 3', midis: drop([1]), sixth, why: `The close voicing with its third note from the top dropped an octave: a wide gap above the bass note.${sixText}` });
    out.push({ type: 'drop24', id: 'drop24', name: 'Drop 2 & 4', midis: drop([2, 0]), sixth, why: `The second and fourth notes from the top dropped an octave: the most open of the drop voicings.${sixText}` });
    out.push({ type: 'block', id: 'block', name: 'Block chord (locked hands)', midis: [x.melody - 12, ...cl], left: [x.melody - 12], sixth, why: `George Shearing's locked hands: the close voicing with the melody doubled an octave below.${sixText}` });
  }
  return out;
}

/** The 9 a rootless voicing uses: the melody's when the melody is a 9, else the chord's own, else the scale's when it is an available tension, else the root. */
function ninth(x: Ctx): number {
  const mel = rel(x.c, x.melody);
  if (mel >= 1 && mel <= 3 && mel !== slots(x.c).third) return mel;
  const own = chordTensions(x.c).find(t => NINES.has(t.label));
  if (own) return mod(pcOf(own.note) - pcOf(x.c.root), 12);
  const sc = x.scale.notes.find(n => NINES.has(n.label) && n.role === 'tension');
  return sc ? mod(pcOf(sc.note) - pcOf(x.c.root), 12) : 0;
}
/** The note next to the 7th in a rootless voicing: the 13 (♭13) on a dominant, else the 5th. */
function fifthOr13(x: Ctx): number | null {
  const s = slots(x.c);
  if (famOfKind(x.c) !== 'dom') return s.fifth;
  const mel = rel(x.c, x.melody);
  if (mel === 8 || mel === 9) return mel;
  const own = chordTensions(x.c).find(t => t.label === '13' || t.label === '♭13');
  if (own) return mod(pcOf(own.note) - pcOf(x.c.root), 12);
  const sc = x.scale.notes.find(n => (n.label === '13' || n.label === '♭13') && n.role === 'tension');
  return sc ? mod(pcOf(sc.note) - pcOf(x.c.root), 12) : s.fifth;
}
/** Lowest note a left-hand rootless voicing may start on (D3), as in the app's voicing sheet. */
const ROOTLESS_FLOOR = 50;
function rootless(x: Ctx): Draft[] {
  const s = slots(x.c), fam = famOfKind(x.c);
  if (s.third === null || s.seventh === null || !['maj', 'min', 'dom', 'hdim'].includes(fam) || x.c.labels.includes('4')) return [];
  const f = fifthOr13(x), n = ninth(x);
  if (f === null) return [];
  const build = (order: number[], type: 'rootlessA' | 'rootlessB', name: string, text: string): Draft | null => {
    const left: number[] = [];
    order.forEach((semi, i) => left.push(i === 0 ? atOrAbove(x.c, semi, ROOTLESS_FLOOR) : atOrAbove(x.c, semi, left[i - 1] + 1)));
    if (left[left.length - 1] >= x.melody) return null;
    return { type, id: type, name, midis: [...left, x.melody], left, why: text };
  };
  const dom = fam === 'dom', nine = n === 0 ? 'root (the 9 of this scale is an avoid note)' : '9';
  return [
    build([s.third, f, s.seventh, n], 'rootlessA', 'Rootless A + melody', `Left hand ${dom ? '3-13-7-9' : '3-5-7-9'} with the ${nine} on top, no root; the right hand plays the melody.`),
    build([s.seventh, n, s.third, f], 'rootlessB', 'Rootless B + melody', `Left hand ${dom ? '7-9-3-13' : '7-9-3-5'}, the 7th on the bottom, no root; the right hand plays the melody.`),
  ].filter((d): d is Draft => !!d);
}

/**
 * Barry Harris: the chord is heard as a 6th chord, and its scale is that 6th chord plus the
 * diminished 7th chord a half step below its root. A melody note of the 6th chord gets the 6th
 * chord under it; any other scale note gets the diminished chord.
 */
export function sixthOf(c: PChord): PChord | null {
  const fam = famOfKind(c);
  if (c.bass || c.upper) return null;
  if (fam === 'maj') return makeChord(c.root, '6');
  if (c.kind === 'm' || c.kind === 'm6' || c.kind === 'm(maj7)') return makeChord(c.root, 'm6');
  if (fam === 'min') return makeChord(simplifyRoot(transpose(c.root, m3)), '6');
  if (fam === 'hdim') return makeChord(simplifyRoot(transpose(c.root, m3)), 'm6');
  if (c.kind === '7' || c.kind === '9' || c.kind === '13') return makeChord(transpose(c.root, P5), 'm6');
  return null;
}
function sixthDim(x: Ctx): Draft[] {
  const six = sixthOf(x.c);
  if (!six) return [];
  const dim = makeChord(simplifyRoot(transpose(six.root, M7)), '°7');
  const pc = mod(x.melody, 12), use = six.tones.some(t => pcOf(t) === pc) ? six : dim.tones.some(t => pcOf(t) === pc) ? dim : null;
  if (!use) return [];
  const midis = [...use.tones.filter(t => pcOf(t) !== pc).map(t => x.melody - mod(pc - pcOf(t), 12)).sort((a, b) => a - b), x.melody];
  /* the 6th chord's notes are named inside the real chord; the diminished chord's notes inside itself */
  const label = use === six ? undefined : (m: number) => { const i = dim.tones.findIndex(t => pcOf(t) === mod(m, 12)); return { note: dim.tones[i], label: dim.labels[i] }; };
  const same = six.root.letter === x.c.root.letter && six.root.acc === x.c.root.acc;
  const as = same ? `${x.c.symbol} is played as ${six.symbol}` : `${x.c.symbol} is played as ${six.symbol} (the same notes${famOfKind(x.c) === 'dom' ? ' as its 5th, 7th, 9th and 3rd' : ''})`;
  return [{
    type: 'sixthDim', id: 'sixthDim', name: use === six ? 'Barry Harris: 6th chord' : 'Barry Harris: passing diminished', midis, label, sounds: use.symbol,
    why: use === six ? `${as}. The melody is a note of that 6th chord, so the 6th chord sits under it.`
      : `${as}. The melody is not in it: it is a passing note, so ${dim.symbol} sits under it and moves on to ${six.symbol}. Labels show each note inside ${dim.symbol}.`,
  }];
}

/** Stacks built downward from the melody; every note must be a chord tone or an available tension. */
function quartal(x: Ctx): Draft[] {
  const ok = (ms: number[]): boolean => ms.every(m => { const r = x.pal.at(rel(x.c, m)).role; return r === 'chord' || r === 'tension'; });
  const has3 = (ms: number[]): boolean => { const t = slots(x.c).third; return t !== null && ms.some(m => rel(x.c, m) === t); };
  const out: Draft[] = [], m = x.melody;
  const so = [m - 19, m - 14, m - 9, m - 4, m], q = [m - 15, m - 10, m - 5, m];
  if (ok(so) && has3(so)) out.push({ type: 'soWhat', id: 'soWhat', name: 'So What', midis: so, left: so.slice(0, 2), why: 'Three perfect 4ths with a major 3rd on top (Bill Evans on "So What"). Every note is a chord tone or an available tension of this chord.' });
  if (ok(q) && has3(q)) out.push({ type: 'quartal', id: 'quartal', name: 'Quartal (stacked 4ths)', midis: q, left: q.slice(0, 1), why: 'Perfect 4ths stacked under the melody. Every note is a chord tone or an available tension of this chord.' });
  return out;
}

/** Triads over a dominant's 3rd and 7th (Levine's upper structures): upper-case = major triad, lower-case = minor triad. */
export const UPPER_TRIADS: { numeral: string; iv: Interval; kind: KindId; adds: string; minor?: boolean }[] = [
  { numeral: 'II', iv: M2, kind: '13♯11', adds: '9, ♯11 and 13' },
  { numeral: '♭III', iv: m3, kind: '7♯9', adds: '♯9' },
  { numeral: '♭V', iv: d5, kind: '7♭9♯11', adds: '♭9 and ♯11' },
  { numeral: '♭VI', iv: m6, kind: '7♯9♭13', adds: '♯9 and ♭13' },
  { numeral: 'VI', iv: M6, kind: '13♭9', adds: '13 and ♭9' },
  { numeral: 'i', iv: { steps: 0, semis: 0 }, kind: '7♯9', adds: '♯9', minor: true },
  { numeral: '♭ii', iv: m2, kind: '7♭9♭13', adds: '♭9 and ♭13', minor: true },
];
function upper(x: Ctx): Draft[] {
  const s = slots(x.c);
  if (famOfKind(x.c) !== 'dom' || s.third !== 4 || s.seventh !== 10 || x.c.bass) return [];
  const pc = mod(x.melody, 12), out: Draft[] = [];
  for (const u of UPPER_TRIADS) {
    const tri = makeChord(simplifyRoot(transpose(x.c.root, u.iv)), u.minor ? 'm' : '');
    if (!tri.tones.some(t => pcOf(t) === pc)) continue;
    const right = [...tri.tones.filter(t => pcOf(t) !== pc).map(t => x.melody - mod(pc - pcOf(t), 12)).sort((a, b) => a - b), x.melody];
    /* the tritone as high as it goes under the right hand, either note on the bottom */
    const lows = [s.third, s.seventh].map(lo => { const top = justBelow(x.c, lo === s.third ? s.seventh! : s.third!, right[0]); return [justBelow(x.c, lo, top), top]; });
    const left = lows.sort((a, b) => b[0] - a[0])[0];
    if (left[0] < 41) continue;
    const full = makeChord(x.c.root, u.kind);
    /* right-hand notes are spelled as the triad (B♭ in an E♭ triad) and labelled by what they are in the chord (♯9);
       a triad note that is the chord's own root, 3rd, 5th or 7th keeps the chord's spelling (E, not F♭, in D♭m over C7) */
    const label = (m: number) => {
      const i = full.tones.findIndex(t => pcOf(t) === mod(m, 12)), p = x.pal.at(rel(x.c, m));
      const basic = [0, 4, 7, 10].includes(rel(x.c, m));
      const tri3 = right.includes(m) && !basic ? tri.tones.find(t => pcOf(t) === mod(m, 12)) : undefined;
      return { note: tri3 ?? (i >= 0 ? full.tones[i] : p.note), label: i >= 0 ? full.labels[i] : p.label };
    };
    out.push({
      type: 'upper', id: 'upper' + u.numeral, name: `Upper structure ${u.numeral}${u.minor ? ' (minor triad)' : ''}`, midis: [...left, ...right], left, label, sounds: full.symbol,
      why: `${an(fmt(tri.root))} ${fmt(tri.root)} ${u.minor ? 'minor' : 'major'} triad in the right hand over the 3rd and 7th of ${fmt(x.c.root)}7 in the left. It adds the ${u.adds}: the chord sounds as ${full.symbol}.`,
    });
  }
  return out;
}

/** Two-hand spread: left hand root + 7th, or root + 3rd a tenth up; the rest of the close voicing in the right hand. */
function spread(x: Ctx): Draft[] {
  const s = slots(x.c), set = fourWay(x.c, x.melody);
  if (!set || s.third === null || s.seventh === null || x.c.bass) return [];
  const mel = rel(x.c, x.melody), out: Draft[] = [];
  const make = (type: 'spread17' | 'spread110', name: string, upperSemi: number, lh: string, text: string): void => {
    const bass = atOrAbove(x.c, 0, 36), top = atOrAbove(x.c, upperSemi, type === 'spread110' ? bass + 13 : bass + 1);
    const rest = set.filter(v => v !== 0 && v !== upperSemi || v === mel);
    const right = under(x.c, [...new Set([...rest, mel])], x.melody);
    if (right.length < 2 || right[0] <= top) return;
    out.push({ type, id: type, name, midis: [bass, top, ...right], left: [bass, top], sixth: sixthForSeventh(x.c, x.melody), why: `Left hand ${lh}; ${text}` });
  };
  const sixth = sixthForSeventh(x.c, x.melody), six = sixth || x.c.labels.includes('6');
  const note6 = sixth ? ' The root is on top, so the 6th takes the place of the 7th.' : '';
  make('spread17', six ? 'Spread 1–6' : 'Spread 1–7', sixth ? 9 : s.seventh, six ? 'root and 6th' : 'root and 7th', `the right hand has the 3rd and the color notes under the melody.${note6}`);
  make('spread110', 'Spread 1–10', s.third, 'root and the 3rd a tenth above it', `the right hand has the ${six ? '6th' : '7th'} and the color notes under the melody.${note6}`);
  return out;
}

/** Close cluster: 3rd, 7th and 9th under the melody, so two notes sit a 2nd apart. */
function cluster(x: Ctx): Draft[] {
  const s = slots(x.c), n = ninth(x);
  if (s.third === null || s.seventh === null || n === 0 || x.c.labels.includes('4')) return [];
  const mel = rel(x.c, x.melody), set = new Set([s.third, s.seventh, n, mel]);
  if (set.size < 4 && s.fifth !== null) set.add(s.fifth);
  if (set.size !== 4) return [];
  const fw = fourWay(x.c, x.melody);
  if (!fw) return [];
  const midis = under(x.c, [...set], x.melody);
  const seconds = midis.filter((m, i) => i > 0 && m - midis[i - 1] <= 2).length;
  /* the same notes as the close voicing is not a second choice */
  if (!seconds || [...set].every(v => fw.includes(v))) return [];
  return [{ type: 'cluster', id: 'cluster', name: 'Cluster (2nd inside)', midis, why: 'The 9th sits right next to another note, a 2nd apart, with no root: the rub that neo-soul voicings are known for.' }];
}

/**
 * Every voicing of the chord with the melody (a MIDI note) on top, in a fixed order by type.
 * Voicings that break the low-interval limit are left out.
 */
export function leadVoicings(c: PChord, melody: number, next: PChord | null, key: Key): LeadVoicing[] {
  if (c.upper) return [];
  const scale = leadScale(c, next, key), x: Ctx = { c, melody, pal: palette(c, scale), scale, key };
  const drafts = [...closeFamily(x), ...rootless(x), ...sixthDim(x), ...quartal(x), ...upper(x), ...spread(x), ...cluster(x)];
  return drafts.filter(d => rangeOk(d.midis)).map(d => {
    const left = new Set(d.left ?? []);
    const notes: LNote[] = d.midis.map(m => {
      const p = d.label ? d.label(m) : x.pal.at(rel(c, m));
      return { midi: m, note: p.note, label: d.sixth && rel(c, m) === 9 ? '6' : p.label, hand: left.has(m) ? 'L' : 'R' };
    });
    return { type: d.type, id: d.id, name: d.name, formula: notes.map(n => n.label).join(' '), notes, why: d.why, sounds: d.sounds };
  });
}

/* ---------- voice leading ---------- */
export interface VoiceMove { from: number; to: number; semis: number }
export interface Motion { moves: VoiceMove[]; total: number; /** total ÷ number of voices: used to compare voicings of different sizes */ mean: number; common: number }
/**
 * How the notes of `prev` move to `cur` (both low to high). Same number of notes: voice by voice,
 * bottom to top. Otherwise every note of `cur` comes from the nearest note of `prev` (the lower
 * one when two are equally near).
 */
export function voiceMotion(prev: number[], cur: number[]): Motion {
  const a = [...prev].sort((p, q) => p - q), b = [...cur].sort((p, q) => p - q);
  const moves: VoiceMove[] = b.map((to, i) => {
    const from = a.length === b.length ? a[i] : a.reduce((best, m) => (Math.abs(m - to) < Math.abs(best - to) ? m : best), a[0]);
    return { from, to, semis: to - from };
  });
  const total = moves.reduce((s, m) => s + Math.abs(m.semis), 0);
  return { moves, total, mean: moves.length ? total / moves.length : 0, common: moves.filter(m => m.semis === 0).length };
}
export interface RankedVoicing { voicing: LeadVoicing; motion: Motion | null; /** one of the style's preferred voicing types */ preferred: boolean }
/** The voicing-type names used in the style data (src/data/styles.ts) → the voicing types here. */
export const STYLE_TYPES: Record<string, LeadType[]> = {
  rootless: ['rootlessA', 'rootlessB'], drop2: ['drop2'], spread: ['spread17', 'spread110'], upperStructure: ['upper'], block: ['block'],
  cluster: ['cluster'], quartal: ['soWhat', 'quartal'], close: ['close'], triad: ['close'], shell: [],
};
/**
 * With a previous voicing: smoothest first (least movement per voice, then most common tones, then
 * the style's preferred types). Without one: the style's preferred types first, in the style's
 * order, then the rest by type.
 */
export function rankLead(list: LeadVoicing[], prev: number[] | null, prefer: string[] = []): RankedVoicing[] {
  const order = prefer.flatMap(k => STYLE_TYPES[k] ?? []);
  const pref = (v: LeadVoicing): number => { const i = order.indexOf(v.type); return i < 0 ? order.length : i; };
  const rows = list.map((v, i) => ({ voicing: v, motion: prev && prev.length ? voiceMotion(prev, v.notes.map(n => n.midi)) : null, preferred: pref(v) < order.length, i }));
  rows.sort((p, q) => (p.motion && q.motion ? p.motion.mean - q.motion.mean || q.motion.common - p.motion.common : 0) || pref(p.voicing) - pref(q.voicing) || p.i - q.i);
  return rows.map(({ voicing, motion, preferred }) => ({ voicing, motion, preferred }));
}

/* ---------- the melody note against the chord ---------- */
export type MelodyRole = ToneRole | 'outside';
export interface MelodyFix { kind: 'move' | 'color' | 'sus' | 'reharm'; text: string; /** the chord to switch to */ chord?: PChord; /** the melody note to switch to */ midi?: number }
export interface MelodyCheck { role: MelodyRole; note: Note; label: string; scale: ChordScale; text: string; fixes: MelodyFix[] }
const ordOf = (label: string): string => ORD[label] ?? label;

export function melodyCheck(c: PChord, melody: number, next: PChord | null, key: Key): MelodyCheck {
  const scale = leadScale(c, next, key), pal = palette(c, scale), p = pal.at(rel(c, melody)), name = fmt(p.note);
  const base = { role: p.role, note: p.note, label: p.label, scale };
  if (p.role === 'chord') return { ...base, text: `${name} is the ${ordOf(p.label)} of ${c.symbol}: a chord tone.`, fixes: [] };
  if (p.role === 'tension') return { ...base, text: `${name} is the ${ordOf(p.label)} of ${c.symbol}: an available tension (${fmt(scale.root)} ${scale.name}).`, fixes: [] };
  const fixes: MelodyFix[] = [];
  /* 1. the same chord with a color that holds the note */
  const seen = new Set<string>();
  for (const o of extensionOptions(plainOf(c), impliedNext(c, next, key), key)) {
    const i = o.chord.tones.findIndex(t => pcOf(t) === mod(melody, 12));
    if (i < 0 || seen.has(o.chord.symbol) || fixes.filter(f => f.kind === 'color').length >= 2) continue;
    seen.add(o.chord.symbol);
    fixes.push({ kind: 'color', chord: o.chord, text: `Play ${o.chord.symbol}: there ${name} is the ${ordOf(o.chord.labels[i])} (${o.scale.name}).` });
  }
  /* 2. a sus chord, when the note is the 4th over a dominant */
  if (famOfKind(c) === 'dom' && rel(c, melody) === 5 && !c.labels.includes('4')) {
    const sus = makeChord(c.root, '7sus4');
    fixes.push({ kind: 'sus', chord: sus, text: `Play ${sus.symbol}: the 4th takes the place of the 3rd, so ${name} is a chord tone.` });
  }
  /* 3. move the melody a half step to a note that fits */
  for (const d of [-1, 1]) {
    const q = pal.at(rel(c, melody + d));
    if (q.role === 'chord' || q.role === 'tension') fixes.push({ kind: 'move', midi: melody + d, text: `Move the melody ${d < 0 ? 'down' : 'up'} a half step to ${fmt(q.note)}, the ${ordOf(q.label)}.` });
  }
  /* 4. a chord of the key that has the note as a chord tone, nearest in sound first */
  const mine = new Set(c.tones.map(pcOf));
  homeChords(key).map(fromChart)
    .filter(h => pcOf(h.root) !== pcOf(c.root) && h.tones.some(t => pcOf(t) === mod(melody, 12)))
    .map(h => ({ h, shared: h.tones.filter(t => mine.has(pcOf(t))) }))
    .sort((a, b) => b.shared.length - a.shared.length).slice(0, 3)
    .forEach(({ h, shared }) => {
      const i = h.tones.findIndex(t => pcOf(t) === mod(melody, 12));
      fixes.push({ kind: 'reharm', chord: h, text: `Reharmonize with ${h.symbol}: ${name} is its ${ordOf(h.labels[i])}${shared.length ? `, and it shares ${shared.map(fmt).join(', ')} with ${c.symbol}` : ''}.` });
    });
  const text = p.role === 'avoid'
    ? `${name} is the ${ordOf(p.label)} of ${c.symbol}: an avoid note. It sits a half step above a chord tone and blurs the chord when it is held on top.`
    : `${name} is not in ${fmt(scale.root)} ${scale.name}, the scale of ${c.symbol} here: it clashes when it is held on top.`;
  return { ...base, text, fixes };
}

/** "E5" → 76. Accepts b / ♭ / # / ♯; octave 4 starts at middle C. */
export function parsePitch(text: string): number | null {
  const m = /^\s*([A-Ga-g])([#b♯♭]{0,2})(-?\d)\s*$/.exec(text);
  if (!m) return null;
  const base = [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(m[1].toUpperCase())];
  const acc = [...m[2]].reduce((a, ch) => a + (ch === '#' || ch === '♯' ? 1 : -1), 0);
  const midi = (+m[3] + 1) * 12 + base + acc;
  return midi >= 21 && midi <= 108 ? midi : null;
}
/** Octave number of a MIDI note for a given spelling (C♭4 is MIDI 59, B♯3 is MIDI 60). */
export const octaveOf = (midi: number, n: Note): number => Math.floor((midi - n.acc) / 12) - 1;
export const pitchName = (midi: number, n: Note): string => fmt(n) + octaveOf(midi, n);
