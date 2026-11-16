import { mod, note, pcOf } from './notes';
import { parseChord, type PChord } from './symbols';

/*
 * A chord chart typed as text, the way a lead sheet is written:
 *     4/4  key: F
 *     | Fmaj7 | Dm7 | Gm7 C7 | Fmaj7 |
 * Bars are separated by "|" (or by line breaks when no "|" is used). Chords in one bar share it
 * equally. "%" repeats the bar before. Pure: text in, chart out.
 */
export const TEXT_PPQ = 480;
export interface TextChart {
  timeSig: { num: number; den: number };
  /** from a "key: …" line, when there is one */
  key: { pc: number; mode: 'major' | 'minor' } | null;
  /** one entry per bar: its chords in order (empty = the chord before carries on) */
  bars: PChord[][];
  /** chords with their start in ticks, ready for the reharm engine */
  given: { tick: number; chord: PChord }[];
  /** ticks in one bar, and where the chart ends */
  barTicks: number; end: number;
  /** words that could not be read as chords */
  unread: string[];
}

export function parseChartText(text: string): TextChart {
  let timeSig = { num: 4, den: 4 }, key: TextChart['key'] = null;
  const unread: string[] = [];
  /* headers: a time signature and a key, anywhere in the text */
  let body = text.replace(/(^|[\s|])(\d{1,2})\/(2|4|8|16)(?=$|[\s|])/g, (_m, pre: string, n: string, d: string) => { timeSig = { num: +n, den: +d }; return pre; });
  body = body.replace(/key\s*(?:of|:|=)?\s*([A-Ga-g][#b♯♭]?)\s*(major|minor|maj|min|m)?(?=$|[\s|])/gi, (_m, r: string, q?: string) => {
    const n = note(r[0].toUpperCase() + r.slice(1).replace('♯', '#').replace('♭', 'b'));
    key = { pc: pcOf(n), mode: q && /^m(in|inor)?$/i.test(q) && !/^maj/i.test(q) ? 'minor' : 'major' };
    return ' ';
  });
  const hasBars = body.includes('|');
  const cells = (hasBars ? body.split(/[|\n]/) : body.split(/\n/)).map(c => c.trim());
  const bars: PChord[][] = [];
  cells.forEach(cell => {
    if (!cell) return;
    if (/^(%|\/\.\/|𝄎)$/.test(cell)) { bars.push(bars.length ? bars[bars.length - 1].slice() : []); return; }
    const chords: PChord[] = [];
    cell.split(/[\s,]+/).filter(Boolean).forEach(w => {
      if (/^[-–.]+$/.test(w)) return; /* a dash holds the chord */
      const c = parseChord(w);
      if (c) chords.push(c); else unread.push(w);
    });
    /* without bar lines, every chord on a line is its own bar */
    if (hasBars) bars.push(chords); else chords.forEach(c => bars.push([c]));
  });
  const barTicks = Math.round((timeSig.num * 4 * TEXT_PPQ) / timeSig.den), given: TextChart['given'] = [];
  bars.forEach((b, i) => b.forEach((chord, j) => given.push({ tick: i * barTicks + Math.round((j * barTicks) / b.length), chord })));
  return { timeSig, key, bars, given, barTicks, end: bars.length * barTicks, unread };
}
/** Pitch-class weights of a chart (each chord tone for as long as the chord lasts), for key detection when there are no notes. */
export function chartNotes(given: { tick: number; chord: PChord }[], end: number): { midi: number; dur: number }[] {
  return given.flatMap((g, i) => {
    const dur = (given[i + 1]?.tick ?? end) - g.tick;
    /* the root counts double: it is the note a bass player would hold */
    return [...g.chord.tones, g.chord.root].map(t => ({ midi: 60 + mod(pcOf(t), 12), dur }));
  });
}
