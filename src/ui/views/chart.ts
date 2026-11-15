import { S } from '../../state';
import { chordInfo } from '../../theory/chords';
import { keyName } from '../../theory/home';
import { fmt } from '../../theory/notes';
import { SCALE_TYPES, TYPES } from '../../theory/scales';
import { cref, noteCells } from '../pieces';

export function viewChart(): string {
  const T = TYPES[S.chart], root = keyName(S.pc, T.keys), hl: Record<number, [string, string]> = { 1: ['r2', '2'], 4: ['r5', '5'], 0: ['r1', '1'] };
  const rows = [0, 1, 2, 3, 4, 5, 6].map(d => {
    const i = chordInfo(root, S.chart, d), h = hl[d];
    return `<button class="row ${h ? 'hl ' + h[0] : 'r0'}" data-a="row" data-d="${d}" data-ev="c${d}" data-chord="${cref(i)}">
      <span class="rn">${i.numeral}${h ? `<span class="badge">${h[1]}</span>` : ''}</span><span class="rs">${i.symbol}</span>
      <span><span class="rm">${i.mode.name}</span><br><span class="formula">${i.mode.formula.join(' ')}</span></span>
      <span class="notes">${noteCells(i.mode.notes, i.tones)}</span></button>`;
  }).join('');
  return `<div class="stack"><div style="text-align:center"><div class="eyebrow">Reference charts</div><h2>${fmt(root)} <em>${T.label.toLowerCase()}</em></h2></div>
    <div class="controls"><div class="seg" role="group" aria-label="Chart">${SCALE_TYPES.map(k => `<button data-a="chart" data-v="${k}" aria-pressed="${S.chart === k}">${TYPES[k].label}</button>`).join('')}</div></div>
    <p class="small" style="text-align:center;max-width:66ch;margin:0 auto">How to use these for passing chords: find the chord you want to land on, open the chart for that chord's key, and play rows 2 and 5 before it. Major and dominant targets use the Major chart. Minor targets use Harmonic Minor for a dark sound or Melodic Minor for a smoother one. Tap a row to hear it.</p>
    <div class="scrollx"><div class="chart"><div class="row head"><span>Degree</span><span>Chord</span><span>Mode</span><span>Scale notes</span></div>${rows}</div></div>
    <p class="hint">The key follows the home key above. Swipe sideways to change it.</p></div>`;
}
