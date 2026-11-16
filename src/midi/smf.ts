/*
 * Standard MIDI File reader and writer. Pure: bytes in, data out. No DOM, no network.
 * Reads types 0 and 1 (and 2, as separate tracks): running status, tempo map, time signatures, PPQ.
 * Times are in ticks; `ppq` ticks make one quarter note.
 */
export interface SNote { tick: number; dur: number; midi: number; vel: number; ch: number }
export interface STrack { name: string; notes: SNote[] }
export interface Tempo { tick: number; /** microseconds per quarter note */ us: number }
export interface TimeSig { tick: number; num: number; /** the real denominator: 4 = quarter, 8 = eighth */ den: number }
export interface Smf { format: number; ppq: number; tracks: STrack[]; tempos: Tempo[]; timeSigs: TimeSig[]; /** tick of the last note end */ end: number }

export class SmfError extends Error {}

const str = (b: Uint8Array, at: number, len: number): string => String.fromCharCode(...b.subarray(at, at + len));
const u32 = (b: Uint8Array, at: number): number => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const u16 = (b: Uint8Array, at: number): number => (b[at] << 8) | b[at + 1];

/** Parse a .mid file. Tracks with no notes are dropped; a track that uses several channels is split by channel. */
export function parseSmf(b: Uint8Array): Smf {
  if (b.length < 14 || str(b, 0, 4) !== 'MThd') throw new SmfError('This is not a MIDI file (no MThd header).');
  const hlen = u32(b, 4), format = u16(b, 8), division = u16(b, 12);
  if (division & 0x8000) throw new SmfError('This MIDI file uses SMPTE time code, which is not supported. Export it with a tempo (bars and beats) instead.');
  if (division === 0) throw new SmfError('This MIDI file has no time resolution (PPQ is 0).');
  const tempos: Tempo[] = [], timeSigs: TimeSig[] = [], tracks: STrack[] = [];
  let at = 8 + hlen, end = 0, index = 0;
  while (at + 8 <= b.length) {
    const id = str(b, at, 4), len = u32(b, at + 4), stop = Math.min(b.length, at + 8 + len);
    at += 8;
    if (id !== 'MTrk') { at = stop; continue; }
    index++;
    let name = '', tick = 0, status = 0, p = at;
    const byCh = new Map<number, SNote[]>(), open = new Map<number, SNote[]>();
    const vlq = (): number => { let v = 0, c: number; do { c = b[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80 && p < stop); return v; };
    const close = (ch: number, midi: number): void => {
      const k = ch * 128 + midi, n = open.get(k)?.shift();
      if (n) n.dur = Math.max(1, tick - n.tick);
    };
    while (p < stop) {
      tick += vlq();
      if (p >= stop) break;
      let s = b[p];
      if (s & 0x80) p++; else s = status; /* running status: the data byte belongs to the last channel message */
      if (s === 0xff) {
        const type = b[p++], l = vlq();
        if (type === 0x03 && !name) name = str(b, p, l).trim();
        else if (type === 0x51 && l === 3) tempos.push({ tick, us: (b[p] << 16) | (b[p + 1] << 8) | b[p + 2] });
        else if (type === 0x58 && l >= 2) timeSigs.push({ tick, num: b[p], den: 1 << b[p + 1] });
        p += l;
        continue;
      }
      if (s === 0xf0 || s === 0xf7) { const l = vlq(); p += l; continue; }
      if (s < 0x80) throw new SmfError('This MIDI file is damaged (a message without a status byte).');
      status = s;
      const kind = s & 0xf0, ch = s & 0x0f;
      if (kind === 0x90 || kind === 0x80) {
        const midi = b[p++], vel = b[p++];
        if (kind === 0x90 && vel > 0) {
          const n: SNote = { tick, dur: 0, midi, vel, ch };
          if (!byCh.has(ch)) byCh.set(ch, []);
          byCh.get(ch)!.push(n);
          const k = ch * 128 + midi;
          if (!open.has(k)) open.set(k, []);
          open.get(k)!.push(n);
        } else close(ch, midi);
      } else p += kind === 0xc0 || kind === 0xd0 ? 1 : 2;
    }
    /* notes never switched off end with the track */
    open.forEach(list => list.forEach(n => { n.dur = Math.max(1, tick - n.tick); }));
    const chans = [...byCh.keys()].sort((x, y) => x - y);
    chans.forEach(ch => {
      const notes = byCh.get(ch)!.sort((x, y) => x.tick - y.tick || x.midi - y.midi);
      notes.forEach(n => { end = Math.max(end, n.tick + n.dur); });
      tracks.push({ name: (name || `Track ${index}`) + (chans.length > 1 ? ` · channel ${ch + 1}` : ''), notes });
    });
    at = stop;
  }
  if (!tracks.length) throw new SmfError('This MIDI file has no notes.');
  const byTick = <T extends { tick: number }>(xs: T[]): T[] => xs.sort((x, y) => x.tick - y.tick);
  return { format, ppq: division, tracks, tempos: byTick(tempos), timeSigs: byTick(timeSigs), end };
}

/* ---------- writing ---------- */
function vlqBytes(v: number): number[] {
  const out = [v & 0x7f];
  for (let x = v >>> 7; x > 0; x >>>= 7) out.unshift((x & 0x7f) | 0x80);
  return out;
}
const be32 = (v: number): number[] => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const ascii = (s: string): number[] => [...s].map(c => { const k = c.charCodeAt(0); return k < 128 ? k : 63; });
function chunk(events: { tick: number; order: number; bytes: number[] }[]): number[] {
  events.sort((x, y) => x.tick - y.tick || x.order - y.order);
  const body: number[] = [];
  let last = 0;
  events.forEach(e => { body.push(...vlqBytes(e.tick - last), ...e.bytes); last = e.tick; });
  body.push(0, 0xff, 0x2f, 0);
  return [...ascii('MTrk'), ...be32(body.length), ...body];
}
/**
 * Write a type-1 file: a first track with the tempo map and time signatures, then one track per
 * entry in `tracks` (each on its own channel). Same ticks in → same ticks out, so it lines up with
 * the file it came from.
 */
export function writeSmf(f: Pick<Smf, 'ppq' | 'tempos' | 'timeSigs'> & { tracks: STrack[] }): Uint8Array {
  const meta = [
    ...f.tempos.map(t => ({ tick: t.tick, order: 0, bytes: [0xff, 0x51, 3, (t.us >>> 16) & 255, (t.us >>> 8) & 255, t.us & 255] })),
    ...f.timeSigs.map(t => ({ tick: t.tick, order: 1, bytes: [0xff, 0x58, 4, t.num, Math.round(Math.log2(t.den)), 24, 8] })),
  ];
  const out = [...ascii('MThd'), ...be32(6), 0, 1, ...[(f.tracks.length + 1) >> 8, (f.tracks.length + 1) & 255], (f.ppq >> 8) & 255, f.ppq & 255, ...chunk(meta)];
  f.tracks.forEach((t, i) => {
    const ch = Math.min(i, 15), nm = ascii(t.name);
    const ev = [{ tick: 0, order: -1, bytes: [0xff, 0x03, ...vlqBytes(nm.length), ...nm] }];
    t.notes.forEach(n => {
      /* note-offs sort before note-ons on the same tick, so a repeated note is not cut */
      ev.push({ tick: n.tick, order: 2, bytes: [0x90 | ch, n.midi & 127, Math.max(1, Math.min(127, n.vel))] });
      ev.push({ tick: n.tick + n.dur, order: 1, bytes: [0x80 | ch, n.midi & 127, 0] });
    });
    out.push(...chunk(ev));
  });
  return new Uint8Array(out);
}

/* ---------- time ---------- */
/** Seconds from the start of the file to a tick, through the tempo map (120 bpm until the first tempo). */
export function tickToSec(tick: number, f: Pick<Smf, 'ppq' | 'tempos'>): number {
  let sec = 0, last = 0, us = 500000;
  for (const t of f.tempos) {
    if (t.tick >= tick) break;
    sec += ((t.tick - last) / f.ppq) * (us / 1e6); last = t.tick; us = t.us;
  }
  return sec + ((tick - last) / f.ppq) * (us / 1e6);
}
/** Beats per minute at the start of the file. */
export const bpmOf = (f: Pick<Smf, 'tempos'>): number => Math.round(6e7 / (f.tempos[0]?.us ?? 500000));

export interface Bar { index: number; start: number; end: number; num: number; den: number; /** ticks in one beat (the time signature's denominator) */ beat: number }
/** The bars of the file, from tick 0 to past the last note (4/4 until the first time signature). */
export function barsOf(f: Pick<Smf, 'ppq' | 'timeSigs' | 'end'>): Bar[] {
  const sigs = f.timeSigs.length && f.timeSigs[0].tick === 0 ? f.timeSigs : [{ tick: 0, num: 4, den: 4 }, ...f.timeSigs];
  const out: Bar[] = [];
  let tick = 0, si = 0;
  while (tick < Math.max(f.end, 1)) {
    while (si + 1 < sigs.length && sigs[si + 1].tick <= tick) si++;
    const s = sigs[si], beat = (f.ppq * 4) / s.den, len = beat * s.num;
    out.push({ index: out.length, start: tick, end: tick + len, num: s.num, den: s.den, beat });
    tick += len;
  }
  return out;
}
