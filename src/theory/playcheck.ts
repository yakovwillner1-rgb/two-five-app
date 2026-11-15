import { approach, homeChords, homeKey, homeTitle } from './home';
import { mod, pcOf } from './notes';
import { defaultVoicing } from './voicings';
import type { Chord, Flavor, HomeMode, ModeDetail, Note, PitchClass, Voicing } from './types';

/** Play-it checking: pure logic, no DOM, no timers. The UI feeds it note on/off. */
export interface ChordStep {
  kind: 'chord';
  chord: Chord;
  label: string;
  voicing: Voicing;
  /** pitch classes of the exact voicing, bottom to top */
  voicingPcs: PitchClass[];
  third: PitchClass;
  seventh: PitchClass;
  /** every pitch class that "fits": the chord's mode, its tones, and the voicing's notes */
  scale: Set<PitchClass>;
}
export interface ScaleStep { kind: 'scale'; mode: ModeDetail; names: Note[]; seq: PitchClass[] }
export type Step = ChordStep | ScaleStep;

export function mkStep(c: Chord, label: string): ChordStep {
  const v = defaultVoicing(c), sc = new Set(c.mode.notes.map(pcOf));
  c.tones.forEach(n => sc.add(pcOf(n)));
  v.notes.forEach(i => sc.add(mod(i.midi, 12)));
  return { kind: 'chord', chord: c, label, voicing: v, voicingPcs: v.notes.map(i => mod(i.midi, 12)), third: pcOf(c.tones[1]), seventh: pcOf(c.tones[3]), scale: sc };
}
/** A mode scale: up one octave and back down. */
export function scaleStep(m: ModeDetail): ScaleStep {
  const up = m.notes.concat([m.notes[0]]), seq = up.concat(up.slice(0, -1).reverse());
  return { kind: 'scale', mode: m, names: seq, seq: seq.map(pcOf) };
}

export interface ProgItem { d: number; a: boolean; /** color of this item's 2-5; defaults to the global one */ flavor?: Flavor }
export interface StepSource {
  px: 'move' | 'prog' | 'random' | 'mode';
  pc: PitchClass;
  mode: HomeMode;
  from: number;
  to: number;
  flavor: Flavor;
  prog: ProgItem[];
  /** random 2-5s: pick the key at random too */
  allKeys: boolean;
  modeDetail: () => ModeDetail;
  rng: () => number;
}
export function buildSteps(s: StepSource): Step[] {
  const key = homeKey(s.pc, s.mode), H = homeChords(key);
  if (s.px === 'move') {
    const fr = H[s.from], to = H[s.to], ap = approach(to, s.flavor);
    if (!ap) throw new Error('Cannot land on ' + to.symbol);
    return [mkStep(fr, fr.rn + ' · start'), mkStep(ap.ii, 'ii / ' + to.rn + ' · from the ' + ap.chart + ' chart'), mkStep(ap.V, 'V / ' + to.rn + ' · from the ' + ap.chart + ' chart'), mkStep(to, to.rn + ' · land')];
  }
  if (s.px === 'prog') {
    const out: Step[] = [];
    s.prog.forEach(p => {
      const tc = H[p.d], ap = p.a ? approach(tc, p.flavor ?? s.flavor) : null;
      if (ap) out.push(mkStep(ap.ii, 'ii / ' + tc.rn), mkStep(ap.V, 'V / ' + tc.rn));
      out.push(mkStep(tc, tc.rn));
    });
    return out.length ? out : [mkStep(H[0], H[0].rn)];
  }
  if (s.px === 'random') {
    const k = homeKey(s.allKeys ? Math.floor(s.rng() * 12) : s.pc, s.mode), t = homeTitle(k);
    const ok = homeChords(k).filter(c => c.landable && c.degree !== 0), tc = ok[Math.floor(s.rng() * ok.length)], ap = approach(tc, s.flavor)!;
    return [mkStep(ap.ii, `${t} · ii / ${tc.rn}`), mkStep(ap.V, `${t} · V / ${tc.rn}`), mkStep(tc, `${t} · ${tc.rn}`)];
  }
  return [scaleStep(s.modeDetail())];
}

/**
 * Is the held chord correct?
 * Exact voicing: the held notes, low to high, are exactly the voicing's pitch classes (any octave).
 * Any voicing: at least 3 different pitch classes, including the 3rd and the 7th, and nothing outside the scale.
 */
export function chordSatisfied(st: ChordStep, held: Iterable<number>, strict: boolean): boolean {
  const pcs = [...held].sort((a, b) => a - b).map(m => mod(m, 12));
  if (strict) return pcs.length === st.voicingPcs.length && pcs.every((p, i) => p === st.voicingPcs[i]);
  const set = new Set(pcs);
  return set.size >= 3 && set.has(st.third) && set.has(st.seventh) && [...set].every(p => st.scale.has(p));
}

export type Mark = 'ok' | 'bad';
export interface NoteResult {
  /** false when the note was already held or the run is finished */
  counted: boolean;
  mark?: Mark;
  /** chord steps: the UI should call checkChord() after a short settle time */
  needsChordCheck: boolean;
  finished: boolean;
}
export type CheckResult = 'none' | 'advanced' | 'newRound' | 'finished';

export class PlaySession {
  i = 0;
  si = 0;
  wrong = 0;
  done = false;
  rounds = 0;
  /** colour of each held key */
  marks: Record<number, Mark> = {};

  /**
   * @param held the set of held MIDI notes (shared with the UI; survives a restart)
   * @param nextRound when given (random 2-5s), finishing the steps starts a new round instead of ending
   */
  constructor(public steps: Step[], readonly strict: boolean, readonly held: Set<number>, private nextRound?: () => Step[]) {}

  get step(): Step | undefined { return this.steps[this.i]; }

  noteOn(n: number): NoteResult {
    if (this.held.has(n)) return { counted: false, needsChordCheck: false, finished: this.done };
    this.held.add(n);
    if (this.done) return { counted: false, needsChordCheck: false, finished: true };
    const st = this.steps[this.i], pc = mod(n, 12);
    if (st.kind === 'scale') {
      if (pc === st.seq[this.si]) {
        this.marks[n] = 'ok';
        this.si++;
        if (this.si >= st.seq.length) this.done = true;
      } else { this.marks[n] = 'bad'; this.wrong++; }
      return { counted: true, mark: this.marks[n], needsChordCheck: false, finished: this.done };
    }
    const ok = this.strict ? st.voicingPcs.includes(pc) : st.scale.has(pc);
    this.marks[n] = ok ? 'ok' : 'bad';
    if (!ok) this.wrong++;
    return { counted: true, mark: this.marks[n], needsChordCheck: true, finished: false };
  }

  noteOff(n: number): void {
    this.held.delete(n);
    delete this.marks[n];
  }

  checkChord(): CheckResult {
    const st = this.steps[this.i];
    if (!st || st.kind !== 'chord' || this.done) return 'none';
    if (!chordSatisfied(st, this.held, this.strict)) return 'none';
    this.i++;
    if (this.i >= this.steps.length) {
      if (this.nextRound) { this.rounds++; this.steps = this.nextRound(); this.i = 0; return 'newRound'; }
      this.done = true;
      return 'finished';
    }
    return 'advanced';
  }
}
