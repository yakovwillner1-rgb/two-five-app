import { noteName } from '../../src/theory/notes';
import type { Note } from '../../src/theory/types';

/** Notes as an ASCII string: "C Eb G Bb". */
export const names = (ns: Note[]): string => ns.map(noteName).join(' ');

/* Hand-typed reference scales (not computed). */
export const MAJOR: Record<string, string> = {
  C: 'C D E F G A B', Db: 'Db Eb F Gb Ab Bb C', D: 'D E F# G A B C#', Eb: 'Eb F G Ab Bb C D',
  E: 'E F# G# A B C# D#', F: 'F G A Bb C D E', Gb: 'Gb Ab Bb Cb Db Eb F', G: 'G A B C D E F#',
  Ab: 'Ab Bb C Db Eb F G', A: 'A B C# D E F# G#', Bb: 'Bb C D Eb F G A', B: 'B C# D# E F# G# A#',
};
export const NATURAL: Record<string, string> = {
  C: 'C D Eb F G Ab Bb', 'C#': 'C# D# E F# G# A B', D: 'D E F G A Bb C', Eb: 'Eb F Gb Ab Bb Cb Db',
  E: 'E F# G A B C D', F: 'F G Ab Bb C Db Eb', 'F#': 'F# G# A B C# D E', G: 'G A Bb C D Eb F',
  Ab: 'Ab Bb Cb Db Eb Fb Gb', A: 'A B C D E F G', Bb: 'Bb C Db Eb F Gb Ab', B: 'B C# D E F# G A',
};
export const HARMONIC: Record<string, string> = {
  C: 'C D Eb F G Ab B', 'C#': 'C# D# E F# G# A B#', D: 'D E F G A Bb C#', Eb: 'Eb F Gb Ab Bb Cb D',
  E: 'E F# G A B C D#', F: 'F G Ab Bb C Db E', 'F#': 'F# G# A B C# D E#', G: 'G A Bb C D Eb F#',
  Ab: 'Ab Bb Cb Db Eb Fb G', A: 'A B C D E F G#', Bb: 'Bb C Db Eb F Gb A', B: 'B C# D E F# G A#',
};
export const MELODIC: Record<string, string> = {
  C: 'C D Eb F G A B', 'C#': 'C# D# E F# G# A# B#', D: 'D E F G A B C#', Eb: 'Eb F Gb Ab Bb C D',
  E: 'E F# G A B C# D#', F: 'F G Ab Bb C D E', 'F#': 'F# G# A B C# D# E#', G: 'G A Bb C D E F#',
  Ab: 'Ab Bb Cb Db Eb F G', A: 'A B C D E F# G#', Bb: 'Bb C Db Eb F G A', B: 'B C# D E F# G# A#',
};
export const REF = { major: MAJOR, natural: NATURAL, melodic: MELODIC, harmonic: HARMONIC } as const;

/* Chord quality on each degree of each chart (textbook). */
export const QUALITIES = {
  major: ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7♭5'],
  natural: ['m7', 'm7♭5', 'maj7', 'm7', 'm7', 'maj7', '7'],
  melodic: ['m(maj7)', 'm7', 'maj7♯5', '7', '7', 'm7♭5', 'm7♭5'],
  harmonic: ['m(maj7)', 'm7♭5', 'maj7♯5', 'm7', '7', 'maj7', '°7'],
} as const;
/* Semitones of 3rd, 5th, 7th above the root for each quality (textbook). */
export const QUALITY_SEMIS: Record<string, number[]> = {
  maj7: [4, 7, 11], m7: [3, 7, 10], '7': [4, 7, 10], 'm7♭5': [3, 6, 10], 'm(maj7)': [3, 7, 11], 'maj7♯5': [4, 8, 11], '°7': [3, 6, 9],
};
