import { fmt } from '../theory/notes';
import type { PChord } from '../theory/symbols';
import { avoidOf, tensionsOf, type ChordScale, type ExtOption } from '../theory/tensions';
import type { Note } from '../theory/types';
import { playTones } from './passing';
import { cache } from './pieces';

/* HTML pieces for chord scales and extension options (Move tab and the Extensions page). */

/** Scale notes as chips: chord tones filled, available tensions outlined teal, avoid notes struck through. */
export function scaleChips(s: ChordScale): string {
  return `<div class="notes">${s.notes.map(n => `<span class="nw"><span class="n ${n.role === 'chord' ? 'ct' : n.role === 'avoid' ? 'av' : 'tn'}${n.caution ? ' cau' : ''}"${n.caution ? ` title="${n.caution.replace(/"/g, '&quot;')}"` : ''}>${fmt(n.note)}</span><small>${n.label}</small></span>`).join('')}</div>`;
}
/** "Tensions: 9 (D), 13 (A) · Avoid: 11 (F)" */
export function tensionLine(s: ChordScale): string {
  const list = (xs: { label: string; note: Note }[]) => xs.map(x => `${x.label} (${fmt(x.note)})`).join(', ');
  const t = tensionsOf(s), a = avoidOf(s), cau = s.notes.find(n => n.caution);
  return `<div class="small"><b>Available:</b> ${t.length ? list(t) : 'none'} · <b>Avoid in the chord:</b> ${a.length ? list(a) : 'none'}</div>${cau ? `<div class="small extcau">The ${cau.label} (${fmt(cau.note)}): ${cau.caution}</div>` : ''}`;
}
/** Register a chord sequence to play and return its id (for data-a="seq"). */
export function seqId(id: string, chords: PChord[]): string {
  cache.seqs[id] = chords.map(playTones);
  return id;
}
/** A tappable extended chord, with how its tensions move into the next chord. */
export function optionChip(o: ExtOption, id: string, next: PChord | null): string {
  seqId(id, next ? [o.chord, next] : [o.chord]);
  return `<button class="extopt" data-a="seq" data-id="${id}" aria-label="Play ${o.chord.symbol}${next ? ' into ' + next.symbol : ''}">
    <span class="eo"><span class="wc">${o.chord.symbol}</span><small>${o.scale.name}</small></span>
    ${o.moves.length ? `<span class="em">${o.moves.map(m => m.text).join('<br>')}</span>` : ''}</button>`;
}
