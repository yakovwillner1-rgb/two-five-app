import { describe, expect, it } from 'vitest';
import { homeKey } from '../../src/theory/home';
import { mod, note, pcOf } from '../../src/theory/notes';
import { parseChord } from '../../src/theory/symbols';
import { SCALES, SCALE_IDS, avoidOf, chordScale, extensionOptions, leadsTo, scaleChoices, tensionMoves, tensionsOf, type ScaleId } from '../../src/theory/tensions';
import { names } from './helpers';

const C = homeKey(0, 'major');
const ch = (s: string) => parseChord(s)!;
const labels = (id: ScaleId) => { const s = chordScale(id, note('C')); return `${tensionsOf(s).map(n => n.label).join(' ')} | ${avoidOf(s).map(n => n.label).join(' ')}`; };

describe('chord scales: available tensions and avoid notes', () => {
  it('per scale on C: "tensions | avoid notes" (hand-typed from the sources in docs/THEORY_SOURCES.md)', () => {
    const want: Record<ScaleId, string> = {
      ionian: '9 13 | 11', lydian: '9 ♯11 13 | ', dorian: '9 11 13 | ', phrygian: '11 | ♭9 ♭13', aeolian: '9 11 | ♭13', melodicMinor: '9 11 13 | ',
      mixolydian: '9 13 | 11', lydianDominant: '9 ♯11 13 | ', mixolydianb13: '9 ♭13 | 11', phrygianDominant: '♭9 ♭13 | 11', altered: '♭9 ♯9 ♯11 ♭13 | ',
      halfWhole: '♭9 ♯9 ♯11 13 | ', wholeTone: '9 ♯11 ♭13 | ', mixolydianSus: '9 13 | 3', locrian: '11 ♭13 | ♭9', locrianNat2: '9 11 ♭13 | ', wholeHalf: '9 11 ♭13 7 | ', lydianAug: '9 ♯11 | 13',
    };
    for (const id of SCALE_IDS) expect(labels(id), id).toBe(want[id]);
  });
  it('scale notes are spelled by letter', () => {
    expect(names(chordScale('dorian', note('C')).notes.map(n => n.note))).toBe('C D Eb F G A Bb');
    expect(names(chordScale('altered', note('G')).notes.map(n => n.note))).toBe('G Ab A# B C# Eb F');
    expect(names(chordScale('lydianDominant', note('Db')).notes.map(n => n.note))).toBe('Db Eb F G Ab Bb Cb');
    expect(names(chordScale('phrygianDominant', note('E')).notes.map(n => n.note))).toBe('E F G# A B C D');
    expect(names(chordScale('wholeHalf', note('C#')).notes.map(n => n.note))).toBe('C# D# E F# G A Bb B#');
  });
  it('THE RULE holds for every scale: tension = whole step above a chord tone; avoid = half step above one', () => {
    for (const id of SCALE_IDS) for (const root of ['C', 'F#', 'Bb']) {
      const s = chordScale(id, note(root)), tones = s.chord.tones.map(pcOf), dominant = s.chord.kind === '7';
      const above = (n: number, d: number) => tones.some(t => mod(n - t, 12) === d);
      for (const t of tensionsOf(s)) {
        const ok = above(pcOf(t.note), 2) || (dominant && ['♭9', '♯9', '♭13'].includes(t.label));
        expect(ok, `${id} on ${root}: tension ${t.label}`).toBe(true);
      }
      for (const a of avoidOf(s)) {
        // on a sus chord the avoid note is the 3rd itself (a half step under the 4th)
        const ok = above(pcOf(a.note), 1) || (id === 'mixolydianSus' && a.label === '3');
        expect(ok, `${id} on ${root}: avoid ${a.label}`).toBe(true);
      }
      // nothing a half step above a chord tone is offered as a tension, except ♭9 / ♭13 on dominants
      for (const t of tensionsOf(s)) if (above(pcOf(t.note), 1) && !above(pcOf(t.note), 2)) expect(dominant && ['♭9', '♭13', '♯9'].includes(t.label), `${id}: ${t.label}`).toBe(true);
    }
  });
  it('flags the one disputed tension: 13 on a Dorian m7', () => {
    const s = chordScale('dorian', note('D'));
    expect(s.notes.filter(n => n.caution).map(n => n.label)).toEqual(['13']);
    for (const id of SCALE_IDS) if (id !== 'dorian') expect(chordScale(id, note('C')).notes.some(n => n.caution)).toBe(false);
  });
  it('extended chords only use notes of their scale and never an avoid note', () => {
    for (const id of SCALE_IDS) {
      const s = chordScale(id, note('C')), pcs = new Set(s.notes.map(n => pcOf(n.note))), avoid = new Set(avoidOf(s).map(n => pcOf(n.note)));
      for (const k of SCALES[id].options) {
        const c = parseChord('C' + k)!;
        for (const t of c.tones) { expect(pcs.has(pcOf(t)), `${id}: C${k}`).toBe(true); expect(avoid.has(pcOf(t)), `${id}: C${k} uses an avoid note`).toBe(false); }
      }
    }
  });
});

describe('which scale: it depends on what the chord does', () => {
  const first = (c: string, next: string | null, key = C) => scaleChoices(ch(c), next ? ch(next) : null, key)[0].scale.id;
  it('dominants follow where they go', () => {
    expect(first('G7', 'Cmaj7')).toBe('mixolydian'); // down a fifth to major: 9, 13
    expect(first('C7', 'Fmaj7')).toBe('mixolydian');
    expect(first('E7', 'Am7')).toBe('phrygianDominant'); // down a fifth to minor: ♭9, ♭13
    expect(first('A7', 'Dm7')).toBe('phrygianDominant');
    expect(first('Db7', 'Cmaj7')).toBe('lydianDominant'); // tritone sub
    expect(first('Bb7', 'Cmaj7')).toBe('lydianDominant'); // backdoor ♭VII7
    expect(first('F7', 'Cmaj7')).toBe('lydianDominant'); // IV7
    expect(scaleChoices(ch('A7'), ch('Dm7'), C).map(x => x.scale.id)).toEqual(['phrygianDominant', 'altered', 'mixolydianb13']);
    expect(scaleChoices(ch('G7'), ch('Cmaj7'), C).map(x => x.scale.id)).toEqual(['mixolydian', 'altered', 'halfWhole']);
  });
  it('major chords: Ionian at home, Lydian elsewhere', () => {
    expect(first('Cmaj7', null)).toBe('ionian');
    expect(first('Fmaj7', null)).toBe('lydian');
    expect(first('Abmaj7', null)).toBe('lydian');
    expect(first('Cmaj7', null, homeKey(9, 'minor'))).toBe('ionian'); // ♭III of A minor = relative major
  });
  it('minor chords: Dorian as a ii, Phrygian on iii, Aeolian on vi', () => {
    expect(first('Dm7', 'G7')).toBe('dorian');
    expect(first('Gm7', 'C7')).toBe('dorian');
    expect(first('Em7', 'Am7')).toBe('phrygian');
    expect(first('Am7', 'Dm7')).toBe('aeolian');
    expect(first('Am7', 'D7')).toBe('dorian'); // now it is a ii
    expect(first('Am7', null, homeKey(9, 'minor'))).toBe('aeolian');
    expect(first('Cm6', null)).toBe('melodicMinor');
  });
  it('half-diminished, diminished, sus', () => {
    expect(scaleChoices(ch('Bm7b5'), ch('E7'), C).map(x => x.scale.id)).toEqual(['locrian', 'locrianNat2']);
    expect(first('C#dim7', 'Dm7')).toBe('wholeHalf');
    expect(first('G7sus4', 'Cmaj7')).toBe('mixolydianSus');
  });
});

describe('extensions that lead into the next chord', () => {
  const opts = (c: string, next: string) => extensionOptions(ch(c), ch(next), C).map(o => o.chord.symbol);
  const move = (c: string, next: string) => tensionMoves(ch(c), ch(next), C).map(m => m.text);
  it('options per situation', () => {
    expect(opts('G7', 'Cmaj7')).toEqual(['G9', 'G13', 'G7♯9♭13', 'G7♭9♯11', 'G13♭9', 'G7♯9']);
    expect(opts('E7', 'Am7')).toEqual(['E7♭9', 'E7♭9♭13', 'E7♯9♭13', 'E7♭9♯11', 'E9♭13', 'E7♭13']);
    expect(opts('Db7', 'Cmaj7')).toEqual(['D♭9♯11', 'D♭13♯11', 'D♭7♯11', 'D♭9', 'D♭13']);
    expect(opts('Dm7', 'G7')).toEqual(['Dm9', 'Dm11', 'Dm6']);
    expect(opts('Fmaj7', 'G7')).toEqual(['Fmaj7♯11', 'Fmaj9', 'F6/9', 'F6']);
    expect(opts('Em7', 'Am7')).toEqual(['Em7add11', 'Em9', 'Em11', 'Em6']);
    expect(extensionOptions(ch('C/G'), ch('G7'), C)).toEqual([]);
  });
  it('sourced resolutions: ♭9 falls to the 5th; the 9 of ii is the 13 of V; the 13 of V is the 3rd of I', () => {
    expect(move('G7b9', 'Cmaj7')).toEqual(['A♭ (♭9) moves down a half step to G, the 5th of Cmaj7']);
    expect(move('E7b9', 'Am7')).toEqual(['F (♭9) moves down a half step to E, the 5th of Am7']);
    expect(move('Dm9', 'G7')).toEqual(['E (9) stays the same: it is the 13th of G7']);
    expect(move('G13', 'Cmaj7')).toEqual(['A (9) stays the same: it is the 13th of Cmaj7', 'E (13) stays the same: it is the 3rd of Cmaj7']);
  });
  it('other tensions: the nearest note of the next chord', () => {
    expect(move('G7#9b13', 'Cmaj7')).toEqual(['A♯ (♯9) moves up a half step to B, the 7th of Cmaj7', 'E♭ (♭13) moves up a half step to E, the 3rd of Cmaj7']);
    expect(move('Db9#11', 'Cmaj7')).toEqual(['E♭ (9) moves up a half step to E, the 3rd of Cmaj7', 'G (♯11) stays the same: it is the 5th of Cmaj7']);
    expect(move('E7b9b13', 'Am7')).toEqual(['F (♭9) moves down a half step to E, the 5th of Am7', 'C (♭13) stays the same: it is the 3rd of Am7']);
  });
  it('every tension of every option gets a move, in all 12 keys', () => {
    for (let pc = 0; pc < 12; pc++) {
      const key = homeKey(pc, 'major');
      for (const [a, b] of [['G7', 'Cmaj7'], ['E7', 'Am7'], ['Db7', 'Cmaj7'], ['Dm7', 'G7'], ['Fmaj7', 'G7'], ['Am7', 'Dm7'], ['Bb7', 'Cmaj7']]) {
        for (const o of extensionOptions(ch(a), ch(b), key)) {
          const tensions = o.chord.labels.filter(l => !['R', '3', '♭3', '5', '♭5', '♯5', '7', '♭7', '𝄫7', '4'].includes(l));
          expect(o.moves.length, `${o.chord.symbol} → ${b}`).toBe(tensions.length);
        }
      }
    }
  });
});

describe('what a chord leads to', () => {
  const lead = (id: ScaleId, root: string) => leadsTo(id, note(root)).map(l => l.chords.map(c => c.symbol).join(' → '));
  it('by scale', () => {
    expect(lead('mixolydian', 'G')).toEqual(['Cmaj7']);
    expect(lead('phrygianDominant', 'E')).toEqual(['Am7']);
    expect(lead('altered', 'G')).toEqual(['Cmaj7', 'Cm7']);
    expect(lead('lydianDominant', 'Db')).toEqual(['Cmaj7', 'E♭maj7']);
    expect(lead('dorian', 'D')).toEqual(['G7']);
    expect(lead('locrian', 'B')).toEqual(['E7♭9 → Am7']);
    expect(lead('wholeHalf', 'C#')).toEqual(['Dm7', 'C♯maj7']);
    expect(lead('mixolydianSus', 'G')).toEqual(['G7', 'Cmaj7']);
    expect(lead('lydian', 'F')).toEqual(['G7', 'Cmaj7']);
    expect(lead('ionian', 'C')).toEqual([]);
  });
});
