import { S, curChords, curMode, earNotes } from '../state';
import { approach } from '../theory/home';
import { modeFrom } from '../theory/modes';
import { mod, pcOf } from '../theory/notes';
import { playbackVoicing } from '../theory/voicings';
import type { Chord, Note } from '../theory/types';
import { getOut, midiPanic, sendOff, sendOn, vel } from './midiOut';
import { audio, silence, synthTone } from './synth';

/* Playback: schedules chords and scales on the built-in synth or the chosen MIDI output. */
let token = 0, timers: ReturnType<typeof setTimeout>[] = [];

export interface PlayEvent { t: number; dur: number; tones: Note[]; id?: string }

export function clearLive(): void { document.querySelectorAll('.live').forEach(e => e.classList.remove('live')); }

const ICO_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>', ICO_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';
export function syncPlay(): void {
  document.querySelectorAll('.playbtn').forEach(b => {
    const on = !!S.playing;
    b.innerHTML = on ? ICO_STOP : ICO_PLAY; b.classList.toggle('on', on); b.setAttribute('aria-label', on ? 'Stop' : 'Play');
  });
}

export function stopAll(): void {
  token++; timers.forEach(clearTimeout); timers = []; S.playing = ''; midiPanic();
  silence();
  clearLive(); syncPlay();
}

function midiTone(out: MIDIOutput, m: number, t0: number, dur: number, v: number): void {
  const d = Math.max(0, (t0 - audio().currentTime) * 1000);
  timers.push(setTimeout(() => sendOn(out, m, vel(v)), d));
  timers.push(setTimeout(() => sendOff(out, m), d + Math.max(60, dur * 1000 - 20)));
}
/** One note at audio-clock time t0, to MIDI out when a port is chosen, else the synth. */
export function tone(midi: number, t0: number, dur: number, vol: number): void {
  const out = getOut();
  if (out) { midiTone(out, midi, t0, dur, vol); return; }
  synthTone(midi, t0, dur, vol);
}

export function playSeq(events: PlayEvent[], tag: string, done?: () => void): void {
  const c = audio(); stopAll(); S.playing = tag; syncPlay();
  const tok = token, t0 = c.currentTime + 0.06;
  let ref = 64, end = 0;
  events.forEach(ev => {
    const v = playbackVoicing(ev.tones, ref); ref = v.ref;
    v.notes.forEach((m, i) => { tone(m, t0 + ev.t, ev.dur, i === 0 ? 0.2 : 0.12); });
    timers.push(setTimeout(() => {
      if (tok !== token) return;
      clearLive();
      if (ev.id) document.querySelectorAll('[data-ev="' + ev.id + '"]').forEach(e => e.classList.add('live'));
    }, ev.t * 1000 + 60));
    end = Math.max(end, ev.t + ev.dur);
  });
  timers.push(setTimeout(() => { if (tok !== token) return; if (done) done(); else stopAll(); }, end * 1000 + 60));
}
const beat = (): number => 60 / S.tempo;

function moveEvents(): PlayEvent[] {
  const H = curChords(), from = H[S.from], to = H[S.to], ap = approach(to, S.flavor)!, b = beat();
  return [{ t: 0, dur: 4 * b, tones: from.tones, id: 'mf' }, { t: 4 * b, dur: 2 * b, tones: ap.ii.tones, id: 'm2' }, { t: 6 * b, dur: 2 * b, tones: ap.V.tones, id: 'm5' }, { t: 8 * b, dur: 4 * b, tones: to.tones, id: 'mt' }];
}
export function playMove(): void { playSeq(moveEvents(), 'move', () => { if (S.loop && S.playing === 'move' && S.tab === 'move') playMove(); else stopAll(); }); }

function progEvents(): PlayEvent[] {
  const H = curChords(), b = beat();
  let t = 0;
  const ev: PlayEvent[] = [];
  S.prog.forEach((p, i) => {
    const tc = H[p.d], ap = p.a ? approach(tc, S.flavor) : null;
    if (ap) { ev.push({ t, dur: 2 * b, tones: ap.ii.tones, id: 'p' + i + 'a' }); t += 2 * b; ev.push({ t, dur: 2 * b, tones: ap.V.tones, id: 'p' + i + 'b' }); t += 2 * b; }
    ev.push({ t, dur: 4 * b, tones: tc.tones, id: 'p' + i + 'c' }); t += 4 * b;
  });
  return ev;
}
export function playProg(): void { if (!S.prog.length) return; playSeq(progEvents(), 'prog', () => { if (S.loop && S.playing === 'prog' && S.tab === 'prog') playProg(); else stopAll(); }); }

export function playChords(list: Chord[], id?: string[]): void {
  const b = beat();
  let t = 0;
  playSeq(list.map((c, i) => { const e = { t, dur: (i === list.length - 1 ? 4 : 2) * b, tones: c.tones, id: id && id[i] }; t += 2 * b; return e; }), 'x');
}
/** A voicing as one slightly rolled chord. */
export function playNotes(ms: number[]): void {
  const c = audio(); stopAll();
  const t0 = c.currentTime + 0.05;
  ms.forEach((m, i) => tone(m, t0 + i * 0.03, 2.8, i === 0 ? 0.17 : 0.12));
}
/** A scale up and down over a drone on its root. Options: play the chord first, or the major scale first. */
export function playScale(notes: Note[], opt: { chord?: Chord; compare?: boolean } = {}): void {
  const c = audio(); stopAll(); S.playing = 'scale';
  const tok = token, t0 = c.currentTime + 0.06, e = 60 / S.tempo / 2, r = pcOf(notes[0]);
  let t = 0;
  const run = (ns: Note[], hl: boolean) => {
    const m0 = 53 + mod(r - 53, 12), up = ns.map(n => m0 + mod(pcOf(n) - r, 12)).concat(m0 + 12);
    const seq = up.map((m, i) => [m, i % 7]).concat(up.slice(0, -1).reverse().map((m, i) => [m, 6 - i]));
    const start = t;
    seq.forEach(([m, id]) => {
      tone(m, t0 + t, e * 1.7, 0.14);
      if (hl) timers.push(setTimeout(() => { if (tok !== token) return; clearLive(); document.querySelectorAll('[data-ev="s' + id + '"]').forEach(x => x.classList.add('live')); }, t * 1000 + 60));
      t += e;
    });
    const len = t - start + e * 2;
    tone(36 + r, t0 + start, len, 0.09); tone(43 + r, t0 + start, len, 0.05); t += e * 3;
  };
  if (opt.chord) { const v = playbackVoicing(opt.chord.tones, 64); v.notes.forEach((m, i) => tone(m, t0 + t, e * 5, i ? 0.12 : 0.18)); t += e * 6; }
  if (opt.compare) run(modeFrom(notes[0], 'major', 0), false);
  run(notes, true);
  timers.push(setTimeout(() => { if (tok === token) stopAll(); }, t * 1000 + 100));
}

export function canPlay(): boolean { return ['move', 'prog', 'modes'].includes(S.tab) || (S.tab === 'quiz' && S.dmode === 'ear'); }
export function togglePlay(): void {
  if (S.playing) { stopAll(); return; }
  if (S.tab === 'move') playMove(); else if (S.tab === 'prog') playProg();
  else if (S.tab === 'modes') playScale(curMode().notes);
  else if (S.tab === 'quiz' && S.dmode === 'ear') playScale(earNotes());
}
