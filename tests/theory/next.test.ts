import { describe, expect, it } from 'vitest';
import { homeKey } from '../../src/theory/home';
import { nextChords } from '../../src/theory/next';
import { parseChord } from '../../src/theory/symbols';

const C = homeKey(0, 'major'), Am = homeKey(9, 'minor');
const next = (s: string, key = C) => nextChords(parseChord(s)!, key).map(o => o.chord.symbol);

describe('where a chord goes next', () => {
  it('follows the chart of diatonic progressions in major', () => {
    expect(next('Em7')).toEqual(['Am7', 'Fmaj7']); // iii → vi, IV
    expect(next('Am7')).toEqual(['Dm7', 'Fmaj7']); // vi → ii, IV
    expect(next('Dm7')).toEqual(['G7', 'Bm7♭5']); // ii → V, vii
    expect(next('Fmaj7')).toEqual(['G7', 'Dm7', 'Cmaj7', 'Bm7♭5']); // IV → V, ii, I (plagal), vii
    expect(next('G7')).toEqual(['Cmaj7', 'Am7']); // V → I, vi (deceptive)
    expect(next('Bm7b5')).toEqual(['Cmaj7', 'E7♭9']); // vii → I; or the ii of a minor ii–V into vi
    expect(next('Cmaj7')).toEqual(['Fmaj7', 'G7', 'Am7', 'Dm7', 'Em7']); // I → anywhere
  });
  it('and in minor', () => {
    expect(next('G7', Am)).toEqual(['Cmaj7']); // ♭VII → ♭III
    expect(next('Cmaj7', Am)).toEqual(['Fmaj7']); // ♭III → ♭VI
    expect(next('Fmaj7', Am)).toEqual(['Bm7♭5', 'Dm7']); // ♭VI → ii°, iv
    expect(next('Dm7', Am)).toEqual(['E7', 'Bm7♭5', 'Am7']); // iv → V, ii°, i
    expect(next('E7', Am)).toEqual(['Am7', 'Fmaj7']); // V → i, ♭VI
    expect(next('Bm7b5', Am)).toEqual(['E7', 'E7♭9']);
  });
  it('extensions and triads keep the function of the chord', () => {
    expect(next('Dm9')).toEqual(next('Dm7'));
    expect(next('G13')).toEqual(next('G7'));
    expect(next('C6')).toEqual(next('Cmaj7'));
    expect(next('F')).toEqual(next('Fmaj7'));
  });
  it('chords from outside the key go where their type points', () => {
    expect(next('A7')).toEqual(['Dm7', 'A♭maj7']); // V7/ii; or a tritone sub falling a half step
    expect(next('Db7')).toEqual(['G♭maj7', 'Cmaj7']); // tritone sub of G7 → I
    expect(next('Bb7')).toEqual(['E♭maj7', 'Am7', 'Cmaj7']); // includes the backdoor ♭VII7 → I
    expect(next('Gm7')).toEqual(['C7', 'Cmaj7']); // ii of IV
    expect(next('F#m7b5')).toEqual(['B7♭9']);
    expect(next('C#dim7')).toEqual(['Dm7']); // ♯I°7 → ii
    expect(next('Abmaj7')).toEqual(['Cmaj7', 'G7']); // borrowed ♭VI
    expect(next('Gsus4')).toEqual(['G', 'Cmaj7']);
  });
  it('says why', () => {
    const o = nextChords(parseChord('G7')!, C);
    expect(o[0].why).toBe('V7 → Imaj7: the root drops a fifth, a very common move. This is the classic ending: the V chord goes home.');
    expect(o[1].why).toBe('V7 → vi7: the root moves up a whole step. This is called a deceptive cadence: the V chord goes to vi7 instead of home, a pleasant surprise.');
  });
  it('never offers the chord itself, and always offers something', () => {
    for (const s of ['Cmaj7', 'Dm7', 'E7', 'F#dim7', 'Ab7', 'Bbm7', 'Ebmaj7', 'B+', 'G7sus4', 'Dm7b5', 'C']) for (const k of [C, Am]) {
      const n = next(s, k);
      expect(n.length, s).toBeGreaterThan(0);
      expect(n).not.toContain(parseChord(s)!.symbol);
    }
  });
});
