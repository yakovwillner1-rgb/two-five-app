/** Core music-theory types. Pure data, no DOM. */
export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
/** 0 = C … 11 = B */
export type PitchClass = number;
/** A spelled note: letter plus accidental (−2 = 𝄫, −1 = ♭, 0 = ♮, 1 = ♯, 2 = 𝄪). */
export interface Note { letter: Letter; acc: number }
/** Distance between two spelled notes: letter steps (0 = unison, 2 = a third) and semitones. */
export interface Interval { steps: number; semis: number }

export type ScaleType = 'major' | 'natural' | 'melodic' | 'harmonic';
/** The three mode families shown on the Modes tab (natural minor is a mode of major). */
export type Family = 'major' | 'melodic' | 'harmonic';
export type Quality = 'maj7' | 'm7' | '7' | 'm7♭5' | 'm(maj7)' | 'maj7♯5' | '°7';

export interface Scale { root: Note; type: ScaleType; notes: Note[] }
/** A mode: its name, its seven notes from its own root, and its formula against major ("1 2 ♭3 …"). */
export interface Mode { name: string; notes: Note[]; formula: string[] }

/** A seventh chord built on one degree of a scale, with the mode that goes with it. */
export interface Chord {
  root: Note;
  quality: Quality;
  /** R 3 5 7 */
  tones: Note[];
  /** Tensions above the 7th. Empty in Phase 0; the passing-chord engine fills it later. */
  extensions: Note[];
  /** Display symbol, e.g. "B♭maj7". */
  symbol: string;
  scaleRoot: Note;
  scaleType: ScaleType;
  /** 0-based degree in the parent scale. */
  degree: number;
  /** Chart numeral, e.g. "iim7". */
  numeral: string;
  mode: Mode;
}

export type HomeMode = 'major' | 'minor';
export interface Key { tonic: Note; mode: HomeMode }
/** A chord of the home key. `landable` is false for half-diminished/diminished chords. */
export interface HomeChord extends Chord { rn: string; landable: boolean }

export type Flavor = 'auto' | 'bright' | 'dark';
/** The secondary ii–V that leads into a target chord. */
export interface Approach {
  source: ScaleType;
  flavor: 'bright' | 'dark';
  ii: Chord;
  V: Chord;
  /** Chart the two chords come from, e.g. "F Major". */
  chart: string;
}

export type VoiceRole = 'root' | 'guide' | 'color';
export interface VoicedNote { midi: number; note: Note; label: string; role: VoiceRole }
export interface Voicing { group: 'Basic' | 'Jazz'; name: string; sub: string; notes: VoicedNote[] }

/** Everything the Modes tab shows about one mode on one root. */
export interface ModeDetail {
  fam: Family;
  deg: number;
  notes: Note[];
  name: string;
  formula: string[];
  /** The seventh chord built on the mode's root. */
  chord: Chord;
  /** e.g. "C major" */
  parent: string;
  /** Index (0–6) of the character note. */
  char: number;
  sound: string;
  use: string;
}
