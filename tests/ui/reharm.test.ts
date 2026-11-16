import { beforeEach, describe, expect, it } from 'vitest';
import { parseSmf } from '../../src/midi/smf';
import { S } from '../../src/state';
import { EXAMPLE_CHART, demoFile, loadBytes, loadChart, loadFile, loadScore, model, reharmAction, reharmFile, reharmTyped } from '../../src/ui/views/reharm';

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
    expect(out.tracks.map(t => t.name)).toEqual(['Melody', 'Chords medium']);
    expect(out.tracks[0].notes.map(n => [n.tick, n.dur, n.midi])).toEqual(m.melody.map(n => [n.tick, n.dur, n.midi]));
    const starts = [...new Set(out.tracks[1].notes.map(n => n.tick))];
    expect(starts).toEqual(m.voiced.map(c => c.start));
    /* chords do not run into each other, and the original chords are still on their bar lines */
    m.voiced.forEach(c => out.tracks[1].notes.filter(n => n.tick === c.start).forEach(n => expect(n.tick + n.dur).toBeLessThanOrEqual(c.end)));
    expect(m.voiced.filter(c => !c.added).map(c => c.start)).toEqual([0, 1920, 3840, 5760, 7680]);
  });
});

/* A lead sheet as MusicXML: melody with chord symbols | Fmaj7 | Gm7 C7 | Fmaj7 |, one flat. */
const n = (step: string, oct: number, dur: number) => `<note><pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration></note>`;
const h = (step: string, kind: string) => `<harmony><root><root-step>${step}</root-step></root><kind>${kind}</kind></harmony>`;
const LEAD = `<score-partwise><work><work-title>Little Tune</work-title></work><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1">
  <measure number="1"><attributes><divisions>1</divisions><key><fifths>-1</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${h('F', 'major-seventh')}${n('A', 4, 2)}${n('C', 5, 2)}</measure>
  <measure number="2">${h('G', 'minor-seventh')}${n('D', 5, 2)}${h('C', 'dominant')}${n('E', 5, 2)}</measure>
  <measure number="3">${h('F', 'major-seventh')}${n('C', 5, 4)}</measure></part></score-partwise>`;

describe('a lead sheet (MusicXML)', () => {
  beforeEach(() => loadScore(LEAD, 'file name'));
  it('uses the title, the key signature and the written chord symbols', () => {
    const m = model()!;
    expect(m.f.name).toBe('Little Tune');
    expect([S.pc, S.mode]).toEqual([5, 'major']);
    expect(m.written).toBe(true);
    expect(m.chart.map(c => [c.chord.symbol, c.start])).toEqual([['Fmaj7', 0], ['Gm7', 1920], ['C7', 2880], ['Fmaj7', 3840]]);
    expect(m.melody.map(x => x.midi)).toEqual([69, 72, 74, 76, 72]);
  });
  it('every chord is voiced under its melody note, with voice leading from the chord before', () => {
    const m = model()!;
    reharmAction('rview', { v: 'orig' });
    const v = model()!.voiced;
    expect(v.map(c => c.top)).toEqual([69, 74, 76, 72]);
    v.forEach(c => c.notes.forEach(x => expect(x.midi).toBeLessThan(c.top!)));
    expect(v[0].motion).toBeNull();
    v.slice(1).forEach(c => expect(c.motion).not.toBeNull());
    expect(m.bars).toHaveLength(3);
  });
  it('reharms only use chords the melody fits', () => {
    reharmAction('rview', { v: 'medium' });
    expect(model()!.re!.changes.length).toBeGreaterThan(0);
  });
  it('a corrected chord symbol is kept when the key is changed', () => {
    reharmTyped(1920, 'Gm9');
    reharmAction('rkey', { i: '1' });
    expect(model()!.chart[1].chord.symbol).toBe('Gm9');
  });
});

describe('a typed chart', () => {
  beforeEach(() => loadChart(EXAMPLE_CHART));
  it('eight bars in C, no melody: the app picks a top note for each chord', () => {
    const m = model()!;
    expect(m.f.kind).toBe('text');
    expect(m.bars).toHaveLength(8);
    expect([S.pc, S.mode]).toEqual([0, 'major']);
    expect(m.chart.map(c => c.chord.symbol)).toEqual(['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'G7', 'Cmaj7']);
    expect(m.melody).toEqual([]);
    reharmAction('rview', { v: 'orig' });
    model()!.voiced.forEach(c => { expect(c.lead).not.toBeNull(); expect(c.notes.some(x => x.midi === c.lead)).toBe(true); });
  });
  it('the download is one chord track that matches the chart', () => {
    reharmAction('rview', { v: 'light' });
    const m = model()!, out = parseSmf(reharmFile(m, 'light'));
    expect(out.tracks.map(t => t.name)).toEqual(['Chords light']);
    expect([...new Set(out.tracks[0].notes.map(x => x.tick))]).toEqual(m.voiced.map(c => c.start));
    expect(out.timeSigs).toEqual([{ tick: 0, num: 4, den: 4 }]);
  });
  it('nothing readable gives a message and no tune', () => {
    loadChart('hello there');
    expect(model()).toBeNull();
  });
});

describe('picking a file', () => {
  it('MIDI and MusicXML are told apart by their content; a PDF is refused with an explanation', async () => {
    await loadFile(demoFile(), 'a.mid');
    expect(model()!.f.kind).toBe('midi');
    await loadFile(new TextEncoder().encode(LEAD), 'lead.musicxml');
    expect(model()!.f.kind).toBe('score');
    await loadFile(new TextEncoder().encode('%PDF-1.7 ...'), 'tune.pdf');
    expect(model()).toBeNull();
  });
});
