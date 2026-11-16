import { beforeEach, describe, expect, it } from 'vitest';
import { parseSmf } from '../../src/midi/smf';
import { S, keptClear, keptList, keptPop, keptPush } from '../../src/state';
import { PressTracker } from '../../src/ui/press';
import { inputNeck } from '../../src/ui/fretboard';
import { resolveGuitarStudy, resolveStudy, studyEvents } from '../../src/study/model';
import { routeSteps } from '../../src/study/steps';
import { parseChord } from '../../src/theory/symbols';
import { mod } from '../../src/theory/notes';
import { gripText, gripsFor, voiceLead } from '../../src/theory/guitar';
import { playSig, steps, strictOk } from '../../src/ui/play';
import { moveModel, moveSeq, moveStudy } from '../../src/ui/views/move';
import { progSeq, progStudy } from '../../src/ui/views/prog';
import { keptEvents } from '../../src/ui/views/lead';
import { EXAMPLE_CHART, chordMidis, demoFile, guitarGrips, loadBytes, model, reharmAction, reharmFile } from '../../src/ui/views/reharm';
import { readFileSync } from 'node:fs';
import { playSources } from '../../src/audio/player';

const P = (s: string) => parseChord(s)!;
beforeEach(() => { Object.assign(S, { pc: 0, mode: 'major', from: 1, to: 0, fromSym: null, toSym: null, fromExt: null, toExt: null, way: null, inst: 'piano', px: 'move', pstrict: false, lkept: [], prog: [{ d: 0, via: null }, { d: 3, via: 'secIIV' }], tempo: 120 }); });

describe('audit 3: practice uses the route that is selected, whatever the technique', () => {
  it('"The move" on a tritone sub route practises Dm7, D♭7, Cmaj7 (not a ii–V)', () => {
    Object.assign(S, { way: 'tritone.sub', px: 'move' });
    expect(steps().map(st => (st.kind === 'chord' ? st.chord.symbol : ''))).toEqual(['Dm7', 'D♭7', 'Cmaj7']);
  });
  it('every technique of a move gives steps for exactly its chords, on piano and on guitar', () => {
    for (const inst of ['piano', 'guitar'] as const) {
      S.inst = inst;
      const m = moveModel();
      for (const way of m.list.slice(0, 8)) {
        S.way = `${way.techniqueId}.${way.variant}`;
        const q = moveSeq(moveModel());
        expect(steps().map(st => (st.kind === 'chord' ? st.chord.symbol : '')), `${inst} ${S.way}`).toEqual(q.chords.map(c => c.symbol));
      }
    }
  });
  it('"Progression" practises its typed chords and any passing technique, in order', () => {
    Object.assign(S, { px: 'prog', prog: [{ d: 0, via: null }, { d: 0, sym: 'Ebmaj7#11', via: 'tritone.sub' }, { d: 4, via: 'backdoor' }] });
    const q = progSeq();
    expect(steps().map(st => (st.kind === 'chord' ? st.chord.symbol : ''))).toEqual(q.chords.map(c => c.symbol));
    expect(q.chords.some(c => c.symbol === 'E♭maj7♯11')).toBe(true);
  });
  it('the notes checked are the notes of the study that is shown and played (both instruments)', () => {
    for (const inst of ['piano', 'guitar'] as const) {
      S.inst = inst; Object.assign(S, { way: 'secDom.major', px: 'move' });
      const study = moveStudy(), st = steps();
      st.forEach((s, i) => { if (s.kind === 'chord') expect(s.voicingPcs).toEqual(study.events[i].midis.map(x => mod(x, 12))); });
    }
  });
});

describe('audit 4: display, sound, file and practice use the same notes', () => {
  it('Progression sound = Progression study (piano and guitar)', () => {
    Object.assign(S, { prog: [{ d: 0, via: null }, { d: 3, via: 'tritone.sub' }, { d: 4, via: null }] });
    for (const inst of ['piano', 'guitar'] as const) {
      S.inst = inst;
      const study = progStudy(), ev = playSources.prog(), q = progSeq();
      expect(ev.map(e => e.midis)).toEqual(study.events.map(e => e.midis));
      expect(ev.map(e => e.id)).toEqual(q.ids);
      if (inst === 'guitar') expect(ev.every(e => e.inst === 'guitar' && (e.strum ?? 0) > 0)).toBe(true);
    }
  });
  it('Reharm on guitar: the MIDI file and the practice transfer carry the grips that are shown', () => {
    S.inst = 'guitar'; loadBytes(demoFile(), 'Example tune.mid');
    const m = model()!, grips = guitarGrips(m);
    const tracks = parseSmf(reharmFile(m, 'light', grips)).tracks, chordTrack = tracks.find(t => t.name.startsWith('Chords'))!;
    m.voiced.forEach((c, i) => {
      const got = chordTrack.notes.filter(n => n.tick === c.start).map(n => n.midi).sort((a, b) => a - b);
      expect(got).toEqual(grips[i].notes.map(n => n.midi));
      expect(chordMidis(m, i)).toEqual(grips[i].notes.map(n => n.midi));
    });
    reharmAction('rsend', {} as DOMStringMap);
    expect(S.px).toBe('lead');
    expect(keptList().map(k => k.grip && gripText(k.grip))).toEqual(grips.map(gripText));
  });
  it('Reharm on piano is unchanged (its own voicings)', () => {
    S.inst = 'piano'; loadBytes(demoFile(), 'Example tune.mid');
    const m = model()!;
    const chordTrack = parseSmf(reharmFile(m, 'light')).tracks.find(t => t.name.startsWith('Chords'))!;
    m.voiced.forEach(c => expect(chordTrack.notes.filter(n => n.tick === c.start).map(n => n.midi).sort((a, b) => a - b)).toEqual(c.notes.map(n => n.midi).sort((a, b) => a - b)));
    expect(EXAMPLE_CHART.length).toBeGreaterThan(0);
  });
  it('Melody on guitar: keep, undo, clear and the line; piano and guitar lists never mix', () => {
    const g = gripsFor(P('Cmaj7'))[0], k = { sym: 'Cmaj7', name: g.name, notes: g.notes.map(n => ({ m: n.midi, n: 'C', lab: n.label, h: 'L' as const })), grip: g };
    S.inst = 'guitar'; keptPush(k); keptPush(k);
    expect(keptList()).toHaveLength(2);
    S.inst = 'piano'; expect(keptList()).toHaveLength(0); keptPush({ ...k, grip: undefined }); expect(keptList()).toHaveLength(1);
    S.inst = 'guitar'; keptPop(); expect(keptList()).toHaveLength(1);
    S.inst = 'piano'; expect(keptList()).toHaveLength(1);
    S.inst = 'guitar'; keptClear(); expect(keptList()).toHaveLength(0);
    S.inst = 'piano'; expect(keptList()).toHaveLength(1);
  });
});

describe('audit 6: switching instrument changes the practice session', () => {
  it('the session key includes the instrument, and "Exact voicing" is not carried onto guitar random 2-5s', () => {
    const a = playSig(); S.inst = 'guitar'; expect(playSig()).not.toBe(a);
    S.px = 'random'; S.inst = 'piano'; expect(strictOk()).toBe(true);
    S.inst = 'guitar'; expect(strictOk()).toBe(false);
    S.px = 'move'; expect(strictOk()).toBe(true);   // a route's exact notes exist for guitar too
  });
});

describe('audit 7: the neck can be tapped with several fingers and the dots never block a tap', () => {
  it('two fingers on two places that sound the same note: it lasts until the last finger lifts', () => {
    const t = new PressTracker();
    expect(t.down(1, 64)).toBe(true);
    expect(t.down(2, 64)).toBe(false);
    expect(t.up(1)).toEqual({ note: 64, last: false });
    expect(t.up(2)).toEqual({ note: 64, last: true });
    expect(t.up(2)).toBeNull();
    expect(t.down(3, 64)).toBe(true);
  });
  it('hint and held dots let taps through (pointer-events none) and every fret cell is a target of at least 36 px', () => {
    const svg = inputNeck([{ s: 1, f: 3, mark: 'ok', name: 'C' }], [{ s: 2, f: 2, label: '1' }]);
    const groups = svg.match(/<g [^>]*class="(gghost|ghold)[^"]*"[^>]*>/g) ?? [];
    expect(groups.length).toBe(2);
    groups.forEach(g => expect(g).toContain('pointer-events="none"'));
    const hits = [...svg.matchAll(/<rect data-n="(\d+)" data-s="(\d)" data-f="(\d+)" x="([\d.]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)];
    expect(hits.length).toBe(6 * 16);
    expect(Math.min(...hits.map(h => +h[7]))).toBeGreaterThanOrEqual(38);
    expect(Math.min(...hits.slice(6).map(h => +h[6]))).toBeGreaterThanOrEqual(46);
  });
});

describe('audit 8: Stop cancels the whole kept line', () => {
  it('the line is one list of timed chords (no loose timers) and the Melody code has no setTimeout left', () => {
    const g = gripsFor(P('Cmaj7'))[0];
    const ev = keptEvents([1, 2, 3].map(() => ({ sym: 'C', name: 'x', notes: g.notes.map(n => ({ m: n.midi, n: 'C', lab: '', h: 'L' as const })) })), 'guitar');
    expect(ev.map(e => e.t)).toEqual([0, 1.5, 3]);
    expect(readFileSync('src/ui/views/lead.ts', 'utf8')).not.toMatch(/setTimeout\(/);
  });
});

describe('slash chords keep their bass on both instruments', () => {
  it('C/E and F/G: the lowest note is the named bass', () => {
    for (const [sym, bass] of [['C/E', 4], ['F/G', 7], ['Am7/G', 7]] as const) {
      const pc = resolveStudy([P(sym)], 't', 'k').events[0].midis[0];
      expect(mod(pc, 12), `piano ${sym}`).toBe(bass);
      const gu = resolveGuitarStudy([P(sym)], 't', 'k').events[0].midis[0];
      expect(mod(gu, 12), `guitar ${sym}`).toBe(bass);
    }
  });
  it('voice leading through a chart keeps each slash bass', () => {
    const chart = ['C', 'G/B', 'Am', 'F/G', 'C/E'].map(P), path = voiceLead(chart);
    const bass = [0, 11, 9, 7, 4];
    [1, 3, 4].forEach(i => expect(mod(path[i].notes[0].midi, 12), chart[i].symbol).toBe(bass[i]));
    expect(studyEvents(resolveGuitarStudy(chart, 't', 'k'), 0.5).length).toBe(5);
  });
});

describe('a seven-chord Coltrane route is one material everywhere', () => {
  it('7 chords: display, sound and practice agree on both instruments', () => {
    S.to = 0; S.from = 1;
    for (const inst of ['piano', 'guitar'] as const) {
      S.inst = inst; S.way = 'coltrane.cycle';
      const q = moveSeq(moveModel());
      expect(q.chords.length).toBeGreaterThanOrEqual(7);
      const study = moveStudy(), pr = steps();
      expect(study.events.map(e => e.symbol)).toEqual(q.chords.map(c => c.symbol));
      expect(pr.length).toBe(q.chords.length);
      expect(routeSteps(study, q.chords, { tonic: { letter: 'C', acc: 0 }, mode: 'major' } as never, []).length).toBe(q.chords.length);
    }
  });
});
