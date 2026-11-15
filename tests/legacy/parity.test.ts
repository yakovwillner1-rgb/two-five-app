import { describe, expect, it } from 'vitest';
import { chordInfo } from '../../src/theory/chords';
import { HOME, approach, homeChords, homeKey, homePcs, homeTitle } from '../../src/theory/home';
import { FAM, FAMILIES, bestMode, bestParent, famOf, modeInfo } from '../../src/theory/modes';
import { fmt, note, noteName } from '../../src/theory/notes';
import { mkStep } from '../../src/theory/playcheck';
import { SCALE_TYPES, TYPES } from '../../src/theory/scales';
import { VDEF, allVoicings, playbackVoicing } from '../../src/theory/voicings';
import type { Chord, Flavor, HomeMode, Note, Voicing } from '../../src/theory/types';
// @ts-expect-error plain JS copy of the old app's theory code
import { makeLegacy } from './legacyTheory.js';

/* Side-by-side check: the new typed theory core must give exactly what the old app gave. */
const L = makeLegacy();
const ns = (a: Note[]) => a.map(noteName);
const COL = { root: 'var(--gold)', guide: 'var(--c2)', color: 'var(--c0)' };
const flatChord = (c: Chord) => ({ tones: ns(c.tones), q: c.quality, sym: c.symbol, modeNotes: ns(c.mode.notes), modeName: c.mode.name, num: c.numeral, formula: c.mode.formula, deg: c.degree, type: c.scaleType });
const oldChord = (o: any) => ({ tones: o.tones, q: o.q, sym: o.sym, modeNotes: o.modeNotes, modeName: o.modeName, num: o.num, formula: o.formula, deg: o.deg, type: o.type });
const flatV = (v: Voicing) => ({ group: v.group, name: v.name, sub: v.sub, items: v.notes.map(n => ({ m: n.midi, n: noteName(n.note), lab: n.label, col: COL[n.role] })) });

describe('parity with the original index.html', () => {
  it('static tables', () => {
    for (const t of SCALE_TYPES) expect(TYPES[t]).toEqual(L.TYPES[t]);
    for (const m of ['major', 'minor'] as HomeMode[]) {
      expect({ ...HOME[m], src: null }).toEqual({ ...L.HOME[m], src: null });
      for (let d = 0; d < 7; d++) expect(HOME[m].src(d)).toBe(L.HOME[m].src(d));
    }
    expect(VDEF.map(d => [d.group, d.name, d.sub, d.slots, d.base])).toEqual(L.VDEF);
  });
  it('fmt', () => {
    for (const n of ['C', 'Db', 'F#', 'F##', 'Bbb', 'E#', 'Cb']) expect(fmt(note(n))).toBe(L.fmt(n));
  });
  it('all chart chords + their 10 voicings + Play-it step data (4 types × 12 keys × 7)', () => {
    let count = 0;
    for (const t of SCALE_TYPES) for (const k of TYPES[t].keys) for (let d = 0; d < 7; d++) {
      const c = chordInfo(note(k), t, d), o = L.chordInfo(k, t, d);
      expect(flatChord(c)).toEqual(oldChord(o));
      expect(famOf(c)).toEqual(L.famOf(o));
      expect(allVoicings(c).map(flatV)).toEqual(L.VDEF.map((def: unknown) => L.buildVoicing(o, def)));
      const st = mkStep(c, 'x'), os = L.mkStep(o, 'x');
      expect({ vp: st.voicingPcs, p3: st.third, p7: st.seventh, scale: [...st.scale], v: flatV(st.voicing) }).toEqual({ vp: os.vp, p3: os.p3, p7: os.p7, scale: [...os.scale], v: os.v });
      expect(playbackVoicing(c.tones, 64)).toEqual(L.voicing(o.tones, 64));
      count++;
    }
    expect(count).toBe(336);
  });
  it('home chords and every 2-5 (12 keys × major/minor × 3 colors)', () => {
    for (const mode of ['major', 'minor'] as HomeMode[]) for (let pc = 0; pc < 12; pc++) {
      L.S.mode = mode; L.S.pc = pc;
      const key = homeKey(pc, mode), H = homeChords(key), OH = L.homeChords();
      expect(homeTitle(key)).toBe(L.homeTitle());
      expect([...homePcs(key)]).toEqual([...L.homePcs()]);
      H.forEach((c, d) => {
        expect({ ...flatChord(c), rn: c.rn, ok: c.landable }).toEqual({ ...oldChord(OH[d]), rn: OH[d].rn, ok: OH[d].ok });
        for (const fl of ['auto', 'bright', 'dark'] as Flavor[]) {
          const a = approach(c, fl), oa = L.approach(OH[d], fl);
          if (!oa) { expect(a).toBeNull(); continue; }
          expect({ type: a!.source, f: a!.flavor, chart: a!.chart, ii: flatChord(a!.ii), V: flatChord(a!.V) }).toEqual({ type: oa.type, f: oa.f, chart: oa.chart, ii: oldChord(oa.ii), V: oldChord(oa.V) });
        }
      });
    }
  });
  it('modes: both views, 3 families × 7 modes × 12 roots', () => {
    for (const fam of FAMILIES) {
      expect(FAMILIES).toEqual(Object.keys(L.FAM));
      for (let pc = 0; pc < 12; pc++) {
        expect(noteName(bestParent(pc, fam))).toBe(L.bestParent(pc, fam));
        for (let deg = 0; deg < 7; deg++) {
          expect(ns(bestMode(pc, fam, deg))).toEqual(L.bestMode(pc, fam, deg));
          for (const view of ['parallel', 'parent'] as const) {
            L.S.mroot = pc; L.S.mview = view;
            const m = modeInfo(pc, fam, deg, view), o = L.modeInfo(fam, deg);
            expect({ notes: ns(m.notes), tones: ns(m.chord.tones), q: m.chord.quality, sym: m.chord.symbol, name: m.name, formula: m.formula, parent: m.parent, char: m.char, sound: m.sound, use: m.use })
              .toEqual({ notes: o.notes, tones: o.tones, q: o.q, sym: o.sym, name: o.name, formula: o.formula, parent: o.parent, char: o.char, sound: o.sound, use: o.use });
            expect(allVoicings(m.chord).map(flatV)).toEqual(L.VDEF.map((def: unknown) => L.buildVoicing(o, def)));
          }
        }
      }
      expect([FAM[fam].label, FAM[fam].order, FAM[fam].char]).toEqual([L.FAM[fam].label, L.FAM[fam].order, L.FAM[fam].char]);
    }
  });
});
