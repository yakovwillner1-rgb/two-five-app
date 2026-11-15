import { describe, expect, it } from 'vitest';
import { TECHNIQUE_IDS, VARIANTS, type TechniqueId } from '../../src/data/techniques';
import { approach, homeChords, homeKey, homePcs } from '../../src/theory/home';
import { fmt, note, noteName, pcOf } from '../../src/theory/notes';
import { passingChords } from '../../src/theory/passing/engine';
import { upperStructure } from '../../src/theory/passing/techniques';
import { fromChart, makeChord, parseChord } from '../../src/theory/symbols';
import type { HomeMode } from '../../src/theory/types';
import { names } from '../theory/helpers';

/** Chord symbols of every suggestion of one technique, e.g. ["Gm7 C7"]. */
const get = (from: string, to: string, tech: TechniqueId, keyPc = 0, mode: HomeMode = 'major') =>
  passingChords(parseChord(from)!, parseChord(to)!, homeKey(keyPc, mode), [tech]);
const syms = (from: string, to: string, tech: TechniqueId, keyPc = 0, mode: HomeMode = 'major') =>
  get(from, to, tech, keyPc, mode).map(s => s.chords.map(c => c.symbol).join(' '));

describe('SPEC 1.4 test cases', () => {
  it('C major, Cmaj7 → Fmaj7', () => {
    expect(syms('Cmaj7', 'Fmaj7', 'secDom')).toEqual(['C7']);
    expect(syms('Cmaj7', 'Fmaj7', 'secIIV')).toEqual(['Gm7 C7', 'Gm7♭5 C7']); // bright first, dark also offered
    expect(syms('Cmaj7', 'Fmaj7', 'tritone')).toEqual(['G♭7']);
    expect(syms('Cmaj7', 'Fmaj7', 'iiSubV')).toEqual(['D♭m7 G♭7']);
  });
  it('C major → Am7 (vi)', () => {
    expect(syms('Cmaj7', 'Am7', 'secDom')).toEqual(['E7']);
    expect(syms('Cmaj7', 'Am7', 'secIIV')).toEqual(['Bm7♭5 E7', 'Bm7 E7']);
    expect(get('Cmaj7', 'Am7', 'secIIV').map(s => s.variant)).toEqual(['dark', 'bright']);
  });
  it('backdoor to Cmaj7: Fm7–B♭7', () => expect(syms('Dm7', 'Cmaj7', 'backdoor')).toEqual(['Fm7 B♭7']));
  it('diminished passing', () => {
    const s = get('Cmaj7', 'Dm7', 'dimPass');
    expect(s.map(x => x.chords[0].symbol)).toEqual(['C♯°7']);
    expect(names(s[0].chords[0].tones)).toBe('C# E G Bb');
    expect(syms('Fmaj7', 'C/G', 'dimPass')).toEqual(['F♯°7']);
    expect(syms('Cmaj7', 'Em7', 'dimPass')).toEqual([]); // not a whole step
    expect(syms('Dm7', 'Cmaj7', 'dimPass')).toEqual([]); // going down
  });
  it('common-tone °7 into Cmaj7: C°7 (C E♭ G♭ B𝄫)', () => {
    const s = get('G7', 'Cmaj7', 'dimCT');
    expect(s[0].chords[0].symbol).toBe('C°7');
    expect(s[0].chords[0].tones.map(fmt).join(' ')).toBe('C E♭ G♭ B𝄫');
  });
  it('Coltrane over Dm7–G7–Cmaj7: Dm7 | E♭7 A♭maj7 | B7 Emaj7 | G7 | Cmaj7', () => {
    expect(syms('Dm7', 'Cmaj7', 'coltrane')).toEqual(['E♭7 A♭maj7 B7 Emaj7 G7']); // FROM is already Dm7
    expect(syms('Am7', 'Cmaj7', 'coltrane')).toEqual(['Dm7 E♭7 A♭maj7 B7 Emaj7 G7']);
  });
  it('Tadd Dameron in C: Cmaj7 – E♭maj7 – A♭maj7 – D♭maj7 → Cmaj7', () => {
    const s = get('Cmaj7', 'Cmaj7', 'turnaround').find(x => x.variant === 'dameron')!;
    expect(s.chords.map(c => c.symbol)).toEqual(['E♭maj7', 'A♭maj7', 'D♭maj7']);
    expect(s.romanNumerals).toEqual(['♭IIImaj7', '♭VImaj7', '♭IImaj7']);
  });
  it('upper structures: D triad over C7 = C13♯11 (C E B♭ + D F♯ A); E♭ triad over G7 = G7♯9♭13', () => {
    const a = upperStructure(note('C'), 'II');
    expect([a.symbol, names(a.tones), noteName(a.upper!.root)]).toEqual(['C13♯11', 'C E Bb D F# A', 'D']);
    expect(a.labels).toEqual(['R', '3', '♭7', '9', '♯11', '13']);
    const b = upperStructure(note('G'), 'bVI');
    expect([b.symbol, names(b.tones), names(b.upper!.tones)]).toEqual(['G7♯9♭13', 'G B F Eb G Bb', 'Eb G Bb']);
    expect(b.labels).toEqual(['R', '3', '♭7', '♭13', 'R', '♯9']);
    expect(syms('Dm7', 'Cmaj7', 'upperStruct')).toEqual(['G13♯11', 'G7♯9♭13', 'G7♯9']);
    expect(syms('Cmaj7', 'Fmaj7', 'upperStruct')[0]).toBe('C13♯11');
  });
  it('spelling: tritone sub of A7 is E♭7 (not D♯7); secondary dominant of ii in G♭ major is E♭7', () => {
    expect(syms('Cmaj7', 'Dm7', 'secDom')).toEqual(['A7']);
    expect(syms('Cmaj7', 'Dm7', 'tritone')).toEqual(['E♭7']);
    expect(syms('Gbmaj7', 'Abm7', 'secDom', 6)).toEqual(['E♭7']);
  });
});

describe('each technique', () => {
  it('secondary dominant: roman numerals and rules', () => {
    expect(get('Cmaj7', 'Fmaj7', 'secDom')[0].romanNumerals).toEqual(['V7/IV']);
    expect(get('Cmaj7', 'Am7', 'secDom')[0].romanNumerals).toEqual(['V7/vi']);
    expect(get('Dm7', 'Cmaj7', 'secDom')[0].romanNumerals).toEqual(['V7']);
    expect(syms('Cmaj7', 'Bm7b5', 'secDom')).toEqual([]); // not into half-diminished
    expect(syms('Cmaj7', 'B°7', 'secDom')).toEqual([]);
    expect(syms('G7', 'Cmaj7', 'secDom')).toEqual([]); // already on the V7
  });
  it('secondary ii–V numerals', () => {
    expect(get('Cmaj7', 'Fmaj7', 'secIIV')[0].romanNumerals).toEqual(['ii7/IV', 'V7/IV']);
    expect(get('Cmaj7', 'Am7', 'secIIV')[0].romanNumerals).toEqual(['iiø7/vi', 'V7/vi']);
    expect(syms('Cmaj7', 'G7', 'secIIV')).toEqual(['Am7 D7', 'Am7♭5 D7']);
  });
  it('secondary ii–V matches the Move tab for every diatonic target in 12 keys', () => {
    for (const mode of ['major', 'minor'] as HomeMode[]) for (let pc = 0; pc < 12; pc++) {
      const key = homeKey(pc, mode), H = homeChords(key);
      H.filter(c => c.landable).forEach(t => {
        const got = passingChords(makeChord(key.tonic, 'sus4'), fromChart(t), key, ['secIIV']).map(s => s.chords.map(c => names(c.tones)).join(' | '));
        // same chords as Phase 0's approach(): dark then bright for minor targets, bright then dark otherwise
        const want = (t.quality === 'm7' ? (['dark', 'bright'] as const) : (['bright', 'dark'] as const)).map(fl => { const a = approach(t, fl)!; return names(a.ii.tones) + ' | ' + names(a.V.tones); });
        expect(got, `${t.symbol} in ${mode} ${pc}`).toEqual(want);
      });
    }
  });
  it('tritone sub and ii–subV in other keys', () => {
    expect(syms('Cmaj7', 'G7', 'tritone')).toEqual(['A♭7']);
    expect(syms('Cmaj7', 'Em7', 'tritone')).toEqual(['F7']);
    expect(syms('Dm7', 'Cmaj7', 'iiSubV')).toEqual(['A♭m7 D♭7']);
    expect(syms('Fmaj7', 'Bbmaj7', 'iiSubV', 5)).toEqual(['F♯m7 B7']); // C♭7 respelled as B7
    expect(names(get('Cmaj7', 'Fmaj7', 'tritone')[0].chords[0].tones)).toBe('Gb Bb Db Fb');
    expect(get('Cmaj7', 'Fmaj7', 'tritone')[0].romanNumerals).toEqual(['subV7/IV']);
  });
  it('backdoor: only into major or dominant chords', () => {
    expect(syms('Cmaj7', 'Fmaj7', 'backdoor')).toEqual(['B♭m7 E♭7']);
    expect(syms('Cmaj7', 'Am7', 'backdoor')).toEqual([]);
    expect(get('Dm7', 'Cmaj7', 'backdoor')[0].romanNumerals).toEqual(['iv7', '♭VII7']);
  });
  it('diminished passing in every whole-step slot of C major', () => {
    expect(syms('Dm7', 'Em7', 'dimPass')).toEqual(['D♯°7']);
    expect(syms('Fmaj7', 'G7', 'dimPass')).toEqual(['F♯°7']);
    expect(syms('G7', 'Am7', 'dimPass')).toEqual(['G♯°7']);
    expect(names(get('G7', 'Am7', 'dimPass')[0].chords[0].tones)).toBe('G# B D F');
    expect(get('Cmaj7', 'Dm7', 'dimPass')[0].romanNumerals).toEqual(['♯i°7']);
    expect(get('Cmaj7', 'Dm7', 'dimPass')[0].explanation.join(' ')).toContain('A7♭9 without its root');
  });
  it('chromatic approach and planing keep the quality of TO', () => {
    expect(syms('Cmaj7', 'Dm7', 'chromAbove')).toEqual(['E♭m7']);
    expect(syms('Cmaj7', 'Dm7', 'chromBelow')).toEqual(['C♯m7']);
    expect(syms('Dm7', 'Cmaj7', 'chromAbove')).toEqual(['D♭maj7']);
    expect(syms('Dm7', 'Cmaj7', 'chromBelow')).toEqual(['Bmaj7']);
    expect(syms('Cmaj7', 'Dm7', 'planing')).toEqual(['Em7', 'Cm7']);
    expect(syms('Dm7', 'Cmaj7', 'planing')).toEqual(['Dmaj7', 'B♭maj7']);
  });
  it('line cliché on a minor FROM chord', () => {
    const s = get('Am7', 'Dm7', 'lineCliche')[0];
    expect(s.chords.map(c => c.symbol)).toEqual(['Am', 'Am(maj7)', 'Am7', 'Am6']);
    expect(s.replacesFrom).toBe(true);
    expect(s.explanation.join(' ')).toContain('A → G♯ → G → F♯');
    expect(syms('Cmaj7', 'Dm7', 'lineCliche')).toEqual([]);
  });
  it('modal interchange in C major', () => {
    const by = (to: string) => Object.fromEntries(get('Fmaj7', to, 'borrowed').map(s => [s.variant, s.chords.map(c => c.symbol).join(' ')]));
    expect(by('Cmaj7')).toEqual({ iv: 'Fm7', iv6: 'Fm6', bVI: 'A♭maj7', bVII: 'B♭7', 'bVI-bVII': 'A♭maj7 B♭7', bII: 'D♭maj7' });
    expect(by('G7')).toEqual({ iv: 'Fm7', bVI: 'A♭maj7' });
    expect(by('Dm7')).toEqual({ bIII: 'E♭maj7' });
    expect(by('Am7')).toEqual({});
    expect(get('Fmaj7', 'Cmaj7', 'borrowed')[0].explanation.join(' ')).toContain('borrowed from C minor');
    expect(syms('Dm7', 'Am7', 'borrowed', 9, 'minor')).toEqual([]); // minor home keys: not yet
  });
  it('sus / pedal', () => {
    expect(syms('Dm7', 'Cmaj7', 'susSub')).toEqual(['G7sus4', 'F/G']);
    expect(names(get('Dm7', 'Cmaj7', 'susSub')[1].chords[0].tones)).toBe('F A C');
    expect(syms('Cmaj7', 'Am7', 'susSub')).toEqual(['E7sus4']);
  });
  it('Coltrane cycle in flat keys uses practical key spellings', () => {
    expect(syms('Cmaj7', 'Fmaj7', 'coltrane')).toEqual(['Gm7 A♭7 D♭maj7 E7 Amaj7 C7']);
    expect(syms('Ebm7', 'Dbmaj7', 'coltrane', 1)).toEqual(['E7 Amaj7 C7 Fmaj7 A♭7']);
    expect(syms('Cmaj7', 'Am7', 'coltrane')).toEqual([]);
  });
  it('turnarounds back to I, and the gospel 7-3-6 into vi', () => {
    const t = Object.fromEntries(get('Cmaj7', 'Cmaj7', 'turnaround').map(s => [s.variant, s.chords.map(c => c.symbol).join(' ')]));
    expect(t).toEqual({ 'vi-ii-V': 'Am7 Dm7 G7', 'VI7-ii-V': 'A7 Dm7 G7', 'iii-VI7-ii-V': 'Em7 A7 Dm7 G7', dameron: 'E♭maj7 A♭maj7 D♭maj7' });
    expect(syms('Cmaj7', 'Am7', 'turnaround')).toEqual(['Bm7♭5 E7']);
    expect(get('Cmaj7', 'Am7', 'turnaround')[0].romanNumerals).toEqual(['viiø7', 'III7']);
    expect(syms('Cmaj7', 'Fmaj7', 'turnaround')).toEqual([]);
  });
  it('gospel walk-up: I → I/3 → IV → ♯IV°7 → I/5', () => {
    const s = get('C', 'G7', 'gospelWalk')[0];
    expect(s.chords.map(c => c.symbol)).toEqual(['C/E', 'F', 'F♯°7', 'C/G']);
    expect(s.romanNumerals).toEqual(['I/3', 'IV', '♯iv°7', 'I/5']);
    expect(syms('Cmaj7', 'Fmaj7', 'gospelWalk')).toEqual(['C/E']);
    expect(syms('Dm7', 'G7', 'gospelWalk')).toEqual([]); // has to start on I
  });
});

describe('every suggestion', () => {
  const all = () => {
    const out = [];
    for (const mode of ['major', 'minor'] as HomeMode[]) for (let pc = 0; pc < 12; pc++) {
      const key = homeKey(pc, mode), H = homeChords(key).map(fromChart);
      for (const f of H) for (const t of H) for (const s of passingChords(f, t, key)) out.push({ key, f, t, s });
    }
    return out;
  };
  const everything = all();
  it('runs for all diatonic pairs in 24 keys', () => {
    expect(everything.length).toBeGreaterThan(5000);
    expect(new Set(everything.map(x => x.s.techniqueId)).size).toBe(TECHNIQUE_IDS.length - 0);
  });
  it('has chords, matching numerals, catalogue data and at most 4 bullets', () => {
    const bad: string[] = [];
    for (const { s, f, t } of everything) {
      const ok = s.chords.length > 0 && s.romanNumerals.length === s.chords.length && !!VARIANTS[s.techniqueId + '.' + s.variant]
        && s.tension >= 0 && s.tension <= 1 && s.explanation.length >= 3 && s.explanation.length <= 4
        && !s.explanation.some(b => /undefined|NaN|\[object/.test(b)) && s.chords[s.chords.length - 1].symbol !== t.symbol;
      if (!ok) bad.push(`${s.techniqueId}.${s.variant} ${f.symbol}→${t.symbol}`);
    }
    expect(bad).toEqual([]);
  });
  it('never shows an awkward chord root (double accidental, C♭, F♭, E♯, B♯) outside the strict-theory techniques', () => {
    const strict = new Set(['secDom', 'secIIV', 'dimPass', 'dimCT', 'lineCliche', 'susSub', 'upperStruct', 'turnaround', 'borrowed', 'gospelWalk']);
    const bad: string[] = [];
    for (const { s, f, t } of everything) {
      if (strict.has(s.techniqueId)) continue;
      if (/^Cb|^Fb|^E#|^B#/.test(noteName(t.root))) continue; // TO itself has such a root (e.g. F♭maj7 in A♭ minor)
      for (const c of s.chords) if (/##|bb|^Cb|^Fb|^E#|^B#/.test(noteName(c.root))) bad.push(`${s.techniqueId} ${f.symbol}→${t.symbol}: ${c.symbol}`);
    }
    expect(bad).toEqual([]);
  });
  it('outside notes are exactly the chord notes that are not in the home key', () => {
    const bad: string[] = [];
    for (const { s, key, f, t } of everything) {
      const home = homePcs(key), want = [...new Set(s.chords.flatMap(c => c.tones.map(pcOf)).filter(pc => !home.has(pc)))].sort().join();
      const got = s.outsideNotes.map(pcOf).sort().join();
      if (got !== want) bad.push(`${s.techniqueId} ${f.symbol}→${t.symbol}: ${got} vs ${want}`);
    }
    expect(bad).toEqual([]);
  });
  it('is deterministic: same input, same output', () => {
    const key = homeKey(0, 'major');
    const run = () => JSON.stringify(passingChords(parseChord('Cmaj7')!, parseChord('Fmaj7')!, key));
    expect(run()).toBe(run());
  });
});

describe('explanations', () => {
  const ex = (from: string, to: string, tech: TechniqueId) => get(from, to, tech)[0].explanation;
  it('secondary dominant C7 → Fmaj7 (SPEC example: "B♭ in C7 falls to A in Fmaj7")', () => {
    expect(ex('Cmaj7', 'Fmaj7', 'secDom')).toEqual([
      'C7 is the dominant (V7) of Fmaj7.',
      'Voice leading: B♭ in C7 falls a half step to A in Fmaj7; E in C7 rises a half step to F in Fmaj7.',
      'B♭ is outside C major, borrowed from F major.',
      'The root falls a fifth (C → F) and the tritone E–B♭ resolves inward.',
    ]);
  });
  it('names borrowed notes and where they come from ("A♭ is borrowed from C minor")', () => {
    const e = get('Cmaj7', 'Cmaj7', 'borrowed').find(s => s.variant === 'iv6')!.explanation;
    expect(e[2]).toBe('A♭ is outside C major, borrowed from C minor.');
    expect(e[1]).toBe('Voice leading: A♭ in Fm6 falls a half step to G in Cmaj7; F in Fm6 falls a half step to E in Cmaj7.');
  });
  it('says when nothing is borrowed', () => {
    expect(get('Cmaj7', 'Cmaj7', 'turnaround')[0].explanation[2]).toBe('Every note is inside C major.');
  });
  it('upper structure wording and no doubled voice-leading moves', () => {
    const s = get('Fmaj7', 'Cmaj7', 'upperStruct');
    expect(s[0].explanation[0]).toBe('G13♯11 is the V7 of Cmaj7 played as an A major triad over the G7 shell (G B F).');
    expect(s[0].explanation[3]).toContain('adds 9, ♯11 and 13 as color');
    expect(s[2].explanation[1]).toBe('Voice leading: F in G7♯9 falls a half step to E in Cmaj7; B♭ in G7♯9 rises a half step to B in Cmaj7.');
    for (const x of s) expect(new Set(x.voiceLeading.map(m => pcOf(m.from))).size).toBe(x.voiceLeading.length);
  });
  it('tritone sub and common-tone °7', () => {
    expect(ex('Cmaj7', 'Fmaj7', 'tritone')[0]).toBe('G♭7 is the tritone sub of C7, the V7 of Fmaj7: a dominant a tritone away that shares its 3rd and 7th.');
    expect(ex('Cmaj7', 'Fmaj7', 'tritone')[3]).toContain('G♭ → F');
    expect(ex('G7', 'Cmaj7', 'dimCT')[3]).toContain('The root C stays put');
  });
});
