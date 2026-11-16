import { fmt } from '../theory/notes';
import type { PChord } from '../theory/symbols';
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
}
export interface Study { title: string; key: string; events: StudyEvent[] }

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
/** Start time and length (seconds) of every event at a tempo. `ids` are optional data-ev ids. */
export function studyEvents(study: Study, secondsPerBeat: number, ids?: string[]): { t: number; dur: number; midis: number[]; id?: string }[] {
  let t = 0;
  return study.events.map((e, i) => { const ev = { t, dur: e.beats * secondsPerBeat, midis: e.midis, ...(ids?.[i] ? { id: ids[i] } : {}) }; t += ev.dur; return ev; });
}
export const studyLength = (study: Study): number => study.events.reduce((n, e) => n + e.beats, 0);
/** Note name with octave (C4 = middle C). */
export const pitchName = (e: StudyEvent, i: number): string => e.names[i] + Math.floor(e.midis[i] / 12 - 1);

export interface ListeningCue { text: string; fromIndex: number; toIndex: number; fromMidi: number; toMidi: number }
/**
 * One voice worth listening to in the last move of the study, described from the pitches actually played.
 * Voices are paired by register only when both chords have the same number of notes; with different
 * sizes only a pitch that is held exactly is described. A listening aid, not a full voice analysis.
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
  const from = pitchName(a, c.i), to = pitchName(b, c.j);
  return {
    fromIndex, toIndex, fromMidi: a.midis[c.i], toMidi: b.midis[c.j],
    text: c.d === 0
      ? `${from} stays at the same pitch from ${a.symbol} to ${b.symbol}.`
      : `${from} ${c.d < 0 ? 'falls' : 'rises'} ${Math.abs(c.d) === 1 ? 'a half step' : 'a whole step'} to ${to} from ${a.symbol} to ${b.symbol}.`,
  };
}
