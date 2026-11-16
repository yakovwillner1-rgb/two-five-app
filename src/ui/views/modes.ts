import { S, curMode } from '../../state';
import { FAM } from '../../theory/modes';
import { fmt, mod, pcOf } from '../../theory/notes';
import { scaleNeck } from '../fretboard';
import { kbAbs, type KeyItem } from '../keyboards';
import { cref, famSeg } from '../pieces';

export function viewModes(): string {
  const F = FAM[S.mfam], m = curMode(), plain = ['1', '2', '3', '4', '5', '6', '7'];
  const cls = (j: number) => (j === 0 ? 'rt' : j === m.char ? 'chr' : m.formula[j] !== plain[j] ? 'alt' : '');
  const ladder = F.order.map((d, idx) => {
    const x = curMode(S.mfam, d);
    return `<button class="lad" data-a="msel" data-d="${d}" aria-pressed="${d === S.mdeg}"><span class="ln">${fmt(x.notes[0])} ${x.name}</span><span class="lf">${x.formula.join(' ')}</span>${S.mfam === 'major' ? `<span class="bright" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6].map(i => `<i class="${i < 7 - idx ? 'on' : ''}"></i>`).join('')}</span>` : ''}</button>`;
  }).join('');
  const r = pcOf(m.notes[0]), m0 = 53 + mod(r - 53, 12);
  const kitems: KeyItem[] = m.notes.map((n, j) => ({ m: m0 + mod(pcOf(n) - r, 12), n, lab: m.formula[j], col: j === 0 ? 'var(--gold)' : j === m.char ? 'var(--c5)' : 'var(--c2)' })).concat([{ m: m0 + 12, n: m.notes[0], lab: '8', col: 'var(--gold)' }]);
  const k = cref(m.chord);
  return `<div class="stack">
   <div class="controls">${famSeg('mfam', S.mfam)}<div class="seg" role="group" aria-label="View">${([['parallel', 'Same root'], ['parent', 'From one scale']] as const).map(([v, l]) => `<button data-a="mview" data-v="${v}" aria-pressed="${S.mview === v}">${l}</button>`).join('')}</div></div>
   <div class="mgrid"><div class="ladder">${S.mfam === 'major' && S.mview === 'parallel' ? '<div class="small">Brightest at the top. Each step down flattens one note.</div>' : ''}${ladder}</div>
    <div class="panel mdet">
     <div class="eyebrow">Mode ${S.mdeg + 1} of ${m.parent}</div>
     <h2>${fmt(m.notes[0])} <em>${m.name}</em></h2>
     <p class="msound">${m.sound}</p>
     <div class="lbl">Steps of the scale (compared with major)</div><div class="notes">${m.formula.map((f, j) => `<span class="n ${cls(j)}">${f}</span>`).join('')}</div>
     <div class="lbl" style="margin-top:12px">Notes</div><div class="notes">${m.notes.map((n, j) => `<span class="n ${cls(j)}" data-ev="s${j}">${fmt(n)}</span>`).join('')}</div>
     <div style="margin:16px 0 8px">${S.inst === 'guitar' ? scaleNeck(m.notes.map((n, j) => ({ pc: pcOf(n), name: fmt(n), kind: j === 0 ? 'root' as const : j === m.char ? 'char' as const : 'other' as const, idx: j }))) : kbAbs(kitems, 24, true)}</div>
     <div class="vleg"><span><i class="lg" style="background:var(--gold)"></i>Root</span><span><i class="lg" style="background:var(--c5)"></i>The note that gives it its sound (${m.formula[m.char]})</span><span><i class="lg" style="background:var(--c2)"></i>Other notes</span></div>
     <div class="mchord"><span class="lbl" style="margin:0">Its chord</span><span class="cs" data-chord="${k}">${m.chord.symbol}</span><span class="small">Use it over: ${m.use}</span></div>
     <div class="controls" style="justify-content:flex-start"><button class="pill" data-a="mchordplay">▶ Chord, then scale</button><button class="pill" data-a="mcomp">▶ Major, then this</button><button class="pill" data-a="vopen" data-k="${k}">Voicings</button></div>
    </div></div>
   <div class="panel"><h3>Two ways to look at modes</h3>
    <p class="small" style="max-width:72ch"><b>From one scale:</b> play C major starting on D and you get D Dorian. That is how the charts work, and it tells you which mode fits each chord in a key. <b>Same root:</b> C Ionian, C Dorian, C Phrygian and so on, all starting on the same note. Hearing them over one held note is the fastest way to learn how each one sounds. To learn a mode, remember its steps and the one note that makes it different.</p></div>
   <p class="hint">The root follows the key strip. Swipe sideways to change it.</p></div>`;
}
