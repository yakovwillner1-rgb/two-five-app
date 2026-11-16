import { describe, expect, it } from 'vitest';
import { resolveStudy, studyEvents } from '../../src/study/model';
import { parseChord } from '../../src/theory/symbols';
import { voicingSatisfied, voicingStep } from '../../src/theory/playcheck';
import { S } from '../../src/state';
import { moveStudy } from '../../src/ui/views/move';
describe('selected musical study', () => {
  it('preserves a tritone route instead of substituting a ii–V for practice', () => {
    Object.assign(S, { pc: 0, mode: 'major', from: 1, to: 0, fromSym: null, toSym: null, fromExt: null, toExt: null, way: 'tritone.sub' });
    const study = moveStudy();
    expect(study.events.map(e => e.symbol)).toEqual(['Dm7', 'D♭7', 'Cmaj7']);
    for (const event of study.events) {
      const step = voicingStep(event.symbol, '', event.midis.map((midi, i) => ({ midi, name: event.names[i] })));
      expect(voicingSatisfied(step, event.midis)).toBe(true);
    }
  });
  it('snapshots remain independent of later changes and round trip through storage', () => {
    const chords = ['Dm7', 'G7', 'Cmaj7'].map(c => parseChord(c)!);
    const a = resolveStudy(chords, 'ii–V', 'C major');
    const restored = JSON.parse(JSON.stringify(a));
    chords[1] = parseChord('Db7')!;
    expect(restored).toEqual(a);
    expect(a.events[1].symbol).toBe('G7');
    expect(a.events.every(e => e.midis.every((m, i) => i === 0 || m >= e.midis[i-1]))).toBe(true);
  });
  it('shares pitches and beat durations with playback at any tempo', () => {
    const a = resolveStudy(['Dm7','G7','Cmaj7'].map(c => parseChord(c)!), 'Study', 'C');
    expect(studyEvents(a, .5).map(e => [e.t,e.dur])).toEqual([[0,2],[2,1],[3,2]]);
    expect(studyEvents(a, 1)[1].midis).toEqual(a.events[1].midis);
  });
});
