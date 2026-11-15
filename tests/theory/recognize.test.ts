import { describe, expect, it } from 'vitest';
import { homeKey } from '../../src/theory/home';
import { pcOf } from '../../src/theory/notes';
import { betterKey, recognize, spellRoot } from '../../src/theory/recognize';
import { KINDS, makeChord, parseChord, passVoicing, type KindId } from '../../src/theory/symbols';
import { note } from '../../src/theory/notes';

const C = homeKey(0, 'major');
/** MIDI numbers for note names, each one above the last, starting near C3. */
function m(names: string): number[] {
  let prev = 47;
  return names.split(' ').map(n => { let x = pcOf(note(n)); while (x <= prev) x += 12; prev = x; return x; });
}
const top = (names: string, key = C) => recognize(m(names), key)[0]?.chord.symbol;
const all = (names: string, key = C) => recognize(m(names), key).map(r => r.chord.symbol);

describe('naming a chord from held notes', () => {
  it('needs three different notes', () => {
    expect(recognize(m('C E'), C)).toEqual([]);
    expect(recognize([48, 60, 72], C)).toEqual([]);
  });
  it('root position 7th chords', () => {
    expect(top('C E G B')).toBe('Cmaj7');
    expect(top('D F A C')).toBe('Dm7');
    expect(top('G B D F')).toBe('G7');
    expect(top('B D F A')).toBe('Bm7♭5');
    expect(top('C E G')).toBe('C');
    expect(top('A C E')).toBe('Am');
  });
  it('doubled notes and octaves do not matter', () => {
    expect(recognize([36, 48, 52, 55, 59, 64], C)[0].chord.symbol).toBe('Cmaj7');
  });
  it('the lowest note decides between look-alikes', () => {
    expect(top('C E G A')).toBe('C6');
    expect(top('A C E G')).toBe('Am7');
    expect(all('C E G A')).toContain('Am7/C');
    expect(top('B D F A')).toBe('Bm7♭5');
    expect(top('D F A B')).toBe('Dm6');
    expect(top('G C D F A')).toBe('G9sus4');
    expect(top('F A C D G')).toBe('F6/9');
  });
  it('inversions come out as slash chords', () => {
    expect(top('E G C')).toBe('C/E');
    expect(top('B D F G')).toBe('G7/B');
    expect(top('E G A C')).toBe('Am7/E'); // a 7th chord before a 6th chord
  });
  it('a missing 5th is still the chord', () => {
    expect(top('C E B')).toBe('Cmaj7');
    expect(top('G B F')).toBe('G7');
    expect(top('G B F A')).toBe('G9');
  });
  it('extended chords', () => {
    expect(top('D F A C E')).toBe('Dm9');
    expect(top('G B D F A E')).toBe('G13');
    expect(top('C E G B F#')).toBe('Cmaj7♯11');
    expect(top('G B F Ab Eb')).toBe('G7♭9♭13');
  });
  it('rootless voicings are offered, the rooted reading first', () => {
    expect(all('F A C E').slice(0, 2)).toEqual(['Fmaj7', 'Dm9']); // Dm9 without its D
    // 7 9 3 13 of G13 = 3 ♭13 7 ♯9 of D♭7 (rule 8: tritone subs share a rootless voicing).
    // With F in the bass it is also Fmaj7♯11 without its 5th, and a root in the bass wins.
    const r = recognize(m('F A B E'), C);
    expect(r.map(x => x.chord.symbol)).toEqual(['Fmaj7♯11', 'G13', 'D♭7♯9♭13']);
    expect(r.map(x => x.how)).toEqual(['no5', 'rootless', 'rootless']);
  });
  it('diminished 7th: named from the bass', () => {
    expect(top('C# E G Bb')).toBe('C♯°7');
    expect(top('E G Bb Db')).toBe('E°7');
  });
  it('spells roots for the key', () => {
    expect(top('Db F Ab B')).toBe('D♭7'); // ♭II7, not C♯7
    expect(top('F# A C E')).toBe('F♯m7♭5'); // ♯iv ø
    expect(top('Bb D F Ab')).toBe('B♭7');
    expect(top('Eb G Bb D', homeKey(10, 'major'))).toBe('E♭maj7');
    expect(top('F# A# C# E', homeKey(11, 'major'))).toBe('F♯7');
    expect(fmtRoot(spellRoot(8, 'maj7', homeKey(0, 'minor')))).toBe('Ab');
  });
  it('reads back every chord type the app knows, on every root', () => {
    const bad: string[] = [];
    for (const kind of Object.keys(KINDS) as KindId[]) for (let pc = 0; pc < 12; pc++) {
      const c = makeChord(spellRoot(pc, kind, C), kind);
      if (new Set(c.tones.map(pcOf)).size < 3) continue;
      const got = recognize(passVoicing(c).map(v => v.midi), C);
      if (!got.some(r => r.chord.symbol === c.symbol)) bad.push(`${c.symbol} → ${got.map(r => r.chord.symbol).join(', ')}`);
      else if (got[0].how !== 'root') bad.push(`${c.symbol}: first reading is ${got[0].how} ${got[0].chord.symbol}`);
    }
    expect(bad).toEqual([]);
  });
  it('every name it gives can be typed back in', () => {
    const bad: string[] = [];
    for (const kind of Object.keys(KINDS) as KindId[]) for (const r of ['C', 'F#', 'Bb']) {
      const c = makeChord(note(r), kind, kind === '' ? undefined : note(r === 'C' ? 'E' : r)), p = parseChord(c.symbol);
      if (!p || p.symbol !== c.symbol) bad.push(c.symbol);
    }
    expect(bad).toEqual([]);
  });
});
const fmtRoot = (n: { letter: string; acc: number }) => n.letter + (n.acc < 0 ? 'b'.repeat(-n.acc) : '#'.repeat(n.acc));

describe('a better-fitting key', () => {
  const ch = (s: string) => parseChord(s)!;
  it('says nothing when the chords fit the key', () => {
    expect(betterKey(['Dm7', 'G7', 'Cmaj7'].map(ch), C, pc => homeKey(pc, 'major'))).toBeNull();
  });
  it('points to the key that holds the chords', () => {
    const b = betterKey(['Gm7', 'C7', 'Fmaj7', 'Bbmaj7'].map(ch), C, pc => homeKey(pc, 'major'));
    expect(b).toEqual({ pc: 5, fits: 4, now: 1 });
  });
});
