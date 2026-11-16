import { fmt } from '../theory/notes';
import type { PChord } from '../theory/symbols';
import { TUNING, voiceLead, type GChord, type GuitarStyle } from '../theory/guitar';
import { playbackVoicing } from '../theory/voicings';

/**
 * One piece of musical material, resolved once. What Connect shows (notes, keyboard, cue), what it plays
 * (see PlayEvent.midis), what A/B compares and what Play it checks all read these pitches.
 */
export interface StudyEvent {
  symbol: string;
  beats: number;
  /** the pitches actually played, low to high */
  midis: number[];
  /** note names aligned with midis (spelled from the chord) */
  names: string[];
  /** chord-member labels aligned with midis: R, 3, ♭3, 5, 7 ... */
  labels?: string[];
  /** guitar only: fret per string, low to high (null = muted), the string of each note, and the grip's name */
  frets?: (number | null)[];
  strings?: number[];
  grip?: string;
}
export interface Study { title: string; key: string; events: StudyEvent[]; /** how it is voiced; missing = piano */ instrument?: 'piano' | 'guitar' }

/** Beats of each chord: first and last 4, the ones between 2 (what the Move transport always played). */
export const defaultBeats = (n: number): number[] => Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1 ? 4 : 2));

export function resolveStudy(chords: PChord[], title: string, key: string, beats: number[] = defaultBeats(chords.length)): Study {
  let ref = 64;
  return {
    title, key,
    events: chords.map((c, i) => {
      const v = playbackVoicing(c.tones, ref); ref = v.ref;
      const notes = v.notes.map((m, j) => ({ midi: m, name: fmt(c.tones[j]), label: c.labels[j] })).sort((a, b) => a.midi - b.midi);
      return { symbol: c.symbol, beats: beats[i] ?? 2, midis: notes.map(n => n.midi), names: notes.map(n => n.name), labels: notes.map(n => n.label) };
    }),
  };
}
/** The same route voiced on guitar: the smoothest grips through the chords (see theory/guitar.ts voiceLead). */
export function resolveGuitarStudy(chords: GChord[], title: string, key: string, beats: number[] = defaultBeats(chords.length), style: GuitarStyle = 'jazz'): Study {
  const grips = voiceLead(chords, style);
  return {
    title, key, instrument: 'guitar',
    events: chords.map((c, i) => {
      const g = grips[i];
      return { symbol: c.symbol, beats: beats[i] ?? 2, midis: g.notes.map(n => n.midi), names: g.notes.map(n => fmt(n.note)), labels: g.notes.map(n => n.label), frets: g.frets, strings: g.notes.map(n => n.string), grip: g.name + ' · ' + g.sub };
    }),
  };
}
/** Start time and length (seconds) of every event at a tempo. `ids` are optional data-ev ids. */
export function studyEvents(study: Study, secondsPerBeat: number, ids?: string[]): { t: number; dur: number; midis: number[]; id?: string; strum?: number; inst?: 'guitar' }[] {
  let t = 0;
  const guitar = study.instrument === 'guitar';
  return study.events.map((e, i) => { const ev = { t, dur: e.beats * secondsPerBeat, midis: e.midis, ...(ids?.[i] ? { id: ids[i] } : {}), ...(guitar ? { strum: 0.022, inst: 'guitar' as const } : {}) }; t += ev.dur; return ev; });
}
export const studyLength = (study: Study): number => study.events.reduce((n, e) => n + e.beats, 0);
/** Note name with octave (C4 = middle C). */
export const pitchName = (e: StudyEvent, i: number): string => e.names[i] + Math.floor(e.midis[i] / 12 - 1);
const STRING_WORD = ['low E', 'A', 'D', 'G', 'B', 'high E'];
/** Where a note is on the neck, in words: "G string, fret 3". */
export function neckSpot(e: StudyEvent, i: number): string | null {
  const s = e.strings?.[i];
  return s == null ? null : `${STRING_WORD[s]} string, fret ${e.midis[i] - TUNING[s]}`;
}

export interface ListeningCue { text: string; fromIndex: number; toIndex: number; fromMidi: number; toMidi: number }
/**
 * One note worth listening to in the last move of the study, described from the notes actually played, in plain words.
 * Notes are paired by register only when both chords have the same number of notes; with different sizes only a note
 * that is held exactly is described. A listening aid, not a full analysis of the voices.
 */
export function listeningCue(study: Study): ListeningCue | null {
  const toIndex = study.events.length - 1, fromIndex = toIndex - 1;
  if (fromIndex < 0) return null;
  const a = study.events[fromIndex], b = study.events[toIndex];
  const candidates = a.midis.length === b.midis.length
    ? a.midis.map((m, i) => ({ i, j: i, d: b.midis[i] - m })).filter(x => Math.abs(x.d) <= 2)
    : a.midis.flatMap((m, i) => b.midis.map((n, j) => ({ i, j, d: n - m }))).filter(x => x.d === 0);
  candidates.sort((x, y) => Number(x.d === 0) - Number(y.d === 0) || Math.abs(x.d) - Math.abs(y.d));
  const c = candidates[0];
  if (!c) return null;
  const guitar = study.instrument === 'guitar', n1 = a.names[c.i], n2 = b.names[c.j];
  const at = (e: StudyEvent, i: number, name: string) => (guitar ? `${name} (${neckSpot(e, i)})` : name);
  const head = `From ${a.symbol} to ${b.symbol}, `;
  const dir = c.d < 0 ? 'down' : 'up', size = Math.abs(c.d);
  const how = guitar ? (size === 1 ? 'one fret' : 'two frets (a whole step)') : (size === 1 ? 'a half step (the very next key)' : 'a whole step (skip one key)');
  return {
    fromIndex, toIndex, fromMidi: a.midis[c.i], toMidi: b.midis[c.j],
    text: c.d === 0
      ? `${head}${at(a, c.i, n1)} does not move. That shared note ties the two chords together.`
      : `${head}${at(a, c.i, n1)} moves ${dir} ${how} to ${at(b, c.j, n2)}.`,
  };
}
