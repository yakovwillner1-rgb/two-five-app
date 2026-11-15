import { describe, expect, it } from 'vitest';
import { GENRES, GENRE_IDS, type Style } from '../../src/data/styles';
import { FEELS, TECHNIQUE_IDS } from '../../src/data/techniques';
import { homeKey } from '../../src/theory/home';
import { passingChords } from '../../src/theory/passing/engine';
import { rankSuggestions, scoreOf } from '../../src/theory/passing/rank';
import { parseChord } from '../../src/theory/symbols';

const list = passingChords(parseChord('Dm7')!, parseChord('Cmaj7')!, homeKey(0, 'major'));
const top = (style: Style, n = 3) => rankSuggestions(list, style).shown.slice(0, n).map(r => r.suggestion.techniqueId);

describe('style system', () => {
  it('has the 8 genres and 6 feels of the spec, with a weight for every technique', () => {
    expect(GENRE_IDS).toEqual(['jazz', 'gospel', 'neosoul', 'funk', 'pop', 'lofi', 'bossa', 'film']);
    expect(FEELS).toEqual(['bright', 'dark', 'tense', 'lush', 'sad', 'dreamy']);
    for (const g of GENRE_IDS) for (const t of TECHNIQUE_IDS) { const w = GENRES[g].weights[t]; expect(w, `${g}.${t}`).toBeGreaterThanOrEqual(0); expect(w).toBeLessThanOrEqual(1); }
  });
  it('keeps the starting weights from SPEC §1.2', () => {
    const w = (g: keyof typeof GENRES) => GENRES[g].weights;
    expect([w('jazz').secIIV, w('jazz').tritone, w('jazz').iiSubV, w('jazz').backdoor, w('jazz').upperStruct, w('jazz').coltrane]).toEqual([1, 0.9, 0.8, 0.6, 0.7, 0.3]);
    expect([w('gospel').dimPass, w('gospel').gospelWalk, w('gospel').secDom, w('gospel').borrowed, w('gospel').upperStruct]).toEqual([1, 1, 0.9, 0.8, 0.6]);
    expect([w('neosoul').planing, w('neosoul').chromAbove, w('neosoul').borrowed, w('neosoul').susSub]).toEqual([1, 0.8, 0.7, 0.7]);
    expect([w('funk').chromAbove, w('funk').planing, w('funk').susSub]).toEqual([1, 0.8, 0.7]);
    expect([w('pop').secDom, w('pop').borrowed, w('pop').susSub]).toEqual([0.8, 0.9, 0.6]);
    expect([w('lofi').planing, w('lofi').borrowed, w('lofi').chromBelow]).toEqual([0.9, 0.7, 0.6]);
    expect([w('bossa').secIIV, w('bossa').tritone, w('bossa').dimPass]).toEqual([0.9, 0.7, 0.5]);
    expect([w('film').borrowed, w('film').coltrane, w('film').planing]).toEqual([1, 0.4, 0.6]);
  });
  it('switching genre reorders the results', () => {
    expect(top({ genre: 'jazz', feel: 'lush' }, 1)).toEqual(['secIIV']);
    expect(top({ genre: 'jazz', feel: 'tense' }, 1)).toEqual(['tritone']);
    expect(top({ genre: 'neosoul', feel: 'dreamy' }, 2)).toEqual(['planing', 'planing']);
    expect(top({ genre: 'pop', feel: 'sad' }, 1)).toEqual(['borrowed']);
    expect(top({ genre: 'film', feel: 'dreamy' }, 1)).toEqual(['borrowed']);
    const orders = new Set(GENRE_IDS.map(g => top({ genre: g, feel: 'bright' }, 6).join()));
    expect(orders.size).toBeGreaterThanOrEqual(6);
  });
  it('switching feel reorders the results', () => {
    const jazz = (feel: Style['feel']) => rankSuggestions(list, { genre: 'jazz', feel }).shown[0].suggestion;
    expect(jazz('bright').colorTags).toContain('bright');
    expect(jazz('tense').colorTags).toContain('tense');
    expect(rankSuggestions(list, { genre: 'pop', feel: 'sad' }).shown[0].suggestion.colorTags).toContain('sad');
    expect(new Set(FEELS.map(f => { const x = jazz(f); return x.techniqueId + x.variant; })).size).toBeGreaterThanOrEqual(3);
  });
  it('filters by the genre tension limit and by zero weight', () => {
    const pop = rankSuggestions(list, { genre: 'pop', feel: 'bright' });
    expect(pop.shown.every(r => r.suggestion.tension <= 0.45 && r.score > 0)).toBe(true);
    expect(pop.hidden.some(r => r.suggestion.techniqueId === 'coltrane')).toBe(true);
    expect(pop.shown.length + pop.hidden.length).toBe(list.length);
    const jazz = rankSuggestions(list, { genre: 'jazz', feel: 'bright' });
    expect(jazz.hidden).toHaveLength(0);
    expect(jazz.shown.some(r => r.suggestion.techniqueId === 'coltrane')).toBe(true);
  });
  it('scores are sorted and the order is stable', () => {
    for (const genre of GENRE_IDS) for (const feel of FEELS) {
      const r = rankSuggestions(list, { genre, feel }).shown;
      for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
      expect(r.map(x => x.score)).toEqual(r.map(x => scoreOf(x.suggestion, { genre, feel })));
    }
  });
});
