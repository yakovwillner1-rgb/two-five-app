import { FEEL_MATCH, FEEL_MISS, GENRES, type Style } from '../../data/styles';
import type { Suggestion } from './types';

export interface Ranked { suggestion: Suggestion; score: number }
/** Score = how typical the technique is for the genre × whether its color matches the feel × how well it carries the picked extensions. */
export function scoreOf(s: Suggestion, style: Style): number {
  return GENRES[style.genre].weights[s.techniqueId] * (s.colorTags.includes(style.feel) ? FEEL_MATCH : FEEL_MISS) * (s.ext?.factor ?? 1);
}
/**
 * Order suggestions for a style. `shown`: best first (ties: calmer first, then catalogue order).
 * `hidden`: left out because the genre never uses the technique or it is above the genre's tension limit.
 */
export function rankSuggestions(list: Suggestion[], style: Style): { shown: Ranked[]; hidden: Ranked[] } {
  const g = GENRES[style.genre];
  const all = list.map((suggestion, i) => ({ suggestion, score: scoreOf(suggestion, style), i }));
  all.sort((a, b) => b.score - a.score || a.suggestion.tension - b.suggestion.tension || a.i - b.i);
  const keep = (r: { suggestion: Suggestion; score: number }) => r.score > 0 && r.suggestion.tension <= g.maxTension;
  const strip = ({ suggestion, score }: { suggestion: Suggestion; score: number }): Ranked => ({ suggestion, score });
  return { shown: all.filter(keep).map(strip), hidden: all.filter(r => !keep(r)).map(strip) };
}
