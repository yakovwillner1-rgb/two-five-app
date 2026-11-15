import { fmt, mod, pcOf } from '../notes';
import { famOfKind, type PChord } from '../symbols';
import { CORE, ORD, chordTensions, extensionOptions, scaleChoices } from '../tensions';
import type { Key, Note } from '../types';
import type { ExtInfo } from './types';

/*
 * Extensions as part of the move. When the start or landing chord carries extensions (9, 11, 13 and
 * their alterations), each way is "colored" and re-scored:
 *  1. every plain passing 7th chord takes the extended version, from the scale its resolution calls
 *     for (THEORY_SOURCES rule 9), that connects best to its neighbours;
 *  2. the way gets a fit: how smoothly the picked extensions carry through it.
 * "Connects" is the voice-leading order of THEORY_SOURCES rules 13–14: a common tone is best, then a
 * half step, then a whole step; a leap is worst.
 */

/** How well one note connects, by distance in semitones. */
const VALUE: Record<number, number> = { 0: 1, 1: 0.75, 2: 0.5 };
/** Score factor for a way = EXT_BASE + fit (fit 0–1). A tunable guess, like the feel factors. */
export const EXT_BASE = 0.5;
/** What a passing chord loses per step down its list of scales: the first scale (rule 9) wins unless another connects clearly better. */
export const SCALE_STEP = 0.25;

export interface Link { note: Note; label: string; /** signed semitones moved; null = no note within a whole step */ semis: number | null; other: Note | null; otherLabel: string; value: number }

/** Where a note of one chord goes in the next chord: stay, else a half step, else a whole step. */
export function carry(x: { note: Note; label: string }, target: PChord): Link {
  for (const d of [0, -1, 1, -2, 2]) {
    const i = target.tones.findIndex(t => mod(pcOf(t) - pcOf(x.note), 12) === mod(d, 12));
    if (i >= 0) return { ...x, semis: d, other: target.tones[i], otherLabel: target.labels[i], value: VALUE[Math.abs(d)] };
  }
  return { ...x, semis: null, other: null, otherLabel: '', value: 0 };
}
/** How a note of a chord is reached from the chord before: already there, else by a half step, else a whole step. */
export function approach(x: { note: Note; label: string }, source: PChord): Link {
  /* the 3rd and 7th of a dominant have their own resolutions (rule 12), so they are not free to step elsewhere */
  const busy = (i: number): boolean => famOfKind(source) === 'dom' && (source.labels[i] === '3' || source.labels[i] === '♭7');
  for (const d of [0, 1, -1, 2, -2]) {
    const i = source.tones.findIndex((t, k) => mod(pcOf(x.note) - pcOf(t), 12) === mod(d, 12) && !(d !== 0 && busy(k)));
    if (i >= 0) return { ...x, semis: d, other: source.tones[i], otherLabel: source.labels[i], value: VALUE[Math.abs(d)] };
  }
  return { ...x, semis: null, other: null, otherLabel: '', value: 0 };
}
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]): number => (xs.length ? sum(xs) / xs.length : 0);

/** Passing chords the engine may extend: plain 7th chords. Chords a technique already extended, triads, slash chords and upper structures stay as they are. */
const PLAIN = new Set(['7', 'm7', 'maj7']);
/** An extended version must keep the root, 3rd and 7th of the chord it replaces (the 5th may go). */
const keepsShell = (plain: PChord, ext: PChord): boolean =>
  plain.tones.every((t, i) => plain.labels[i] === '5' || ext.tones.some(e => pcOf(e) === pcOf(t)));

export interface Colored { chords: PChord[]; ext?: ExtInfo }

/**
 * Color one way for the extensions on FROM and TO. Returns the chords unchanged (and no `ext`) when
 * neither chord has extensions.
 */
export function colorWay(chords: PChord[], from: PChord, to: PChord, key: Key, replacesFrom = false): Colored {
  const fromT = replacesFrom ? [] : chordTensions(from), toT = chordTensions(to);
  if (!fromT.length && !toT.length) return { chords };
  const out = chords.slice(), changed: string[] = [];
  /* right to left: the last chord is fitted to TO first, then each earlier chord to the one after it */
  for (let j = out.length - 1; j >= 0; j--) {
    const c = out[j];
    if (!PLAIN.has(c.kind) || c.bass || c.upper) continue;
    const prev = j > 0 ? out[j - 1] : replacesFrom ? null : from, next = j < out.length - 1 ? out[j + 1] : to;
    const prevT = prev ? chordTensions(prev) : [], nextT = chordTensions(next);
    const score = (x: PChord): number =>
      sum(prevT.map(t => carry(t, x).value)) + mean(chordTensions(x).map(t => carry(t, next).value)) + sum(nextT.map(t => approach(t, x).value));
    let best = c, bestScore = score(c), bestWhy = '';
    const order = scaleChoices(c, next, key).map(ch => ch.scale.id);
    for (const o of extensionOptions(c, next, key)) {
      if (!keepsShell(c, o.chord)) continue;
      const s = score(o.chord) - SCALE_STEP * order.indexOf(o.scale.id);
      if (s > bestScore + 1e-9) { best = o.chord; bestScore = s; bestWhy = `${c.symbol} becomes ${o.chord.symbol} (${o.scale.name}). ${o.why}`; }
    }
    if (best !== c) { out[j] = best; changed.unshift(bestWhy); }
  }
  const first = out[0], last = out[out.length - 1];
  const leave = fromT.map(t => carry(t, first)), arrive = toT.map(t => approach(t, last));
  const vals = [...leave, ...arrive].map(l => l.value);
  const fit = vals.length ? mean(vals) : null;
  const lines = [
    ...leave.map(l => leaveText(l, from, first)),
    ...changed,
    ...arrive.map(l => arriveText(l, to, last)),
  ];
  return { chords: out, ext: { fit, factor: fit === null ? 1 : EXT_BASE + fit, lines } };
}

const ord = (label: string): string => ORD[label] ?? label;
const step = (d: number): string => (Math.abs(d) === 1 ? 'a half step' : 'a whole step');
const kindOf = (label: string): string => (CORE.has(label) ? '' : ', an extension');
function leaveText(l: Link, from: PChord, next: PChord): string {
  const who = `${fmt(l.note)}, the ${ord(l.label)} of ${from.symbol},`;
  if (l.semis === null) return `${who} has no note within a whole step in ${next.symbol}: it has to leap.`;
  const what = `the ${ord(l.otherLabel)} of ${next.symbol}`;
  return l.semis === 0 ? `${who} stays: it is ${what}.` : `${who} ${l.semis < 0 ? 'falls' : 'rises'} ${step(l.semis)} to ${fmt(l.other!)}, ${what}.`;
}
function arriveText(l: Link, to: PChord, last: PChord): string {
  const who = `${fmt(l.note)}, the ${ord(l.label)} of ${to.symbol},`;
  if (l.semis === null) return `${who} is not within a whole step of any note in ${last.symbol}: it arrives by leap.`;
  const what = `the ${ord(l.otherLabel)} of ${last.symbol}${kindOf(l.otherLabel)}`;
  return l.semis === 0 ? `${who} is already sounding: it is ${what}.` : `${who} is reached ${l.semis > 0 ? 'up' : 'down'} ${step(l.semis)} from ${fmt(l.other!)}, ${what}.`;
}
