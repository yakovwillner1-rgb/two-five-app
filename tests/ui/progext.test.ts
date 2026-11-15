import { beforeEach, describe, expect, it } from 'vitest';
import { S } from '../../src/state';
import { fmt } from '../../src/theory/notes';
import { progChord } from '../../src/ui/passing';
import { progExtChoices, progSteps } from '../../src/ui/views/prog';

/* Extensions on the chords of the progression (C major unless said). */
const tones = (i: number): string => progChord(S.prog[i]).tones.map(fmt).join(' ');
beforeEach(() => { S.mode = 'major'; S.pc = 0; S.pgenre = 'jazz'; S.pfeel = 'bright'; });

describe('progression: extension on a chord', () => {
  it('a picked extension replaces the chord type and keeps the root', () => {
    S.prog = [{ d: 1, ext: 'm9', via: null }, { d: 4, ext: '13', via: null }, { d: 0, ext: 'maj9', via: null }];
    expect(S.prog.map(p => progChord(p).symbol)).toEqual(['Dm9', 'G13', 'Cmaj9']);
    expect(tones(0)).toBe('D F A C E');
    expect(tones(2)).toBe('C E G B D');
  });
  it('works on a typed chord, spelled from its own root', () => {
    S.prog = [{ d: 0, sym: 'Ebmaj7', ext: 'maj9', via: null }];
    expect(progChord(S.prog[0]).symbol).toBe('E♭maj9');
    expect(tones(0)).toBe('E♭ G B♭ D F');
  });
  it('an extension of another chord type is ignored (m9 on a major 7 chord)', () => {
    S.prog = [{ d: 0, ext: 'm9', via: null }];
    expect(progChord(S.prog[0]).symbol).toBe('Cmaj7');
  });
  it('slash chords get no extension', () => {
    S.prog = [{ d: 0, sym: 'C/G', ext: 'maj9', via: null }];
    expect(progChord(S.prog[0]).symbol).toBe('C/G');
    expect(progExtChoices(0)).toEqual([]);
  });
  it('the picker lists the plain chord first, then chords its scales allow', () => {
    S.prog = [{ d: 1, via: null }, { d: 4, via: null }, { d: 0, via: null }];
    const names = (i: number) => progExtChoices(i).map(c => c.symbol);
    expect(names(0)[0]).toBe('Dm7');
    expect(names(0)).toContain('Dm9');
    expect(names(1)[0]).toBe('G7');
    expect(names(1)).toContain('G13');
    expect(names(2)).toContain('Cmaj9');
    /* the choices stay the same after one is picked */
    S.prog[1].ext = '13';
    expect(names(1)[0]).toBe('G7');
  });
});

describe('progression: the passing follows the extensions', () => {
  it('2-5 into Cmaj9 from Am7: the V takes an extension that connects (G7 → G13)', () => {
    S.prog = [{ d: 5, via: null }, { d: 0, ext: 'maj9', via: 'secIIV.bright' }];
    const via = progSteps()[1].via!;
    expect(via.chords.map(c => c.symbol)).toEqual(['Dm9', 'G13']);
    expect(via.ext).toBeDefined();
  });
  it('with no extensions the passing is unchanged', () => {
    S.prog = [{ d: 5, via: null }, { d: 0, via: 'secIIV.bright' }];
    const via = progSteps()[1].via!;
    expect(via.chords.map(c => c.symbol)).toEqual(['Dm7', 'G7']);
    expect(via.ext).toBeUndefined();
  });
});
