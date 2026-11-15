import { describe, expect, it } from 'vitest';
import { fmt, intervalBetween, note, noteName, pcOf, spell, transpose } from '../../src/theory/notes';

describe('notes', () => {
  it('parses letter + accidentals', () => {
    expect(note('C')).toEqual({ letter: 'C', acc: 0 });
    expect(note('Bb')).toEqual({ letter: 'B', acc: -1 });
    expect(note('F##')).toEqual({ letter: 'F', acc: 2 });
    expect(note('Bbb')).toEqual({ letter: 'B', acc: -2 });
    expect(() => note('H')).toThrow();
  });
  it('gives pitch classes, including wrap-around spellings', () => {
    const pcs: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11, Cb: 11, 'B#': 0, Bbb: 9, 'F##': 7 };
    for (const [n, pc] of Object.entries(pcs)) expect(pcOf(note(n)), n).toBe(pc);
  });
  it('spells a pitch class on a given letter', () => {
    expect(noteName(spell(2, 3))).toBe('Eb'); // E♭, not D♯
    expect(noteName(spell(1, 3))).toBe('D#');
    expect(noteName(spell(6, 0))).toBe('B#');
    expect(noteName(spell(0, 11))).toBe('Cb');
    expect(noteName(spell(6, 9))).toBe('Bbb');
    expect(noteName(spell(3, 7))).toBe('F##');
  });
  it('displays ♯ ♭ 𝄪 𝄫', () => {
    expect(fmt(note('C'))).toBe('C');
    expect(fmt(note('F#'))).toBe('F♯');
    expect(fmt(note('Bb'))).toBe('B♭');
    expect(fmt(note('F##'))).toBe('F𝄪');
    expect(fmt(note('Bbb'))).toBe('B𝄫');
  });
  it('round-trips ASCII names', () => {
    for (const n of ['C', 'Db', 'F##', 'Bbb', 'E#', 'Cb']) expect(noteName(note(n))).toBe(n);
  });
  it('measures and applies intervals by letter steps', () => {
    expect(intervalBetween(note('C'), note('Eb'))).toEqual({ steps: 2, semis: 3 });
    expect(intervalBetween(note('A'), note('G#'))).toEqual({ steps: 6, semis: 11 });
    expect(noteName(transpose(note('C'), { steps: 2, semis: 3 }))).toBe('Eb');
    expect(noteName(transpose(note('C'), { steps: 1, semis: 3 }))).toBe('D#');
    expect(noteName(transpose(note('F#'), { steps: 4, semis: 7 }))).toBe('C#');
    expect(noteName(transpose(note('Gb'), { steps: 3, semis: 5 }))).toBe('Cb');
  });
});
