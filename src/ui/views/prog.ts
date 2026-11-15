import { S, curChords, curTitle } from '../../state';
import { HOME, approach } from '../../theory/home';
import { cref, tilesHTML } from '../pieces';

export function viewProg(): string {
  const H = curChords(), M = HOME[S.mode];
  let bars = '';
  S.prog.forEach((p, i) => {
    const tc = H[p.d], ap = p.a ? approach(tc, S.flavor) : null;
    if (ap) bars += `<div class="bar ap"><button class="half r2" data-a="pchord" data-ev="p${i}a" data-chord="${cref(ap.ii)}" aria-label="Play ${ap.ii.symbol}"><span>${ap.ii.symbol}</span><small>ii/${tc.rn}</small></button><button class="half r5" data-a="pchord" data-ev="p${i}b" data-chord="${cref(ap.V)}" aria-label="Play ${ap.V.symbol}"><span>${ap.V.symbol}</span><small>V/${tc.rn}</small></button></div>`;
    bars += `<div class="bar tg ${ap ? 'r1' : 'r0'}" data-ev="p${i}c"><button class="tgb" data-a="pchord" data-ev="p${i}c" data-chord="${cref(tc)}" aria-label="Play ${tc.symbol}"><span>${tc.symbol}</span><small>${tc.rn}</small></button>${tc.landable ? `<button class="tog${p.a ? ' on' : ''}" data-a="ptog" data-i="${i}" aria-pressed="${p.a}">${p.a ? '2‑5 on' : '+ 2‑5'}</button>` : ''}<button class="x" data-a="pdel" data-i="${i}" aria-label="Remove ${tc.symbol}">×</button></div>`;
  });
  const allOn = S.prog.every(p => !H[p.d].landable || p.a);
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Progression builder · ${curTitle()}</div><h2>Put a <em>2‑5</em> in front of any chord</h2></div>
   <div class="presets">${M.presets.map((p, i) => `<button class="chip" data-a="preset" data-i="${i}">${p[0]}</button>`).join('')}</div>
   <div class="bars">${bars || '<div class="empty">Add chords from the row below.</div>'}</div>
   <div class="controls"><button class="pill" data-a="pall" aria-pressed="${allOn}">2‑5 into every chord</button><button class="pill" data-a="pclear">Clear</button></div>
   <div class="panel"><div class="lbl">Add a chord</div>${tilesHTML(H, -1, 'padd', 'r1')}
     <p class="small" style="margin:12px 0 0">Tap any chord to hear it. Use the <b>+ 2‑5</b> switch on a bar to put a 2‑5 in front of it. Each 2‑5 takes one bar, two beats per chord.</p></div>
  </div>`;
}
