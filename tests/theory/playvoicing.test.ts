import { describe, expect, it } from 'vitest';
import { PlaySession, voicingSatisfied, voicingStep } from '../../src/theory/playcheck';

/* Play it → Voicings: a kept voicing must be played exactly, bottom to top, in any octave. */
const dm = voicingStep('Dm7', 'Rootless A + melody', [{ midi: 53, name: 'F' }, { midi: 57, name: 'A' }, { midi: 60, name: 'C' }, { midi: 64, name: 'E' }, { midi: 76, name: 'E' }]);
const g7 = voicingStep('G7', 'Rootless B + melody', [{ midi: 76, name: 'E' }, { midi: 53, name: 'F' }, { midi: 57, name: 'A' }, { midi: 59, name: 'B' }, { midi: 64, name: 'E' }]);

describe('exact voicing steps', () => {
  it('notes are stored low to high', () => {
    expect(g7.midis).toEqual([53, 57, 59, 64, 76]);
    expect(g7.names.join(' ')).toBe('F A B E E');
  });
  it('the same notes pass, in the kept octave or another one', () => {
    expect(voicingSatisfied(dm, [53, 57, 60, 64, 76])).toBe(true);
    expect(voicingSatisfied(dm, [41, 45, 48, 52, 64])).toBe(true);
  });
  it('a missing note, an extra note or another order fails', () => {
    expect(voicingSatisfied(dm, [53, 57, 60, 64])).toBe(false);          // melody missing
    expect(voicingSatisfied(dm, [50, 53, 57, 60, 64, 76])).toBe(false);  // root added
    expect(voicingSatisfied(dm, [57, 60, 64, 65, 76])).toBe(false);      // F moved up: another inversion
  });
  it('a session marks wrong notes and moves on when the voicing is held', () => {
    const held = new Set<number>(), s = new PlaySession([dm, g7], true, held);
    expect(s.noteOn(61).mark).toBe('bad');
    s.noteOff(61);
    [53, 57, 60, 64, 76].forEach(n => expect(s.noteOn(n).mark).toBe('ok'));
    expect(s.checkChord()).toBe('advanced');
    [53, 57, 60, 64, 76].forEach(n => s.noteOff(n));
    [53, 57, 59, 64].forEach(n => s.noteOn(n));
    expect(s.checkChord()).toBe('none');
    s.noteOn(76);
    expect(s.checkChord()).toBe('finished');
    expect(s.wrong).toBe(1);
  });
});
