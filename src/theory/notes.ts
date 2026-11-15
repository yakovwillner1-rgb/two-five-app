import type { Interval, Letter, Note, PitchClass } from './types';

export const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Pitch class of each natural letter. */
export const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

export const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Parse an ASCII note name: "C", "Bb", "F#", "Bbb", "F##". */
export function note(name: string): Note {
  const letter = name[0] as Letter;
  if (!LETTERS.includes(letter)) throw new Error('Bad note name: ' + name);
  let acc = 0;
  for (const c of name.slice(1)) {
    if (c === '#') acc += 1;
    else if (c === 'b') acc -= 1;
    else throw new Error('Bad note name: ' + name);
  }
  return { letter, acc };
}
export const notes = (names: string): Note[] => names.trim().split(/\s+/).map(note);

export const letterIndex = (n: Note): number => LETTERS.indexOf(n.letter);
export const pcOf = (n: Note): PitchClass => mod(LETTER_PC[letterIndex(n)] + n.acc, 12);

/** Spell a pitch class on a given letter (index 0–6). Picks the accidental within −5…+6. */
export function spell(li: number, pc: PitchClass): Note {
  let d = mod(pc - LETTER_PC[li], 12);
  if (d > 6) d -= 12;
  return { letter: LETTERS[li], acc: d };
}

/** ASCII name, the inverse of `note()`: "Bb", "F##". */
export const noteName = (n: Note): string => n.letter + (n.acc > 0 ? '#'.repeat(n.acc) : 'b'.repeat(-n.acc));

/** Display name with ♯ ♭ 𝄪 𝄫. */
export function fmt(n: Note): string {
  const a = Math.abs(n.acc), dbl = Math.floor(a / 2), single = a % 2;
  return n.letter + (n.acc > 0 ? '𝄪'.repeat(dbl) + '♯'.repeat(single) : '𝄫'.repeat(dbl) + '♭'.repeat(single));
}

export const sameNote = (a: Note, b: Note): boolean => a.letter === b.letter && a.acc === b.acc;

/** Interval from a up to b (within one octave). */
export function intervalBetween(a: Note, b: Note): Interval {
  return { steps: mod(letterIndex(b) - letterIndex(a), 7), semis: mod(pcOf(b) - pcOf(a), 12) };
}
/** The note an interval above `n`, spelled by letter steps. */
export function transpose(n: Note, iv: Interval): Note {
  return spell(mod(letterIndex(n) + iv.steps, 7), mod(pcOf(n) + iv.semis, 12));
}
