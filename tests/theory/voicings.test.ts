import { describe, expect, it } from 'vitest';
import { chordInfo } from '../../src/theory/chords';
import { note, noteName, pcOf } from '../../src/theory/notes';
import { SCALE_TYPES, TYPES } from '../../src/theory/scales';
import { VDEF, allVoicings, buildVoicing, defaultVoicing, defaultVoicingIndex, degNotes, playbackVoicing } from '../../src/theory/voicings';
import type { Chord } from '../../src/theory/types';

const Cmaj7 = chordInfo(note('C'), 'major', 0), Dm7 = chordInfo(note('C'), 'major', 1), G7 = chordInfo(note('C'), 'major', 4);
const v = (c: Chord, name: string) => { const x = buildVoicing(c, VDEF.find(d => d.name === name)!); return x.notes.map(n => `${noteName(n.note)}${n.midi}`).join(' '); };
const labels = (c: Chord, name: string) => buildVoicing(c, VDEF.find(d => d.name === name)!).notes.map(n => n.label).join(' ');

describe('voicing builders', () => {
  it('the 10 voicings of Cmaj7 (note + MIDI number)', () => {
    expect(v(Cmaj7, 'Root position')).toBe('C48 E52 G55 B59');
    expect(v(Cmaj7, '1st inversion')).toBe('E52 G55 B59 C60');
    expect(v(Cmaj7, '2nd inversion')).toBe('G55 B59 C60 E64');
    expect(v(Cmaj7, '3rd inversion')).toBe('B59 C60 E64 G67');
    expect(v(Cmaj7, 'Shell 1‑3‑7')).toBe('C48 E52 B59');
    expect(v(Cmaj7, 'Shell 1‑7‑3')).toBe('C48 B59 E64');
    expect(v(Cmaj7, 'Rootless A')).toBe('E52 G55 B59 D62');
    expect(v(Cmaj7, 'Rootless B')).toBe('B59 D62 E64 G67');
    expect(v(Cmaj7, 'Drop 2')).toBe('G55 C60 E64 B71');
    expect(v(Cmaj7, 'Two hands')).toBe('C36 B47 E52 G55 D62');
    expect(allVoicings(Cmaj7)).toHaveLength(10);
  });
  it('Rootless A Dm7 = F A C E (SPEC)', () => {
    expect(v(Dm7, 'Rootless A')).toBe('F53 A57 C60 E64');
    expect(labels(Dm7, 'Rootless A')).toBe('♭3 5 ♭7 9');
  });
  it('Rootless B G7 = F A B E (SPEC; Levine: dominant B = 7-9-3-13)', () => {
    expect(v(G7, 'Rootless B')).toBe('F53 A57 B59 E64');
    expect(labels(G7, 'Rootless B')).toBe('♭7 9 3 13');
    expect(buildVoicing(G7, VDEF.find(d => d.name === 'Rootless B')!).sub).toBe('7 9 3 13');
  });
  it('Rootless A G7 = B E F A (Levine: dominant A = 3-13-7-9)', () => {
    expect(v(G7, 'Rootless A')).toBe('B59 E64 F65 A69');
    expect(labels(G7, 'Rootless A')).toBe('3 13 ♭7 9');
  });
  it('only dominants take the 13: other chords keep the 5', () => {
    expect(labels(Cmaj7, 'Rootless B')).toBe('7 9 3 5');
    expect(labels(Dm7, 'Rootless B')).toBe('♭7 9 ♭3 5');
    expect(labels(G7, 'Drop 2')).toBe('5 R 3 ♭7');
  });
  it('keeps the ♭9 on a dominant from harmonic minor', () => {
    const E7 = chordInfo(note('A'), 'harmonic', 4);
    /* the 13 is the 6th note of the chord's mode: ♭13 on the V of a minor key */
    expect(v(E7, 'Rootless B')).toBe('D50 F53 G#56 C60');
    expect(labels(E7, 'Rootless B')).toBe('♭7 ♭9 3 ♭13');
  });
  it('swaps a ♭9 for a natural 9 on non-dominant chords', () => {
    const Bh = chordInfo(note('C'), 'major', 6), Em7 = chordInfo(note('C'), 'major', 2);
    expect(noteName(degNotes(Bh)['9'])).toBe('C#');
    expect(v(Bh, 'Rootless A')).toBe('D50 F53 A57 C#61');
    expect(labels(Bh, 'Rootless A')).toBe('♭3 ♭5 ♭7 9');
    expect(noteName(degNotes(Em7)['9'])).toBe('F#');
  });
  it('labels altered chord tones', () => {
    const dim = chordInfo(note('A'), 'harmonic', 6), aug = chordInfo(note('C'), 'harmonic', 2), mM = chordInfo(note('C'), 'melodic', 0);
    expect(v(dim, 'Root position')).toBe('G#56 B59 D62 F65');
    expect(labels(dim, 'Root position')).toBe('R ♭3 ♭5 𝄫7');
    expect(labels(aug, 'Root position')).toBe('R 3 ♯5 7');
    expect(labels(mM, 'Root position')).toBe('R ♭3 5 7');
  });
  it('roles: root, guide tones (3rd + 7th), color', () => {
    expect(buildVoicing(Cmaj7, VDEF[9]).notes.map(n => n.role)).toEqual(['root', 'guide', 'guide', 'color', 'color']);
  });
  it('default voicing: Rootless B for dominants, root position for °7, Rootless A otherwise', () => {
    expect(defaultVoicingIndex(G7)).toBe(7);
    expect(defaultVoicingIndex(chordInfo(note('A'), 'harmonic', 6))).toBe(0);
    for (const c of [Cmaj7, Dm7, chordInfo(note('C'), 'major', 6), chordInfo(note('C'), 'melodic', 0), chordInfo(note('C'), 'harmonic', 2)]) expect(defaultVoicingIndex(c)).toBe(6);
    expect(defaultVoicing(G7).name).toBe('Rootless B');
  });
  it('every voicing of every chart chord: ascending, right pitch classes, bottom note in range', () => {
    for (const type of SCALE_TYPES) for (const key of TYPES[type].keys) for (let d = 0; d < 7; d++) {
      const c = chordInfo(note(key), type, d);
      VDEF.forEach(def => {
        const x = buildVoicing(c, def), ms = x.notes.map(n => n.midi);
        expect(ms.length).toBe(def.slots.length);
        for (let i = 1; i < ms.length; i++) expect(ms[i]).toBeGreaterThan(ms[i - 1]);
        expect(ms[0]).toBeGreaterThanOrEqual(def.base);
        expect(ms[0]).toBeLessThan(def.base + 12);
        // each step up is less than an octave (closest note above)
        for (let i = 1; i < ms.length; i++) expect(ms[i] - ms[i - 1]).toBeLessThanOrEqual(12);
        const D = degNotes(c);
        x.notes.forEach((n, i) => { const k = def.slots[i]; expect(n.note).toEqual(D[c.quality === '7' && def.name.startsWith('Rootless') && k === '5' ? '13' : k]); expect(n.midi % 12).toBe(pcOf(n.note)); });
      });
    }
  });
  it('playback voicing: root in the bass, upper notes nearest the previous chord', () => {
    const a = playbackVoicing(Cmaj7.tones, 64);
    expect(a.notes).toEqual([36, 64, 67, 59]);
    expect(a.ref).toBeCloseTo(63.333, 2);
    expect(playbackVoicing(G7.tones, a.ref).notes).toEqual([43, 59, 62, 65]);
  });
});
