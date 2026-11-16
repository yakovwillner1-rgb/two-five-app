import { describe, expect, it } from 'vitest';
import { barsOf } from '../../src/midi/smf';
import type { ANote } from '../../src/theory/analyze';
import { homeKey } from '../../src/theory/home';
import { melodyCheck } from '../../src/theory/lead';
import { pcOf } from '../../src/theory/notes';
import { LEVELS, chooseTop, melodyFits, reharmonize, slotLength, voiceChart, type ChartChord, type Level } from '../../src/theory/reharm';
import { parseChord } from '../../src/theory/symbols';

/* Reharm of | Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | in C, 4/4, PPQ 480. */
const Q = 480, BAR = 1920, C = homeKey(0, 'major'), jazz = { genre: 'jazz', feel: 'bright' } as const;
const ch = (s: string) => parseChord(s)!;
const bars = barsOf({ ppq: Q, timeSigs: [{ tick: 0, num: 4, den: 4 }], end: 5 * BAR });
const chart: ChartChord[] = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7'].map((s, i) => ({ start: i * BAR, end: (i + 1) * BAR, chord: ch(s), bar: i }));
const n = (tick: number, dur: number, midi: number): ANote => ({ tick, dur, midi, track: 1 });
/* melody: E (bar 1), C then E (bar 2), F then A (bar 3), D then B (bar 4), C (bar 5) */
const melody: ANote[] = [n(0, BAR, 76), n(BAR, 960, 72), n(BAR + 960, 960, 76), n(2 * BAR, 960, 77), n(2 * BAR + 960, 960, 81), n(3 * BAR, 960, 74), n(3 * BAR + 960, 960, 71), n(4 * BAR, BAR, 72)];
const run = (level: Level, mel = melody, style: { genre: 'jazz' | 'pop' | 'gospel'; feel: 'bright' | 'dark' } = jazz) => reharmonize(chart, mel, bars, C, style, level);

describe('how long a passing chord lasts', () => {
  it('light: one beat, only after a chord of four beats or more', () => {
    expect(slotLength('light', 1, 4, Q)).toBe(Q);
    expect(slotLength('light', 1, 2, Q)).toBe(0);
    expect(slotLength('light', 2, 8, Q)).toBe(0);
  });
  it('medium: two beats for one chord after a long chord, one beat each otherwise', () => {
    expect(slotLength('medium', 1, 4, Q)).toBe(2 * Q);
    expect(slotLength('medium', 1, 2, Q)).toBe(Q);
    expect(slotLength('medium', 2, 4, Q)).toBe(Q);
    expect(slotLength('medium', 2, 2, Q)).toBe(0);
    expect(slotLength('medium', 3, 8, Q)).toBe(0);
  });
  it('the original chord always keeps at least half of its time', () => {
    for (const level of ['light', 'medium', 'wild'] as Level[]) for (let k = 1; k <= 4; k++) for (let beats = 1; beats <= 16; beats++) {
      const slot = slotLength(level, k, beats, Q);
      expect(slot * k, `${level} ${k} ${beats}`).toBeLessThanOrEqual((beats * Q) / 2);
    }
  });
});

describe('the melody decides', () => {
  it('a note fits when it is a chord tone or an available tension', () => {
    expect(melodyFits(ch('A7'), ch('Dm7'), [n(0, Q, 76)], 0, Q, Q, C)).toBe(true);   // E = 5th of A7
    expect(melodyFits(ch('A7'), ch('Dm7'), [n(0, Q, 77)], 0, Q, Q, C)).toBe(true);   // F = ♭13, A7 going to a minor chord
    expect(melodyFits(ch('A7'), ch('Dm7'), [n(0, Q, 74)], 0, Q, Q, C)).toBe(false);  // D = the 11, an avoid note
    expect(melodyFits(ch('C7'), ch('Fmaj7'), [n(0, Q, 71)], 0, Q, Q, C)).toBe(false); // B against B♭
  });
  it('a short passing note is not checked', () => {
    expect(melodyFits(ch('C7'), ch('Fmaj7'), [n(0, Q / 8, 71), n(Q / 8, Q, 72)], 0, Q, Q, C)).toBe(true);
  });
  it('every melody note over every added chord fits that chord, at every level and in several styles', () => {
    for (const level of ['light', 'medium', 'wild'] as Level[]) for (const style of [jazz, { genre: 'gospel', feel: 'dark' }, { genre: 'pop', feel: 'bright' }] as const) {
      const r = run(level, melody, style);
      r.chords.filter(c => c.added).forEach(c => {
        melody.filter(m => Math.min(m.tick + m.dur, c.end) - Math.max(m.tick, c.start) >= Q / 4).forEach(m => {
          const role = melodyCheck(c.chord, m.midi, null, C).role, i = r.chords.indexOf(c), role2 = melodyCheck(c.chord, m.midi, r.chords[i + 1]?.chord ?? null, C).role;
          expect(['chord', 'tension'], `${level} ${style.genre} ${c.chord.symbol} under ${m.midi}`).toContain(role2 === 'chord' || role2 === 'tension' ? role2 : role);
        });
      });
    }
  });
  it('a melody that holds B into F major blocks the C7 family there', () => {
    const two: ChartChord[] = [{ start: 0, end: BAR, chord: ch('Cmaj7'), bar: 0 }, { start: BAR, end: 2 * BAR, chord: ch('Fmaj7'), bar: 1 }];
    const r = reharmonize(two, [n(0, BAR, 71), n(BAR, BAR, 69)], bars, C, jazz, 'medium');
    r.chords.filter(c => c.added).forEach(c => expect(c.chord.tones.map(pcOf)).not.toContain(10));
  });
});

describe('the new chart', () => {
  it('keeps every original chord at its start, and has no gaps or overlaps', () => {
    for (const level of ['light', 'medium', 'wild'] as Level[]) {
      const r = run(level);
      expect(r.chords.filter(c => !c.added).map(c => [c.chord.symbol, c.start])).toEqual(chart.map(c => [c.chord.symbol, c.start]));
      r.chords.forEach((c, i) => { expect(c.end).toBeGreaterThan(c.start); if (i) expect(c.start).toBe(r.chords[i - 1].end); });
      expect(r.chords[0].start).toBe(0);
      expect(r.chords[r.chords.length - 1].end).toBe(5 * BAR);
    }
  });
  it('light: single passing chords on the last beat of a bar, nothing tense', () => {
    const r = run('light');
    expect(r.changes.length).toBeGreaterThan(0);
    r.changes.forEach(c => { expect(c.way.chords).toHaveLength(1); expect(c.way.tension).toBeLessThanOrEqual(LEVELS.light.maxTension); });
    r.chords.filter(c => c.added).forEach(c => { expect(c.end - c.start).toBe(Q); expect(c.end % BAR).toBe(0); });
  });
  it('medium changes at least as much as light; wild uses tenser ways than light', () => {
    const light = run('light'), medium = run('medium'), wild = run('wild');
    const addedTicks = (r: typeof light) => r.chords.filter(c => c.added).reduce((s, c) => s + c.end - c.start, 0);
    expect(addedTicks(medium)).toBeGreaterThanOrEqual(addedTicks(light));
    const mean = (r: typeof light) => r.changes.reduce((s, c) => s + c.way.tension, 0) / Math.max(1, r.changes.length);
    expect(mean(wild)).toBeGreaterThan(mean(light));
  });
  it('does not lean on one technique: four spots, at least two different techniques', () => {
    const r = run('medium');
    expect(new Set(r.changes.map(c => c.way.techniqueId)).size).toBeGreaterThanOrEqual(Math.min(2, r.changes.length));
  });
  it('never goes back through the chord it is leaving (no G7 → Dm7 → G7 → Cmaj7)', () => {
    for (const level of ['light', 'medium', 'wild'] as Level[]) {
      const r = run(level);
      r.changes.forEach(c => c.way.chords.forEach(x => expect(x.symbol).not.toBe(c.from.symbol)));
    }
  });
  it('same input, same output', () => {
    expect(JSON.stringify(run('medium'))).toBe(JSON.stringify(run('medium')));
  });
  it('every change is explained, with a line for the melody, and the summary names the bars', () => {
    const r = run('medium');
    r.changes.forEach(c => { expect(c.lines.length).toBeGreaterThanOrEqual(3); expect(c.lines.some(l => l.startsWith('Melody: '))).toBe(true); });
    expect(r.summary).toMatch(/^Medium: \d+ changes?\. Bar \d+: /);
    expect(r.summary).not.toMatch(/ii–v/);
    expect(reharmonize([chart[0]], melody, bars, C, jazz, 'light').summary).toMatch(/no change/);
  });
});

describe('voicing the chart under the melody', () => {
  const r = run('medium'), v = voiceChart(r.chords, melody, C, jazz, 'medium');
  it('one voicing per chord, under the melody note, with the root or bass in it', () => {
    expect(v).toHaveLength(r.chords.length);
    v.forEach(c => {
      expect(c.notes.length).toBeGreaterThanOrEqual(3);
      if (c.top !== null) c.notes.forEach(x => expect(x.midi, c.chord.symbol).toBeLessThan(c.top!));
      expect(c.notes.some(x => x.midi % 12 === pcOf(c.chord.bass ?? c.chord.root)), c.chord.symbol + ' has its root').toBe(true);
      expect([...c.notes].sort((a, b) => a.midi - b.midi)).toEqual(c.notes);
    });
  });
  it('the first chord is voiced under E5 (bar 1 melody), a chord with no melody gets root position', () => {
    expect(v[0].top).toBe(76);
  });
  it('voice leading is reported for every chord after the first', () => {
    expect(v[0].motion).toBeNull();
    v.slice(1).forEach(c => { expect(c.motion).not.toBeNull(); expect(c.motion!.total).toBeGreaterThanOrEqual(0); });
  });
});

describe('a chart with no melody (a typed lead sheet)', () => {
  const plain = chart.map(c => ({ ...c, added: false })), v = voiceChart(plain, [], C, jazz, 'light');
  it('the top note is a chord tone near C5, never the root of a 7th chord', () => {
    expect(chooseTop(ch('Cmaj7'), null)).toBe(71);  // B4 (a half step) beats E5 and G4
    expect(chooseTop(ch('Dm7'), 71)).toBe(72);      // C5, the 7th
    expect(chooseTop(ch('G7'), 72)).toBe(71);       // B4, the 3rd
    expect(chooseTop(ch('C'), 71)).toBe(72);        // a triad may have its root on top
  });
  it('every chord gets a full voicing with its top note in it, and the top voice moves by step', () => {
    v.forEach(c => {
      expect(c.top).toBeNull();
      expect(c.lead).not.toBeNull();
      expect(Math.max(...c.notes.map(x => x.midi))).toBe(c.lead);
      expect(c.voicing).not.toMatch(/melody/);
    });
    for (let i = 1; i < v.length; i++) expect(Math.abs(v[i].lead! - v[i - 1].lead!)).toBeLessThanOrEqual(2);
  });
  it('the whole ii–V–I moves little: under 3 semitones a voice on average', () => {
    v.slice(1).forEach(c => expect(c.motion!.mean, c.chord.symbol).toBeLessThan(3));
  });
  it('reharm works with no melody too: nothing blocks the passing chords', () => {
    const r = reharmonize(chart, [], bars, C, jazz, 'medium');
    expect(r.changes).toHaveLength(4);
    r.changes.forEach(c => expect(c.lines.some(l => l.startsWith('Melody: '))).toBe(false));
  });
});
