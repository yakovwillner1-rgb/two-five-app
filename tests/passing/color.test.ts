import { describe, expect, it } from 'vitest';
import { GENRES } from '../../src/data/styles';
import { homeKey } from '../../src/theory/home';
import { EXT_BASE, approach, carry, colorWay } from '../../src/theory/passing/color';
import { passingChords } from '../../src/theory/passing/engine';
import { scoreOf } from '../../src/theory/passing/rank';
import { pcOf } from '../../src/theory/notes';
import { KINDS, parseChord, type KindId, type PChord } from '../../src/theory/symbols';
import { baseKind, chordTensions, extensionOptions, plainOf } from '../../src/theory/tensions';

const C = homeKey(0, 'major');
const ch = (s: string): PChord => parseChord(s)!;
const way = (from: string, to: string, k: string) => {
  const s = passingChords(ch(from), ch(to), C).find(x => x.techniqueId + '.' + x.variant === k);
  if (!s) throw new Error('no way ' + k);
  return s;
};
const syms = (from: string, to: string, k: string) => way(from, to, k).chords.map(c => c.symbol);

describe('plain chords and tensions', () => {
  it('finds the plain chord under an extended one', () => {
    expect(baseKind('m9')).toBe('m7');
    expect(baseKind('13♯11')).toBe('7');
    expect(baseKind('6/9')).toBe('maj7');
    expect(baseKind('m7♭5')).toBe('m7♭5');
    expect(plainOf(ch('Dm11')).symbol).toBe('Dm7');
    expect(plainOf(ch('G7b9b13')).symbol).toBe('G7');
    expect(plainOf(ch('Cmaj7')).symbol).toBe('Cmaj7');
  });
  it('lists the notes a chord adds to root, 3rd, 5th, 7th', () => {
    expect(chordTensions(ch('Dm9')).map(t => t.label)).toEqual(['9']);
    expect(chordTensions(ch('G13')).map(t => t.label)).toEqual(['9', '13']);
    expect(chordTensions(ch('G7#9b13')).map(t => t.label)).toEqual(['♯9', '♭13']);
    expect(chordTensions(ch('Cmaj7'))).toEqual([]);
  });
});

describe('how one note connects', () => {
  const E = { note: ch('Dm9').tones[4], label: '9' };
  it('keeps a common tone first (Dm9 → G13: E is the 13th)', () => {
    const l = carry(E, ch('G13'));
    expect([l.semis, l.otherLabel, l.value]).toEqual([0, '13', 1]);
  });
  it('else moves a half step, else a whole step', () => {
    expect(carry(E, ch('G7')).semis).toBe(1); // E → F, the 7th
    expect(carry(E, ch('G7')).value).toBe(0.75);
    expect(carry(E, ch('Gbmaj7')).semis).toBe(1); // E → F
    expect(carry(E, ch('D')).semis).toBe(-2); // E → D
    expect(carry(E, ch('D')).value).toBe(0.5);
  });
  it('the 3rd and 7th of a dominant are not free to step to a tension (rule 12)', () => {
    const fs = { note: ch('Cmaj7#11').tones[4], label: '♯11' };
    const l = approach(fs, ch('G13'));
    expect(l.otherLabel).toBe('R'); // from G, not from the 7th F
    expect(l.semis).toBe(-1);
  });
});

describe('no extensions picked: nothing changes', () => {
  it('leaves plain chords plain and adds no ext info', () => {
    const s = way('Dm7', 'Cmaj7', 'secDom.major');
    expect(s.chords.map(c => c.symbol)).toEqual(['G7']);
    expect(s.ext).toBeUndefined();
    expect(colorWay([ch('G7')], ch('Dm7'), ch('Cmaj7'), C).chords[0].symbol).toBe('G7');
  });
  it('scores exactly as before', () => {
    const s = way('Dm7', 'Cmaj7', 'tritone.sub');
    expect(scoreOf(s, { genre: 'jazz', feel: 'tense' })).toBeCloseTo(GENRES.jazz.weights.tritone * 1.5);
  });
});

describe('extensions picked: the passing chords follow', () => {
  it('Dm9 → Cmaj9: the V becomes G13 (the 9 of ii is the 13 of V; rule 13)', () => {
    const s = way('Dm9', 'Cmaj9', 'secDom.major');
    expect(s.chords.map(c => c.symbol)).toEqual(['G13']);
    expect(s.ext!.fit).toBe(1);
    expect(s.ext!.factor).toBe(EXT_BASE + 1);
    expect(s.ext!.lines[0]).toBe('E, the 9th of Dm9, stays the same: it is the 13th of G13.');
    expect(s.ext!.lines[2]).toBe('D, the 9th of Cmaj9, is already there: it is the 5th of G13.');
  });
  it('does not repeat the start chord when it is extended (Dm9 then Dm7)', () => {
    expect(syms('Dm9', 'Cmaj9', 'secIIV.bright')).toEqual(['G13']);
  });
  it('into a minor chord the V takes ♭9 ♭13 (rule 9)', () => {
    expect(syms('Cmaj7', 'Am9', 'secDom.minor')).toEqual(['E7♭9♭13']);
  });
  it('into a major chord the V takes natural 9 / 13 (rule 9)', () => {
    expect(syms('Cmaj9', 'Fmaj9', 'secIIV.bright')).toEqual(['Gm9', 'C13']);
  });
  it('a tritone sub takes the ♯11 (rule 9)', () => {
    expect(syms('Cmaj9', 'Fmaj9', 'tritone.sub')).toEqual(['G♭7♯11']);
  });
  it('chords a technique already extended are left alone', () => {
    expect(syms('Cmaj9', 'Fmaj9', 'secIIV.dark')[0]).toBe('Gm7♭5');
    expect(syms('Dm9', 'Cmaj9', 'upperStruct.II')).toEqual(syms('Dm7', 'Cmaj7', 'upperStruct.II'));
  });
});

describe('extensions picked: the ranking follows', () => {
  it('a held extension beats one that has to move', () => {
    const v = way('Dm9', 'Cmaj9', 'secDom.major'), sub = way('Dm9', 'Cmaj9', 'tritone.sub');
    expect(v.ext!.fit).toBe(1);
    expect(sub.ext!.fit).toBe(0.75); // E rises to F, D is reached from D♭
    expect(v.ext!.factor).toBeGreaterThan(sub.ext!.factor);
  });
  it('picking a ♭9 on the landing chord lifts the tritone sub', () => {
    // B♭ (♭9 of A7♭9) is the root of the tritone sub B♭7; from E7 it is only a half step away
    expect(way('Em7', 'A7b9', 'tritone.sub').ext!.fit).toBe(1);
    expect(way('Em7', 'A7b9', 'secDom.major').ext!.fit).toBe(0.75);
  });
  it('the factor multiplies the style score', () => {
    const s = way('Dm9', 'Cmaj9', 'secDom.major');
    expect(scoreOf(s, { genre: 'jazz', feel: 'bright' })).toBeCloseTo(GENRES.jazz.weights.secDom * 1.5 * 1.5);
  });
});

describe('every extension on every chord type', () => {
  it('never throws, keeps root, 3rd and 7th of each passing chord, fit stays in 0–1', () => {
    const bad: string[] = [];
    const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const bases: KindId[] = ['maj7', 'm7', '7'];
    for (const pc of [0, 6]) for (const mode of ['major', 'minor'] as const) {
      const key = homeKey(pc, mode);
      for (const fr of roots.slice(0, 4)) for (const tr of roots) for (const fb of bases) for (const tb of bases) {
        const f0 = ch(fr + fb), t0 = ch(tr + tb);
        if (pcOf(f0.root) === pcOf(t0.root)) continue;
        const fo = extensionOptions(f0, t0, key)[0]?.chord ?? f0, tos = extensionOptions(t0, null, key).map(o => o.chord);
        const plain = passingChords(f0, t0, key);
        for (const t of tos.slice(0, 2)) {
          const col = passingChords(fo, t, key);
          if (col.length !== plain.length) bad.push(`${fo.symbol}→${t.symbol}: ${col.length} ways, plain has ${plain.length}`);
          col.forEach((s, i) => {
            if (!s.ext) bad.push(`${fo.symbol}→${t.symbol} ${s.techniqueId}: no ext`);
            else if (s.ext.fit !== null && (s.ext.fit < 0 || s.ext.fit > 1)) bad.push('fit out of range');
            const p = plain[i];
            if (!p || p.chords.length !== s.chords.length) return;
            s.chords.forEach((c, j) => {
              const o = p.chords[j];
              if (c.kind === t.kind) return; // planing and chromatic approach copy the landing chord's shape
              if (pcOf(c.root) !== pcOf(o.root) || KINDS[c.kind].fam !== KINDS[o.kind].fam) bad.push(`${o.symbol} became ${c.symbol}`);
              o.tones.forEach((n, k) => { if (o.labels[k] !== '5' && !c.tones.some(x => pcOf(x) === pcOf(n))) bad.push(`${c.symbol} lost the ${o.labels[k]} of ${o.symbol}`); });
            });
          });
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  }, 60_000); // a wide sweep: slow on the GitHub build machine (the 5 s default timed out there)
});
