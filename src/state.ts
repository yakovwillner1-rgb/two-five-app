import type { Genre } from './data/styles';
import type { Feel } from './data/techniques';
import { HOME, homeChords, homeKey, homeTitle } from './theory/home';
import { bestMode, modeInfo, type ModeView } from './theory/modes';
import type { ProgItem } from './theory/playcheck';
import type { Family, Flavor, HomeChord, HomeMode, Key, ModeDetail, Note, ScaleType } from './theory/types';

export type Tab = 'move' | 'pass' | 'prog' | 'play' | 'quiz' | 'map' | 'modes' | 'chart' | 'guide';
export interface State {
  mode: HomeMode; pc: number; tab: Tab; from: number; to: number; flavor: Flavor; tempo: number; loop: boolean;
  /** '' when silent, else what is playing: 'move' | 'prog' | 'scale' | 'x' */
  playing: string;
  chart: ScaleType; prog: ProgItem[];
  quiz: { pc: number; deg: number; rev: boolean } | null; score: { r: number; t: number };
  tipDone: boolean; soundOut: string | null;
  px: 'move' | 'prog' | 'random' | 'mode'; pstrict: boolean; phint: boolean; pall: boolean; psound: boolean; midiOn: boolean;
  mfam: Family; mview: ModeView; mdeg: number; mroot: number | null;
  dmode: 'spell' | 'ear'; efam: Family; ear: { fam: Family; deg: number; pc: number; ans: number | null } | null; escore: { r: number; t: number };
  voiceHover: boolean;
  /* Passing tab: style, FROM/TO as a degree of the key or a typed chord symbol */
  pgenre: Genre; pfeel: Feel; pfrom: number; pto: number; pfromSym: string | null; ptoSym: string | null; pshowAll: boolean;
}
export const S: State = {
  mode: 'major', pc: 0, tab: 'move', from: 0, to: 3, flavor: 'auto', tempo: 92, loop: false, playing: '', chart: 'major',
  prog: [{ d: 0, a: false }, { d: 3, a: true }], quiz: null, score: { r: 0, t: 0 }, tipDone: false, soundOut: null,
  px: 'move', pstrict: false, phint: true, pall: false, psound: false, midiOn: false,
  mfam: 'major', mview: 'parallel', mdeg: 1, mroot: null, dmode: 'spell', efam: 'major', ear: null, escore: { r: 0, t: 0 }, voiceHover: true,
  pgenre: 'jazz', pfeel: 'bright', pfrom: 0, pto: 3, pfromSym: null, ptoSym: null, pshowAll: false,
};

/* Same storage key as the single-file app, so saved settings carry over. */
const LSK = 'twofive-v1';
const snap = () => ({
  soundOut: S.soundOut, px: S.px, pstrict: S.pstrict, phint: S.phint, pall: S.pall, psound: S.psound, midiOn: S.midiOn, mode: S.mode, pc: S.pc, tab: S.tab,
  from: S.from, to: S.to, flavor: S.flavor, tempo: S.tempo, chart: S.chart, prog: S.prog, mfam: S.mfam, mview: S.mview, mdeg: S.mdeg, mroot: S.mroot,
  dmode: S.dmode, efam: S.efam, voiceHover: S.voiceHover, loop: S.loop, tipDone: S.tipDone,
  pgenre: S.pgenre, pfeel: S.pfeel, pfrom: S.pfrom, pto: S.pto, pfromSym: S.pfromSym, ptoSym: S.ptoSym,
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
  S.prog = HOME[m].presets[0][1].map((d, i) => ({ d, a: i > 0 }));
  S.quiz = null;
}
