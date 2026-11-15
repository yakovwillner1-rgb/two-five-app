import { describe, expect, it } from 'vitest';
import { chordInfo } from '../../src/theory/chords';
import { FAM, bestMode, bestParent, famOf, modeFrom, modeInfo } from '../../src/theory/modes';
import { note, noteName } from '../../src/theory/notes';
import { TYPES, formula } from '../../src/theory/scales';
import { names } from './helpers';

describe('modes', () => {
  it('the seven modes of major on C (same root)', () => {
    const want = ['C D E F G A B', 'C D Eb F G A Bb', 'C Db Eb F G Ab Bb', 'C D E F# G A B', 'C D E F G A Bb', 'C D Eb F G Ab Bb', 'C Db Eb F Gb Ab Bb'];
    want.forEach((w, d) => expect(names(modeFrom(note('C'), 'major', d)), TYPES.major.modes[d]).toBe(w));
  });
  it('formulas of the major modes', () => {
    const want = ['1 2 3 4 5 6 7', '1 2 ♭3 4 5 6 ♭7', '1 ♭2 ♭3 4 5 ♭6 ♭7', '1 2 3 ♯4 5 6 7', '1 2 3 4 5 6 ♭7', '1 2 ♭3 4 5 ♭6 ♭7', '1 ♭2 ♭3 4 ♭5 ♭6 ♭7'];
    want.forEach((w, d) => expect(formula(modeFrom(note('C'), 'major', d)).join(' ')).toBe(w));
  });
  it('melodic and harmonic minor modes on C', () => {
    expect(names(modeFrom(note('C'), 'melodic', 3))).toBe('C D E F# G A Bb'); // Lydian Dominant
    expect(names(modeFrom(note('C'), 'melodic', 6))).toBe('C Db Eb Fb Gb Ab Bb'); // Super Locrian
    expect(names(modeFrom(note('C'), 'melodic', 4))).toBe('C D E F G Ab Bb'); // Mixolydian ♭6
    expect(names(modeFrom(note('C'), 'harmonic', 4))).toBe('C Db E F G Ab Bb'); // Phrygian Dominant
    expect(names(modeFrom(note('C'), 'harmonic', 6))).toBe('C Db Eb Fb Gb Ab Bbb'); // Altered ♭♭7
  });
  it('picks the simpler root spelling', () => {
    expect(names(bestMode(3, 'major', 1))).toBe('Eb F Gb Ab Bb C Db'); // E♭ Dorian, not D♯
    expect(names(bestMode(10, 'major', 4))).toBe('Bb C D Eb F G Ab'); // B♭ Mixolydian
    expect(names(bestMode(6, 'major', 3))).toBe('Gb Ab Bb C Db Eb F'); // G♭ Lydian (5 flats) beats F♯ Lydian (7 sharps)
    expect(noteName(bestParent(1, 'major'))).toBe('Db');
    expect(noteName(bestParent(1, 'harmonic'))).toBe('C#');
  });
  it('same-root view', () => {
    const m = modeInfo(0, 'major', 1, 'parallel');
    expect(names(m.notes)).toBe('C D Eb F G A Bb');
    expect([m.name, m.parent, m.chord.symbol, m.char]).toEqual(['Dorian', 'B♭ major', 'Cm7', 5]);
    expect(m.formula[m.char]).toBe('6');
  });
  it('from-one-scale view', () => {
    const m = modeInfo(0, 'major', 1, 'parent');
    expect(names(m.notes)).toBe('D E F G A B C');
    expect([m.name, m.parent, m.chord.symbol]).toEqual(['Dorian', 'C major', 'Dm7']);
    const alt = modeInfo(0, 'melodic', 6, 'parent');
    expect(names(alt.notes)).toBe('B C D Eb F G A');
    expect([alt.name, alt.parent, alt.chord.symbol]).toEqual(['Super Locrian', 'C melodic minor', 'Bm7♭5']);
  });
  it('character notes', () => {
    const ch = (fam: 'major' | 'melodic' | 'harmonic', d: number) => { const m = modeInfo(0, fam, d, 'parallel'); return m.formula[m.char]; };
    expect([0, 1, 2, 3, 4, 5, 6].map(d => ch('major', d))).toEqual(['4', '6', '♭2', '♯4', '♭7', '♭6', '♭5']);
    expect([0, 1, 2, 3, 4, 5, 6].map(d => ch('melodic', d))).toEqual(['7', '♭2', '♯5', '♯4', '♭6', '2', '♭4']);
    expect([0, 1, 2, 3, 4, 5, 6].map(d => ch('harmonic', d))).toEqual(['7', '6', '♯5', '♯4', '3', '♯2', '♭♭7']);
  });
  it('brightness order of the major modes: Lydian … Locrian', () => {
    expect(FAM.major.order.map(d => TYPES.major.modes[d])).toEqual(['Lydian', 'Ionian', 'Mixolydian', 'Dorian', 'Aeolian', 'Phrygian', 'Locrian']);
  });
  it('chart chords link to the right mode family', () => {
    expect(famOf(chordInfo(note('A'), 'natural', 0))).toEqual(['major', 5]); // Aeolian
    expect(famOf(chordInfo(note('A'), 'natural', 2))).toEqual(['major', 0]); // Ionian
    expect(famOf(chordInfo(note('A'), 'harmonic', 4))).toEqual(['harmonic', 4]);
    for (let d = 0; d < 7; d++) { const [f, dd] = famOf(chordInfo(note('A'), 'natural', d)); expect(TYPES[f].modes[dd]).toBe(TYPES.natural.modes[d]); }
  });
});
