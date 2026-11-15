import { describe, expect, it } from 'vitest';
import { chordInfo } from '../../src/theory/chords';
import { modeInfo } from '../../src/theory/modes';
import { note } from '../../src/theory/notes';
import { PlaySession, buildSteps, chordSatisfied, mkStep, scaleStep, type StepSource } from '../../src/theory/playcheck';

const Dm7 = chordInfo(note('C'), 'major', 1);
const src = (over: Partial<StepSource> = {}): StepSource => ({
  px: 'move', pc: 0, mode: 'major', from: 0, to: 3, flavor: 'auto', prog: [{ d: 0, a: false }, { d: 3, a: true }], allKeys: false,
  modeDetail: () => modeInfo(0, 'major', 1, 'parallel'), rng: () => 0, ...over,
});
/** Press notes (they stay held), then run the chord check like the UI does after 90 ms. */
const press = (s: PlaySession, ...ns: number[]) => { ns.forEach(n => s.noteOn(n)); return s.checkChord(); };
const release = (s: PlaySession, ...ns: number[]) => ns.forEach(n => s.noteOff(n));
const tap = (s: PlaySession, n: number) => { const r = s.noteOn(n); s.noteOff(n); return r; };

describe('Play it: one chord', () => {
  const st = mkStep(Dm7, 'ii');
  it('step data for Dm7', () => {
    expect([st.third, st.seventh]).toEqual([5, 0]); // F and C
    expect(st.voicing.name).toBe('Rootless A');
    expect(st.voicingPcs).toEqual([5, 9, 0, 4]); // F A C E
    expect([...st.scale].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]); // D Dorian
  });
  it('any voicing: needs the 3rd and the 7th, at least 3 notes, all in the scale', () => {
    expect(chordSatisfied(st, [53, 60, 64], false)).toBe(true); // F C E
    expect(chordSatisfied(st, [50, 53, 57, 60], false)).toBe(true); // root position
    expect(chordSatisfied(st, [60, 65, 69, 76], false)).toBe(true); // any octave, any order
    expect(chordSatisfied(st, [53, 60], false)).toBe(false); // only two notes
    expect(chordSatisfied(st, [53, 65, 60], false)).toBe(false); // doubled 3rd is still two pitch classes
    expect(chordSatisfied(st, [50, 53, 57], false)).toBe(false); // no 7th
    expect(chordSatisfied(st, [50, 57, 60], false)).toBe(false); // no 3rd
    expect(chordSatisfied(st, [53, 60, 64, 66], false)).toBe(false); // F♯ is outside D Dorian
  });
  it('exact voicing: bottom to top, any octave, nothing extra', () => {
    expect(chordSatisfied(st, [53, 57, 60, 64], true)).toBe(true);
    expect(chordSatisfied(st, [65, 69, 72, 76], true)).toBe(true);
    expect(chordSatisfied(st, [41, 57, 60, 76], true)).toBe(true); // spread over octaves, same order
    expect(chordSatisfied(st, [60, 64, 65, 69], true)).toBe(false); // wrong order (C E F A)
    expect(chordSatisfied(st, [53, 57, 60], true)).toBe(false);
    expect(chordSatisfied(st, [41, 53, 57, 60, 64], true)).toBe(false);
  });
  it('the voicing 9th counts as fitting even when it is outside the mode', () => {
    const bh = mkStep(chordInfo(note('C'), 'major', 6), 'vii'); // Bm7♭5, voiced D F A C♯
    expect(bh.scale.has(1)).toBe(true);
    expect(chordSatisfied(bh, [50, 53, 57, 61], true)).toBe(true);
  });
});

describe('Play it: the move, simulated note on/off', () => {
  it('C → Gm7 → C7 → F in C major, any voicing', () => {
    const steps = buildSteps(src());
    expect(steps.map(s => (s.kind === 'chord' ? s.chord.symbol : ''))).toEqual(['Cmaj7', 'Gm7', 'C7', 'Fmaj7']);
    expect(steps.map(s => (s.kind === 'chord' ? s.label : ''))).toEqual(['I · start', 'ii / IV · from the F Major chart', 'V / IV · from the F Major chart', 'IV · land']);
    const s = new PlaySession(steps, false, new Set());
    expect(press(s, 52, 55, 59)).toBe('advanced'); // E G B
    expect(s.checkChord()).toBe('none'); // still holding Cmaj7: not Gm7
    release(s, 52, 55, 59);
    expect(press(s, 58, 62, 65)).toBe('advanced'); // B♭ D F
    release(s, 58, 62, 65);
    expect(press(s, 52, 58, 60)).toBe('advanced'); // E B♭ C
    release(s, 52, 58, 60);
    expect(press(s, 57, 60, 64)).toBe('finished'); // A C E
    expect([s.done, s.wrong, s.i]).toEqual([true, 0, 4]);
  });
  it('wrong notes are counted, shown red, and block the step until released', () => {
    const s = new PlaySession(buildSteps(src()), false, new Set());
    expect(s.noteOn(52).mark).toBe('ok');
    expect(s.noteOn(54).mark).toBe('bad'); // F♯ is not in C Ionian
    s.noteOn(55); s.noteOn(59);
    expect(s.checkChord()).toBe('none');
    expect(s.wrong).toBe(1);
    expect(s.marks).toEqual({ 52: 'ok', 54: 'bad', 55: 'ok', 59: 'ok' });
    s.noteOff(54);
    expect(s.marks[54]).toBeUndefined();
    expect(s.checkChord()).toBe('advanced');
  });
  it('a held key does not count twice', () => {
    const s = new PlaySession(buildSteps(src()), false, new Set());
    s.noteOn(54);
    expect(s.noteOn(54).counted).toBe(false);
    expect(s.wrong).toBe(1);
  });
  it('exact voicing: notes outside the voicing are wrong even if they fit the scale', () => {
    const s = new PlaySession(buildSteps(src()), true, new Set());
    expect(s.noteOn(48).mark).toBe('bad'); // C: Cmaj7 Rootless A is E G B D
    s.noteOff(48);
    expect(press(s, 52, 55, 59, 62)).toBe('advanced');
    expect(s.wrong).toBe(1);
  });
  it('after finishing, more notes change nothing', () => {
    const s = new PlaySession([mkStep(Dm7, 'ii')], false, new Set());
    expect(press(s, 53, 60, 64)).toBe('finished');
    expect(s.noteOn(61)).toEqual({ counted: false, needsChordCheck: false, finished: true });
    expect(s.wrong).toBe(0);
    expect(s.checkChord()).toBe('none');
  });
});

describe('Play it: progression and random 2-5s', () => {
  it('progression adds the 2-5 only where it is switched on', () => {
    const steps = buildSteps(src({ px: 'prog', prog: [{ d: 0, a: false }, { d: 5, a: true }, { d: 6, a: true }] }));
    expect(steps.map(s => (s.kind === 'chord' ? s.chord.symbol : ''))).toEqual(['Cmaj7', 'Bm7♭5', 'E7', 'Am7', 'Bm7♭5']);
    expect(buildSteps(src({ px: 'prog', prog: [] })).map(s => (s.kind === 'chord' ? s.chord.symbol : ''))).toEqual(['Cmaj7']);
  });
  it('random 2-5 picks a landable target that is not the I', () => {
    const steps = buildSteps(src({ px: 'random' }));
    expect(steps.map(s => (s.kind === 'chord' ? s.chord.symbol : ''))).toEqual(['Em7♭5', 'A7', 'Dm7']);
    expect(steps.map(s => (s.kind === 'chord' ? s.label : ''))).toEqual(['C major · ii / ii', 'C major · V / ii', 'C major · ii']);
    const last = buildSteps(src({ px: 'random', rng: () => 0.999 }));
    expect(last.map(s => (s.kind === 'chord' ? s.chord.symbol : ''))).toEqual(['Bm7♭5', 'E7', 'Am7']);
    const other = buildSteps(src({ px: 'random', allKeys: true, rng: () => 0.5 })); // key 6 = G♭ major, target IV
    expect(other.map(s => (s.kind === 'chord' ? s.chord.symbol : ''))).toEqual(['D♭m7', 'G♭7', 'C♭maj7']);
  });
  it('random mode starts a new round instead of finishing', () => {
    const mk = () => buildSteps(src({ px: 'random' }));
    const s = new PlaySession(mk(), false, new Set(), mk);
    expect(press(s, 55, 62, 58)).toBe('advanced'); // Em7♭5: G D B♭
    release(s, 55, 62, 58);
    expect(press(s, 61, 67, 64)).toBe('advanced'); // A7: C♯ G E
    release(s, 61, 67, 64);
    expect(press(s, 53, 60, 57)).toBe('newRound'); // Dm7: F C A
    expect([s.rounds, s.i, s.done]).toEqual([1, 0, false]);
  });
});

describe('Play it: mode scale', () => {
  const m = modeInfo(0, 'major', 1, 'parallel'); // C Dorian
  it('goes up one octave and back down', () => {
    const st = scaleStep(m);
    expect(st.seq).toEqual([0, 2, 3, 5, 7, 9, 10, 0, 10, 9, 7, 5, 3, 2, 0]);
    expect(buildSteps(src({ px: 'mode' }))[0]).toEqual(st);
  });
  it('checks one note at a time, any octave', () => {
    const s = new PlaySession([scaleStep(m)], false, new Set());
    const up = [60, 62, 63, 65, 67, 69, 70, 72], seq = up.concat(up.slice(0, -1).reverse());
    expect(tap(s, 60).mark).toBe('ok');
    expect(tap(s, 64).mark).toBe('bad'); // E natural: wrong, stays on the same note
    expect([s.si, s.wrong]).toEqual([1, 1]);
    expect(tap(s, 74).mark).toBe('ok'); // D, an octave up
    seq.slice(2, -1).forEach(n => expect(tap(s, n).mark).toBe('ok'));
    expect(s.done).toBe(false);
    expect(tap(s, 48).finished).toBe(true);
    expect([s.done, s.wrong]).toEqual([true, 1]);
  });
});
