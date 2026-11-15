import { fmt, mod, pcOf } from '../notes';
import type { PChord } from '../symbols';
import type { Note } from '../types';
import type { VoiceMove } from './types';

/* Rule-generated explanations: same input → same text. */

/**
 * How the notes of the last passing chord move into TO. Half-step moves first (7th, then 3rd,
 * then the rest), then whole steps, then common tones.
 */
export function voiceMoves(last: PChord, to: PChord): VoiceMove[] {
  const order = [3, 1, 2, 0, 4, 5, 6].filter(i => i < last.tones.length).map(i => last.tones[i]);
  const find = (x: Note, d: number): Note | undefined => to.tones.find(y => mod(pcOf(y) - pcOf(x), 12) === mod(d, 12));
  const out: VoiceMove[] = [], used = new Set<number>();
  const add = (x: Note, d: number) => {
    if (used.has(pcOf(x))) return; // each pitch once, even when a chord doubles it
    const y = find(x, d);
    if (y) { used.add(pcOf(x)); out.push({ from: x, to: y, fromChord: last.symbol, toChord: to.symbol, semis: d }); }
  };
  /* a note that TO also contains would rather stay, so notes that have to move go first */
  const inTo = (x: Note): boolean => to.tones.some(y => pcOf(y) === pcOf(x));
  for (const d of [-1, 1]) order.filter(x => !inTo(x)).forEach(x => add(x, d));
  for (const d of [-1, 1]) order.filter(inTo).forEach(x => add(x, d));
  for (const d of [-2, 2]) order.filter(x => !inTo(x)).forEach(x => add(x, d));
  order.forEach(x => add(x, 0));
  return out;
}

const size = (s: number): string => (Math.abs(s) === 1 ? 'a half step' : 'a whole step');
export function moveText(m: VoiceMove): string {
  if (m.semis === 0) return `${fmt(m.from)} stays as a common tone`;
  return `${fmt(m.from)} in ${m.fromChord} ${m.semis < 0 ? 'falls' : 'rises'} ${size(m.semis)} to ${fmt(m.to)} in ${m.toChord}`;
}
/** Bullet 2: the two most telling moves. */
export function voiceLeadingText(moves: VoiceMove[]): string {
  if (!moves.length) return '';
  const pick = moves.filter(m => m.semis !== 0).slice(0, 2);
  const list = pick.length ? pick : moves.slice(0, 1);
  const s = list.map(moveText).join('; ');
  return 'Voice leading: ' + s + '.';
}
/** Bullet 3: notes outside the home key and where they come from. */
export function borrowedText(outside: Note[], homeTitle: string, source?: string): string {
  if (!outside.length) return `Every note is inside ${homeTitle}.`;
  const list = outside.map(fmt).join(', ');
  return `${list} ${outside.length === 1 ? 'is' : 'are'} outside ${homeTitle}${source ? `, borrowed from ${source}` : ''}.`;
}
