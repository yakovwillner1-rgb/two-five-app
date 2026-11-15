import { chordInfo } from './chords';
import { fmt, note, pcOf } from './notes';
import { TYPES } from './scales';
import type { Approach, Chord, Flavor, HomeChord, HomeMode, Key, Note, PitchClass, ScaleType } from './types';

export interface HomeInfo {
  label: string;
  name: string;
  keys: string[];
  rn: string[];
  /** Which chart each degree of the home key comes from. */
  src: (deg: number) => ScaleType;
  presets: [string, number[]][];
}
export const HOME: Record<HomeMode, HomeInfo> = {
  major: {
    label: 'Major', name: 'major', keys: TYPES.major.keys, rn: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'], src: () => 'major',
    presets: [['I → IV', [0, 3]], ['I → vi → ii → V', [0, 5, 1, 4]], ['I → vi → IV → V', [0, 5, 3, 4]], ['I → iii → vi → ii → V → I', [0, 2, 5, 1, 4, 0]], ['I → IV → iii → vi', [0, 3, 2, 5]]],
  },
  /* Minor home key: natural minor, with the V taken from harmonic minor so it is a dominant 7. */
  minor: {
    label: 'Minor', name: 'minor', keys: TYPES.natural.keys, rn: ['i', 'ii', '♭III', 'iv', 'V', '♭VI', '♭VII'], src: d => (d === 4 ? 'harmonic' : 'natural'),
    presets: [['i → iv', [0, 3]], ['i → ♭VI → V', [0, 5, 4]], ['i → iv → ♭VII → ♭III', [0, 3, 6, 2]], ['i → ♭III → ♭VI → V', [0, 2, 5, 4]], ['i → ♭VII → ♭VI → V', [0, 6, 5, 4]]],
  },
};

/** The spelling used for a pitch class in a list of key names. */
export function keyName(pc: PitchClass, list: string[]): Note {
  const k = list.find(x => pcOf(note(x)) === pc);
  if (!k) throw new Error('No key for pitch class ' + pc);
  return note(k);
}
export const homeKey = (pc: PitchClass, mode: HomeMode): Key => ({ tonic: keyName(pc, HOME[mode].keys), mode });
export const homeTitle = (key: Key): string => fmt(key.tonic) + ' ' + HOME[key.mode].name;

/** Half-diminished and diminished chords are not used as landing spots. */
export const landable = (c: Chord): boolean => !/m7♭5|°7/.test(c.quality);

/** The seven chords of the home key. */
export function homeChords(key: Key): HomeChord[] {
  const H = HOME[key.mode];
  return [0, 1, 2, 3, 4, 5, 6].map(d => {
    const c = chordInfo(key.tonic, H.src(d), d);
    return { ...c, rn: H.rn[d], landable: landable(c) };
  });
}
export function homePcs(key: Key): Set<PitchClass> {
  const s = new Set<PitchClass>();
  homeChords(key).forEach(c => c.tones.forEach(n => s.add(pcOf(n))));
  return s;
}

/**
 * The secondary ii–V into a target chord: chords 2 and 5 of the chart built on the target's root.
 * Bright = m7 → 7 (Major chart, or Melodic Minor for a minor target).
 * Dark = m7♭5 → 7 (Harmonic Minor chart). Auto = dark into minor targets, bright otherwise.
 */
export function approach(target: Pick<HomeChord, 'tones' | 'quality' | 'landable'>, fl: Flavor): Approach | null {
  if (!target.landable) return null;
  const minor = /^m(?!aj)/.test(target.quality);
  const flavor = fl === 'auto' ? (minor ? 'dark' : 'bright') : fl;
  const source: ScaleType = flavor === 'dark' ? 'harmonic' : minor ? 'melodic' : 'major';
  const r = target.tones[0];
  return { source, flavor, ii: chordInfo(r, source, 1), V: chordInfo(r, source, 4), chart: fmt(r) + ' ' + TYPES[source].label };
}
