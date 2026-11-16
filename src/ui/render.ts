import { canPlay, syncPlay } from '../audio/player';
import { connectMIDI, midi } from '../midi/input';
import { S, curMode, curTitle, modeRootPc, rootCtx, save, type Tab } from '../state';
import { HOME, homeKey } from '../theory/home';
import { fmt } from '../theory/notes';
import type { HomeMode } from '../theory/types';
import { flipPlay, flipSnapshot } from './motion';
import { cache, resetReg, soundBox, tempoHTML } from './pieces';
import { bindPiano, drawPlay, viewPlay } from './play';
import { hidePop } from './popover';
import { viewChart } from './views/chart';
import { viewExt } from './views/ext';
import { viewGuide } from './views/guide';
import { drawLead, viewLead } from './views/lead';
import { drawListen, viewListen } from './views/listen';
import { viewMap } from './views/map';
import { viewModes } from './views/modes';
import { moveModel, viewMove } from './views/move';
import { progBars, viewProg } from './views/prog';
import { viewQuiz } from './views/quiz';
import { viewReharm } from './views/reharm';

const ICONS: Record<Tab, string> = {
  move: '<path d="M4 12h13M13 6l6 6-6 6"/>',
  listen: '<path d="M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4"/>',
  reharm: '<path d="M4 7h11l-3-3M20 17H9l3 3"/><circle cx="18.5" cy="7" r="1.5"/><circle cx="5.5" cy="17" r="1.5"/>',
  lead: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  play: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M7 5v8M12 5v8M17 5v8M7 13v6M12 13v6M17 13v6"/>',
  prog: '<rect x="3" y="6" width="5" height="12" rx="1.2"/><rect x="10" y="6" width="5" height="12" rx="1.2"/><rect x="17" y="6" width="4" height="12" rx="1.2"/>',
  quiz: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  map: '<path d="M5 6h14M5 12h14M5 18h9"/>',
  modes: '<path d="M3 17l4-4 4 3 5-7 5-3"/>',
  ext: '<path d="M4 18V8M9 18V5M14 18v-7M19 18V9"/><path d="M3 21h18"/>',
  chart: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
  guide: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
};
const ico = (k: Tab): string => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
const NAV: [string, [Tab, string][]][] = [['Practice', [['move', 'Move'], ['prog', 'Progression'], ['lead', 'Melody'], ['reharm', 'Reharm'], ['listen', 'Listen'], ['play', 'Play it'], ['quiz', 'Drill']]], ['Reference', [['map', 'Cheat sheet'], ['modes', 'Modes'], ['ext', 'Extensions'], ['chart', 'Charts']]], ['Learn', [['guide', 'Guide']]]];
export const TITLES: Record<Tab, string> = { play: 'Play it', listen: 'Listen', lead: 'Melody on top', reharm: 'Reharm', move: 'Move', prog: 'Progression', quiz: 'Drill', map: 'Cheat sheet', modes: 'Modes', ext: 'Extensions', chart: 'Charts', guide: 'Guide' };
const SHORT: Record<Tab, string> = { play: 'Play it', listen: 'Listen', lead: 'Melody', reharm: 'Reharm', move: 'Move', prog: 'Prog', quiz: 'Drill', map: 'Cheat', modes: 'Modes', ext: 'Extend', chart: 'Charts', guide: 'Guide' };
const VIEWS: Record<Tab, () => string> = { play: viewPlay, listen: viewListen, lead: viewLead, reharm: viewReharm, move: viewMove, prog: viewProg, map: viewMap, modes: viewModes, ext: viewExt, chart: viewChart, quiz: viewQuiz, guide: viewGuide };

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
  /* the phone tab bar scrolls sideways: keep the current tab in view */
  const cur = $('tabbar').querySelector<HTMLElement>('[aria-current]');
  if (cur && cur.offsetParent) $('tabbar').scrollLeft = Math.max(0, cur.offsetLeft - ($('tabbar').clientWidth - cur.offsetWidth) / 2);
}
function renderPlayer(): void {
  const t = S.tab, pl = $('player');
  if (t === 'guide' || t === 'chart' || t === 'play' || t === 'listen' || t === 'lead' || t === 'reharm' || t === 'ext') { pl.hidden = true; return; }
  pl.hidden = false;
  let lab = '', now = '';
  if (t === 'move') { const m = moveModel(); lab = m.sel ? m.sel.name : 'The move'; now = [...(m.sel?.replacesFrom ? [] : [m.from]), ...(m.sel?.chords ?? []), m.to].map(c => c.symbol).join(' → '); }
  if (t === 'prog') { const n = S.prog.length, bars = progBars(); lab = 'Progression'; now = n ? `${n} chord${n > 1 ? 's' : ''} · ${bars} bar${bars === 1 ? '' : 's'}` : 'Add some chords'; }
  if (t === 'modes') { const m = curMode(); lab = 'Scale over a drone'; now = fmt(m.notes[0]) + ' ' + m.name; }
  if (t === 'quiz' && S.dmode === 'ear') { lab = 'Mystery mode'; now = 'Play it, then pick'; }
  const flav = t === 'map' || (t === 'quiz' && S.dmode === 'spell');
  pl.innerHTML = `<div class="pl-in">
    ${canPlay() ? `<button class="playbtn" data-a="play"></button><div class="pl-l"><span class="eyebrow">${lab}</span><span class="pl-now">${now}</span></div>` : ''}
    ${['move', 'prog'].includes(t) ? `<button class="pill sm" data-a="loop" aria-pressed="${S.loop}">Loop</button>` : ''}
    <span class="grow"></span>
    ${flav ? `<div class="flavc"><span class="eyebrow">2‑5 color</span><div class="seg" role="group" aria-label="2-5 color">${[['auto', 'Auto', 'Bright into major, dark into minor'], ['bright', 'Bright', 'm7 → 7'], ['dark', 'Dark', 'm7♭5 → 7♭9']].map(([k, l, tt]) => `<button data-a="flavor" data-v="${k}" title="${tt}" aria-pressed="${S.flavor === k}">${l}</button>`).join('')}</div></div>` : ''}
    ${tempoHTML()}</div>`;
}
export function render(): void {
  hidePop(); resetReg();
  cache.seqs = {}; cache.scales = {};
  renderShell();
  const v = $('view');
  flipSnapshot(v);
  v.innerHTML = VIEWS[S.tab]();
  flipPlay(v);
  if (dir) { v.classList.remove('slide-l', 'slide-r'); void v.offsetWidth; v.classList.add(dir); dir = ''; }
  if (S.tab === 'lead') { drawLead(); bindPiano(); if (S.midiOn && !midi.acc && midi.state === 'idle') connectMIDI(); }
  if (S.tab === 'listen') { drawListen(); bindPiano(); if (S.midiOn && !midi.acc && midi.state === 'idle') connectMIDI(); }
  if (S.tab === 'play') { drawPlay(); bindPiano(); if (S.midiOn && !midi.acc && midi.state === 'idle') connectMIDI(); }
  renderPlayer(); syncPlay(); save();
}
