import { TECHNIQUES, TECHNIQUE_IDS, VARIANTS, type TechniqueId } from '../../data/techniques';
import { homePcs, homeTitle } from '../home';
import { mod, pcOf } from '../notes';
import { degreeNumeral, famOfKind, type PChord } from '../symbols';
import type { Key, Note } from '../types';
import { plainOf } from '../tensions';
import { colorWay } from './color';
import { borrowedText, voiceLeadingText, voiceMoves } from './explain';
import { TECHNIQUE_FNS } from './techniques';
import type { PassCtx, Suggestion } from './types';

/** Context shared by every technique for one FROM → TO pair. */
export function passCtx(from: PChord, to: PChord, key: Key): PassCtx {
  const toSemis = mod(pcOf(to.root) - pcOf(key.tonic), 12);
  const lower = ['min', 'hdim', 'dim'].includes(famOfKind(to));
  return { toSemis, fromSemis: mod(pcOf(from.root) - pcOf(key.tonic), 12), of: toSemis === 0 ? '' : '/' + degreeNumeral(to.root, key, lower) };
}

/** Every way the catalogue knows to get from FROM to TO, in catalogue order (unranked). */
export function passingChords(from: PChord, to: PChord, key: Key, only?: TechniqueId[]): Suggestion[] {
  /* the same chord, also when one of the two is an extended version of the other (Dm9 and Dm7) */
  const same = (c: PChord, x: PChord): boolean => c.symbol === x.symbol || plainOf(c).symbol === plainOf(x).symbol;
  const ctx = passCtx(from, to, key), home = homePcs(key), title = homeTitle(key), out: Suggestion[] = [];
  for (const id of only ?? TECHNIQUE_IDS) {
    for (const d of TECHNIQUE_FNS[id](from, to, key, ctx)) {
      let chords = d.chords, rn = d.romanNumerals;
      /* don't repeat the chord we are already on, or land early on TO */
      if (!d.replacesFrom) while (chords.length && same(chords[0], from)) { chords = chords.slice(1); rn = rn.slice(1); }
      while (chords.length && same(chords[chords.length - 1], to)) { chords = chords.slice(0, -1); rn = rn.slice(0, -1); }
      if (!chords.length) continue;
      /* extensions on FROM or TO: extend the passing chords to match and measure the fit */
      const col = colorWay(chords, from, to, key, d.replacesFrom);
      chords = col.chords;
      const v = VARIANTS[id + '.' + d.variant];
      if (!v) throw new Error('No catalogue entry for ' + id + '.' + d.variant);
      const seen = new Set<number>(), outside: Note[] = [];
      chords.forEach(c => c.tones.forEach(n => { const pc = pcOf(n); if (!home.has(pc) && !seen.has(pc)) { seen.add(pc); outside.push(n); } }));
      const moves = voiceMoves(chords[chords.length - 1], to);
      const explanation = [d.fn, voiceLeadingText(moves), borrowedText(outside, title, d.source), d.pull].filter(Boolean);
      out.push({
        techniqueId: id, name: TECHNIQUES[id].name, variant: d.variant, variantLabel: d.variantLabel, chords, romanNumerals: rn,
        tension: v.tension, colorTags: v.tags, outsideNotes: outside, voiceLeading: moves, explanation, replacesFrom: d.replacesFrom, ext: col.ext,
      });
    }
  }
  return out;
}
