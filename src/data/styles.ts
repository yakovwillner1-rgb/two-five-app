import type { Feel, TechniqueId } from './techniques';

/* Style system: genre × feel. Plain data, meant to be tuned.
   Weights marked "spec" come from docs/SPEC.md §1.2. The rest are first guesses so that every
   technique has a place in every genre; see docs/OPEN_QUESTIONS.md. */
export type Genre = 'jazz' | 'gospel' | 'neosoul' | 'funk' | 'pop' | 'lofi' | 'bossa' | 'film';
export interface GenreStyle {
  label: string;
  /** 0–1 per technique: how typical it is for the genre */
  weights: Record<TechniqueId, number>;
  /** chord colors the genre likes (used by the voicing engine in Phase 2) */
  extensions: string[];
  /** preferred voicing types (Phase 2) */
  voicings: string[];
  /** suggestions above this tension are hidden */
  maxTension: number;
  /** typical chords per bar (Phase 3) */
  chordsPerBar: number;
}
export const GENRES: Record<Genre, GenreStyle> = {
  jazz: {
    label: 'Jazz',
    weights: { secIIV: 1, tritone: 0.9, iiSubV: 0.8, upperStruct: 0.7, backdoor: 0.6, coltrane: 0.3, /* spec ↑ */ secDom: 0.85, turnaround: 0.7, dimPass: 0.5, dimCT: 0.4, chromAbove: 0.4, chromBelow: 0.35, susSub: 0.4, lineCliche: 0.4, borrowed: 0.4, planing: 0.3, gospelWalk: 0.1 },
    extensions: ['9', '13', '♯11', '♭9', '♯9', '♭13'], voicings: ['rootless', 'drop2', 'shell'], maxTension: 1, chordsPerBar: 2,
  },
  gospel: {
    label: 'Gospel',
    weights: { dimPass: 1, gospelWalk: 1, secDom: 0.9, borrowed: 0.8, upperStruct: 0.6, /* spec ↑ */ turnaround: 0.8, secIIV: 0.7, backdoor: 0.6, susSub: 0.6, dimCT: 0.5, tritone: 0.5, chromAbove: 0.4, chromBelow: 0.4, lineCliche: 0.3, planing: 0.3, iiSubV: 0.3, coltrane: 0.05 },
    extensions: ['9', '11', '13', '♯9', '♭13'], voicings: ['spread', 'upperStructure', 'block'], maxTension: 0.85, chordsPerBar: 2,
  },
  neosoul: {
    label: 'Neo-soul / R&B',
    weights: { planing: 1, chromAbove: 0.8, borrowed: 0.7, susSub: 0.7, /* spec ↑ */ backdoor: 0.7, tritone: 0.6, secIIV: 0.6, chromBelow: 0.6, iiSubV: 0.5, secDom: 0.5, lineCliche: 0.4, upperStruct: 0.4, dimPass: 0.3, dimCT: 0.3, turnaround: 0.3, gospelWalk: 0.2, coltrane: 0.05 },
    extensions: ['9', '11', '13'], voicings: ['cluster', 'rootless', 'spread'], maxTension: 0.8, chordsPerBar: 2,
  },
  funk: {
    label: 'Funk',
    weights: { chromAbove: 1, planing: 0.8, susSub: 0.7, /* spec ↑ */ chromBelow: 0.8, secDom: 0.5, tritone: 0.4, backdoor: 0.3, borrowed: 0.3, secIIV: 0.3, dimPass: 0.2, lineCliche: 0.2, turnaround: 0.2, dimCT: 0.15, iiSubV: 0.15, upperStruct: 0.15, gospelWalk: 0.15, coltrane: 0 },
    extensions: ['9', '13', 'm11'], voicings: ['shell', 'quartal'], maxTension: 0.6, chordsPerBar: 1,
  },
  pop: {
    label: 'Pop',
    weights: { borrowed: 0.9, secDom: 0.8, susSub: 0.6, /* spec ↑ */ lineCliche: 0.5, turnaround: 0.5, gospelWalk: 0.3, secIIV: 0.3, dimPass: 0.3, planing: 0.2, dimCT: 0.15, backdoor: 0.15, chromAbove: 0.1, chromBelow: 0.1, tritone: 0.05, iiSubV: 0.05, upperStruct: 0, coltrane: 0 },
    extensions: ['add9'], voicings: ['triad', 'close'], maxTension: 0.45, chordsPerBar: 1,
  },
  lofi: {
    label: 'Lo-fi',
    weights: { planing: 0.9, borrowed: 0.7, chromBelow: 0.6, /* spec ↑ */ chromAbove: 0.5, secIIV: 0.5, backdoor: 0.5, susSub: 0.5, tritone: 0.4, lineCliche: 0.4, secDom: 0.4, iiSubV: 0.3, dimCT: 0.25, dimPass: 0.2, turnaround: 0.3, upperStruct: 0.1, gospelWalk: 0.1, coltrane: 0 },
    extensions: ['maj9', 'm9', 'm11'], voicings: ['rootless', 'close'], maxTension: 0.6, chordsPerBar: 1,
  },
  bossa: {
    label: 'Bossa',
    weights: { secIIV: 0.9, tritone: 0.7, dimPass: 0.5, /* spec ↑ */ secDom: 0.7, lineCliche: 0.6, turnaround: 0.6, dimCT: 0.5, iiSubV: 0.5, backdoor: 0.3, susSub: 0.3, chromAbove: 0.3, chromBelow: 0.3, borrowed: 0.3, planing: 0.2, upperStruct: 0.2, gospelWalk: 0.05, coltrane: 0.05 },
    extensions: ['6/9', 'maj7', 'm6'], voicings: ['shell', 'drop2'], maxTension: 0.7, chordsPerBar: 2,
  },
  film: {
    label: 'Film',
    weights: { borrowed: 1, planing: 0.6, coltrane: 0.4, /* spec ↑ */ lineCliche: 0.6, chromAbove: 0.5, chromBelow: 0.5, susSub: 0.5, dimCT: 0.4, secDom: 0.4, tritone: 0.3, backdoor: 0.3, secIIV: 0.3, dimPass: 0.3, turnaround: 0.2, iiSubV: 0.2, upperStruct: 0.2, gospelWalk: 0.1 },
    extensions: ['maj7♯11', 'add9'], voicings: ['spread', 'close'], maxTension: 0.85, chordsPerBar: 1,
  },
};
export const GENRE_IDS = Object.keys(GENRES) as Genre[];

/** How much a suggestion's score is scaled when its color tags include / don't include the chosen feel. */
export const FEEL_MATCH = 1.5;
export const FEEL_MISS = 0.7;
export const FEEL_LABELS: Record<Feel, string> = { bright: 'Bright', dark: 'Dark', tense: 'Tense', lush: 'Lush', sad: 'Sad', dreamy: 'Dreamy' };
export interface Style { genre: Genre; feel: Feel }
