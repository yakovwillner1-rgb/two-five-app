import { homePcs } from './home';
import { mod, pcOf, transpose } from './notes';
import { KINDS, famOfKind, makeChord, simplifyRoot, type KindId, type PChord } from './symbols';
import { chordTensions } from './tensions';
import type { Key, Note } from './types';

/*
 * Name a chord from the notes being held (MIDI numbers). Pure: same notes + key → same answer.
 * A set of notes often has more than one name (C–E–G–A is C6 and Am7), so this returns every
 * reading, best first:
 *  1. the lowest note is the root and every chord tone is there;
 *  2. the lowest note is the root, the 5th is left out (the 5th is the note voicings drop first);
 *  3. an inversion: every tone is there, the lowest note is another chord tone (shown as a slash chord);
 *  4. a rootless voicing: 3rd, 7th and at least one extension, no root (and maybe no 5th).
 * Ties go to the chord that sits inside the key, then to the more common chord type.
 */
export type ReadingHow = 'root' | 'no5' | 'inversion' | 'rootless';
export interface Reading { chord: PChord; how: ReadingHow; /** higher = more likely */ score: number; /** one line saying how the notes were read */ note: string }

/** More common chord types first: used only to break ties between readings of the same notes. */
const COMMON: KindId[] = ['maj7', 'm7', '7', '', 'm', 'm7♭5', '°7', '6', 'm6', 'maj9', 'm9', '9', '13', '7sus4', 'sus4', '°', '+'];
const rank = (k: KindId): number => { const i = COMMON.indexOf(k); return i < 0 ? COMMON.length : i; };
const BASE: Record<ReadingHow, number> = { root: 100, no5: 92, inversion: 80, rootless: 55 };

/* Spelling of a root that is `semis` above the tonic: flats for ♭II ♭III ♭V ♭VI ♭VII; a diminished or
   half-diminished chord on a note outside the key is a raised degree (♯I°, ♯II°, ♯IV°, ♯V°). */
const FLAT_STEPS = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6], SHARP_STEPS = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
export function spellRoot(pc: number, kind: KindId, key: Key): Note {
  const semis = mod(pc - pcOf(key.tonic), 12);
  const raised = ['dim', 'hdim'].includes(KINDS[kind].fam) && !homePcs(key).has(pc);
  return simplifyRoot(transpose(key.tonic, { steps: (raised ? SHARP_STEPS : FLAT_STEPS)[semis], semis }));
}

const sameSet = (a: Set<number>, b: Set<number>): boolean => a.size === b.size && [...a].every(x => b.has(x));

export function recognize(midis: number[], key: Key): Reading[] {
  const pcs = new Set(midis.map(m => mod(m, 12)));
  if (pcs.size < 3) return [];
  const bass = mod(Math.min(...midis), 12), home = homePcs(key), out: Reading[] = [];
  for (let r = 0; r < 12; r++) {
    for (const kind of Object.keys(KINDS) as KindId[]) {
      const c = makeChord(spellRoot(r, kind, key), kind);
      const all = new Set(c.tones.map(pcOf));
      if (all.size !== c.tones.length) continue;
      const fifth = c.tones.find((_t, i) => c.labels[i] === '5'), no5 = new Set(all), noRoot = new Set(all), noRoot5 = new Set(all);
      if (fifth) { no5.delete(pcOf(fifth)); noRoot5.delete(pcOf(fifth)); }
      noRoot.delete(r); noRoot5.delete(r);
      let how: ReadingHow | null = null, dropped5 = false;
      if (sameSet(pcs, all)) how = bass === r ? 'root' : 'inversion';
      else if (fifth && sameSet(pcs, no5) && bass === r) { how = 'no5'; dropped5 = true; }
      else if (isRootlessKind(c) && (sameSet(pcs, noRoot) || (fifth && sameSet(pcs, noRoot5)))) { how = 'rootless'; dropped5 = !sameSet(pcs, noRoot); }
      if (!how) continue;
      const inKey = c.tones.every(t => home.has(pcOf(t)));
      const score = BASE[how] + (inKey ? 4 : 0) + (home.has(r) ? 2 : 0) - rank(kind) * 0.1 - (how === 'rootless' && dropped5 ? 3 : 0);
      const bassNote = how === 'inversion' ? c.tones.find(t => pcOf(t) === bass) : undefined;
      const chord = bassNote ? makeChord(c.root, kind, bassNote) : c;
      out.push({ chord, how, score, note: noteFor(how, chord, dropped5) });
    }
  }
  out.sort((a, b) => b.score - a.score);
  /* symmetric chords (°7, +) read the same from every note: keep the one on the bass */
  const seen = new Set<string>();
  return out.filter(x => { if (seen.has(x.chord.symbol)) return false; seen.add(x.chord.symbol); return true; }).slice(0, 4);
}
/** Rootless voicings are read only for 7th chords that carry an extension (3rd + 7th + color). */
function isRootlessKind(c: PChord): boolean {
  const has7 = c.labels.some(l => l === '7' || l === '♭7');
  return has7 && chordTensions(c).length > 0 && famOfKind(c) !== 'sus';
}
function noteFor(how: ReadingHow, c: PChord, dropped5: boolean): string {
  if (how === 'root') return 'Root in the bass, every chord tone played.';
  if (how === 'no5') return 'Root in the bass, 5th left out.';
  if (how === 'inversion') return `Inversion: ${c.symbol.split('/')[1]} in the bass.`;
  return `Rootless voicing: no root${dropped5 ? ' and no 5th' : ''}. A bass player would play the root.`;
}

/**
 * Does another key (same mode) hold more of these chords than the current one? Returns the best
 * other tonic pitch class when it holds every tone of at least `min` more chords, else null.
 */
export function betterKey(chords: PChord[], key: Key, keyOf: (pc: number) => Key, min = 2): { pc: number; fits: number; now: number } | null {
  const fits = (k: Key): number => { const h = homePcs(k); return chords.filter(c => c.tones.every(t => h.has(pcOf(t)))).length; };
  const now = fits(key);
  let best: { pc: number; fits: number; now: number } | null = null;
  for (let pc = 0; pc < 12; pc++) {
    if (pc === pcOf(key.tonic)) continue;
    const f = fits(keyOf(pc));
    if (f >= now + min && (!best || f > best.fits)) best = { pc, fits: f, now };
  }
  return best;
}
