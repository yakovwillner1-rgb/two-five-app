import { MODE_TEXT } from '../data/modeText';
import { qualityOf } from './chords';
import { fmt, letterIndex, mod, note, pcOf, spell } from './notes';
import { FORMS, TYPES, formula, rot, scaleNotes } from './scales';
import type { Chord, Family, ModeDetail, Note, PitchClass } from './types';

/** Root spellings tried when looking for the simplest spelling of a pitch class. */
const SPELLS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'].map(note);
/** Spelling cost: one per single accidental, four per double accidental. */
const accCount = (ns: Note[]): number => ns.reduce((s, n) => { const a = Math.abs(n.acc); return s + a * (a >= 2 ? 2 : 1); }, 0);

/** Mode `deg` of a family, built on `root` (same-root / parallel view). */
export function modeFrom(root: Note, fam: Family, deg: number): Note[] {
  const f = FORMS[fam], iv = rot(f, deg).map(x => mod(x - f[deg], 12)), li = letterIndex(root), pc = pcOf(root);
  return iv.map((x, j) => spell((li + j) % 7, (pc + x) % 12));
}
/** The mode on a pitch class, with the root spelling that needs the fewest accidentals. */
export function bestMode(pc: PitchClass, fam: Family, deg: number): Note[] {
  let best: Note[] | null = null, bs = 1e9;
  SPELLS.filter(n => pcOf(n) === pc).forEach(n => { const ns = modeFrom(n, fam, deg), sc = accCount(ns); if (sc < bs) { bs = sc; best = ns; } });
  return best!;
}
/** The simplest-spelled parent scale root on a pitch class. */
export function bestParent(pc: PitchClass, fam: Family): Note {
  let best: Note | null = null, bs = 1e9;
  SPELLS.filter(n => pcOf(n) === pc).forEach(n => { const sc = accCount(scaleNotes(n, fam)); if (sc < bs) { bs = sc; best = n; } });
  return best!;
}

export interface FamilyInfo { label: string; /** display order (brightest first for Major) */ order: number[]; /** character-note index per mode */ char: number[] }
export const FAM: Record<Family, FamilyInfo> = {
  major: { label: 'Major', order: [3, 0, 4, 1, 5, 2, 6], char: [3, 5, 1, 3, 6, 5, 4] },
  melodic: { label: 'Melodic Minor', order: [0, 1, 2, 3, 4, 5, 6], char: [6, 1, 4, 3, 5, 1, 3] },
  harmonic: { label: 'Harmonic Minor', order: [0, 1, 2, 3, 4, 5, 6], char: [6, 5, 4, 3, 2, 1, 6] },
};
export const FAMILIES = Object.keys(FAM) as Family[];

/** Which family + degree a chart chord's mode belongs to (natural minor = major from its 6th degree). */
export const famOf = (c: Pick<Chord, 'scaleType' | 'degree'>): [Family, number] =>
  c.scaleType === 'natural' ? ['major', (c.degree + 5) % 7] : [c.scaleType, c.degree];

export type ModeView = 'parallel' | 'parent';
/**
 * Everything about one mode. `parallel`: the mode built on pitch class `pc`.
 * `parent`: mode `deg` of the parent scale whose root is `pc`.
 */
export function modeInfo(pc: PitchClass, fam: Family, deg: number, view: ModeView): ModeDetail {
  const ns = view === 'parent' ? rot(scaleNotes(bestParent(pc, fam), fam), deg) : bestMode(pc, fam, deg);
  const tones = [0, 2, 4, 6].map(i => ns[i]), quality = qualityOf(tones), name = TYPES[fam].modes[deg], f = formula(ns);
  const scaleRoot = ns[(7 - deg) % 7];
  const chord: Chord = {
    root: tones[0], quality, tones, extensions: [], symbol: fmt(tones[0]) + quality,
    scaleRoot, scaleType: fam, degree: deg, numeral: TYPES[fam].nums[deg], mode: { name, notes: ns, formula: f },
  };
  return {
    fam, deg, notes: ns, name, formula: f, chord,
    parent: fmt(scaleRoot) + ' ' + TYPES[fam].label.toLowerCase(),
    char: FAM[fam].char[deg], sound: MODE_TEXT[fam][deg][0], use: MODE_TEXT[fam][deg][1],
  };
}
