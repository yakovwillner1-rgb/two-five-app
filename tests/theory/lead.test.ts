import { describe, expect, it } from 'vitest';
import { homeKey } from '../../src/theory/home';
import { E2, fourWay, leadScale, leadVoicings, melodyCheck, parsePitch, pitchName, rangeOk, rankLead, sixthOf, voiceMotion, type LeadVoicing } from '../../src/theory/lead';
import { KINDS, parseChord, type KindId } from '../../src/theory/symbols';

/* Melody on top. Home key C major unless said. Pitches are written with octaves (C4 = middle C). */
const C = homeKey(0, 'major'), Am = homeKey(9, 'minor');
const ch = (s: string) => parseChord(s)!, p = (s: string) => parsePitch(s)!;
const list = (sym: string, mel: string, next = '', key = C): LeadVoicing[] => leadVoicings(ch(sym), p(mel), next ? ch(next) : null, key);
const get = (sym: string, mel: string, id: string, next = '', key = C): LeadVoicing | undefined => list(sym, mel, next, key).find(v => v.id === id);
const spell = (v: LeadVoicing | undefined): string => (v ? v.notes.map(n => pitchName(n.midi, n.note)).join(' ') : 'none');
const left = (v: LeadVoicing | undefined): string => (v ? v.notes.filter(n => n.hand === 'L').map(n => pitchName(n.midi, n.note)).join(' ') : 'none');

describe('pitch names', () => {
  it('reads and writes octaves', () => {
    expect(p('C4')).toBe(60);
    expect(p('E5')).toBe(76);
    expect(p('Bb3')).toBe(58);
    expect(p('F#2')).toBe(42);
    expect(parsePitch('H4')).toBeNull();
    expect(parsePitch('C')).toBeNull();
    expect(spell(get('Cmaj7', 'E5', 'close'))).toBe('G4 B4 C5 E5');
  });
});

describe('close and drop voicings', () => {
  it('SPEC: Cmaj7 with E5 on top → drop 2 = C4 G4 B4 E5', () => {
    expect(spell(get('Cmaj7', 'E5', 'drop2'))).toBe('C4 G4 B4 E5');
  });
  it('drop 3 and drop 2&4 of the same close voicing (G4 B4 C5 E5)', () => {
    expect(spell(get('Cmaj7', 'E5', 'drop3'))).toBe('B3 G4 C5 E5');
    expect(spell(get('Cmaj7', 'E5', 'drop24'))).toBe('G3 C4 B4 E5');
  });
  it('each inversion: the melody decides', () => {
    expect(spell(get('Cmaj7', 'C5', 'close'))).toBe('E4 G4 B4 C5');
    expect(spell(get('Cmaj7', 'G4', 'close'))).toBe('B3 C4 E4 G4');
    expect(spell(get('Cmaj7', 'B4', 'close'))).toBe('C4 E4 G4 B4');
    expect(spell(get('Dm7', 'A4', 'close'))).toBe('C4 D4 F4 A4');
  });
  it('a 9 on top takes the place of the root; a 13 takes the place of the 5th', () => {
    expect(get('Cmaj7', 'D5', 'close')!.formula).toBe('3 5 7 9');
    expect(spell(get('Cmaj7', 'D5', 'close'))).toBe('E4 G4 B4 D5');
    expect(get('G7', 'E5', 'close')!.formula).toBe('♭7 R 3 13');
    expect(spell(get('G7', 'E5', 'close'))).toBe('F4 G4 B4 E5');
  });
  it('the 3rd and 7th always stay', () => {
    for (const [sym, mel] of [['Cmaj7', 'D5'], ['Cmaj7', 'A4'], ['G7', 'A4'], ['G7', 'E5'], ['Dm7', 'G4'], ['Dm7', 'E5'], ['G7', 'Ab4'], ['C7', 'F#5']]) {
      const f = get(sym, mel, 'close')!.formula.split(' ');
      expect(f.some(l => l === '3' || l === '♭3'), sym + mel).toBe(true);
      expect(f.some(l => l === '7' || l === '♭7'), sym + mel).toBe(true);
    }
  });
  it('the chord\'s own extensions are in the voicing (Dm9: 9 for the root; G13: 9 and 13)', () => {
    expect(get('Dm9', 'C5', 'close')!.formula).toBe('9 ♭3 5 ♭7');
    expect(spell(get('G13', 'E5', 'close'))).toBe('F4 A4 B4 E5');
    expect(get('G13', 'E5', 'close')!.formula).toBe('♭7 9 3 13');
  });
  it('the melody wins its slot back (root on top of Dm9)', () => {
    expect(get('Dm9', 'D5', 'close')!.formula).toBe('♭3 5 ♭7 R');
  });
  it('spelling follows the chord: E♭maj7, F♯m7♭5, A♭7 with a ♭9', () => {
    expect(spell(get('Ebmaj7', 'G4', 'close'))).toBe('B♭3 D4 E♭4 G4');
    expect(spell(get('F#m7b5', 'E5', 'close'))).toBe('F♯4 A4 C5 E5');
    expect(spell(get('Ab7', 'Bbb4', 'close', 'Dbmaj7'))).toBe('C4 E♭4 G♭4 B𝄫4');
  });
  it('a melody with a different 3rd or 7th has no close voicing (B♭ over Cmaj7, E over Cm7)', () => {
    expect(fourWay(ch('Cmaj7'), p('Bb4'))).toBeNull();
    expect(fourWay(ch('Cm7'), p('E4'))).toBeNull();
    expect(get('Cmaj7', 'Bb4', 'close')).toBeUndefined();
  });
  it('a triad has three notes and no drop voicings', () => {
    expect(spell(get('C', 'G5', 'close'))).toBe('C5 E5 G5');
    expect(get('C', 'G5', 'drop2')).toBeUndefined();
  });
});

describe('block chords (Shearing)', () => {
  it('close voicing with the melody doubled an octave below', () => {
    const v = get('Cmaj7', 'E5', 'block');
    expect(spell(v)).toBe('E4 G4 B4 C5 E5');
    expect(left(v)).toBe('E4');
  });
});

describe('rootless voicings under the melody (Levine)', () => {
  it('SPEC: Rootless A Dm7 = F A C E', () => {
    const v = get('Dm7', 'A5', 'rootlessA', 'G7');
    expect(left(v)).toBe('F3 A3 C4 E4');
    expect(v!.formula).toBe('♭3 5 ♭7 9 5');
  });
  it('SPEC: Rootless B G7 = F A B E (7-9-3-13)', () => {
    const v = get('G7', 'D5', 'rootlessB', 'Cmaj7');
    expect(left(v)).toBe('F3 A3 B3 E4');
    expect(v!.formula).toBe('♭7 9 3 13 5');
  });
  it('Rootless A G7 = B E F A (3-13-7-9); Cmaj7 A = E G B D, B = B D E G', () => {
    expect(left(get('G7', 'D6', 'rootlessA', 'Cmaj7'))).toBe('B3 E4 F4 A4');
    expect(left(get('Cmaj7', 'E5', 'rootlessA'))).toBe('E3 G3 B3 D4');
    expect(left(get('Cmaj7', 'E5', 'rootlessB'))).toBe('B3 D4 E4 G4');
  });
  it('V7 going to a minor chord takes ♭9 and ♭13 (E7 → Am7: D F G♯ C)', () => {
    const v = get('E7', 'B4', 'rootlessB', 'Am7');
    expect(left(v)).toBe('D3 F3 G♯3 C4');
    expect(v!.formula).toBe('♭7 ♭9 3 ♭13 5');
  });
  it('a dominant with no next chord is read as V of the key chord a fifth below', () => {
    expect(leadScale(ch('G7'), null, C).id).toBe('mixolydian');
    expect(leadScale(ch('E7'), null, C).id).toBe('phrygianDominant');
    expect(leadScale(ch('Db7'), null, C).id).toBe('lydianDominant');
    expect(leadScale(ch('E7'), null, Am).id).toBe('phrygianDominant');
  });
  it('where the 9 is an avoid note the root takes its place (Em7 as iii, Bm7♭5)', () => {
    expect(get('Em7', 'B4', 'rootlessA')!.formula).toBe('♭3 5 ♭7 R 5');
    expect(get('Bm7b5', 'D5', 'rootlessA', 'E7')!.formula).toBe('♭3 ♭5 ♭7 R ♭3');
  });
  it('a 9 or 13 in the melody is used in the left hand too (no ♭9 against 9)', () => {
    expect(get('G7', 'Ab5', 'rootlessB', 'Cmaj7')!.formula).toBe('♭7 ♭9 3 13 ♭9');
    expect(get('G7', 'Eb5', 'rootlessB', 'Cmaj7')!.formula).toBe('♭7 9 3 ♭13 ♭13');
  });
  it('left out when the melody is not above the left hand', () => {
    expect(get('Cmaj7', 'E4', 'rootlessB')).toBeUndefined();
    expect(get('Cmaj7', 'E4', 'rootlessA')).toBeDefined();
  });
});

describe('Barry Harris 6th-diminished', () => {
  it('which 6th chord stands for a chord', () => {
    const six = (s: string) => sixthOf(ch(s))?.symbol ?? 'none';
    expect(six('Cmaj7')).toBe('C6');
    expect(six('Cm6')).toBe('Cm6');
    expect(six('Dm7')).toBe('F6');
    expect(six('Bm7b5')).toBe('Dm6');
    expect(six('G7')).toBe('Dm6');
    expect(six('G7b9')).toBe('none');
    expect(six('C°7')).toBe('none');
  });
  it('a note of the 6th chord gets the 6th chord; a passing note gets the diminished', () => {
    const on = get('Cmaj7', 'E5', 'sixthDim'), off = get('Cmaj7', 'D5', 'sixthDim');
    expect(spell(on)).toBe('G4 A4 C5 E5');
    expect(on!.sounds).toBe('C6');
    expect(spell(off)).toBe('F4 A♭4 B4 D5');
    expect(off!.sounds).toBe('B°7');
  });
  it('the eight notes of the C6 diminished scale are all harmonized; the rest are not', () => {
    const kinds = ['C5', 'D5', 'E5', 'F5', 'G5', 'Ab5', 'A5', 'B5'].map(m => get('C6', m, 'sixthDim')!.sounds);
    expect(kinds).toEqual(['C6', 'B°7', 'C6', 'B°7', 'C6', 'B°7', 'C6', 'B°7']);
    for (const m of ['Db5', 'Eb5', 'F#5', 'Bb5']) expect(get('C6', m, 'sixthDim')).toBeUndefined();
  });
  it('Dm7 is voiced as F6, G7 as Dm6', () => {
    expect(spell(get('Dm7', 'A4', 'sixthDim'))).toBe('C4 D4 F4 A4');
    expect(spell(get('G7', 'B4', 'sixthDim', 'Cmaj7'))).toBe('D4 F4 A4 B4');
    expect(get('G7', 'B4', 'sixthDim', 'Cmaj7')!.formula).toBe('5 ♭7 9 3');
  });
});

describe('quartal voicings', () => {
  it('So What: Dm7 with A on top = D G C F A (three 4ths and a major 3rd)', () => {
    const v = get('Dm7', 'A4', 'soWhat', 'G7');
    expect(spell(v)).toBe('D3 G3 C4 F4 A4');
    expect(v!.formula).toBe('R 11 ♭7 ♭3 5');
    const gaps = v!.notes.map((n, i) => (i ? n.midi - v!.notes[i - 1].midi : 0)).slice(1);
    expect(gaps).toEqual([5, 5, 5, 4]);
  });
  it('the same shape on a major chord gives a 6/9 sound (Cmaj7, E on top)', () => {
    expect(get('Cmaj7', 'E5', 'soWhat')!.formula).toBe('13 9 5 R 3');
  });
  it('left out when a note would be an avoid note or outside the scale', () => {
    /* G7 with D on top: E A D G C → C is the avoid 11 */
    expect(get('G7', 'D5', 'soWhat', 'Cmaj7')).toBeUndefined();
    /* Cmaj7 with C on top: stacked 4ths give D G C F → no: F is the avoid 11 */
    for (const v of list('Cmaj7', 'F5')) expect(['soWhat', 'quartal']).not.toContain(v.type);
  });
});

describe('upper structures (major triad over the 3rd and 7th of a dominant)', () => {
  it('SPEC: D triad over C7 = C13♯11', () => {
    const v = get('C7', 'A5', 'upperII');
    expect(v!.sounds).toBe('C13♯11');
    expect(spell(v)).toBe('E4 B♭4 D5 F♯5 A5'); // C E B♭ + D F♯ A, without the root
    expect(left(v)).toBe('E4 B♭4');
  });
  it('SPEC: E♭ triad over G7 = G7♯9♭13 (♭VI)', () => {
    const v = get('G7', 'Eb5', 'upper♭VI', 'Cmaj7');
    expect(v!.sounds).toBe('G7♯9♭13');
    expect(v!.notes.filter(n => n.hand === 'R').map(n => n.label)).toEqual(['R', '♯9', '♭13']);
    expect(spell(v)).toBe('B3 F4 G4 B♭4 E♭5');
    expect(left(v)).toBe('B3 F4');
  });
  it('each of the five triads appears only when the melody is one of its notes', () => {
    const ids = (mel: string) => list('C7', mel).filter(v => v.type === 'upper').map(v => v.id).sort();
    expect(ids('A5')).toEqual(['upperII', 'upperVI']);          // A: 13 of II (D F♯ A) and root of VI (A C♯ E)
    expect(ids('F#5')).toEqual(['upperII', 'upper♭V']);         // F♯/G♭
    expect(ids('Eb5')).toEqual(['upper♭III', 'upper♭VI']);      // E♭
    expect(ids('F5')).toEqual([]);
  });
  it('only on dominant chords with a major 3rd', () => {
    expect(list('Cmaj7', 'D5').some(v => v.type === 'upper')).toBe(false);
    expect(list('G7sus4', 'A5').some(v => v.type === 'upper')).toBe(false);
  });
});

describe('spread voicings', () => {
  it('1–7: root and 7th in the left hand, 3-5-9 in the right (Cmaj7, D on top)', () => {
    const v = get('Cmaj7', 'D5', 'spread17');
    expect(spell(v)).toBe('C2 B2 E4 G4 D5');
    expect(left(v)).toBe('C2 B2');
  });
  it('1–10: root and the 3rd a tenth above', () => {
    const v = get('Cmaj7', 'D5', 'spread110');
    expect(spell(v)).toBe('C2 E3 G4 B4 D5');
    expect(v!.notes[1].midi - v!.notes[0].midi).toBe(16);
  });
});

describe('cluster', () => {
  it('3rd, 7th and 9th under the melody with a 2nd inside (Cmaj7, E on top: G B D E)', () => {
    const v = get('Cmaj7', 'E5', 'cluster');
    expect(spell(v)).toBe('G4 B4 D5 E5');
    expect(v!.notes.some((n, i) => i > 0 && n.midi - v!.notes[i - 1].midi <= 2)).toBe(true);
  });
  it('not offered when it would repeat the close voicing, or put two kinds of 9 together', () => {
    expect(get('Cmaj7', 'D5', 'cluster')).toBeUndefined();
    expect(get('G7', 'Ab5', 'cluster', 'Cmaj7')).toBeUndefined();
  });
});

describe('range rule', () => {
  it('a 3rd needs its lower note at E2 or higher', () => {
    expect(E2).toBe(40);
    expect(rangeOk([40, 44])).toBe(true);
    expect(rangeOk([39, 43])).toBe(false);
    expect(rangeOk([36, 46])).toBe(true); // a 7th may go lower
  });
  it('no voicing in any list breaks it, the melody is always on top and never moves', () => {
    const kinds = Object.keys(KINDS) as KindId[];
    for (const root of ['C', 'Db', 'F#', 'Bb']) for (const k of kinds) for (const mel of [52, 60, 67, 76, 84]) {
      const c = ch(root + k);
      for (const v of leadVoicings(c, mel, null, C)) {
        const ms = v.notes.map(n => n.midi);
        expect(rangeOk(ms), `${c.symbol} ${v.id} ${mel}`).toBe(true);
        expect(Math.max(...ms), `${c.symbol} ${v.id}`).toBe(mel);
        expect(ms[ms.length - 1]).toBe(mel);
        expect([...ms].sort((a, b) => a - b), `${c.symbol} ${v.id} sorted`).toEqual(ms);
        expect(new Set(ms).size, `${c.symbol} ${v.id} ${mel} no doubled key`).toBe(ms.length);
        v.notes.forEach(n => expect((n.midi % 12 + 12) % 12).toBe(((('C D EF G A B'.indexOf(n.note.letter)) + n.note.acc) % 12 + 12) % 12));
      }
    }
  });
});

describe('voice leading', () => {
  it('same number of notes: voice by voice', () => {
    const m = voiceMotion([53, 57, 60, 64], [53, 57, 59, 64]); // Dm7 A form → G7 B form
    expect(m.moves.map(x => x.semis)).toEqual([0, 0, -1, 0]);
    expect(m.total).toBe(1);
    expect(m.common).toBe(3);
  });
  it('different sizes: each new note comes from the nearest old one', () => {
    const m = voiceMotion([48, 55, 64], [48, 52, 55, 62]);
    expect(m.moves.map(x => x.from)).toEqual([48, 55, 55, 64]);
    expect(m.total).toBe(0 + 3 + 0 + 2);
  });
  it('with a previous voicing the smoothest comes first; without one the type order stays', () => {
    const vs = list('G7', 'E5', 'Cmaj7');
    expect(rankLead(vs, null).map(r => r.voicing.id)).toEqual(vs.map(v => v.id));
    /* previous: Dm7 rootless A under E5 → G7 rootless B under E5 moves one note by a half step */
    const prev = get('Dm7', 'E5', 'rootlessA', 'G7')!.notes.map(n => n.midi);
    const r = rankLead(vs, prev);
    expect(r[0].voicing.id).toBe('rootlessB');
    expect(r[0].motion!.total).toBe(1);
    for (let i = 1; i < r.length; i++) expect(r[i].motion!.mean).toBeGreaterThanOrEqual(r[i - 1].motion!.mean);
  });
});

describe('melody check', () => {
  it('SPEC: F over Cmaj7 is an avoid note', () => {
    const m = melodyCheck(ch('Cmaj7'), p('F5'), null, C);
    expect(m.role).toBe('avoid');
    expect(m.label).toBe('11');
    expect(m.fixes.find(f => f.kind === 'move')!.midi).toBe(p('E5'));
    expect(m.fixes.filter(f => f.kind === 'reharm').map(f => f.chord!.symbol)).toEqual(['Fmaj7', 'G7', 'Dm7']);
  });
  it('SPEC: ♭9 over a m7 chord (F over Em7, the iii of C) is an avoid note', () => {
    const m = melodyCheck(ch('Em7'), p('F5'), null, C);
    expect(m.role).toBe('avoid');
    expect(m.label).toBe('♭9');
  });
  it('chord tones and available tensions pass with no fix', () => {
    expect(melodyCheck(ch('Cmaj7'), p('E5'), null, C)).toMatchObject({ role: 'chord', label: '3', fixes: [] });
    expect(melodyCheck(ch('Cmaj7'), p('D5'), null, C)).toMatchObject({ role: 'tension', label: '9', fixes: [] });
    expect(melodyCheck(ch('G7'), p('E5'), ch('Cmaj7'), C)).toMatchObject({ role: 'tension', label: '13' });
    expect(melodyCheck(ch('Dm7'), p('G5'), ch('G7'), C)).toMatchObject({ role: 'tension', label: '11' });
  });
  it('a note written in the chord symbol is a chord tone (F♯ over Cmaj7♯11)', () => {
    expect(melodyCheck(ch('Cmaj7#11'), p('F#5'), null, C)).toMatchObject({ role: 'chord', label: '♯11' });
  });
  it('the 4th over a dominant: sus fix first (C over G7 → G7sus4)', () => {
    const m = melodyCheck(ch('G7'), p('C5'), ch('Cmaj7'), C);
    expect(m.role).toBe('avoid');
    expect(m.fixes[0]).toMatchObject({ kind: 'sus' });
    expect(m.fixes[0].chord!.symbol).toBe('G7sus4');
  });
  it('a note outside the scale: the chord can take it as a color (A♭ over G7 → a G7 with ♭9)', () => {
    const m = melodyCheck(ch('G7'), p('Ab5'), ch('Cmaj7'), C);
    expect(m.role).toBe('outside');
    const color = m.fixes.filter(f => f.kind === 'color');
    expect(color.length).toBeGreaterThan(0);
    color.forEach(f => expect(f.chord!.labels).toContain('♭9'));
    expect(m.fixes.filter(f => f.kind === 'move').map(f => f.midi)).toEqual([p('G5'), p('A5')]);
    /* the same with no next chord given: G7 in C is read as the V of Cmaj7 */
    expect(melodyCheck(ch('G7'), p('Ab5'), null, C).fixes.map(f => f.text)).toEqual(m.fixes.map(f => f.text));
  });
  it('spelling of the melody note follows the chord (A♭ = ♭9 of G7, G♯ = 3rd of E7, B𝄫 = ♭9 of A♭7)', () => {
    expect(melodyCheck(ch('G7b9'), 68, null, C).note).toEqual({ letter: 'A', acc: -1 });
    expect(melodyCheck(ch('E7'), 68, null, C).note).toEqual({ letter: 'G', acc: 1 });
    expect(melodyCheck(ch('Ab7b9'), 69, null, C).note).toEqual({ letter: 'B', acc: -2 });
  });
});
