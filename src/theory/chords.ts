import { fmt, mod, pcOf } from './notes';
import { TYPES, formula, rot, scaleNotes } from './scales';
import type { Chord, Note, Quality, ScaleType } from './types';

/** Seventh-chord quality from the semitones of 3rd, 5th, 7th above the root. */
const QUAL: Record<string, Quality> = {
  '4,7,11': 'maj7', '3,7,10': 'm7', '4,7,10': '7', '3,6,10': 'm7♭5',
  '3,7,11': 'm(maj7)', '4,8,11': 'maj7♯5', '3,6,9': '°7',
};
export function qualityOf(tones: Note[]): Quality {
  const r = pcOf(tones[0]);
  const key = tones.slice(1).map(n => mod(pcOf(n) - r, 12)).join(',');
  const q = QUAL[key];
  if (!q) throw new Error('Unknown chord quality: ' + tones.map(fmt).join(' '));
  return q;
}

/** Build the seventh chord on one degree (0–6) of a scale by stacking thirds. */
export function chordInfo(scaleRoot: Note, type: ScaleType, deg: number): Chord {
  const sc = scaleNotes(scaleRoot, type);
  const tones = [0, 2, 4, 6].map(o => sc[(deg + o) % 7]);
  const quality = qualityOf(tones);
  const modeNotes = rot(sc, deg);
  return {
    root: tones[0], quality, tones, extensions: [], symbol: fmt(tones[0]) + quality,
    scaleRoot, scaleType: type, degree: deg, numeral: TYPES[type].nums[deg],
    mode: { name: TYPES[type].modes[deg], notes: modeNotes, formula: formula(modeNotes) },
  };
}
