import { describe, expect, it } from 'vitest';
import { SmfError, barsOf, bpmOf, parseSmf, tickToSec, writeSmf, type STrack } from '../../src/midi/smf';

/* Hand-built MIDI files: every byte is written out, so the expected notes are known. */
const A = (s: string): number[] => [...s].map(c => c.charCodeAt(0));
const be32 = (v: number): number[] => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const header = (format: number, ntrks: number, ppq: number): number[] => [...A('MThd'), ...be32(6), 0, format, 0, ntrks, ppq >> 8, ppq & 255];
const track = (body: number[]): number[] => [...A('MTrk'), ...be32(body.length + 4), ...body, 0, 0xff, 0x2f, 0];
const file = (...parts: number[][]): Uint8Array => new Uint8Array(parts.flat());

describe('reading a MIDI file', () => {
  it('type 0: one note, a quarter long at 96 PPQ', () => {
    const f = parseSmf(file(header(0, 1, 96), track([0, 0x90, 60, 100, 96, 0x80, 60, 0])));
    expect(f.format).toBe(0);
    expect(f.ppq).toBe(96);
    expect(f.tracks).toHaveLength(1);
    expect(f.tracks[0].notes).toEqual([{ tick: 0, dur: 96, midi: 60, vel: 100, ch: 0 }]);
    expect(f.end).toBe(96);
  });
  it('running status, and note-on with velocity 0 as note-off', () => {
    /* C E G together, status byte sent once; released with velocity-0 note-ons */
    const f = parseSmf(file(header(0, 1, 480), track([0, 0x90, 60, 90, 0, 64, 90, 0, 67, 90, 0x83, 0x60, 60, 0, 0, 64, 0, 0, 67, 0])));
    expect(f.tracks[0].notes.map(n => [n.tick, n.dur, n.midi])).toEqual([[0, 480, 60], [0, 480, 64], [0, 480, 67]]);
  });
  it('a delta time of two bytes (0x83 0x60 = 480)', () => {
    const f = parseSmf(file(header(0, 1, 480), track([0x83, 0x60, 0x90, 62, 80, 0x83, 0x60, 0x80, 62, 0])));
    expect(f.tracks[0].notes[0]).toMatchObject({ tick: 480, dur: 480, midi: 62 });
  });
  it('type 1: tempo map, time signature and track names from separate tracks', () => {
    const conductor = track([0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20, 0, 0xff, 0x58, 4, 3, 2, 24, 8, 0x8f, 0x00, 0xff, 0x51, 3, 0x0f, 0x42, 0x40]);
    const piano = track([0, 0xff, 0x03, 5, ...A('Piano'), 0, 0x90, 48, 70, 0x87, 0x40, 0x80, 48, 0]);
    const lead = track([0, 0xff, 0x03, 4, ...A('Lead'), 0, 0x91, 72, 99, 0x83, 0x60, 0x81, 72, 0]);
    const f = parseSmf(file(header(1, 3, 480), conductor, piano, lead));
    expect(f.tempos).toEqual([{ tick: 0, us: 500000 }, { tick: 1920, us: 1000000 }]);
    expect(f.timeSigs).toEqual([{ tick: 0, num: 3, den: 4 }]);
    expect(f.tracks.map(t => t.name)).toEqual(['Piano', 'Lead']);
    expect(f.tracks[0].notes[0]).toMatchObject({ midi: 48, dur: 960, ch: 0 });
    expect(f.tracks[1].notes[0]).toMatchObject({ midi: 72, dur: 480, ch: 1 });
    expect(bpmOf(f)).toBe(120);
  });
  it('a type-0 track with two channels is split into two tracks', () => {
    const f = parseSmf(file(header(0, 1, 96), track([0, 0x90, 40, 80, 0, 0x91, 76, 80, 96, 0x80, 40, 0, 0, 0x81, 76, 0])));
    expect(f.tracks.map(t => t.name)).toEqual(['Track 1 · channel 1', 'Track 1 · channel 2']);
  });
  it('skips controllers, program changes, pitch bend, sysex and unknown chunks', () => {
    const body = [0, 0xb0, 64, 127, 0, 0xc0, 5, 0, 0xe0, 0, 64, 0, 0xf0, 3, 1, 2, 0xf7, 0, 0xd0, 40, 0, 0x90, 65, 64, 96, 0x80, 65, 0];
    const f = parseSmf(file(header(1, 1, 96), [...A('XFIH'), ...be32(2), 9, 9], track(body)));
    expect(f.tracks[0].notes).toEqual([{ tick: 0, dur: 96, midi: 65, vel: 64, ch: 0 }]);
  });
  it('the same note struck twice before the first release: first on pairs with first off', () => {
    const f = parseSmf(file(header(0, 1, 96), track([0, 0x90, 60, 80, 48, 0x90, 60, 80, 48, 0x80, 60, 0, 48, 0x80, 60, 0])));
    expect(f.tracks[0].notes.map(n => [n.tick, n.dur])).toEqual([[0, 96], [48, 96]]);
  });
  it('a note that is never released ends with the track', () => {
    const f = parseSmf(file(header(0, 1, 96), track([0, 0x90, 60, 80, 0x60, 0xb0, 1, 0])));
    expect(f.tracks[0].notes[0].dur).toBe(96);
  });
  it('says what is wrong with files it cannot read', () => {
    expect(() => parseSmf(new Uint8Array([1, 2, 3]))).toThrow(SmfError);
    expect(() => parseSmf(file(A('RIFF'), new Array(20).fill(0)))).toThrow(/not a MIDI file/);
    expect(() => parseSmf(file([...A('MThd'), ...be32(6), 0, 0, 0, 1, 0xe7, 0x28], track([])))).toThrow(/SMPTE/);
    expect(() => parseSmf(file(header(0, 1, 96), track([0, 0xb0, 7, 100])))).toThrow(/no notes/);
  });
});

describe('time', () => {
  it('ticks to seconds through a tempo change (120 bpm for one bar of 4/4, then 60 bpm)', () => {
    const f = { ppq: 480, tempos: [{ tick: 0, us: 500000 }, { tick: 1920, us: 1000000 }] };
    expect(tickToSec(0, f)).toBe(0);
    expect(tickToSec(480, f)).toBeCloseTo(0.5);
    expect(tickToSec(1920, f)).toBeCloseTo(2);
    expect(tickToSec(2400, f)).toBeCloseTo(3);
    expect(tickToSec(480, { ppq: 480, tempos: [] })).toBeCloseTo(0.5); // 120 bpm by default
  });
  it('bars follow the time signature (two bars of 3/4, then 4/4; 6/8 counts eighths)', () => {
    const bars = barsOf({ ppq: 480, timeSigs: [{ tick: 0, num: 3, den: 4 }, { tick: 2880, num: 4, den: 4 }], end: 4000 });
    expect(bars.map(b => [b.start, b.end, b.num])).toEqual([[0, 1440, 3], [1440, 2880, 3], [2880, 4800, 4]]);
    const six = barsOf({ ppq: 480, timeSigs: [{ tick: 0, num: 6, den: 8 }], end: 1 });
    expect(six[0]).toMatchObject({ end: 1440, beat: 240, num: 6, den: 8 });
    expect(barsOf({ ppq: 96, timeSigs: [], end: 400 })).toHaveLength(2); // 4/4 by default: 384 ticks a bar
  });
});

describe('writing a MIDI file', () => {
  const tracks: STrack[] = [
    { name: 'Melody', notes: [{ tick: 0, dur: 480, midi: 76, vel: 96, ch: 0 }, { tick: 480, dur: 480, midi: 76, vel: 96, ch: 0 }, { tick: 960, dur: 240, midi: 74, vel: 90, ch: 0 }] },
    { name: 'Reharm', notes: [{ tick: 0, dur: 1920, midi: 48, vel: 70, ch: 1 }, { tick: 0, dur: 1920, midi: 64, vel: 70, ch: 1 }, { tick: 1920, dur: 20000, midi: 53, vel: 70, ch: 1 }] },
  ];
  const src = { ppq: 480, tempos: [{ tick: 0, us: 652174 }], timeSigs: [{ tick: 0, num: 6, den: 8 }], tracks };
  it('round trip: what is written is read back note for note, with tempo and time signature', () => {
    const f = parseSmf(writeSmf(src));
    expect(f.format).toBe(1);
    expect(f.ppq).toBe(480);
    expect(f.tempos).toEqual(src.tempos);
    expect(f.timeSigs).toEqual(src.timeSigs);
    expect(f.tracks.map(t => t.name)).toEqual(['Melody', 'Reharm']);
    expect(f.tracks[0].notes).toEqual(tracks[0].notes);
    expect(f.tracks[1].notes).toEqual(tracks[1].notes);
  });
  it('a repeated note is not cut: the release is written before the next attack on the same tick', () => {
    const f = parseSmf(writeSmf(src));
    expect(f.tracks[0].notes.filter(n => n.midi === 76).map(n => [n.tick, n.dur])).toEqual([[0, 480], [480, 480]]);
  });
  it('the header says type 1 with one extra track for tempo and time signature', () => {
    const b = writeSmf(src);
    expect(String.fromCharCode(...b.subarray(0, 4))).toBe('MThd');
    expect([b[8], b[9], b[10], b[11]]).toEqual([0, 1, 0, 3]);
  });
});
