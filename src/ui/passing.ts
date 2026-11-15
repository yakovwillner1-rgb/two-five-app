import { S, curChords, curKey, type ProgChord } from '../state';
import { pcOf } from '../theory/notes';
import { passingChords } from '../theory/passing/engine';
import { rankSuggestions, type Ranked } from '../theory/passing/rank';
import type { Suggestion } from '../theory/passing/types';
import { KINDS, fromChart, makeChord, parseChord, passVoicing, type KindId, type PChord } from '../theory/symbols';
import { baseKind, extensionOptions, plainOf } from '../theory/tensions';
import type { Note } from '../theory/types';
import { kbAbs, type KeyItem } from './keyboards';

/* Shared by the Move and Progression views: resolving chords, ranking ways, small HTML pieces. */
export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
/** Key that identifies one way of getting somewhere: "techniqueId.variant". */
export const wayKey = (s: Suggestion): string => s.techniqueId + '.' + s.variant;

/** A typed symbol when it can be read, else the chord on that degree of the home key. */
export function pickChord(sym: string | null | undefined, deg: number): { chord: PChord; bad: boolean } {
  const typed = sym ? parseChord(sym) : null;
  return { chord: typed ?? fromChart(curChords()[deg]), bad: !!sym && !typed };
}
/**
 * The versions of a chord the extension picker offers: the plain chord first, then the extended
 * chords its scales allow (the scales depend on the chord it moves to, when there is one).
 */
export function extChoices(c: PChord, next: PChord | null): PChord[] {
  if (c.bass || c.upper) return [];
  const plain = plainOf(c), key = curKey(), out = [plain], seen = new Set<KindId>([plain.kind]);
  for (const o of [...(next ? extensionOptions(plain, next, key) : []), ...extensionOptions(plain, null, key)]) {
    if (!seen.has(o.chord.kind)) { seen.add(o.chord.kind); out.push(o.chord); }
  }
  if (!seen.has(c.kind)) out.splice(1, 0, c);
  return out;
}
/** A chord with the picked extension, when that extension is one its scales allow. */
export const withExt = (c: PChord, ext: KindId | null, next: PChord | null): PChord =>
  (ext ? extChoices(c, next).find(x => x.kind === ext) : null) ?? c;
/** Every way from → to, ranked for the current genre and feel. */
export function rankedWays(from: PChord, to: PChord): { shown: Ranked[]; hidden: Ranked[] } {
  return rankSuggestions(passingChords(from, to, curKey()), { genre: S.pgenre, feel: S.pfeel });
}
/**
 * Find a stored way for a pair of chords: "techniqueId.variant", or just "techniqueId", which means
 * its default variant (for the 2-5: dark into a minor chord, bright otherwise, as the app always did).
 */
export function findWay(from: PChord, to: PChord, key: string | null): Suggestion | null {
  if (!key) return null;
  const all = passingChords(from, to, curKey());
  return all.find(s => wayKey(s) === key) ?? all.find(s => s.techniqueId === key) ?? null;
}

/** Notes to play: bass first (the slash bass when there is one), each pitch class once. */
export function playTones(c: PChord): Note[] {
  const out: Note[] = [], seen = new Set<number>();
  [...(c.bass ? [c.bass] : []), ...c.tones].forEach(n => { if (!seen.has(pcOf(n))) { seen.add(pcOf(n)); out.push(n); } });
  return out;
}
const ROLE = { root: 'var(--gold)', guide: 'var(--c2)', color: 'var(--c0)' };
export function chordKeys(c: PChord): string {
  const items: KeyItem[] = passVoicing(c).map(v => ({ m: v.midi, n: v.note, lab: v.label, col: ROLE[v.role] }));
  return kbAbs(items, 24, true);
}
/** One option in a list of ways. `attrs` carries the data-a action. */
export function wayButton(s: Suggestion, attrs: string, on: boolean, dim = false): string {
  const bars = Math.max(1, Math.round(s.tension * 5));
  return `<button class="way${dim ? ' off' : ''}" ${attrs} aria-pressed="${on}">
    <span class="wn">${s.name}${s.variantLabel ? ` <small>${s.variantLabel}</small>` : ''}</span>
    <span class="wc">${s.chords.map(c => c.symbol).join(' → ')}</span>
    <span class="wt">${s.ext && s.ext.fit !== null ? `<span class="ptag fit" title="How smoothly your extensions carry through this way">ext ${Math.round(s.ext.fit * 100)}%</span>` : ''}${s.colorTags.map(t => `<span class="ptag${t === S.pfeel ? ' on' : ''}">${t}</span>`).join('')}<span class="bright" style="margin:0 0 0 auto" title="Tension">${[0, 1, 2, 3, 4].map(k => `<i class="${k < bars ? 'on' : ''}"></i>`).join('')}</span></span>
  </button>`;
}
/** The chord a progression item stands for, before its picked extension. */
export const progBase = (p: ProgChord): PChord => pickChord(p.sym, p.d).chord;
/**
 * The chord a progression item stands for. A picked extension replaces the chord type when it is
 * an extended version of that same chord (so it still holds after the chords around it change).
 */
export function progChord(p: ProgChord): PChord {
  const c = progBase(p);
  if (!p.ext || c.bass || c.upper || !(p.ext in KINDS)) return c;
  const plain = plainOf(c);
  return baseKind(p.ext) === plain.kind ? makeChord(plain.root, p.ext) : c;
}
