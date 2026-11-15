import { letterIndex, mod, pcOf, spell } from './notes';
import type { Note, Scale, ScaleType } from './types';

/** Semitones above the root for each scale degree. */
export const FORMS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural: [0, 2, 3, 5, 7, 8, 10],
  melodic: [0, 2, 3, 5, 7, 9, 11],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};
const MAJ = FORMS.major;

export interface ScaleTypeInfo { label: string; keys: string[]; modes: string[]; nums: string[] }
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
/** The four chord/scale charts: 12 keys each, mode names and chart numerals per degree. */
export const TYPES: Record<ScaleType, ScaleTypeInfo> = {
  major: {
    label: 'Major', keys: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    modes: ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'],
    nums: ['Imaj7', 'iim7', 'iiim7', 'IVmaj7', 'V7', 'vim7', 'viiø7'],
  },
  natural: {
    label: 'Natural Minor', keys: MINOR_KEYS,
    modes: ['Aeolian', 'Locrian', 'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian'],
    nums: ['im7', 'iiø7', '♭IIImaj7', 'ivm7', 'vm7', '♭VImaj7', '♭VII7'],
  },
  melodic: {
    label: 'Melodic Minor', keys: MINOR_KEYS,
    modes: ['Melodic Minor', 'Dorian ♭2', 'Lydian Augmented', 'Lydian Dominant', 'Mixolydian ♭6', 'Locrian ♮2', 'Super Locrian'],
    nums: ['im(maj7)', 'iim7', '♭IIImaj7♯5', 'IV7', 'V7', 'viø7', 'viiø7'],
  },
  harmonic: {
    label: 'Harmonic Minor', keys: MINOR_KEYS,
    modes: ['Harmonic Minor', 'Locrian ♮6', 'Ionian ♯5', 'Dorian ♯4', 'Phrygian Dominant', 'Lydian ♯2', 'Altered ♭♭7'],
    nums: ['im(maj7)', 'iiø7', '♭IIImaj7♯5', 'ivm7', 'V7', '♭VImaj7', 'vii°7'],
  },
};
export const SCALE_TYPES = Object.keys(TYPES) as ScaleType[];

/** Rotate an array left by k. */
export function rot<T>(a: T[], k: number): T[] { return a.slice(k).concat(a.slice(0, k)); }

/** The seven notes of a scale, one per letter (correct enharmonic spelling). */
export function scaleNotes(root: Note, type: ScaleType): Note[] {
  const li = letterIndex(root), rp = pcOf(root);
  return FORMS[type].map((s, i) => spell((li + i) % 7, (rp + s) % 12));
}
export const scale = (root: Note, type: ScaleType): Scale => ({ root, type, notes: scaleNotes(root, type) });

/** Formula of a seven-note mode compared with major: ["1","2","♭3",…]. */
export function formula(m: Note[]): string[] {
  const r = pcOf(m[0]);
  return m.map((n, j) => {
    const a = mod(pcOf(n) - r, 12) - MAJ[j];
    return (a < 0 ? '♭'.repeat(-a) : '♯'.repeat(a)) + (j + 1);
  });
}
