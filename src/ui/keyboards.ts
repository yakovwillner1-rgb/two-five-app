import { fmt, pcOf } from '../theory/notes';
import type { Study } from '../study/model';
import type { Note, VoiceRole, Voicing } from '../theory/types';

const WHITE = [0, 2, 4, 5, 7, 9, 11];

/** Two-octave keyboard with the chord tones lit, stacked upward from the root. */
export function kb(tones: Note[]): string {
  const W = 22, H = 86, BW = 14, BH = 54;
  const ms: number[] = [];
  let prev = -1;
  tones.forEach(n => { let m = pcOf(n); while (m <= prev) m += 12; ms.push(m); prev = m; });
  const lab: Record<number, Note> = {};
  ms.forEach((m, i) => { lab[m] = tones[i]; });
  let w = '', b = '';
  for (let o = 0; o < 2; o++) {
    WHITE.forEach((pc, wi) => {
      const m = o * 12 + pc, x = (o * 7 + wi) * W, h = lab[m];
      w += `<rect x="${x + .5}" y=".5" width="${W - 1}" height="${H}" rx="3" class="wk${h ? ' on' : ''}"/>`;
      if (h) w += `<text x="${x + W / 2}" y="${H - 8}" class="kl">${fmt(h)}</text>`;
    });
    [1, 3, 6, 8, 10].forEach(pc => {
      const m = o * 12 + pc, x = (o * 7 + WHITE.indexOf(pc - 1) + 1) * W - BW / 2, h = lab[m];
      b += `<rect x="${x}" y=".5" width="${BW}" height="${BH}" rx="2" class="bk${h ? ' on' : ''}"/>`;
      if (h) b += `<text x="${x + BW / 2}" y="${BH - 6}" class="kl kb">${fmt(h)}</text>`;
    });
  }
  return `<svg class="kbd" viewBox="0 0 ${14 * W + 1} ${H + 1}" role="img" aria-label="Piano keys ${tones.map(fmt).join(' ')}">${w}${b}</svg>`;
}

export interface KeyItem { m: number; n: Note; lab: string; col: string }
const ROLE_COLOR: Record<VoiceRole, string> = { root: 'var(--gold)', guide: 'var(--c2)', color: 'var(--c0)' };
export const voicingItems = (v: Voicing): KeyItem[] => v.notes.map(x => ({ m: x.midi, n: x.note, lab: x.label, col: ROLE_COLOR[x.role] }));

/** Keyboard at real pitch: each item coloured and labelled (degree, and note name when showN). */
export function kbAbs(items: KeyItem[], minSpan: number, showN?: boolean): string {
  const ms = items.map(i => i.m), lo = Math.floor(Math.min(...ms) / 12) * 12;
  let hi = Math.ceil((Math.max(...ms) + 1) / 12) * 12;
  if (hi - lo < minSpan) hi = lo + minSpan;
  const W = 20, H = 80, BW = 12, BH = 50, at: Record<number, KeyItem> = {}, oc = (hi - lo) / 12;
  items.forEach(i => { at[i.m] = i; });
  let w = '', b = '';
  for (let o = 0; o < oc; o++) {
    const base = lo + o * 12;
    WHITE.forEach((pc, wi) => {
      const m = base + pc, x = (o * 7 + wi) * W, h = at[m];
      w += `<rect x="${x + .5}" y=".5" width="${W - 1}" height="${H}" rx="3" class="wk"${h ? ` style="fill:${h.col}"` : ''}/>`;
      if (h) { w += `<text x="${x + W / 2}" y="${H - (showN ? 17 : 7)}" class="kl">${h.lab}</text>`; if (showN) w += `<text x="${x + W / 2}" y="${H - 6}" class="kl kn">${fmt(h.n)}</text>`; }
    });
    [1, 3, 6, 8, 10].forEach(pc => {
      const m = base + pc, x = (o * 7 + WHITE.indexOf(pc - 1) + 1) * W - BW / 2, h = at[m];
      b += `<rect x="${x}" y=".5" width="${BW}" height="${BH}" rx="2" class="bk"${h ? ` style="fill:${h.col};stroke:var(--key-black)"` : ''}/>`;
      if (h) { b += `<text x="${x + BW / 2}" y="${BH - (showN ? 15 : 6)}" class="kl kb">${h.lab}</text>`; if (showN) b += `<text x="${x + BW / 2}" y="${BH - 5}" class="kl kb">${fmt(h.n)}</text>`; }
    });
  }
  return `<svg class="kbd" viewBox="0 0 ${oc * 7 * W + 1} ${H + 1}" role="img" aria-label="Piano keys ${items.map(i => fmt(i.n)).join(' ')}">${w}${b}</svg>`;
}

/**
 * The played notes on one keyboard: the keys of the chord being played light up in its role colour, and
 * two dots mark its 3rd and 7th AS PLAYED (their real pitch in the real voicing), sliding to their place in
 * the next chord. Everything comes from the resolved study, so it matches what you hear.
 * (The small chord-tone diagrams on the cards are a different thing: a reference, not the played voicing.)
 * `ids` are the data-ev ids of the chords; `cue` marks the two pitches the listening cue talks about.
 */
export function playedStage(study: Study, ids: string[], cls: string[], cue: { fromMidi: number; toMidi: number } | null): string {
  const THIRD = ['3', '♭3', '4'], SEVENTH = ['7', '♭7', '𝄫7', '6'];
  const all = study.events.flatMap(e => e.midis);
  const lo = Math.floor((Math.min(...all) - 1) / 12) * 12, hi = Math.ceil((Math.max(...all) + 2) / 12) * 12;
  const W = 24, H = 104, BW = 14, BH = 64, pos: Record<number, number> = {};
  const pcw = (m: number) => ((m % 12) + 12) % 12;
  let x = 0, w = '', b = '';
  const cueSet = new Set(cue ? [cue.fromMidi, cue.toMidi] : []);
  for (let m = lo; m < hi; m++) if (WHITE.includes(pcw(m))) { pos[m] = x; w += `<rect data-m="${m}" x="${x + .5}" y=".5" width="${W - 1}" height="${H}" rx="4" class="k-w${cueSet.has(m) ? ' cue' : ''}"/>`; x += W; }
  for (let m = lo; m < hi; m++) if (!WHITE.includes(pcw(m))) b += `<rect data-m="${m}" x="${pos[m - 1] + W - BW / 2}" y=".5" width="${BW}" height="${BH}" rx="3" class="k-b${cueSet.has(m) ? ' cue' : ''}"/>`;
  const spot = (m: number) => (WHITE.includes(pcw(m)) ? { x: pos[m] + W / 2, y: H - 20 } : { x: pos[m - 1] + W, y: BH - 18 });
  const ev = study.events.map((e, i) => {
    const dot = (list: string[]) => { const k = (e.labels ?? []).findIndex(l => list.includes(l)); return k < 0 ? null : { ...spot(e.midis[k]), n: e.names[k] }; };
    return { keys: e.midis, col: cls[i] ?? 'r0', dots: [dot(THIRD), dot(SEVENTH)] };
  });
  const first = ev[0], dot = (k: number, c: string) => `<g class="vl-dot ${c}${first.dots[k] ? '' : ' gone'}" style="transform:translate(${first.dots[k]?.x ?? 0}px,${first.dots[k]?.y ?? 0}px)"><circle r="11.5"/><text>${first.dots[k]?.n ?? ''}</text></g>`;
  const marked = w.replace(/data-m="(\d+)"/g, (t, n) => (first.keys.includes(+n) ? t + ' data-on="1"' : t)) ;
  const markedB = b.replace(/data-m="(\d+)"/g, (t, n) => (first.keys.includes(+n) ? t + ' data-on="1"' : t));
  const data = JSON.stringify({ ids, ev }).replace(/'/g, '&#39;');
  return `<div class="vl" data-vl='${data}' data-role="${first.col}"><div class="vl-h"><span>Notes played</span><span class="sw"><i class="lit"></i>every note of the chord</span><span class="sw"><i style="background:var(--accent)"></i>3rd</span><span class="sw"><i style="background:var(--ink)"></i>7th, as played</span></div>
    <svg viewBox="0 0 ${x + 1} ${H + 1}" role="img" aria-label="Keyboard showing the notes played, with the 3rd and 7th marked">${marked}${markedB}${dot(0, 'd3')}${dot(1, 'd7')}</svg></div>`;
}
