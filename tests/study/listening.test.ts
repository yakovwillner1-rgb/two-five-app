import { describe, expect, it } from 'vitest';
import { listeningCue, type Study } from '../../src/study/model';
describe('listening instructions use realized pitches', () => {
  it('describes a registered semitone, not an unplayed theoretical resolution', () => {
    const study: Study = { title: '', key: '', events: [
      { symbol: 'G7', beats: 2, midis: [43,59,62,65], names: ['G','B','D','F'] },
      { symbol: 'Cmaj7', beats: 4, midis: [36,59,64,67], names: ['C','B','E','G'] },
    ] };
    const cue = listeningCue(study)!;
    expect(cue.text).toContain('D moves up a whole step');
    expect(cue.text).toContain('to E.');
    expect(cue.fromMidi).toBe(62); expect(cue.toMidi).toBe(64);
  });
  it('does not invent a voice mapping between different-size voicings', () => {
    expect(listeningCue({ title: '', key: '', events: [
      { symbol: 'X', beats: 2, midis: [60,64], names: ['C','E'] },
      { symbol: 'Y', beats: 4, midis: [61,65,68], names: ['D♭','F','A♭'] },
    ] })).toBeNull();
  });
});
