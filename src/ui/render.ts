import { canPlay, syncPlay } from '../audio/player';
import { connectMIDI, midi } from '../midi/input';
import { S, curChords, curMode, curTitle, modeRootPc, rootCtx, save, type Tab } from '../state';
import { HOME, approach, homeKey } from '../theory/home';
import { fmt } from '../theory/notes';
import type { HomeMode } from '../theory/types';
import { resetReg, soundBox, tempoHTML } from './pieces';
import { bindPiano, drawPlay, viewPlay } from './play';
import { hidePop } from './popover';
import { viewChart } from './views/chart';
import { viewGuide } from './views/guide';
import { viewMap } from './views/map';
import { viewModes } from './views/modes';
import { viewMove } from './views/move';
import { viewPass } from './views/pass';
import { viewProg } from './views/prog';
import { viewQuiz } from './views/quiz';

const ICONS: Record<Tab, string> = {
  move: '<path d="M4 12h13M13 6l6 6-6 6"/>',
  pass: '<circle cx="5" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/><path d="M7.5 12h2M11 12h2M14.5 12h2"/>',
  play: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M7 5v8M12 5v8M17 5v8M7 13v6M12 13v6M17 13v6"/>',
  prog: '<rect x="3" y="6" width="5" height="12" rx="1.2"/><rect x="10" y="6" width="5" height="12" rx="1.2"/><rect x="17" y="6" width="4" height="12" rx="1.2"/>',
  quiz: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  map: '<path d="M5 6h14M5 12h14M5 18h9"/>',
  modes: '<path d="M3 17l4-4 4 3 5-7 5-3"/>',
  chart: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
  guide: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
};
const ico = (k: Tab): string => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
const NAV: [string, [Tab, string][]][] = [['Practice', [['move', 'Move'], ['pass', 'Passing'], ['prog', 'Progression'], ['play', 'Play it'], ['quiz', 'Drill']]], ['Reference', [['map', 'Cheat sheet'], ['modes', 'Modes'], ['chart', 'Charts']]], ['Learn', [['guide', 'Guide']]]];
export const TITLES: Record<Tab, string> = { play: 'Play it', move: 'Move', pass: 'Passing chords', prog: 'Progression', quiz: 'Drill', map: 'Cheat sheet', modes: 'Modes', chart: 'Charts', guide: 'Guide' };
const SHORT: Record<Tab, string> = { play: 'Play it', move: 'Move', pass: 'Passing', prog: 'Progress', quiz: 'Drill', map: 'Cheat', modes: 'Modes', chart: 'Charts', guide: 'Guide' };
const VIEWS: Record<Tab, () => string> = { play: viewPlay, move: viewMove, pass: viewPass, prog: viewProg, map: viewMap, modes: viewModes, chart: viewChart, quiz: viewQuiz, guide: viewGuide };

const $ = (id: string): HTMLElement => document.getElementById(id)!;
let dir = '';
/** Slide the next render in from the left or right. */
export function setDir(d: 'slide-l' | 'slide-r'): void { dir = d; }

function renderShell(): void {
  $('side').innerHTML = `<div class="sb-brand"><h1>2‑5 <em>into anything</em></h1><p>Passing chords, modes and voicings</p></div>
    ${NAV.map(([g, items]) => `<div class="sb-grp"><div class="eyebrow">${g}</div>${items.map(([k, l]) => `<button class="nav" data-a="tab" data-v="${k}" ${S.tab === k ? 'aria-current="page"' : ''}>${ico(k)}${l}</button>`).join('')}</div>`).join('')}
    <div class="sb-foot"><button class="switch" role="switch" data-a="vtog" aria-checked="${S.voiceHover}">Show voicing on hover<i></i></button>
      <div class="sndslot">${soundBox()}</div>
      <div class="kbd-help"><kbd>Space</kbd><span>Play or stop</span><kbd>← →</kbd><span>Change key</span><kbd>1–7</kbd><span>Land on a chord</span><kbd>Esc</kbd><span>Close a popup</span></div></div>`;
  $('tabbar').innerHTML = NAV.flatMap(g => g[1]).map(([k]) => `<button data-a="tab" data-v="${k}" ${S.tab === k ? 'aria-current="page"' : ''}>${ico(k)}<span>${SHORT[k]}</span></button>`).join('');
  const md = rootCtx(), pc = md ? modeRootPc() : S.pc;
  $('kbtn').innerHTML = `<span class="klab">${md ? 'Root' : 'Home key'}</span><span class="kname">${md ? fmt(homeKey(pc, S.mode).tonic) : curTitle()}</span><span class="chev">▼</span>`;
  $('kbtn').setAttribute('aria-label', md ? 'Pick root' : 'Pick home key');
  $('mode').innerHTML = md ? '' : `<div class="seg" role="group" aria-label="Major or minor key">${(Object.keys(HOME) as HomeMode[]).map(k => `<button data-a="mode" data-v="${k}" aria-pressed="${S.mode === k}">${HOME[k].label}</button>`).join('')}</div>`;
  $('htitle').textContent = TITLES[S.tab];
}
function renderPlayer(): void {
  const t = S.tab, pl = $('player');
  if (t === 'guide' || t === 'chart' || t === 'play') { pl.hidden = true; return; }
  pl.hidden = false;
  const H = curChords();
  let lab = '', now = '';
  if (t === 'move') { const to = H[S.to], ap = approach(to, S.flavor); lab = 'The move'; now = ap ? `${H[S.from].symbol} → ${ap.ii.symbol} → ${ap.V.symbol} → ${to.symbol}` : ''; }
  if (t === 'prog') { const n = S.prog.length, bars = S.prog.reduce((a, p) => a + (p.a && H[p.d].landable ? 2 : 1), 0); lab = 'Progression'; now = n ? `${n} chord${n > 1 ? 's' : ''} · ${bars} bar${bars > 1 ? 's' : ''}` : 'Add some chords'; }
  if (t === 'modes') { const m = curMode(); lab = 'Scale over a drone'; now = fmt(m.notes[0]) + ' ' + m.name; }
  if (t === 'quiz' && S.dmode === 'ear') { lab = 'Mystery mode'; now = 'Play it, then pick'; }
  const flav = ['move', 'prog', 'map'].includes(t) || (t === 'quiz' && S.dmode === 'spell');
  pl.innerHTML = `<div class="pl-in">
    ${canPlay() ? `<button class="playbtn" data-a="play"></button><div class="pl-l"><span class="eyebrow">${lab}</span><span class="pl-now">${now}</span></div>` : ''}
    ${['move', 'prog'].includes(t) ? `<button class="pill sm" data-a="loop" aria-pressed="${S.loop}">Loop</button>` : ''}
    <span class="grow"></span>
    ${flav ? `<div class="flavc"><span class="eyebrow">2‑5 color</span><div class="seg" role="group" aria-label="2-5 color">${[['auto', 'Auto', 'Bright into major, dark into minor'], ['bright', 'Bright', 'm7 → 7'], ['dark', 'Dark', 'm7♭5 → 7♭9']].map(([k, l, tt]) => `<button data-a="flavor" data-v="${k}" title="${tt}" aria-pressed="${S.flavor === k}">${l}</button>`).join('')}</div></div>` : ''}
    ${tempoHTML()}</div>`;
}
export function render(): void {
  hidePop(); resetReg();
  renderShell();
  const v = $('view');
  v.innerHTML = VIEWS[S.tab]();
  if (dir) { v.classList.remove('slide-l', 'slide-r'); void v.offsetWidth; v.classList.add(dir); dir = ''; }
  if (S.tab === 'play') { drawPlay(); bindPiano(); if (S.midiOn && !midi.acc && midi.state === 'idle') connectMIDI(); }
  renderPlayer(); syncPlay(); save();
}
