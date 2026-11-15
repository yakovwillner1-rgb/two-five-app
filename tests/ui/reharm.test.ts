import { beforeEach, describe, expect, it } from 'vitest';
import { parseSmf } from '../../src/midi/smf';
import { S } from '../../src/state';
import { demoFile, loadBytes, model, reharmAction, reharmFile, reharmTyped } from '../../src/ui/views/reharm';

/* The Reharm tab on its built-in example: | Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | with a melody track. */
beforeEach(() => { S.mode = 'minor'; S.pc = 5; S.pgenre = 'jazz'; S.pfeel = 'bright'; S.rrhythm = 'auto'; loadBytes(demoFile(), 'Example tune.mid'); });

describe('loading a file', () => {
  it('finds the key and makes it the home key, without touching the progression', () => {
    const prog = JSON.stringify(S.prog);
    expect([S.pc, S.mode]).toEqual([0, 'major']);
    expect(JSON.stringify(S.prog)).toBe(prog);
  });
  it('offers the higher track as the melody and reads the chart from the other', () => {
    const m = model()!;
    expect(m.f.tracks.map(t => t.name)).toEqual(['Melody', 'Chords']);
    expect(m.melody.map(n => n.midi)).toEqual([76, 74, 72, 76, 77, 81, 74, 71, 72]);
    expect(m.chart.map(c => c.chord.symbol)).toEqual(['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7']);
    expect(m.bars).toHaveLength(5);
  });
  it('a file that is not MIDI gives a message, not a crash', () => {
    loadBytes(new Uint8Array([1, 2, 3, 4]), 'x.mid');
    expect(model()).toBeNull();
  });
});

describe('correcting the chart', () => {
  it('a typed chord replaces what was heard; an unreadable one is ignored', () => {
    reharmTyped(1920, 'A7');
    expect(model()!.chart.map(c => c.chord.symbol)).toEqual(['Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7']);
    reharmTyped(1920, 'xyz');
    expect(model()!.chart[1].chord.symbol).toBe('A7');
    reharmAction('rreset', { t: '1920' });
    expect(model()!.chart[1].chord.symbol).toBe('Am7');
  });
});

describe('versions', () => {
  it('original has no added chords; light, medium and wild add some', () => {
    reharmAction('rview', { v: 'orig' });
    expect(model()!.re).toBeNull();
    expect(model()!.voiced.every(c => !c.added)).toBe(true);
    for (const v of ['light', 'medium', 'wild']) {
      reharmAction('rview', { v });
      expect(model()!.re!.changes.length, v).toBeGreaterThan(0);
    }
  });
});

describe('the downloaded file lines up with the original', () => {
  it('same PPQ, tempo and time signature; melody note for note; every chord starts where it starts in the chart', () => {
    reharmAction('rview', { v: 'medium' });
    const m = model()!, out = parseSmf(reharmFile(m, 'medium'));
    expect(out.ppq).toBe(m.f.ppq);
    expect(out.tempos).toEqual(m.f.tempos);
    expect(out.timeSigs).toEqual(m.f.timeSigs);
    expect(out.tracks.map(t => t.name)).toEqual(['Melody', 'Reharm medium']);
    expect(out.tracks[0].notes.map(n => [n.tick, n.dur, n.midi])).toEqual(m.melody.map(n => [n.tick, n.dur, n.midi]));
    const starts = [...new Set(out.tracks[1].notes.map(n => n.tick))];
    expect(starts).toEqual(m.voiced.map(c => c.start));
    /* chords do not run into each other, and the original chords are still on their bar lines */
    m.voiced.forEach(c => out.tracks[1].notes.filter(n => n.tick === c.start).forEach(n => expect(n.tick + n.dur).toBeLessThanOrEqual(c.end)));
    expect(m.voiced.filter(c => !c.added).map(c => c.start)).toEqual([0, 1920, 3840, 5760, 7680]);
  });
});
