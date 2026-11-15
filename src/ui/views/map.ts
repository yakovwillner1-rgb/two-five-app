import { S, curChords, curTitle } from '../../state';
import { approach } from '../../theory/home';
import { cref } from '../pieces';

export function viewMap(): string {
  const H = curChords();
  const rows = H.map(c => {
    const ap = approach(c, S.flavor);
    if (!ap) return `<div class="mrow off"><span class="rn">${c.rn}</span><span class="tg">${c.symbol}</span><span class="small">Half‑diminished: sounds unstable, so players rarely land here.</span><span></span></div>`;
    return `<div class="mrow"><span class="rn">${c.rn}</span><span class="tg" data-chord="${cref(c)}">${c.symbol}</span>
      <span class="apx"><span class="c r2" data-ev="q${c.degree}a" data-chord="${cref(ap.ii)}">${ap.ii.symbol}</span><span class="arr">→</span><span class="c r5" data-ev="q${c.degree}b" data-chord="${cref(ap.V)}">${ap.V.symbol}</span><span class="arr">→</span><span class="c r1" data-ev="q${c.degree}c" data-chord="${cref(c)}">${c.symbol}</span><span class="src">From the ${ap.chart} chart, chords 2 and 5</span></span>
      <span class="acts"><button class="pill" data-a="mapplay" data-d="${c.degree}" aria-label="Play 2-5 into ${c.symbol}">▶</button><button class="pill" data-a="mapopen" data-d="${c.degree}">Open</button></span></div>`;
  }).join('');
  return `<div class="stack"><div style="text-align:center"><div class="eyebrow">Cheat sheet</div><h2>Every 2‑5 in <em>${curTitle()}</em></h2>
    <p class="small" style="max-width:62ch;margin:10px auto 0">One row per chord in the key, with the 2‑5 that leads into it. This is the whole idea on one screen: to reach any chord, play the 2 and 5 of that chord's own key first.</p></div>
    <div class="map">${rows}</div><p class="hint">Swipe sideways to change the home key.</p></div>`;
}
