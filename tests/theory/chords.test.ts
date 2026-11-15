import { describe, expect, it } from 'vitest';
import { chordInfo } from '../../src/theory/chords';
import { fmt, mod, note, notes, pcOf } from '../../src/theory/notes';
import { SCALE_TYPES, TYPES } from '../../src/theory/scales';
import { QUALITIES, QUALITY_SEMIS, REF, names } from './helpers';

describe('chords: every chord of the 4 scale types in 12 keys (336 chords)', () => {
  for (const type of SCALE_TYPES) {
    for (const key of TYPES[type].keys) {
      it(`${key} ${type}: 7 chords, spelling + quality`, () => {
        const ref = REF[type][key].split(' ');
        for (let d = 0; d < 7; d++) {
          const c = chordInfo(note(key), type, d);
          // stacked thirds out of the hand-typed scale
          const want = [0, 2, 4, 6].map(o => ref[(d + o) % 7]).join(' ');
          expect(names(c.tones), `${key} ${type} degree ${d + 1}`).toBe(want);
          expect(c.quality).toBe(QUALITIES[type][d]);
          // the tones really are that quality
          const r = pcOf(c.tones[0]);
          expect(c.tones.slice(1).map(n => mod(pcOf(n) - r, 12))).toEqual(QUALITY_SEMIS[c.quality]);
          // root, 3rd, 5th, 7th sit on every other letter
          expect(c.tones.map(n => mod('CDEFGAB'.indexOf(n.letter) - 'CDEFGAB'.indexOf(c.root.letter), 7))).toEqual([0, 2, 4, 6]);
          expect(c.symbol).toBe(fmt(note(ref[d])) + QUALITIES[type][d]);
          expect(c.numeral).toBe(TYPES[type].nums[d]);
          expect(c.mode.name).toBe(TYPES[type].modes[d]);
          expect(names(c.mode.notes)).toBe([...ref.slice(d), ...ref.slice(0, d)].join(' '));
          expect(c.degree).toBe(d);
        }
      });
    }
  }
});

describe('chords: hand-checked examples', () => {
  const t = (key: string, type: Parameters<typeof chordInfo>[1], deg: number) => {
    const c = chordInfo(note(key), type, deg - 1);
    return `${c.symbol}: ${names(c.tones)}`;
  };
  it('C major', () => {
    expect(t('C', 'major', 1)).toBe('Cmaj7: C E G B');
    expect(t('C', 'major', 2)).toBe('Dm7: D F A C');
    expect(t('C', 'major', 5)).toBe('G7: G B D F');
    expect(t('C', 'major', 7)).toBe('Bm7♭5: B D F A');
  });
  it('flat keys keep flats', () => {
    expect(t('Gb', 'major', 2)).toBe('A♭m7: Ab Cb Eb Gb');
    expect(t('Gb', 'major', 4)).toBe('C♭maj7: Cb Eb Gb Bb');
    expect(t('Ab', 'major', 4)).toBe('D♭maj7: Db F Ab C');
  });
  it('minor charts', () => {
    expect(t('A', 'natural', 5)).toBe('Em7: E G B D');
    expect(t('A', 'harmonic', 5)).toBe('E7: E G# B D');
    expect(t('A', 'harmonic', 7)).toBe('G♯°7: G# B D F');
    expect(t('C', 'harmonic', 7)).toBe('B°7: B D F Ab');
    expect(t('C', 'harmonic', 3)).toBe('E♭maj7♯5: Eb G B D');
    expect(t('C', 'melodic', 1)).toBe('Cm(maj7): C Eb G B');
    expect(t('C', 'melodic', 4)).toBe('F7: F A C Eb');
    expect(t('C', 'melodic', 7)).toBe('Bm7♭5: B D F A');
    expect(t('C#', 'harmonic', 7)).toBe('B♯°7: B# D# F# A');
    expect(t('Ab', 'natural', 6)).toBe('F♭maj7: Fb Ab Cb Eb');
  });
  it('mode + formula travel with the chord', () => {
    const c = chordInfo(note('C'), 'major', 1);
    expect(c.mode.name).toBe('Dorian');
    expect(c.mode.notes).toEqual(notes('D E F G A B C'));
    expect(c.mode.formula).toEqual(['1', '2', '♭3', '4', '5', '6', '♭7']);
    const v = chordInfo(note('A'), 'harmonic', 4);
    expect(v.mode.name).toBe('Phrygian Dominant');
    expect(v.mode.formula).toEqual(['1', '♭2', '3', '4', '5', '♭6', '♭7']);
    const alt = chordInfo(note('C'), 'melodic', 6);
    expect(alt.mode.name).toBe('Super Locrian');
    expect(alt.mode.formula).toEqual(['1', '♭2', '♭3', '♭4', '♭5', '♭6', '♭7']);
    expect(chordInfo(note('C'), 'harmonic', 6).mode.formula).toEqual(['1', '♭2', '♭3', '♭4', '♭5', '♭6', '♭♭7']);
  });
});
