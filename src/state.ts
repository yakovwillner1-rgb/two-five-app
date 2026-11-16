import type { Study } from './study/model';
import type { Genre } from './data/styles';
import type { Feel } from './data/techniques';
import { HOME, homeChords, homeKey, homeTitle } from './theory/home';
import { bestMode, modeInfo, type ModeView } from './theory/modes';
import type { Family, Flavor, HomeChord, HomeMode, Key, ModeDetail, Note, ScaleType } from './theory/types';
import type { KindId } from './theory/symbols';

export type Tab = 'move' | 'prog' | 'lead' | 'reharm' | 'listen' | 'play' | 'quiz' | 'map' | 'modes' | 'ext' | 'chart' | 'guide';
/**
 * One chord of the progression: a degree of the home key, or a typed symbol. `via` is the passing used
 * to get here from the chord before (its passing chords pick up extensions that connect to `ext`): "techniqueId.variant", or just "secIIV" (= its first variant), or null.
 */
export interface ProgChord { d: number; sym?: string; /** picked extension: the chord type that replaces the plain one (e.g. 'maj9') */ ext?: KindId; via: string | null }
/** A voicing kept on the Melody tab: chord symbol, voicing name, and its notes low to high (m = MIDI, n = note name, lab = degree, h = hand). */
export interface KeptVoicing { sym: string; name: string; notes: { m: number; n: string; lab: string; h: 'L' | 'R' }[] }
export interface State {
  /** last tab used in each navigation group */
  groupLast: Record<string, Tab>;
  /** saved comparison A, and the study Play it practises (both saved) */
  studyA: Study | null; practiceStudy: Study | null;
  /** Move: which chord the chooser tray is open for (not saved) */
  pickSide: 'from' | 'to' | null;
  mode: HomeMode; pc: number; tab: Tab; from: number; to: number; flavor: Flavor; tempo: number; loop: boolean;
  /** '' when silent, else what is playing: 'move' | 'prog' | 'scale' | 'x' */
  playing: string;
  chart: ScaleType; prog: ProgChord[];
  quiz: { pc: number; deg: number; rev: boolean } | null; score: { r: number; t: number };
  tipDone: boolean; soundOut: string | null;
  px: 'move' | 'prog' | 'random' | 'mode' | 'lead' | 'study'; pstrict: boolean; phint: boolean; pall: boolean; psound: boolean; midiOn: boolean;
  mfam: Family; mview: ModeView; mdeg: number; mroot: number | null;
  dmode: 'spell' | 'ear'; efam: Family; ear: { fam: Family; deg: number; pc: number; ans: number | null } | null; escore: { r: number; t: number };
  voiceHover: boolean;
  /* Move tab: style, typed FROM/TO symbols (override from/to), the chosen way ("techniqueId.variant") */
  pgenre: Genre; pfeel: Feel; fromSym: string | null; toSym: string | null; fromExt: KindId | null; toExt: KindId | null; way: string | null; pshowAll: boolean;
  /* Listen tab: how long (ms) notes must be held before the chord counts; tap-to-hold for the on-screen keys */
  lhold: number; llatch: boolean;
  /* Melody tab: the chord (degree, or typed symbol, plus a picked extension), the melody note (MIDI), the voicings kept so far */
  ld: number; lsym: string | null; lext: KindId | null; lmel: number; lkept: KeptVoicing[];
  /** Melody tab: degree of the chord that follows (decides the scale), or null when not set */
  lnx: number | null;
  /* Reharm tab: how often the chords change, and which version is shown */
  rrhythm: 'auto' | 'bar' | 'half' | 'beat'; rview: 'orig' | 'light' | 'medium' | 'wild';
  /** last typed progression chord that could not be read (not saved) */
  progBad: string | null;
}
export const S: State = {
  groupLast: {}, studyA: null, practiceStudy: null, pickSide: null,
  mode: 'major', pc: 0, tab: 'move', from: 0, to: 3, flavor: 'auto', tempo: 92, loop: false, playing: '', chart: 'major',
  prog: [{ d: 0, via: null }, { d: 3, via: 'secIIV' }], quiz: null, score: { r: 0, t: 0 }, tipDone: false, soundOut: null,
  px: 'move', pstrict: false, phint: true, pall: false, psound: false, midiOn: false,
  mfam: 'major', mview: 'parallel', mdeg: 1, mroot: null, dmode: 'spell', efam: 'major', ear: null, escore: { r: 0, t: 0 }, voiceHover: true,
  pgenre: 'jazz', pfeel: 'bright', fromSym: null, toSym: null, fromExt: null, toExt: null, way: null, pshowAll: false, progBad: null, lhold: 500, llatch: false,
  ld: 0, lsym: null, lext: null, lmel: 76, lkept: [], lnx: null, rrhythm: 'auto', rview: 'light',
};

/* Same storage key as the single-file app, so saved settings carry over. */
const LSK = 'twofive-v1';
const snap = () => ({
  groupLast: S.groupLast, studyA: S.studyA, practiceStudy: S.practiceStudy, soundOut: S.soundOut, px: S.px, pstrict: S.pstrict, phint: S.phint, pall: S.pall, psound: S.psound, midiOn: S.midiOn, mode: S.mode, pc: S.pc, tab: S.tab,
  from: S.from, to: S.to, flavor: S.flavor, tempo: S.tempo, chart: S.chart, prog: S.prog, mfam: S.mfam, mview: S.mview, mdeg: S.mdeg, mroot: S.mroot,
  dmode: S.dmode, efam: S.efam, voiceHover: S.voiceHover, loop: S.loop, tipDone: S.tipDone,
  pgenre: S.pgenre, pfeel: S.pfeel, fromSym: S.fromSym, toSym: S.toSym, fromExt: S.fromExt, toExt: S.toExt, way: S.way, lhold: S.lhold, llatch: S.llatch,
  ld: S.ld, lsym: S.lsym, lext: S.lext, lmel: S.lmel, lkept: S.lkept, lnx: S.lnx, rrhythm: S.rrhythm, rview: S.rview,
});
export function save(): void { try { localStorage.setItem(LSK, JSON.stringify(snap())); } catch (e) { /* storage full or blocked */ } }
export function load(): Partial<State> { try { return JSON.parse(localStorage.getItem(LSK) || '{}') || {}; } catch (e) { return {}; } }

export const curKey = (): Key => homeKey(S.pc, S.mode);
export const curChords = (): HomeChord[] => homeChords(curKey());
export const curTitle = (): string => homeTitle(curKey());
export const modeRootPc = (): number => (S.mroot == null ? S.pc : S.mroot);
/** True when the key button picks a mode root instead of the home key. */
export const rootCtx = (): boolean => S.tab === 'modes' || (S.tab === 'play' && S.px === 'mode');
export const curMode = (fam: Family = S.mfam, deg: number = S.mdeg): ModeDetail => modeInfo(modeRootPc(), fam, deg, S.mview);
export const earNotes = (): Note[] => bestMode(S.ear!.pc, S.ear!.fam, S.ear!.deg);

export function setMode(m: HomeMode): void {
  if (S.mode === m) return;
  S.mode = m; S.from = 0; S.to = 3;
  S.prog = HOME[m].presets[0][1].map((d, i) => ({ d, via: i > 0 ? 'secIIV' : null }));
  S.fromSym = null; S.toSym = null; S.fromExt = null; S.toExt = null;
  S.ld = 0; S.lext = null; S.lnx = null;
  S.quiz = null;
}
