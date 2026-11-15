import { S, curChords, curKey, curTitle } from '../../state';
import { approach, homePcs } from '../../theory/home';
import { fmt, pcOf } from '../../theory/notes';
import { cache, card, cref, tilesHTML } from '../pieces';

export function viewMove(): string {
  const H = curChords();
  if (!H[S.to].landable) S.to = H.findIndex(c => c.landable && c.degree !== S.from);
  const from = H[S.from], to = H[S.to], ap = approach(to, S.flavor)!, rn = to.rn;
  cache.chords = { mf: from, m2: ap.ii, m5: ap.V, mt: to };
  const home = homePcs(curKey());
  const out = [...new Set([...ap.ii.tones, ...ap.V.tones].filter(n => !home.has(pcOf(n))).map(fmt))];
  const lines: string[] = [];
  lines.push(`To land on <b>${to.symbol}</b>, borrow chords 2 and 5 from the <b>${ap.chart}</b> chart: <b>${ap.ii.symbol} → ${ap.V.symbol}</b>. Written as ii/${rn} and V/${rn}.`);
  if (S.to === 0 && ((S.mode === 'major' && ap.source === 'major') || (S.mode === 'minor' && ap.source === 'harmonic'))) lines.push(`This target is home, so it's the key's own 2‑5‑1 and nothing is borrowed.`);
  else lines.push(out.length ? `Notes from outside ${curTitle()}: <b>${out.join(', ')}</b>. Those borrowed notes are what make the change sound like a move.` : `Every note is already in ${curTitle()}, so the move sounds smooth and inside the key.`);
  if (pcOf(ap.V.tones[0]) === pcOf(from.tones[0]) && S.from !== S.to) lines.push(`Shortcut: ${ap.V.symbol} has the same root as ${from.symbol}. Change ${from.symbol} into ${ap.V.symbol} and you're already on the V.`);
  if (pcOf(ap.ii.tones[0]) === pcOf(from.tones[0]) && S.from !== S.to) lines.push(`You start on the root of the ii already, so the ii can be a small change to the chord you're on.`);
  lines.push(`Why it pulls: in ${ap.V.symbol}, the ${fmt(ap.V.tones[1])} rises a half step to ${fmt(to.tones[0])}, and the ${fmt(ap.V.tones[3])} falls a step to ${fmt(to.tones[1])}, the 3rd of ${to.symbol}.`);
  const seq = [from, ap.ii, ap.V, to], cls = ['r0', 'r2', 'r5', 'r1'];
  const gl = (lab: string, idx: number) => `<div><span class="tag">${lab}</span>${seq.map((c, i) => `<span class="n ct ${cls[i]}">${fmt(c.tones[idx])}</span>${i < 3 ? '<span class="arr">→</span>' : ''}`).join('')}</div>`;
  const tip = S.tipDone ? '' : `<div class="tip"><p><b>How it works:</b> pick the chord you want to land on. The 2‑5 that leads there appears below. Press play or the space bar. Hover a chord on a Mac, or press and hold it on iPad, for a voicing.</p><button class="pill sm" data-a="tipx">Got it</button></div>`;
  return `<div class="stack">${tip}
   <div style="text-align:center"><div class="eyebrow">In ${curTitle()}</div><h2>Get from <em>${from.symbol}</em> to <em>${to.symbol}</em></h2></div>
   <div class="panel pick">
     <span class="lab">Start on</span>${tilesHTML(H, S.from, 'from', 'r0', true)}
     <span class="lab">Land on</span>${tilesHTML(H, S.to, 'to', 'r1')}
   </div>
   <div class="path">
     <div class="blk r0" data-ev="mf" data-chord="${cref(from)}"><div class="bt">${from.rn} · start</div><div class="bs">${from.symbol}</div><div class="bn">home chord</div></div><div class="ar">→</div>
     <div class="blk r2" data-ev="m2" data-chord="${cref(ap.ii)}"><div class="bt">ii / ${rn}</div><div class="bs">${ap.ii.symbol}</div><div class="bn">${ap.chart} chart · chord 2</div></div><div class="ar">→</div>
     <div class="blk r5" data-ev="m5" data-chord="${cref(ap.V)}"><div class="bt">V / ${rn}</div><div class="bs">${ap.V.symbol}</div><div class="bn">${ap.chart} chart · chord 5</div></div><div class="ar">→</div>
     <div class="blk r1" data-ev="mt" data-chord="${cref(to)}"><div class="bt">${rn} · land</div><div class="bs">${to.symbol}</div><div class="bn">target</div></div>
   </div>
   <div class="duo"><div class="panel why"><h3>What's happening</h3>${lines.map(l => `<p>${l}</p>`).join('')}</div>
   <div class="panel"><h3>Voice‑leading lines</h3><p class="small" style="margin:0">The 3rds and 7ths move by small steps. Hum these and you hear the whole move.</p>
     <div class="lines">${gl('3rds', 1)}${gl('7ths', 3)}</div></div></div>
   <div class="cards">${card(ap.ii, 'r2', 'ii / ' + rn, 'm2')}${card(ap.V, 'r5', 'V / ' + rn, 'm5')}${card(to, 'r1', rn + ' · target', 'mt')}</div>
   </div>`;
}
