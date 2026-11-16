import { describe, expect, it } from 'vitest';
import { BARRE, OPEN, TUNING, canon, fromChord, gripMidis, gripText, gripsFor, gripsWithTop, voiceLead, type GChord, type Grip } from '../../src/theory/guitar';
import { fmt, mod, pcOf } from '../../src/theory/notes';
import { parseChord } from '../../src/theory/symbols';

const G = (sym: string): GChord => { const c = parseChord(sym); if (!c) throw new Error('bad ' + sym); return c; };
const frets = (sym: string, type?: string): string[] => gripsFor(G(sym)).filter(g => !type || g.type === type).map(gripText);
const names = (g: Grip): string => g.notes.map(n => fmt(n.note)).join(' ');
const find = (sym: string, text: string): Grip | undefined => gripsFor(G(sym)).find(g => gripText(g) === text);

/* Known grips, checked against jazzguitar.be, jazz-guitar-licks.com, Fundamental Changes, Premier Guitar (docs/THEORY_SOURCES.md 37-44). */
describe('tuning', () => {
  it('standard tuning sounds E2 A2 D3 G3 B3 E4', () => { expect([...TUNING]).toEqual([40, 45, 50, 55, 59, 64]); });
  it('open C chord x-3-2-0-1-0 sounds C3 E3 G3 C4 E4', () => {
    const g = find('C', 'x-3-2-0-1-0')!; expect(g).toBeDefined(); expect(gripMidis(g)).toEqual([48, 52, 55, 60, 64]);
  });
});

describe('open and barre chords', () => {
  const root = (r: string) => r;
  it('every open shape spells its chord, root in the bass, nothing outside the chord', () => {
    for (const [q, shapes] of Object.entries(OPEN)) {
      const suffix = ({ maj: '', min: 'm', '7': '7', maj7: 'maj7', m7: 'm7' } as Record<string, string>)[q];
      for (const [r, fr] of Object.entries(shapes)) {
        const chord = G(root(r) + suffix), pcs = new Set(chord.tones.map(pcOf));
        const notes = fr.map((f, s) => (f < 0 ? null : TUNING[s] + f)).filter((x): x is number => x != null);
        expect(notes.every(m => pcs.has(mod(m, 12))), `${r}${suffix} ${fr}`).toBe(true);
        expect(mod(notes[0], 12), `${r}${suffix} bass`).toBe(pcOf(chord.tones[0]));
        const have = new Set(notes.map(m => mod(m, 12)));
        [chord.tones[0], chord.tones[1], chord.tones[chord.tones.length - 1]].forEach(n => expect(have.has(pcOf(n)), `${r}${suffix} has root, 3rd and 7th`).toBe(true));
      }
    }
  });
  it('barre shapes spell the chord at any fret (all 12 roots)', () => {
    for (const q of Object.keys(BARRE)) {
      const suffix = ({ maj: '', min: 'm', '7': '7', maj7: 'maj7', m7: 'm7' } as Record<string, string>)[q];
      for (const r of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']) {
        const chord = G(r + suffix), pcs = new Set(chord.tones.map(pcOf));
        const barres = gripsFor(chord).filter(g => g.type === 'barre');
        expect(barres.length, r + suffix).toBeGreaterThan(0);
        barres.forEach(g => { expect(g.notes.every(n => pcs.has(mod(n.midi, 12)))).toBe(true); expect(mod(g.notes[0].midi, 12)).toBe(pcOf(chord.tones[0])); });
      }
    }
  });
  it('knows the five basic chord types', () => {
    expect(['C', 'Cm', 'C7', 'Cmaj7', 'Cm7'].map(s => canon(G(s)))).toEqual(['maj', 'min', '7', 'maj7', 'm7']);
    expect(canon(G('C9'))).toBeNull();
  });
});

describe('shell (3-note) chords', () => {
  it('Cmaj7 root-3-7 is x-3-2-4-x-x', () => { expect(frets('Cmaj7', 'shell')).toContain('x-3-2-4-x-x'); });
  it('Cmaj7 root-7-3 skips the D string: x-3-x-4-5-x', () => { expect(frets('Cmaj7', 'shell')).toContain('x-3-x-4-5-x'); });
  it('C7 root-3-b7 is x-3-2-3-x-x (the Freddie Green chord)', () => { expect(frets('C7', 'shell')).toContain('x-3-2-3-x-x'); });
  it('every shell has exactly root, 3rd, 7th', () => {
    gripsFor(G('Dm7')).filter(g => g.type === 'shell').forEach(g => expect(g.notes.map(n => n.label).sort()).toEqual(['R', '♭3', '♭7'].sort()));
  });
});

describe('drop 2 (four neighbouring strings)', () => {
  it('Cmaj7 2nd inversion on strings 4-3-2-1 is x-x-5-5-5-7 (G C E B)', () => {
    const g = find('Cmaj7', 'x-x-5-5-5-7')!; expect(g?.type).toBe('drop2'); expect(names(g)).toBe('G C E B');
  });
  it('Cmaj7 root position on strings 5-4-3-2 is x-3-5-4-5-x (C G B E)', () => {
    const g = find('Cmaj7', 'x-3-5-4-5-x')!; expect(g?.type).toBe('drop2'); expect(names(g)).toBe('C G B E');
  });
  it('uses three string sets with four inversions each, at most', () => {
    const d2 = gripsFor(G('Cmaj7')).filter(g => g.type === 'drop2');
    expect(new Set(d2.map(g => g.notes[0].string)).size).toBe(3);
    d2.forEach(g => { expect(g.notes.length).toBe(4); const s = g.notes.map(n => n.string); expect(s[3] - s[0]).toBe(3); });
  });
  it('spells flats on flat chords (Ab7)', () => {
    gripsFor(G('Ab7')).filter(g => g.type === 'drop2').forEach(g => expect(names(g).split(' ').sort()).toEqual(['A♭', 'C', 'E♭', 'G♭'].sort()));
  });
});

describe('drop 3 (skips a string after the bass)', () => {
  it('G7 root position is 3-x-3-4-3-x (G F B D)', () => { const g = find('G7', '3-x-3-4-3-x')!; expect(g?.type).toBe('drop3'); expect(names(g)).toBe('G F B D'); });
  it('Dm7 root position is x-5-x-5-6-5 (D C F A)', () => { const g = find('Dm7', 'x-5-x-5-6-5')!; expect(g?.type).toBe('drop3'); expect(names(g)).toBe('D C F A'); });
  it('only two string sets: bass on the 6th or the 5th string', () => {
    const d3 = gripsFor(G('Cmaj7')).filter(g => g.type === 'drop3');
    expect(new Set(d3.map(g => g.notes[0].string))).toEqual(new Set([0, 1]));
  });
});

describe('no-root voicings', () => {
  it('leave the root out and keep the 3rd and 7th', () => {
    const rl = gripsFor(G('Dm7')).filter(g => g.type === 'rootless');
    expect(rl.length).toBeGreaterThan(0);
    rl.forEach(g => { const L = g.notes.map(n => n.label); expect(L).not.toContain('R'); expect(L).toContain('♭3'); expect(L).toContain('♭7'); expect(L).toContain('9'); });
  });
  it('a dominant takes the 13th instead of the 5th', () => {
    gripsFor(G('G7')).filter(g => g.type === 'rootless').forEach(g => { const L = g.notes.map(n => n.label); expect(L).toContain('13'); expect(L).not.toContain('5'); });
  });
});

describe('fourths', () => {
  it('Em7 So What is the open strings 0-0-0-0-0-x (E A D G B)', () => {
    const g = find('Em7', '0-0-0-0-0-x')!; expect(g?.type).toBe('quartal'); expect(names(g)).toBe('E A D G B');
  });
  it('only minor 7th chords get it', () => { expect(gripsFor(G('Cmaj7')).some(g => g.type === 'quartal')).toBe(false); expect(gripsFor(G('G7')).some(g => g.type === 'quartal')).toBe(false); });
});

describe('extended chords drop the 5th (and the 9th under a 13th)', () => {
  it('C9 plays root, 3rd, b7 and 9th', () => {
    gripsFor(G('C9')).filter(g => g.type === 'drop2').forEach(g => expect(g.notes.map(n => n.label).sort()).toEqual(['3', '9', 'R', '♭7'].sort()));
  });
  it('C13 plays root, 3rd, b7 and 13th', () => {
    gripsFor(G('C13')).filter(g => g.type === 'drop2').forEach(g => expect(g.notes.map(n => n.label).sort()).toEqual(['13', '3', 'R', '♭7'].sort()));
  });
});

describe('every grip is playable and correct (12 roots x common chords)', () => {
  const kinds = ['maj7', 'm7', '7', 'm7♭5', '°7', '9', '13', '6', 'm6', 'maj9', 'm9', '7sus4', '7♭9', '7♯11'];
  it('right notes, strings ascending, within the neck, hand within 5 frets, max 4 fingers', () => {
    for (const r of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']) for (const k of kinds) {
      const c = G(r + k), pcs = new Set(c.tones.map(pcOf));
      const list = gripsFor(c);
      expect(list.length, r + k).toBeGreaterThan(0);
      list.forEach(g => {
        expect(g.span, `${r}${k} ${gripText(g)}`).toBeLessThanOrEqual(5);
        expect(g.fingers).toBeLessThanOrEqual(4);
        expect(g.frets.every(f => f == null || (f >= 0 && f <= 15))).toBe(true);
        g.notes.forEach((n, i) => {
          expect(n.midi).toBe(TUNING[n.string] + n.fret);
          if (i) expect(n.midi).toBeGreaterThan(g.notes[i - 1].midi);
          if (g.type !== 'rootless' && g.type !== 'quartal') expect(pcs.has(mod(n.midi, 12)), `${r}${k} ${g.type} ${gripText(g)}`).toBe(true);
          expect(pcOf(n.note)).toBe(mod(n.midi, 12));
        });
        if (g.type !== 'rootless' && g.type !== 'quartal' && g.type !== 'triad') {
          const L = g.notes.map(n => n.label);
          expect(L.some(l => ['3', '♭3', '4'].includes(l)), `${r}${k} ${gripText(g)} has a 3rd`).toBe(true);
        }
      });
    }
  }, 60000);
});

describe('voice leading through a chord list', () => {
  it('Dm7 - G7 - Cmaj7: the hand barely moves', () => {
    const chart = ['Dm7', 'G7', 'Cmaj7'].map(G), path = voiceLead(chart);
    expect(path.length).toBe(3);
    const mid = (g: Grip) => (g.lo + g.hi) / 2;
    expect(Math.abs(mid(path[0]) - mid(path[1]))).toBeLessThanOrEqual(3);
    expect(Math.abs(mid(path[1]) - mid(path[2]))).toBeLessThanOrEqual(3);
    path.forEach((g, i) => expect(gripsFor(chart[i]).some(x => gripText(x) === gripText(g))).toBe(true));
  });
  it('picks the same grips on every run (no randomness)', () => {
    const chart = ['Am7', 'D7', 'Gmaj7'].map(G);
    expect(voiceLead(chart).map(gripText)).toEqual(voiceLead(chart).map(gripText));
  });
});

describe('melody on top (chord melody)', () => {
  it('Cmaj7 with E on top: every grip ends on an E, nearest octave first', () => {
    const list = gripsWithTop(G('Cmaj7'), 64);
    expect(list.length).toBeGreaterThan(0);
    list.forEach(g => expect(mod(g.notes[g.notes.length - 1].midi, 12)).toBe(4));
    expect(Math.abs(list[0].notes[list[0].notes.length - 1].midi - 64)).toBeLessThanOrEqual(12);
  });
});

describe('chart chords', () => {
  it('turns a chart chord into grips', () => {
    const c = parseChord('Dm7')!;
    expect(fromChord({ symbol: 'Dm7', tones: c.tones }).labels).toEqual(['R', '♭3', '5', '♭7']);
  });
});
