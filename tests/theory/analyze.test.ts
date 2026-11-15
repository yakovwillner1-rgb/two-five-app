import { describe, expect, it } from 'vitest';
import { barsOf } from '../../src/midi/smf';
import { detectChart, detectChord, detectKey, feltBeat, joinChart, melodyAt, skyline, slices, type ANote } from '../../src/theory/analyze';
import { homeKey } from '../../src/theory/home';

/* Reading a recording. PPQ 480, 4/4 unless said: one bar = 1920 ticks. */
const Q = 480, BAR = 1920, C = homeKey(0, 'major');
const n = (tick: number, dur: number, midi: number, track = 0): ANote => ({ tick, dur, midi, track });
const block = (tick: number, dur: number, midis: number[], track = 0): ANote[] => midis.map(m => n(tick, dur, m, track));
const best = (notes: ANote[], a = 0, b = BAR, key = C): string => detectChord(notes, a, b, key)[0]?.chord.symbol ?? 'none';
const bars4 = (count: number) => barsOf({ ppq: Q, timeSigs: [{ tick: 0, num: 4, den: 4 }], end: count * BAR });

describe('key detection (Krumhansl–Schmuckler)', () => {
  const scale = (midis: number[]) => midis.map((m, i) => n(i * Q, Q, m));
  it('a C major scale ending on a long C is C major', () => {
    const g = detectKey([...scale([60, 62, 64, 65, 67, 69, 71, 72]), n(8 * Q, 4 * Q, 60), n(8 * Q, 4 * Q, 64), n(8 * Q, 4 * Q, 67)]);
    expect([g[0].pc, g[0].mode]).toEqual([0, 'major']);
  });
  it('I–vi–ii–V in C major, and the same up a fourth in F major', () => {
    const prog = (t: number) => [...block(0, BAR, [48, 64, 67, 71].map(m => m + t)), ...block(BAR, BAR, [45, 64, 67, 72].map(m => m + t)), ...block(2 * BAR, BAR, [50, 65, 69, 72].map(m => m + t)), ...block(3 * BAR, BAR, [43, 65, 71, 74].map(m => m + t)), ...block(4 * BAR, BAR, [48, 64, 67, 72].map(m => m + t))];
    expect(detectKey(prog(0))[0]).toMatchObject({ pc: 0, mode: 'major' });
    expect(detectKey(prog(5))[0]).toMatchObject({ pc: 5, mode: 'major' });
  });
  it('i–iv–V7–i in A minor is A minor', () => {
    const notes = [...block(0, BAR, [45, 60, 64, 69]), ...block(BAR, BAR, [50, 62, 65, 69]), ...block(2 * BAR, BAR, [40, 62, 64, 68]), ...block(3 * BAR, 2 * BAR, [45, 60, 64, 69])];
    expect(detectKey(notes)[0]).toMatchObject({ pc: 9, mode: 'minor' });
  });
  it('returns all 24 keys, best first', () => {
    const g = detectKey(scale([60, 62, 64, 65, 67, 69, 71, 72]));
    expect(g).toHaveLength(24);
    for (let i = 1; i < g.length; i++) expect(g[i].r).toBeLessThanOrEqual(g[i - 1].r);
  });
});

describe('melody (skyline)', () => {
  it('the top note of each chord, and single notes between chords', () => {
    const notes = [...block(0, BAR, [48, 55, 64]), n(0, Q, 76), n(Q, Q, 74), n(2 * Q, 2 * Q, 72)];
    expect(skyline(notes, 30).map(x => x.midi)).toEqual([76, 74, 72]);
  });
  it('notes struck a few ticks apart still count as together', () => {
    const notes = [n(0, BAR, 48), n(10, BAR, 60), n(20, BAR, 67)];
    expect(skyline(notes, 30).map(x => x.midi)).toEqual([67]);
  });
  it('melodyAt: the note sounding at a tick, else the next one before the end', () => {
    const mel = [n(Q, Q, 72), n(3 * Q, Q, 76)];
    expect(melodyAt(mel, Q + 10, BAR)!.midi).toBe(72);
    expect(melodyAt(mel, 0, BAR)!.midi).toBe(72);
    expect(melodyAt(mel, 2 * Q, BAR)!.midi).toBe(76);
    expect(melodyAt(mel, BAR, 2 * BAR)).toBeNull();
  });
});

describe('chord detection', () => {
  it('block chords with the root in the bass', () => {
    expect(best(block(0, BAR, [48, 52, 55]))).toBe('C');
    expect(best(block(0, BAR, [48, 52, 55, 59]))).toBe('Cmaj7');
    expect(best(block(0, BAR, [50, 53, 57, 60]))).toBe('Dm7');
    expect(best(block(0, BAR, [43, 47, 50, 53]))).toBe('G7');
    expect(best(block(0, BAR, [47, 50, 53, 57]))).toBe('Bm7♭5');
    expect(best(block(0, BAR, [48, 52, 55, 58, 62]))).toBe('C9');
    expect(best(block(0, BAR, [50, 53, 57, 60, 64]))).toBe('Dm9');
    expect(best(block(0, BAR, [43, 48, 50]))).toBe('Gsus4');
    expect(best(block(0, BAR, [49, 52, 55, 58]))).toBe('C♯°7');
  });
  it('the same notes: the bass decides (C6 on C, Am7 on A)', () => {
    expect(best(block(0, BAR, [48, 52, 55, 57]))).toBe('C6');
    expect(best(block(0, BAR, [45, 48, 52, 55]))).toBe('Am7');
  });
  it('another chord tone in the bass is a slash chord', () => {
    expect(best(block(0, BAR, [52, 55, 60]))).toBe('C/E');
    expect(best(block(0, BAR, [43, 48, 52, 55]))).toBe('C/G');
  });
  it('a missing 5th is still the chord (shell: root, 3rd, 7th)', () => {
    expect(best(block(0, BAR, [43, 53, 59]))).toBe('G7');
    expect(best(block(0, BAR, [50, 60, 65]))).toBe('Dm7');
  });
  it('an arpeggio over a held bass note', () => {
    const notes = [n(0, BAR, 36), n(0, Q, 60), n(Q, Q, 64), n(2 * Q, Q, 67), n(3 * Q, Q, 71)];
    expect(best(notes)).toBe('Cmaj7');
  });
  it('a short passing note in the melody does not change the chord', () => {
    const notes = [...block(0, BAR, [50, 53, 57, 60]), n(0, Q / 2, 76), n(Q / 2, Q / 2, 74), n(Q, Q / 2, 71), n(Q * 1.5, Q * 2.5, 72)];
    expect(best(notes)).toBe('Dm7');
  });
  it('roots outside the key are spelled as flats, diminished chords as raised degrees', () => {
    expect(best(block(0, BAR, [51, 55, 58, 62]))).toBe('E♭maj7');
    expect(best(block(0, BAR, [49, 53, 56, 59]))).toBe('D♭7');
    expect(best(block(0, BAR, [54, 57, 60, 64]))).toBe('F♯m7♭5');
  });
  it('nothing to read: silence or one note', () => {
    expect(detectChord([], 0, BAR, C)).toEqual([]);
    expect(detectChord([n(0, BAR, 60)], 0, BAR, C)).toEqual([]);
    expect(detectChord(block(0, BAR, [48, 52, 55]), BAR, 2 * BAR, C)).toEqual([]);
  });
});

describe('grid', () => {
  it('half a bar of 4/4 is two beats; 3/4 has no half; 6/8 is felt in two', () => {
    const b44 = bars4(1)[0];
    expect(slices(b44, 'half')).toEqual([[0, 960], [960, 1920]]);
    expect(slices(b44, 'beat')).toHaveLength(4);
    const b34 = barsOf({ ppq: Q, timeSigs: [{ tick: 0, num: 3, den: 4 }], end: 1 })[0];
    expect(slices(b34, 'half')).toEqual([[0, 1440]]);
    expect(slices(b34, 'beat')).toHaveLength(3);
    const b68 = barsOf({ ppq: Q, timeSigs: [{ tick: 0, num: 6, den: 8 }], end: 1 })[0];
    expect(feltBeat(b68)).toBe(720);
    expect(slices(b68, 'half')).toEqual([[0, 720], [720, 1440]]);
    expect(slices(b68, 'beat')).toEqual([[0, 720], [720, 1440]]);
  });
});

describe('chart', () => {
  /* | Cmaj7 | Am7 | Dm7  G7 | Cmaj7 | with a melody on top */
  const song: ANote[] = [
    ...block(0, BAR, [48, 55, 59, 64]), n(0, BAR, 76, 1),
    ...block(BAR, BAR, [45, 55, 60, 64]), n(BAR, Q * 2, 72, 1), n(BAR + Q * 2, Q * 2, 76, 1),
    ...block(2 * BAR, BAR / 2, [50, 57, 60, 65]), n(2 * BAR, BAR / 2, 77, 1),
    ...block(2.5 * BAR, BAR / 2, [43, 53, 59, 62]), n(2.5 * BAR, BAR / 2, 74, 1),
    ...block(3 * BAR, BAR, [48, 55, 59, 64]), n(3 * BAR, BAR, 72, 1),
  ];
  const sym = (r: 'auto' | 'bar' | 'half' | 'beat') => detectChart(song, bars4(4), C, r).map(s => s.chord?.symbol ?? '-');
  it('auto: one chord a bar, two where the halves are different chords', () => {
    expect(sym('auto')).toEqual(['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7']);
  });
  it('half-bar reading repeats the chord of a one-chord bar', () => {
    expect(sym('half')).toEqual(['Cmaj7', 'Cmaj7', 'Am7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7']);
  });
  it('an arpeggiated bar is not split in auto (its halves are parts of one chord)', () => {
    const arp = [n(0, BAR, 36), n(0, Q, 60), n(Q, Q, 64), n(2 * Q, Q, 67), n(3 * Q, Q, 71)];
    expect(detectChart(arp, bars4(1), C, 'auto').map(s => s.chord?.symbol)).toEqual(['Cmaj7']);
  });
  it('joinChart: repeats join, an empty bar carries the chord before it', () => {
    const notes = [...block(0, BAR, [48, 52, 55]), ...block(2 * BAR, BAR, [48, 52, 55]), ...block(3 * BAR, BAR, [43, 47, 50, 53])];
    const segs = detectChart(notes, bars4(4), C, 'bar');
    expect(segs.map(s => s.chord?.symbol ?? '-')).toEqual(['C', '-', 'C', 'G7']);
    expect(joinChart(segs).map(s => [s.chord.symbol, s.start, s.end])).toEqual([['C', 0, 3 * BAR], ['G7', 3 * BAR, 4 * BAR]]);
  });
});
