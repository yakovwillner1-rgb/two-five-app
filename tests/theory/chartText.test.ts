import { describe, expect, it } from 'vitest';
import { detectKey } from '../../src/theory/analyze';
import { chartNotes, parseChartText } from '../../src/theory/chartText';

const syms = (t: string) => parseChartText(t).bars.map(b => b.map(c => c.symbol).join(' '));

describe('typed chord chart', () => {
  it('bars between | lines; chords in a bar share it equally', () => {
    const c = parseChartText('| Cmaj7 | Am7 | Dm7 G7 | Cmaj7 |');
    expect(syms('| Cmaj7 | Am7 | Dm7 G7 | Cmaj7 |')).toEqual(['Cmaj7', 'Am7', 'Dm7 G7', 'Cmaj7']);
    expect(c.given.map(g => [g.tick, g.chord.symbol])).toEqual([[0, 'Cmaj7'], [1920, 'Am7'], [3840, 'Dm7'], [4800, 'G7'], [5760, 'Cmaj7']]);
    expect(c.end).toBe(4 * 1920);
    expect(c.timeSig).toEqual({ num: 4, den: 4 });
  });
  it('several lines, flats and sharps, slash chords, a repeat sign and a held bar', () => {
    expect(syms('Ebmaj7 | Cm7 | F#m7b5 B7b9 |\n% | C/G | - |')).toEqual(['E♭maj7', 'Cm7', 'F♯m7♭5 B7♭9', 'F♯m7♭5 B7♭9', 'C/G', '']);
  });
  it('time signature and key from the text', () => {
    const c = parseChartText('3/4  key: F\n| Fmaj7 | Gm7 C7 | F6 |');
    expect(c.timeSig).toEqual({ num: 3, den: 4 });
    expect(c.key).toEqual({ pc: 5, mode: 'major' });
    expect(c.barTicks).toBe(1440);
    expect(c.given.map(g => g.tick)).toEqual([0, 1440, 2160, 2880]);
    expect(parseChartText('key of A minor | Am7 | Dm7 |').key).toEqual({ pc: 9, mode: 'minor' });
    expect(parseChartText('key: Bb | Bb | Eb |').key).toEqual({ pc: 10, mode: 'major' });
    expect(parseChartText('6/8 | Am | G |').barTicks).toBe(1440);
  });
  it('without bar lines every chord is one bar', () => {
    expect(syms('Cmaj7 Am7 Dm7 G7')).toEqual(['Cmaj7', 'Am7', 'Dm7', 'G7']);
    expect(syms('Cmaj7 Am7\nDm7 G7')).toEqual(['Cmaj7', 'Am7', 'Dm7', 'G7']);
  });
  it('words that are not chords are reported, the rest is kept', () => {
    const c = parseChartText('| Cmaj7 | Hm7 | Dm7 blah G7 |');
    expect(c.unread).toEqual(['Hm7', 'blah']);
    expect(c.bars.map(b => b.length)).toEqual([1, 0, 2]);
  });
  it('the key of a chart with no key line can be read from its chords', () => {
    const c = parseChartText('| Fmaj7 | Dm7 | Gm7 | C7 | Fmaj7 |');
    expect(detectKey(chartNotes(c.given, c.end))[0]).toMatchObject({ pc: 5, mode: 'major' });
    const m = parseChartText('| Am7 | Dm7 | Bm7b5 E7b9 | Am7 |');
    expect(detectKey(chartNotes(m.given, m.end))[0]).toMatchObject({ pc: 9, mode: 'minor' });
  });
});
