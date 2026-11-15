import type { Feel, TechniqueId } from '../../data/techniques';
import type { PChord } from '../symbols';
import type { Key, Note } from '../types';

/** What a technique function returns: the chords and the facts the explanation is built from. */
export interface Draft {
  /** key into VARIANTS (after the technique id), e.g. "dark" */
  variant: string;
  /** label shown next to the technique name, e.g. "dark" or "I–vi–ii–V" */
  variantLabel?: string;
  /** the passing chords, in order, between FROM and TO */
  chords: PChord[];
  romanNumerals: string[];
  /** bullet 1: what the chords are, functionally */
  fn: string;
  /** bullet 4: why it pulls toward TO */
  pull: string;
  /** where outside notes come from, e.g. "F major" → "… borrowed from F major" */
  source?: string;
  /** the chords are played in place of FROM (line cliché) */
  replacesFrom?: boolean;
}
export interface PassCtx {
  /** semitones from the key's tonic to TO's root / FROM's root */
  toSemis: number;
  fromSemis: number;
  /** "/IV" style suffix naming TO in the key; empty when TO is the tonic */
  of: string;
}
export type Technique = (from: PChord, to: PChord, key: Key, ctx: PassCtx) => Draft[];

/** One note moving from the last passing chord into TO. */
export interface VoiceMove { from: Note; to: Note; fromChord: string; toChord: string; /** signed semitones; 0 = common tone */ semis: number }

export interface Suggestion {
  techniqueId: TechniqueId;
  name: string;
  variant: string;
  variantLabel?: string;
  chords: PChord[];
  romanNumerals: string[];
  /** 0–1 */
  tension: number;
  colorTags: Feel[];
  /** notes of the passing chords that are outside the home key */
  outsideNotes: Note[];
  voiceLeading: VoiceMove[];
  /** at most 4 short bullets: function, voice leading, borrowed notes, why it pulls */
  explanation: string[];
  replacesFrom?: boolean;
}
