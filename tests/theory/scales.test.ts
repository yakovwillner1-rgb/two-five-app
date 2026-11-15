import { describe, expect, it } from 'vitest';
import { note } from '../../src/theory/notes';
import { SCALE_TYPES, TYPES, formula, scaleNotes } from '../../src/theory/scales';
import { REF, names } from './helpers';

describe('scales: 4 types × 12 keys against hand-typed spellings', () => {
  for (const type of SCALE_TYPES) {
    it(`${type}: has 12 keys`, () => {
      expect(TYPES[type].keys).toHaveLength(12);
      expect(Object.keys(REF[type]).sort()).toEqual([...TYPES[type].keys].sort());
    });
    for (const key of TYPES[type].keys) {
      it(`${key} ${type}`, () => {
        const sc = scaleNotes(note(key), type);
        expect(names(sc)).toBe(REF[type][key]);
        // one of each letter
        expect(new Set(sc.map(n => n.letter)).size).toBe(7);
      });
    }
  }
  it('spelling rules from CLAUDE.md', () => {
    expect(names(scaleNotes(note('Ab'), 'major'))).toContain('Db'); // A♭ major has D♭
    expect(names(scaleNotes(note('C#'), 'harmonic'))).toContain('B#');
    expect(names(scaleNotes(note('G#'), 'harmonic'))).toBe('G# A# B C# D# E F##'); // double sharp when theory demands
  });
  it('formulas against major', () => {
    expect(formula(scaleNotes(note('C'), 'major'))).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(formula(scaleNotes(note('C'), 'natural'))).toEqual(['1', '2', '♭3', '4', '5', '♭6', '♭7']);
    expect(formula(scaleNotes(note('F#'), 'melodic'))).toEqual(['1', '2', '♭3', '4', '5', '6', '7']);
    expect(formula(scaleNotes(note('Eb'), 'harmonic'))).toEqual(['1', '2', '♭3', '4', '5', '♭6', '7']);
  });
});
