import { S, earNotes } from '../../state';
import { chordInfo } from '../../theory/chords';
import { HOME, approach, homeKey, landable } from '../../theory/home';
import { FAM } from '../../theory/modes';
import { fmt } from '../../theory/notes';
import { TYPES } from '../../theory/scales';
import { cache, card, famSeg } from '../pieces';

/** New 2-5 spelling question: random key (in the current major/minor mode) and landable target. */
export function newQ(): void {
  const pc = Math.floor(Math.random() * 12), root = homeKey(pc, S.mode).tonic, H = HOME[S.mode];
  const ok = [0, 1, 2, 3, 4, 5, 6].filter(d => landable(chordInfo(root, H.src(d), d)));
  S.quiz = { pc, deg: ok[Math.floor(Math.random() * ok.length)], rev: false };
}
function viewSpell(): string {
  if (!S.quiz) newQ();
  const q = S.quiz!, root = homeKey(q.pc, S.mode).tonic, H = HOME[S.mode], t = chordInfo(root, H.src(q.deg), q.deg);
  const ap = approach({ tones: t.tones, quality: t.quality, landable: true }, S.flavor)!;
  cache.qz = [ap.ii, ap.V, t];
  const body = q.rev ? `<div class="qa">${card(ap.ii, 'r2', 'ii / ' + H.rn[q.deg], 'qa0')}${card(ap.V, 'r5', 'V / ' + H.rn[q.deg], 'qa1')}</div>
     <p class="small">From the ${ap.chart} chart, chords 2 and 5.</p>
     <div class="controls"><button class="pill" data-a="qhear">▶ Hear it</button><button class="pill go" data-a="qok">I got it</button><button class="pill" data-a="qno">Missed it</button></div>`
    : `<div class="controls"><button class="pill go" data-a="qshow">Show answer</button></div>`;
  return `<div class="quiz"><div class="eyebrow">Drill · ${HOME[S.mode].label} keys · ${S.flavor === 'auto' ? 'auto color' : S.flavor}</div>
    <div class="q">In ${fmt(root)} ${H.name}, what 2‑5 leads into <b>${t.symbol}</b> <span class="small">(${H.rn[q.deg]})</span>?</div>${body}
    <p class="small" style="margin-top:22px;font-family:var(--mono)">${S.score.r} of ${S.score.t} right</p></div>`;
}
export function newEar(): void { S.ear = { fam: S.efam, deg: Math.floor(Math.random() * 7), pc: Math.floor(Math.random() * 12), ans: null }; }
function viewEar(): string {
  if (!S.ear || S.ear.fam !== S.efam) newEar();
  const E = S.ear!, F = FAM[E.fam];
  const ch = F.order.map(d => {
    let c = 'choice';
    if (E.ans != null) { if (d === E.deg) c += ' right'; else if (d === E.ans) c += ' wrong'; }
    return `<button class="${c}" data-a="eans" data-d="${d}" ${E.ans != null ? 'disabled' : ''}>${TYPES[E.fam].modes[d]}</button>`;
  }).join('');
  const res = E.ans == null ? '' : `<p class="q" style="font-size:1.4rem;margin:8px 0 14px">${E.ans === E.deg ? 'Right.' : 'Not quite.'} That was ${fmt(earNotes()[0])} ${TYPES[E.fam].modes[E.deg]}.</p>
    <div class="controls"><button class="pill go" data-a="enext">Next one</button><button class="pill" data-a="eopen">Open it in Modes</button></div>`;
  return `<div class="quiz"><div class="controls">${famSeg('efam', S.efam)}</div>
    <div class="q">Which mode is this?</div>
    <div class="controls"><button class="pill go" data-a="eplay">▶ Play</button><button class="pill" data-a="ecomp">▶ Major, then this</button></div>
    <div class="choices">${ch}</div>${res}
    <p class="small" style="font-family:var(--mono);margin-top:18px">${S.escore.r} of ${S.escore.t} right</p>
    <p class="small">Each mode plays up and down over a low drone on its root. Listen for the one note that sets it apart. Start with the Major family.</p></div>`;
}
export function viewQuiz(): string {
  const seg = `<div class="controls" style="margin-bottom:10px"><div class="seg" role="group" aria-label="Drill type">${([['spell', '2‑5 spelling'], ['ear', 'Modes by ear']] as const).map(([k, l]) => `<button data-a="dmode" data-v="${k}" aria-pressed="${S.dmode === k}">${l}</button>`).join('')}</div></div>`;
  return seg + (S.dmode === 'ear' ? viewEar() : viewSpell());
}
