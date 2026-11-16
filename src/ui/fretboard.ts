import { STRING_NAMES, TUNING, assignFingers, type Grip } from '../theory/guitar';
import { S } from '../state';
import type { Study, StudyEvent } from '../study/model';

/* Guitar diagrams. Four kinds, never mixed up:
   - chordBox: one grip as a standard chord box (vertical, low E on the left) with finger numbers in the dots.
   - neckStage: the whole neck lying down like you hold it (high E on top), one dot per string that SLIDES to its place in the next chord.
   - scaleNeck: every place a scale's notes are on the neck (Modes tab).
   - inputNeck: a neck you can tap (Play it, Listen, Melody): the guitar's version of the on-screen piano. */

const ROLE_FILL: Record<string, string> = { root: 'var(--gold)', guide: 'var(--c2)', color: 'var(--c0)' };
const NN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
export const midiName = (m: number): string => NN[((m % 12) + 12) % 12];

/** What a chord box needs: a Grip, or a saved study event turned into one with eventBox. */
export type BoxGrip = Pick<Grip, 'frets' | 'notes' | 'lo' | 'hi' | 'fingers' | 'barre'>;
export function eventBox(e: StudyEvent): BoxGrip | null {
  if (!e.frets || !e.strings) return null;
  const f = e.frets.filter((x): x is number => x != null && x > 0), fg = assignFingers(e.frets);
  const notes = e.strings.map((s, i) => { const lab = e.labels?.[i] ?? ''; return { string: s, fret: e.midis[i] - TUNING[s], midi: e.midis[i], note: { letter: 'C' as const, acc: 0 }, label: lab, role: (lab === 'R' ? 'root' : ['3', '♭3', '4', '7', '♭7', '𝄫7'].includes(lab) ? 'guide' : 'color') as 'root' | 'guide' | 'color' }; });
  return { frets: e.frets, notes, lo: f.length ? Math.min(...f) : 0, hi: f.length ? Math.max(...f) : 0, fingers: e.fingers ?? fg.fingers, barre: fg.barre };
}

/** A chord box: 6 strings, 5 frets. The number in a dot is the finger; the colour says what the note does (root gold, 3rd/7th mint, others blue). */
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
  if (g.barre && g.barre.fret >= start && g.barre.fret < start + ROWS) svg += `<rect x="${x(g.barre.from) - 8}" y="${y(g.barre.fret) - 7}" width="${x(g.barre.to) - x(g.barre.from) + 16}" height="14" rx="7" class="gl-barre"/>`;
  g.notes.forEach(n => {
    if (n.fret === 0) return;
    const fin = g.fingers[n.string];
    svg += `<circle cx="${x(n.string)}" cy="${y(n.fret)}" r="7.5" fill="${ROLE_FILL[n.role]}" class="gl-dot"/><text x="${x(n.string)}" y="${y(n.fret)}" class="gl-lab">${fin ?? ''}</text>`;
  });
  if (start > 1) svg += `<text x="${X0 - 10}" y="${y(start)}" class="gl-fr">${start}</text>`;
  const text = g.frets.map((f, s) => (f == null ? 'x' : f + (g.fingers[s] ? ` (finger ${g.fingers[s]})` : ''))).join(', ');
  return `<svg class="gbox" viewBox="0 0 120 ${Y0 + ROWS * DY + 6}" role="img" aria-label="${label ? label + ', ' : ''}frets ${text}">${svg}</svg>`;
}

/* ---------- the neck: shared geometry ---------- */
const FRETS = 15, M = 46, W = 46, SP = 26, T = 22, H = T + SP * 5 + 40;
const fx = (f: number): number => (f === 0 ? M - 20 : M + (f - 0.5) * W);
const sy = (s: number): number => T + (5 - s) * SP;
function neckBase(): string {
  let svg = `<rect x="${M}" y="${T - 10}" width="${FRETS * W}" height="${SP * 5 + 20}" rx="6" class="gn-board"/>`;
  for (let k = 0; k <= FRETS; k++) svg += `<line x1="${M + k * W}" y1="${T - 10}" x2="${M + k * W}" y2="${T + SP * 5 + 10}" class="${k === 0 ? 'gl-nut' : 'gn-fret'}"/>`;
  for (let s = 0; s < 6; s++) svg += `<line x1="${M}" y1="${sy(s)}" x2="${M + FRETS * W}" y2="${sy(s)}" class="gn-str" stroke-width="${(1 + (5 - s) * 0.35).toFixed(1)}"/><text x="10" y="${sy(s)}" class="gn-name">${STRING_NAMES[s]}</text>`;
  for (let f = 1; f <= FRETS; f++) {
    if ([3, 5, 7, 9, 15].includes(f)) svg += `<circle cx="${fx(f)}" cy="${T + SP * 2.5}" r="4.5" class="gn-inlay"/>`;
    if (f === 12) svg += `<circle cx="${fx(f)}" cy="${T + SP * 1.5}" r="4.5" class="gn-inlay"/><circle cx="${fx(f)}" cy="${T + SP * 3.5}" r="4.5" class="gn-inlay"/>`;
    svg += `<text x="${fx(f)}" y="${H - 8}" class="gn-num">${f}</text>`;
  }
  return svg;
}
const VB = `0 0 ${M + FRETS * W + 14} ${H}`;
const labelSwitch = (): string => `<span class="seg lblseg" role="group" aria-label="What the dots show">${(['finger', 'note'] as const).map(k => `<button data-a="neckl" data-v="${k}" aria-pressed="${S.neckLabel === k}">${k === 'finger' ? 'Fingers' : 'Notes'}</button>`).join('')}</span>`;

/** The whole neck with one dot per string; data-gl carries every chord's dot positions (see motion.ts glSet). */
export function neckStage(study: Study, ids: string[], cls: string[], cue: { fromMidi: number; toMidi: number } | null): string {
  const cueKeys = new Set(cue ? [cue.fromMidi, cue.toMidi] : []);
  const evs = study.events.filter(e => e.frets);
  const lo = Math.min(...evs.flatMap(e => e.frets!.filter((f): f is number => f != null && f > 0)), 12);
  const ev = study.events.map((e, i) => ({
    col: cls[i] ?? 'r0',
    dots: [0, 1, 2, 3, 4, 5].map(s => {
      const f = e.frets?.[s];
      if (f == null) return null;
      const k = e.strings!.indexOf(s), lab = e.labels?.[k] ?? '';
      const role = lab === 'R' ? 'root' : ['3', '♭3', '4'].includes(lab) ? 'third' : ['7', '♭7', '𝄫7', '6'].includes(lab) ? 'seventh' : 'other';
      return { x: fx(f), n: e.names[k], f: f === 0 ? '○' : String(e.fingers?.[s] ?? ''), role, cue: cueKeys.has(e.midis[k]) };
    }),
  }));
  const first = ev[0];
  const dot = (s: number) => { const d = first.dots[s]; return `<g class="gdot ${d?.role ?? 'other'}${d ? '' : ' gone'}${d?.cue ? ' cue' : ''}" style="transform:translate(${d?.x ?? fx(0)}px,${sy(s)}px)"><circle r="11.5"/><text class="t-fin">${d?.f ?? ''}</text><text class="t-note">${d?.n ?? ''}</text></g>`; };
  const data = JSON.stringify({ ids, ev, tune: [...TUNING] }).replace(/'/g, '&#39;');
  return `<div class="vl gl lbl-${S.neckLabel}" data-gl='${data}' data-role="${first.col}"><div class="vl-h"><span>Notes played</span><span class="sw"><i style="background:var(--gold)"></i>root</span><span class="sw"><i style="background:var(--accent)"></i>3rd</span><span class="sw"><i style="background:var(--ink)"></i>7th</span><span class="sw"><i style="background:var(--c0)"></i>other</span>${labelSwitch()}</div>
    <div class="neckscroll" data-focus="${fx(Math.max(1, lo - 1))}"><svg viewBox="${VB}" role="img" aria-label="The whole guitar neck showing the notes played">${neckBase()}${[0, 1, 2, 3, 4, 5].map(dot).join('')}</svg></div></div>`;
}

/** Every place the notes of a scale are on the neck. `pcs` are pitch classes with a name and a kind: the root, the note that gives the mode its sound, or another note. */
export function scaleNeck(pcs: { pc: number; name: string; kind: 'root' | 'char' | 'other'; idx: number }[]): string {
  let svg = neckBase();
  for (let s = 0; s < 6; s++) for (let f = 0; f <= FRETS; f++) {
    const p = pcs.find(x => x.pc === (TUNING[s] + f) % 12);
    if (!p) continue;
    svg += `<g class="gsc ${p.kind}" data-ev="s${p.idx}" transform="translate(${fx(f)} ${sy(s)})"><circle r="10.5"/><text>${p.name}</text></g>`;
  }
  return `<div class="vl gl"><div class="neckscroll" data-focus="0"><svg viewBox="${VB}" role="img" aria-label="Where the scale's notes are on the guitar neck">${svg}</svg></div></div>`;
}

/** A tappable neck. `held` are the notes sounding now (colour = right / wrong / just held); `ghosts` are hint dots (gold) with a finger or note label. */
export interface HeldDot { s: number; f: number; mark: 'ok' | 'bad' | 'on'; name: string }
export interface GhostDot { s: number; f: number; label: string }
export function inputNeck(held: HeldDot[], ghosts: GhostDot[]): string {
  let svg = neckBase();
  const ghostKey = new Set(ghosts.map(g => `${g.s},${g.f}`));
  for (let s = 0; s < 6; s++) for (let f = 0; f <= FRETS; f++) {
    const x0 = f === 0 ? 0 : M + (f - 1) * W, w = f === 0 ? M : W;
    svg += `<rect data-n="${TUNING[s] + f}" data-s="${s}" data-f="${f}" x="${x0}" y="${sy(s) - SP / 2}" width="${w}" height="${SP}" class="gn-hit"/>`;
  }
  ghosts.forEach(g => { svg += `<g class="gghost" transform="translate(${fx(g.f)} ${sy(g.s)})"><circle r="11"/><text>${g.label}</text></g>`; });
  held.forEach(h => { svg += `<g class="ghold ${h.mark}${ghostKey.has(`${h.s},${h.f}`) ? ' on-hint' : ''}" transform="translate(${fx(h.f)} ${sy(h.s)})"><circle r="12"/><text>${h.name}</text></g>`; });
  return `<svg viewBox="${VB}" role="img" aria-label="Guitar neck: tap a fret to play a note">${svg}</svg>`;
}
/** Every neck position (string, fret) of a MIDI pitch, frets 0 to 15. */
export function positionsOf(midi: number): { s: number; f: number }[] {
  const out: { s: number; f: number }[] = [];
  for (let s = 0; s < 6; s++) { const f = midi - TUNING[s]; if (f >= 0 && f <= FRETS) out.push({ s, f }); }
  return out;
}
/** Every neck position of a pitch class (any octave), frets 0 to 15. */
export function positionsOfPc(pc: number): { s: number; f: number }[] {
  const out: { s: number; f: number }[] = [];
  for (let s = 0; s < 6; s++) for (let f = 0; f <= FRETS; f++) if ((TUNING[s] + f) % 12 === pc) out.push({ s, f });
  return out;
}
