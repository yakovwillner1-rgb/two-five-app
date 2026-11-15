import { fmt, intervalBetween, letterIndex, mod, note, pcOf, transpose } from './notes';
import { FORMS } from './scales';
import type { Chord, Interval, Key, Note, VoicedNote, VoiceRole } from './types';

/* General chord symbols for the passing-chord engine: any root, a table of chord kinds, slash bass. */
const iv = (steps: number, semis: number): Interval => ({ steps, semis });
/** Named intervals (letter steps + semitones), so every chord tone is spelled on the right letter. */
export const IV = {
  A1: iv(0, 1), m2: iv(1, 1), M2: iv(1, 2), A2: iv(1, 3), m3: iv(2, 3), M3: iv(2, 4), P4: iv(3, 5), A4: iv(3, 6),
  d5: iv(4, 6), P5: iv(4, 7), A5: iv(4, 8), m6: iv(5, 8), M6: iv(5, 9), d7: iv(6, 9), m7: iv(6, 10), M7: iv(6, 11),
};

export type ChordFamily = 'maj' | 'min' | 'dom' | 'hdim' | 'dim' | 'sus' | 'aug';
interface KindInfo { fam: ChordFamily; ivs: Interval[]; labels?: string[]; aliases?: string[] }
const { M2, A2, m2, m3, M3, P4, A4, d5, P5, A5, m6, M6, d7, m7, M7 } = IV;
/** Chord kinds by display suffix. `ivs` are the tones above the root. */
export const KINDS = {
  '': { fam: 'maj', ivs: [M3, P5], aliases: ['maj', 'M'] },
  'm': { fam: 'min', ivs: [m3, P5], aliases: ['min', '-'] },
  '°': { fam: 'dim', ivs: [m3, d5], aliases: ['dim', 'o'] },
  '+': { fam: 'aug', ivs: [M3, A5], aliases: ['aug'] },
  'sus4': { fam: 'sus', ivs: [P4, P5], labels: ['4', '5'], aliases: ['sus'] },
  '6': { fam: 'maj', ivs: [M3, P5, M6], labels: ['3', '5', '6'] },
  'm6': { fam: 'min', ivs: [m3, P5, M6], labels: ['♭3', '5', '6'], aliases: ['min6', '-6'] },
  '6/9': { fam: 'maj', ivs: [M3, P5, M6, M2], labels: ['3', '5', '6', '9'], aliases: ['69'] },
  'add9': { fam: 'maj', ivs: [M3, P5, M2] },
  'maj7': { fam: 'maj', ivs: [M3, P5, M7], aliases: ['M7', 'Δ', 'Δ7', 'ma7'] },
  'maj9': { fam: 'maj', ivs: [M3, P5, M7, M2], aliases: ['M9', 'Δ9'] },
  'maj7♯11': { fam: 'maj', ivs: [M3, P5, M7, A4], aliases: ['M7#11', 'Δ#11'] },
  'maj7♯5': { fam: 'aug', ivs: [M3, A5, M7], aliases: ['M7#5', 'maj7+', '+maj7'] },
  'm7': { fam: 'min', ivs: [m3, P5, m7], aliases: ['min7', '-7'] },
  'm9': { fam: 'min', ivs: [m3, P5, m7, M2], aliases: ['min9', '-9'] },
  'm11': { fam: 'min', ivs: [m3, P5, m7, M2, P4], aliases: ['min11', '-11'] },
  'm(maj7)': { fam: 'min', ivs: [m3, P5, M7], aliases: ['mmaj7', 'mM7', 'minmaj7', '-Δ', 'mΔ', 'm(M7)'] },
  'm7♭5': { fam: 'hdim', ivs: [m3, d5, m7], aliases: ['ø', 'ø7', 'min7b5', '-7b5'] },
  '°7': { fam: 'dim', ivs: [m3, d5, d7], aliases: ['dim7', 'o7'] },
  '7': { fam: 'dom', ivs: [M3, P5, m7], aliases: ['dom7'] },
  '9': { fam: 'dom', ivs: [M3, P5, m7, M2] },
  '13': { fam: 'dom', ivs: [M3, P5, m7, M2, M6] },
  '7sus4': { fam: 'dom', ivs: [P4, P5, m7], labels: ['4', '5', '♭7'], aliases: ['7sus', 'sus7'] },
  '9sus4': { fam: 'dom', ivs: [P4, P5, m7, M2], labels: ['4', '5', '♭7', '9'], aliases: ['9sus', '11'] },
  '7♭9': { fam: 'dom', ivs: [M3, P5, m7, m2] },
  '7♯9': { fam: 'dom', ivs: [M3, P5, m7, A2] },
  '7♯11': { fam: 'dom', ivs: [M3, P5, m7, A4] },
  '7♭13': { fam: 'dom', ivs: [M3, P5, m7, m6] },
  '13♯11': { fam: 'dom', ivs: [M3, m7, M2, A4, M6] },
  '13♭9': { fam: 'dom', ivs: [M3, m7, m2, M6] },
  '7♯9♭13': { fam: 'dom', ivs: [M3, m7, A2, m6] },
  '7♭9♯11': { fam: 'dom', ivs: [M3, m7, m2, A4] },
} satisfies Record<string, KindInfo>;
export type KindId = keyof typeof KINDS;
const kindInfo = (k: KindId): KindInfo => KINDS[k];

export interface PChord {
  root: Note;
  kind: KindId;
  /** root first, then the chord tones in order */
  tones: Note[];
  /** degree label per tone: "R", "3", "♭7", "♯11" … */
  labels: string[];
  /** bass note of a slash chord */
  bass?: Note;
  /** upper-structure triad sitting on top (already included in `tones`) */
  upper?: { root: Note; tones: Note[] };
  symbol: string;
}

const MAJ = FORMS.major;
const DEGREE: Record<number, string> = { 0: '1', 1: '9', 2: '3', 3: '11', 4: '5', 5: '13', 6: '7' };
/** Degree label of an interval: ♭3, 5, ♭7 (minor 7th), 7 (major 7th), 𝄫7, ♭9, ♯11, ♭13. */
export function degreeLabel(i: Interval): string {
  if (i.steps === 0 && i.semis === 0) return 'R';
  let a = i.semis - MAJ[i.steps];
  if (a > 6) a -= 12;
  if (a < -6) a += 12;
  return (a === -2 ? '𝄫' : a < 0 ? '♭'.repeat(-a) : '♯'.repeat(a)) + DEGREE[i.steps];
}

export const famOfKind = (c: Pick<PChord, 'kind'>): ChordFamily => kindInfo(c.kind).fam;

export function makeChord(root: Note, kind: KindId, bass?: Note): PChord {
  const k = kindInfo(kind);
  const tones = [root, ...k.ivs.map(i => transpose(root, i))];
  const labels = ['R', ...(k.labels ?? k.ivs.map(degreeLabel))];
  const slash = bass && pcOf(bass) !== pcOf(root) ? bass : undefined;
  return { root, kind, tones, labels, bass: slash, symbol: fmt(root) + kind + (slash ? '/' + fmt(slash) : '') };
}
/** A chart chord (Phase 0 type) as a general chord symbol. */
export const fromChart = (c: Pick<Chord, 'root' | 'quality'>): PChord => makeChord(c.root, c.quality);

/* ---- parsing typed chord symbols ---- */
const norm = (s: string): string => s.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/[()\s]/g, '').replace(/^maj(?=$)/, '');
const ALIAS: Record<string, KindId> = {};
(Object.keys(KINDS) as KindId[]).forEach(k => {
  ALIAS[norm(k)] = k;
  (kindInfo(k).aliases || []).forEach(a => { ALIAS[norm(a)] = k; });
});
/** Parse "Cmaj7", "Bbm7", "F#m7b5", "C/G", "Eb7#9b13". Returns null when it can't be read. */
export function parseChord(text: string): PChord | null {
  /* "6/9" is a chord kind, not a slash chord */
  const m = /^\s*([A-Ga-g])([#b♯♭]{0,2})([^/]*)(?:\/([A-Ga-g])([#b♯♭]{0,2}))?\s*$/.exec(text.replace(/6\/9/, '69'));
  if (!m) return null;
  const acc = (s: string) => s.replace(/♯/g, '#').replace(/♭/g, 'b');
  const suffix = norm(m[3]);
  /* "M7" (major) and "m7" (minor) differ only by case: try the text as typed first, then more loosely. */
  const tries = [suffix, suffix.slice(0, 1) + suffix.slice(1).toLowerCase(), /^(maj|min|dim|sus|aug|add)/i.test(suffix) ? suffix.toLowerCase() : suffix];
  const hit = tries.find(t => ALIAS[t] !== undefined);
  if (hit === undefined) return null;
  const root = note(m[1].toUpperCase() + acc(m[2]));
  const bass = m[4] ? note(m[4].toUpperCase() + acc(m[5])) : undefined;
  return makeChord(root, ALIAS[hit], bass);
}

/* ---- respelling roots of chords from far-away keys ---- */
const FLAT_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].map(note);
/** Replace awkward roots (double accidentals, C♭, F♭, E♯, B♯) with their plain enharmonic. Others are kept. */
export function simplifyRoot(n: Note): Note {
  const awkward = Math.abs(n.acc) > 1 || (n.acc === -1 && (n.letter === 'C' || n.letter === 'F')) || (n.acc === 1 && (n.letter === 'E' || n.letter === 'B'));
  return awkward ? FLAT_ROOTS[pcOf(n)] : n;
}
/** The practical major-key spelling of a tonic (at most 6 sharps or flats): D♯ → E♭, A♯ → B♭, G♯ → A♭. */
export function keyRoot(n: Note): Note {
  const pc = pcOf(n);
  if (pc === 6) return n.letter === 'F' && n.acc === 1 ? n : FLAT_ROOTS[6];
  return FLAT_ROOTS[pc];
}

/* ---- roman numerals ---- */
const NUM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
/** Chromatic scale-degree numeral of a note in a key, measured against the major scale: ♭III, ♯IV, ♭VII. */
export function degreeNumeral(n: Note, key: Key, lower: boolean): string {
  const i = intervalBetween(key.tonic, n);
  let a = i.semis - MAJ[i.steps];
  if (a > 6) a -= 12;
  if (a < -6) a += 12;
  const num = lower ? NUM[i.steps].toLowerCase() : NUM[i.steps];
  return (a < 0 ? '♭'.repeat(-a) : '♯'.repeat(a)) + num;
}
const lowerFam = (c: PChord): boolean => ['min', 'hdim', 'dim'].includes(famOfKind(c));
const RN_SUFFIX: Partial<Record<KindId, string>> = { 'm': '', 'm7': '7', 'm9': '9', 'm11': '11', 'm6': '6', 'm(maj7)': '(maj7)', 'm7♭5': 'ø7' };
/** Roman numeral of a chord in a key: "ii7", "V7", "♭VImaj7", "♯iv°7", "I/3". */
export function romanNumeral(c: PChord, key: Key): string {
  const suffix = RN_SUFFIX[c.kind] ?? c.kind;
  const slash = c.bass ? '/' + (intervalBetween(c.root, c.bass).steps + 1) : '';
  return degreeNumeral(c.root, key, lowerFam(c)) + suffix + slash;
}
/** Numeral of a chord's root only, cased by quality: "IV", "vi". */
export const rootNumeral = (c: PChord, key: Key): string => degreeNumeral(c.root, key, lowerFam(c));

/* ---- a simple keyboard voicing ---- */
/** Bass note in G2–F♯3, then the other tones stacked upward. */
export function passVoicing(c: PChord): VoicedNote[] {
  const bassNote = c.bass ?? c.root, bassPc = pcOf(bassNote);
  const bassMidi = 43 + mod(bassPc - 43, 12);
  const out: VoicedNote[] = [{ midi: bassMidi, note: bassNote, label: c.bass ? degreeLabel(intervalBetween(c.root, c.bass)) : 'R', role: c.bass ? 'color' : 'root' }];
  let prev = bassMidi;
  c.tones.forEach((n, i) => {
    if (pcOf(n) === bassPc && !(c.upper && i > 2)) return;
    let m = pcOf(n);
    while (m <= prev) m += 12;
    prev = m;
    const steps = mod(letterIndex(n) - letterIndex(c.root), 7);
    const role: VoiceRole = i === 0 ? 'root' : (steps === 2 || steps === 6) && !(c.upper && i > 2) ? 'guide' : 'color';
    out.push({ midi: m, note: n, label: c.labels[i], role });
  });
  return out;
}
