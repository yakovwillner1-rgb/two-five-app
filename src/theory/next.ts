import { homeChords } from './home';
import { fmt, mod, pcOf, transpose } from './notes';
import { spellRoot } from './recognize';
import { IV, famOfKind, fromChart, makeChord, romanNumeral, type KindId, type PChord } from './symbols';
import type { Key } from './types';

/*
 * Where a chord usually goes next. Sources: docs/THEORY_SOURCES.md rule 17.
 *  - A chord of the key follows the standard chart of diatonic progressions:
 *    major  iii → vi → ii / IV → V / vii° → I, plus V → vi (deceptive) and IV → I (plagal); I goes anywhere.
 *    minor  ♭VII → ♭III → ♭VI → ii° / iv → V → i, plus V → ♭VI and iv → i; i goes anywhere.
 *  - A chord from outside the key goes where its type points (rule 15): a dominant 7 down a fifth or,
 *    as a tritone sub, down a half step; a m7 up a fourth to its V7; a m7♭5 to its V7♭9; a diminished
 *    chord up a half step; a borrowed major chord back home.
 */
export interface NextOption { chord: PChord; why: string }

const CHART: Record<Key['mode'], number[][]> = {
  major: [[3, 4, 5, 1, 2], [4, 6], [5, 3], [4, 1, 0, 6], [0, 5], [1, 3], [0]],
  minor: [[3, 4, 5, 6, 2, 1], [4], [5], [4, 1, 0], [0, 5], [1, 3], [2]],
};
const MOTION: Record<number, string> = {
  1: 'the root moves up a half step', 2: 'the root moves up a whole step', 3: 'the root moves up a third', 4: 'the root moves up a third',
  5: 'the root drops a fifth, a very common move', 7: 'the root moves up a fifth', 8: 'the root drops a third, so two notes stay the same',
  9: 'the root drops a third, so two notes stay the same', 10: 'the root drops a whole step', 11: 'the root drops a half step', 6: 'the root jumps three whole steps',
};

export function nextChords(c: PChord, key: Key): NextOption[] {
  const H = homeChords(key).map(fromChart), r = pcOf(c.root), fam = famOfKind(c), out: NextOption[] = [];
  const rn = (x: PChord) => romanNumeral(x, key);
  const add = (chord: PChord, why: string) => { if (chord.symbol !== c.symbol && !out.some(o => o.chord.symbol === chord.symbol)) out.push({ chord, why }); };
  /** the chord of the key on a pitch class, else a chord of the given kind there */
  const on = (pc: number, kind: KindId): PChord => H.find(h => pcOf(h.root) === mod(pc, 12)) ?? makeChord(spellRoot(mod(pc, 12), kind, key), kind);
  const d = H.findIndex(h => pcOf(h.root) === r && famOfKind(h) === fam);

  if (d >= 0) {
    const major = key.mode === 'major';
    for (const t of CHART[key.mode][d]) {
      const x = H[t], step = mod(pcOf(x.root) - r, 12);
      const named = d === 4 && t === 5 ? ' This is called a deceptive cadence: the V chord goes to ' + rn(x) + ' instead of home, a pleasant surprise.'
        : d === 3 && t === 0 ? ' This is the "Amen" ending (IV to I).'
        : d === 4 && t === 0 ? ' This is the classic ending: the V chord goes home.'
        : d === 0 ? ' From the home chord you can go anywhere.'
        : major && d === 6 && t === 0 ? ' The chord a half step below home leads straight home.' : '';
      add(x, `${rn(c)} → ${rn(x)}: ${MOTION[step]}.${named}`);
    }
    if (fam === 'hdim') { const v = makeChord(transpose(c.root, IV.P4), '7♭9'); add(v, `As the ii chord of a minor two-five it goes to ${v.symbol}, which leads on to ${fmt(transpose(c.root, IV.m7))} minor.`); }
    return out;
  }
  if (fam === 'dom') {
    const t5 = on(r + 5, 'maj7'), t1 = on(r + 11, 'maj7'), t2 = on(r + 2, 'maj7');
    add(t5, `A dominant 7 chord usually drops a fifth: ${c.symbol} is the five chord of ${t5.symbol}.`);
    add(t1, `As a tritone sub it slides down a half step into ${t1.symbol}.`);
    if (mod(r - pcOf(key.tonic), 12) === 10) add(t2, `As the "back door" ♭VII7 it steps up a whole step into ${t2.symbol}.`);
  } else if (fam === 'min') {
    const v = makeChord(transpose(c.root, IV.P4), '7');
    add(v, `As a ii chord it goes up a fourth to its five chord, ${v.symbol}.`);
    add(H[0], `Back to the home chord, ${H[0].symbol}.`);
  } else if (fam === 'hdim') {
    const v = makeChord(transpose(c.root, IV.P4), '7♭9');
    add(v, `As the ii chord of a minor two-five it goes up a fourth to ${v.symbol}.`);
  } else if (fam === 'dim') {
    const t = on(r + 1, 'm7');
    add(t, `A diminished chord a half step below leads up into ${t.symbol}.`);
    const ct = H.find(h => pcOf(h.root) === r);
    if (ct && !['dim', 'hdim'].includes(famOfKind(ct))) add(ct, `As a diminished chord with the same bottom note, it opens out into ${ct.symbol}.`);
  } else if (fam === 'sus') {
    add(makeChord(c.root, ''), 'The 4th drops down to the 3rd.');
    add(on(r + 5, 'maj7'), 'Or straight down a fifth.');
  } else if (fam === 'aug') {
    const t = on(r + 5, 'maj7');
    add(t, `The raised 5th leans up a half step into the 3rd of ${t.symbol}.`);
  } else {
    add(H[0], `A major chord from outside the key (${rn(c)}) drops back to the home chord.`);
    add(H[4], `Or to the V, ${H[4].symbol}, which then goes home.`);
  }
  return out;
}
