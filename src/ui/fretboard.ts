import { STRING_NAMES, TUNING, type Grip } from '../theory/guitar';
import type { Study, StudyEvent } from '../study/model';

/* Guitar diagrams. Two kinds, never mixed up:
   - chordBox: one grip as a standard chord box (vertical, low E on the left). Used for example shapes and lists.
   - neckStage: the whole neck, lying down like you hold it (high E on top), with one dot per string that SLIDES to its place in the next chord. */

const ROLE_FILL: Record<string, string> = { root: 'var(--gold)', guide: 'var(--c2)', color: 'var(--c0)' };

/** A chord box: 6 strings, 5 frets, dots coloured by what the note does (root gold, 3rd/7th mint, others blue). */
/** What a chord box needs: a Grip, or a saved study event turned into one with eventBox. */
export type BoxGrip = Pick<Grip, 'frets' | 'notes' | 'lo' | 'hi'>;
export function eventBox(e: StudyEvent): BoxGrip | null {
  if (!e.frets || !e.strings) return null;
  const f = e.frets.filter((x): x is number => x != null && x > 0);
  const notes = e.strings.map((s, i) => { const lab = e.labels?.[i] ?? ''; return { string: s, fret: e.midis[i] - TUNING[s], midi: e.midis[i], note: { letter: 'C' as const, acc: 0 }, label: lab, role: (lab === 'R' ? 'root' : ['3', '♭3', '4', '7', '♭7', '𝄫7'].includes(lab) ? 'guide' : 'color') as 'root' | 'guide' | 'color' }; });
  return { frets: e.frets, notes, lo: f.length ? Math.min(...f) : 0, hi: f.length ? Math.max(...f) : 0 };
}
export function chordBox(g: BoxGrip, label = ''): string {
  const X0 = 22, DX = 15, Y0 = 34, DY = 19, ROWS = 5;
  const start = g.hi <= 5 ? 1 : g.lo;
  const x = (s: number) => X0 + s * DX, y = (f: number) => Y0 + (f - start) * DY + DY / 2;
  let svg = '';
  for (let s = 0; s < 6; s++) svg += `<line x1="${x(s)}" y1="${Y0}" x2="${x(s)}" y2="${Y0 + ROWS * DY}" class="gl-str"/>`;
  for (let r = 0; r <= ROWS; r++) svg += `<line x1="${x(0)}" y1="${Y0 + r * DY}" x2="${x(5)}" y2="${Y0 + r * DY}" class="${r === 0 && start === 1 ? 'gl-nut' : 'gl-fret'}"/>`;
  g.frets.forEach((f, s) => {
    if (f == null) svg += `<text x="${x(s)}" y="${Y0 - 9}" class="gl-mark">×</text>`;
    else if (f === 0) svg += `<circle cx="${x(s)}" cy="${Y0 - 12}" r="4" class="gl-open"/>`;
  });
  g.notes.forEach(n => {
    if (n.fret === 0) return;
    svg += `<circle cx="${x(n.string)}" cy="${y(n.fret)}" r="7" fill="${ROLE_FILL[n.role]}" class="gl-dot"/><text x="${x(n.string)}" y="${y(n.fret)}" class="gl-lab">${n.label === 'R' ? 'R' : n.label.replace('♭', '♭')}</text>`;
  });
  if (start > 1) svg += `<text x="${X0 - 10}" y="${y(start)}" class="gl-fr">${start}</text>`;
  const text = g.frets.map(f => (f == null ? 'x' : f)).join(' ');
  return `<svg class="gbox" viewBox="0 0 120 ${Y0 + ROWS * DY + 6}" role="img" aria-label="${label ? label + ', ' : ''}frets ${text}">${svg}</svg>`;
}

/** The neck with one dot per string; data-gl carries every chord's dot positions (see motion.ts glSet). */
export function neckStage(study: Study, ids: string[], cls: string[], cue: { fromMidi: number; toMidi: number } | null): string {
  const evs = study.events.filter(e => e.frets);
  const all = evs.flatMap(e => e.frets!.filter((f): f is number => f != null));
  const lo = Math.min(...all), hi = Math.max(...all);
  const hasOpen = all.includes(0), f0 = hasOpen || lo <= 2 ? 0 : lo - 1;
  const f1 = Math.max(hi, f0 + 4), base = f0 === 0 ? 0 : f0 - 1, n = f1 - base;
  const M = 40, W = Math.min(64, Math.floor(760 / Math.max(5, n))), SP = 24, T = 18, H = T + SP * 5 + 34;
  const fx = (f: number) => (f === 0 ? M - 16 : M + (f - base - 0.5) * W), sy = (s: number) => T + (5 - s) * SP;
  let svg = `<rect x="${M}" y="${T - 8}" width="${n * W}" height="${SP * 5 + 16}" rx="6" class="gn-board"/>`;
  for (let k = 0; k <= n; k++) svg += `<line x1="${M + k * W}" y1="${T - 8}" x2="${M + k * W}" y2="${T + SP * 5 + 8}" class="${k === 0 && base === 0 ? 'gl-nut' : 'gn-fret'}"/>`;
  for (let s = 0; s < 6; s++) svg += `<line x1="${M}" y1="${sy(s)}" x2="${M + n * W}" y2="${sy(s)}" class="gn-str" stroke-width="${(1 + (5 - s) * 0.3).toFixed(1)}"/><text x="8" y="${sy(s)}" class="gn-name">${STRING_NAMES[s]}</text>`;
  for (let f = base + 1; f <= f1; f++) {
    if ([3, 5, 7, 9, 15].includes(f)) svg += `<circle cx="${fx(f)}" cy="${T + SP * 2.5}" r="4" class="gn-inlay"/>`;
    if (f === 12) svg += `<circle cx="${fx(f)}" cy="${T + SP * 1.5}" r="4" class="gn-inlay"/><circle cx="${fx(f)}" cy="${T + SP * 3.5}" r="4" class="gn-inlay"/>`;
    svg += `<text x="${fx(f)}" y="${H - 6}" class="gn-num">${f}</text>`;
  }
  const cueKeys = new Set(cue ? [cue.fromMidi, cue.toMidi] : []);
  const ev = study.events.map((e, i) => ({
    col: cls[i] ?? 'r0',
    dots: [0, 1, 2, 3, 4, 5].map(s => {
      const f = e.frets?.[s];
      if (f == null) return null;
      const k = e.strings!.indexOf(s), role = e.labels?.[k] === 'R' ? 'root' : ['3', '♭3', '4'].includes(e.labels?.[k] ?? '') ? 'third' : ['7', '♭7', '𝄫7', '6'].includes(e.labels?.[k] ?? '') ? 'seventh' : 'other';
      return { x: fx(f), n: e.names[k], role, cue: cueKeys.has(e.midis[k]) };
    }),
  }));
  const first = ev[0];
  const dot = (s: number) => { const d = first.dots[s]; return `<g class="gdot ${d?.role ?? 'other'}${d ? '' : ' gone'}${d?.cue ? ' cue' : ''}" style="transform:translate(${d?.x ?? fx(0)}px,${sy(s)}px)"><circle r="10"/><text>${d?.n ?? ''}</text></g>`; };
  const data = JSON.stringify({ ids, ev, tune: [...TUNING] }).replace(/'/g, '&#39;');
  return `<div class="vl gl" data-gl='${data}' data-role="${first.col}"><div class="vl-h"><span>Notes played</span><span class="sw"><i style="background:var(--gold)"></i>root</span><span class="sw"><i style="background:var(--accent)"></i>3rd</span><span class="sw"><i style="background:var(--ink)"></i>7th</span><span class="sw"><i style="background:var(--c0)"></i>other notes</span></div>
    <svg viewBox="0 0 ${M + n * W + 16} ${H}" role="img" aria-label="Guitar neck showing the notes played">${svg}${[0, 1, 2, 3, 4, 5].map(dot).join('')}</svg></div>`;
}
