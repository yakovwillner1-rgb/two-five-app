import { fmt, pcOf } from '../theory/notes';
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
      b += `<rect x="${x}" y=".5" width="${BW}" height="${BH}" rx="2" class="bk"${h ? ` style="fill:${h.col};stroke:#06080b"` : ''}/>`;
      if (h) { b += `<text x="${x + BW / 2}" y="${BH - (showN ? 15 : 6)}" class="kl kb">${h.lab}</text>`; if (showN) b += `<text x="${x + BW / 2}" y="${BH - 5}" class="kl kb">${fmt(h.n)}</text>`; }
    });
  }
  return `<svg class="kbd" viewBox="0 0 ${oc * 7 * W + 1} ${H + 1}" role="img" aria-label="Piano keys ${items.map(i => fmt(i.n)).join(' ')}">${w}${b}</svg>`;
}
