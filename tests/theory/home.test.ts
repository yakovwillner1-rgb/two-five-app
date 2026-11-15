import { describe, expect, it } from 'vitest';
import { HOME, approach, homeChords, homeKey, homePcs, homeTitle } from '../../src/theory/home';
import { noteName, pcOf, transpose } from '../../src/theory/notes';
import type { Flavor, HomeMode, Interval } from '../../src/theory/types';
import { names } from './helpers';

const syms = (pc: number, mode: HomeMode) => homeChords(homeKey(pc, mode)).map(c => c.symbol).join(' ');
/** "ii V" symbols of the 2-5 into degree `deg` (1-based). */
const twoFive = (pc: number, mode: HomeMode, deg: number, fl: Flavor) => {
  const ap = approach(homeChords(homeKey(pc, mode))[deg - 1], fl);
  return ap ? `${ap.ii.symbol} ${ap.V.symbol}` : null;
};

describe('home key chords', () => {
  it('C major', () => expect(syms(0, 'major')).toBe('Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7♭5'));
  it('G♭ major', () => expect(syms(6, 'major')).toBe('G♭maj7 A♭m7 B♭m7 C♭maj7 D♭7 E♭m7 Fm7♭5'));
  it('A minor: natural minor with the V from harmonic minor', () => {
    expect(syms(9, 'minor')).toBe('Am7 Bm7♭5 Cmaj7 Dm7 E7 Fmaj7 G7');
    expect(names(homeChords(homeKey(9, 'minor'))[4].tones)).toBe('E G# B D');
  });
  it('C minor', () => expect(syms(0, 'minor')).toBe('Cm7 Dm7♭5 E♭maj7 Fm7 G7 A♭maj7 B♭7'));
  it('roman numerals', () => {
    expect(homeChords(homeKey(0, 'major')).map(c => c.rn)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii']);
    expect(homeChords(homeKey(0, 'minor')).map(c => c.rn)).toEqual(['i', 'ii', '♭III', 'iv', 'V', '♭VI', '♭VII']);
  });
  it('half-diminished chords are not landing spots', () => {
    expect(homeChords(homeKey(0, 'major')).map(c => c.landable)).toEqual([true, true, true, true, true, true, false]);
    expect(homeChords(homeKey(0, 'minor')).map(c => c.landable)).toEqual([true, false, true, true, true, true, true]);
    expect(twoFive(0, 'major', 7, 'auto')).toBeNull();
  });
  it('titles and pitch classes', () => {
    expect(homeTitle(homeKey(10, 'major'))).toBe('B♭ major');
    expect(homeTitle(homeKey(1, 'minor'))).toBe('C♯ minor');
    expect([...homePcs(homeKey(0, 'major'))].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]);
    // A minor includes G♯ (from the V)
    expect(homePcs(homeKey(9, 'minor')).has(8)).toBe(true);
  });
});

describe('secondary 2-5 per target: hand-checked', () => {
  it('C major, auto: bright into major/dominant, dark into minor', () => {
    expect(twoFive(0, 'major', 1, 'auto')).toBe('Dm7 G7');
    expect(twoFive(0, 'major', 2, 'auto')).toBe('Em7♭5 A7');
    expect(twoFive(0, 'major', 3, 'auto')).toBe('F♯m7♭5 B7');
    expect(twoFive(0, 'major', 4, 'auto')).toBe('Gm7 C7');
    expect(twoFive(0, 'major', 5, 'auto')).toBe('Am7 D7');
    expect(twoFive(0, 'major', 6, 'auto')).toBe('Bm7♭5 E7');
  });
  it('SPEC cases: C→F is Gm7–C7; into Am7 dark Bm7♭5–E7, bright Bm7–E7', () => {
    expect(twoFive(0, 'major', 4, 'bright')).toBe('Gm7 C7');
    expect(twoFive(0, 'major', 6, 'dark')).toBe('Bm7♭5 E7');
    expect(twoFive(0, 'major', 6, 'bright')).toBe('Bm7 E7');
  });
  it('forced colors', () => {
    expect(twoFive(0, 'major', 4, 'dark')).toBe('Gm7♭5 C7');
    expect(twoFive(0, 'major', 2, 'bright')).toBe('Em7 A7');
  });
  it('A minor', () => {
    expect(twoFive(9, 'minor', 1, 'auto')).toBe('Bm7♭5 E7');
    expect(twoFive(9, 'minor', 2, 'auto')).toBeNull();
    expect(twoFive(9, 'minor', 3, 'auto')).toBe('Dm7 G7');
    expect(twoFive(9, 'minor', 4, 'auto')).toBe('Em7♭5 A7');
    expect(twoFive(9, 'minor', 5, 'auto')).toBe('F♯m7 B7');
    expect(twoFive(9, 'minor', 6, 'auto')).toBe('Gm7 C7');
    expect(twoFive(9, 'minor', 7, 'auto')).toBe('Am7 D7');
  });
  it('flat-key spelling: V of ii in G♭ major is E♭7 (not D♯7)', () => {
    expect(twoFive(6, 'major', 2, 'auto')).toBe('B♭m7♭5 E♭7');
    expect(twoFive(6, 'major', 2, 'bright')).toBe('B♭m7 E♭7');
    expect(twoFive(6, 'major', 4, 'auto')).toBe('D♭m7 G♭7');
  });
  it('chart source and modes', () => {
    const H = homeChords(homeKey(0, 'major'));
    const b = approach(H[3], 'auto')!;
    expect([b.source, b.flavor, b.chart]).toEqual(['major', 'bright', 'F Major']);
    expect([b.ii.mode.name, b.V.mode.name]).toEqual(['Dorian', 'Mixolydian']);
    const d = approach(H[5], 'auto')!;
    expect([d.source, d.flavor, d.chart]).toEqual(['harmonic', 'dark', 'A Harmonic Minor']);
    expect([d.ii.mode.name, d.V.mode.name]).toEqual(['Locrian ♮6', 'Phrygian Dominant']);
    expect(names(d.ii.tones) + ' | ' + names(d.V.tones)).toBe('B D F A | E G# B D');
    const m = approach(H[5], 'bright')!;
    expect([m.source, m.flavor, m.chart]).toEqual(['melodic', 'bright', 'A Melodic Minor']);
    expect([m.ii.mode.name, m.V.mode.name]).toEqual(['Dorian ♭2', 'Mixolydian ♭6']);
    expect(names(m.ii.tones)).toBe('B D F# A');
  });
});

describe('secondary 2-5: every landable target, 12 keys × major/minor × 3 colors', () => {
  const M2: Interval = { steps: 1, semis: 2 }, P5: Interval = { steps: 4, semis: 7 };
  const m3: Interval = { steps: 2, semis: 3 }, M3: Interval = { steps: 2, semis: 4 }, d5: Interval = { steps: 4, semis: 6 }, m7: Interval = { steps: 6, semis: 10 };
  for (const mode of ['major', 'minor'] as HomeMode[]) {
    for (let pc = 0; pc < 12; pc++) {
      it(`${noteName(homeKey(pc, mode).tonic)} ${mode}`, () => {
        for (const t of homeChords(homeKey(pc, mode))) {
          for (const fl of ['auto', 'bright', 'dark'] as Flavor[]) {
            const ap = approach(t, fl);
            if (!t.landable) { expect(ap).toBeNull(); continue; }
            const minor = t.quality === 'm7';
            const dark = fl === 'dark' || (fl === 'auto' && minor);
            const iiRoot = transpose(t.root, M2), vRoot = transpose(t.root, P5);
            const where = `${t.symbol} ${fl}`;
            expect(ap!.flavor, where).toBe(dark ? 'dark' : 'bright');
            expect(ap!.source, where).toBe(dark ? 'harmonic' : minor ? 'melodic' : 'major');
            // ii: m7♭5 when dark, m7 when bright
            expect(ap!.ii.quality, where).toBe(dark ? 'm7♭5' : 'm7');
            expect(ap!.ii.tones, where).toEqual([iiRoot, transpose(iiRoot, m3), transpose(iiRoot, dark ? d5 : P5), transpose(iiRoot, m7)]);
            // V: always a dominant 7 a fifth above the target
            expect(ap!.V.quality, where).toBe('7');
            expect(ap!.V.tones, where).toEqual([vRoot, transpose(vRoot, M3), transpose(vRoot, P5), transpose(vRoot, m7)]);
            // the pull: V's 3rd is a half step under the target root; V's 7th is the ii's 3rd
            expect((pcOf(t.root) - pcOf(ap!.V.tones[1]) + 12) % 12).toBe(1);
            expect(ap!.V.tones[3]).toEqual(ap!.ii.tones[1]);
          }
        }
      });
    }
  }
  it('presets only use valid degrees', () => {
    for (const m of ['major', 'minor'] as HomeMode[]) for (const [, degs] of HOME[m].presets) for (const d of degs) expect(d >= 0 && d < 7).toBe(true);
  });
});
