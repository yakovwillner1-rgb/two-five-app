import { describe, expect, it } from 'vitest';
import { homeKey } from '../../src/theory/home';
import { note, noteName } from '../../src/theory/notes';
import { KINDS, keyRoot, makeChord, parseChord, passVoicing, romanNumeral, simplifyRoot, type KindId } from '../../src/theory/symbols';
import { names } from '../theory/helpers';

const tones = (s: string) => names(parseChord(s)!.tones);
const C = homeKey(0, 'major');

describe('chord symbols', () => {
  it('spells the tones of each kind on C', () => {
    const want: Record<string, string> = {
      'C': 'C E G', 'Cm': 'C Eb G', 'C°': 'C Eb Gb', 'C+': 'C E G#', 'Csus4': 'C F G', 'C6': 'C E G A', 'Cm6': 'C Eb G A', 'C6/9': 'C E G A D', 'Cadd9': 'C E G D',
      'Cmaj7': 'C E G B', 'Cmaj9': 'C E G B D', 'Cmaj7#11': 'C E G B F#', 'Cmaj7#5': 'C E G# B', 'Cm7': 'C Eb G Bb', 'Cm9': 'C Eb G Bb D', 'Cm11': 'C Eb G Bb D F',
      'Cm(maj7)': 'C Eb G B', 'Cm7b5': 'C Eb Gb Bb', 'C°7': 'C Eb Gb Bbb', 'C7': 'C E G Bb', 'C9': 'C E G Bb D', 'C13': 'C E G Bb D A', 'C7sus4': 'C F G Bb',
      'C7b9': 'C E G Bb Db', 'C7#9': 'C E G Bb D#', 'C7#11': 'C E G Bb F#', 'C7b13': 'C E G Bb Ab', 'C13#11': 'C E Bb D F# A',
    };
    for (const [s, w] of Object.entries(want)) expect(tones(s), s).toBe(w);
    expect(Object.keys(KINDS).length).toBeGreaterThanOrEqual(30);
  });
  it('spells by letter in other keys', () => {
    expect(tones('Gb7')).toBe('Gb Bb Db Fb');
    expect(tones('C#°7')).toBe('C# E G Bb');
    expect(tones('F#°7')).toBe('F# A C Eb');
    expect(tones('Ebm7')).toBe('Eb Gb Bb Db');
    expect(tones('A7')).toBe('A C# E G');
    expect(tones('F#m7b5')).toBe('F# A C E');
  });
  it('reads common ways of typing a chord', () => {
    const same: [string, string][] = [['CM7', 'Cmaj7'], ['CΔ', 'Cmaj7'], ['C-7', 'Cm7'], ['Cmin7', 'Cm7'], ['Cø', 'Cm7♭5'], ['Cø7', 'Cm7♭5'], ['Cdim7', 'C°7'], ['Co7', 'C°7'], ['Cdim', 'C°'],
      ['Caug', 'C+'], ['Csus', 'Csus4'], ['C7sus', 'C7sus4'], ['CmMaj7', 'Cm(maj7)'], ['C69', 'C6/9'], ['Cmaj', 'C'], ['c', 'C'], ['B♭m7', 'B♭m7'], ['bb7', 'B♭7'], ['f#m7', 'F♯m7'], [' Eb7#9b13 ', 'E♭7♯9♭13']];
    for (const [typed, sym] of same) expect(parseChord(typed)?.symbol, typed).toBe(sym);
  });
  it('reads slash chords', () => {
    const c = parseChord('C/G')!;
    expect([c.symbol, noteName(c.bass!), names(c.tones)]).toEqual(['C/G', 'G', 'C E G']);
    expect(parseChord('Fmaj7/A')!.symbol).toBe('Fmaj7/A');
    expect(parseChord('C/C')!.bass).toBeUndefined();
  });
  it('rejects what it cannot read', () => {
    for (const s of ['', 'H7', 'Cfoo', 'C7/', '7', 'C//G']) expect(parseChord(s), s).toBeNull();
  });
  it('labels chord degrees', () => {
    const l = (k: KindId) => makeChord(note('C'), k).labels.join(' ');
    expect(l('maj7')).toBe('R 3 5 7');
    expect(l('m7♭5')).toBe('R ♭3 ♭5 ♭7');
    expect(l('°7')).toBe('R ♭3 ♭5 𝄫7');
    expect(l('13♯11')).toBe('R 3 ♭7 9 ♯11 13');
    expect(l('7♯9♭13')).toBe('R 3 ♭7 ♯9 ♭13');
    expect(l('7sus4')).toBe('R 4 5 ♭7');
    expect(l('m6')).toBe('R ♭3 5 6');
  });
  it('roman numerals in a key', () => {
    const rn = (s: string, key = C) => romanNumeral(parseChord(s)!, key);
    expect(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5'].map(s => rn(s))).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
    expect(['Dbmaj7', 'Ebmaj7', 'F#°7', 'Abmaj7', 'Bb7', 'Fm6', 'C#°7', 'C/E', 'C/G', 'Gb7'].map(s => rn(s))).toEqual(['♭IImaj7', '♭IIImaj7', '♯iv°7', '♭VImaj7', '♭VII7', 'iv6', '♯i°7', 'I/3', 'I/5', '♭V7']);
    const Am = homeKey(9, 'minor');
    expect(['Am7', 'Cmaj7', 'E7', 'Fmaj7', 'G7'].map(s => rn(s, Am))).toEqual(['i7', '♭IIImaj7', 'V7', '♭VImaj7', '♭VII7']);
  });
  it('respells awkward roots', () => {
    expect(['Fb', 'Cb', 'E#', 'B#', 'Bbb', 'F##', 'Gb', 'A#', 'Db'].map(n => noteName(simplifyRoot(note(n))))).toEqual(['E', 'B', 'F', 'C', 'A', 'G', 'Gb', 'A#', 'Db']);
    expect(['D#', 'A#', 'G#', 'F#', 'Gb', 'Fb', 'Bbb', 'C#'].map(n => noteName(keyRoot(note(n))))).toEqual(['Eb', 'Bb', 'Ab', 'F#', 'Gb', 'E', 'A', 'Db']);
  });
  it('keyboard voicing: bass in G2–F♯3, tones stacked upward', () => {
    const v = (s: string) => passVoicing(parseChord(s)!).map(n => noteName(n.note) + n.midi).join(' ');
    expect(v('Cmaj7')).toBe('C48 E52 G55 B59');
    expect(v('G7')).toBe('G43 B47 D50 F53');
    expect(v('C/G')).toBe('G43 C48 E52');
    expect(v('F#°7')).toBe('F#54 A57 C60 Eb63');
  });
});
