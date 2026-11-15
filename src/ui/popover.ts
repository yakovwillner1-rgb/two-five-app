import { S, modeRootPc, rootCtx } from '../state';
import { keyName } from '../theory/home';
import { fmt } from '../theory/notes';
import { TYPES } from '../theory/scales';
import { chordByKey, compactPanel, voicingPanel } from './pieces';

/* Popover: voicings (hover with a mouse, press and hold on touch) and the circle-of-fifths key picker. */
const pop = document.getElementById('pop')!, scrim = document.getElementById('scrim')!;
let popTimer: ReturnType<typeof setTimeout> | undefined, hideTimer: ReturnType<typeof setTimeout> | undefined, lpTimer: ReturnType<typeof setTimeout> | undefined;
let popKey: string | null = null, lpXY: [number, number] | null = null, suppress = false, popKind: 'pick' | 'sheet' | 'mini' | null = null, lastClosed: string | null = null;
/** True right after a click closed the key picker (so the same click does not reopen it). */
export const pickerJustClosed = (): boolean => lastClosed === 'pick';

function pickerHTML(): string {
  const md = rootCtx(), cx = 180, cy = 180, R1 = 140, R2 = 92, order = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  let g = '';
  order.forEach((pc, i) => {
    const a = i / 12 * 2 * Math.PI - Math.PI / 2, x = cx + R1 * Math.cos(a), y = cy + R1 * Math.sin(a);
    const on = md ? modeRootPc() === pc : (S.mode === 'major' && S.pc === pc), nm = fmt(keyName(pc, TYPES.major.keys));
    g += `<g class="ck${on ? ' on' : ''}" data-a="pick" data-pc="${pc}" data-m="major" role="button" aria-label="${nm}${md ? '' : ' major'}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="26"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${nm}</text></g>`;
    if (!md) {
      const mpc = (pc + 9) % 12, x2 = cx + R2 * Math.cos(a), y2 = cy + R2 * Math.sin(a), on2 = S.mode === 'minor' && S.pc === mpc, mn = fmt(keyName(mpc, TYPES.natural.keys)) + 'm';
      g += `<g class="ck mi${on2 ? ' on' : ''}" data-a="pick" data-pc="${mpc}" data-m="minor" role="button" aria-label="${mn} minor"><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="21"/><text x="${x2.toFixed(1)}" y="${y2.toFixed(1)}">${mn}</text></g>`;
    }
  });
  return `<div class="vh"><span class="vs" style="font-size:1.4rem">${md ? 'Pick a root' : 'Pick a key'}</span><button class="vx" data-a="vclose" aria-label="Close">×</button></div>
    <svg class="cof" viewBox="0 0 360 360">${g}<text class="cofc" x="180" y="172">Circle</text><text class="cofc" x="180" y="190">of fifths</text></svg>
    <p class="small" style="margin:4px 0 0">${md ? 'Neighbors on the circle share all but one note.' : 'Outer ring: major keys. Inner ring: minor keys. Neighbors share all but one note, so moving one step is the smallest key change.'}</p>`;
}
function placePop(el: Element, pw: number): void {
  pw = Math.min(pw, innerWidth - 24); pop.style.width = pw + 'px';
  const r = el.getBoundingClientRect();
  pop.style.left = Math.min(Math.max(12, r.left + r.width / 2 - pw / 2), innerWidth - pw - 12) + 'px';
  const ph = pop.offsetHeight;
  let top = r.bottom + 8;
  if (top + ph > innerHeight - 8 && r.top - ph - 8 > 8) top = r.top - ph - 8;
  pop.style.top = Math.max(8, Math.min(top, innerHeight - ph - 8)) + 'px';
}
export function showPicker(el: Element): void {
  hidePop(); popKind = 'pick'; pop.innerHTML = pickerHTML(); pop.hidden = false;
  if (innerWidth < 700) { pop.className = 'pop sheet'; scrim.hidden = false; pop.style.left = ''; pop.style.top = ''; pop.style.width = ''; }
  else { pop.className = 'pop keypick'; scrim.hidden = true; placePop(el, 400); }
}
export function showPop(key: string | undefined, el: Element | null, sheet: boolean): void {
  const c = chordByKey(key);
  if (!c || !key) return;
  clearTimeout(hideTimer); popKey = key; pop.innerHTML = voicingPanel(c); pop.hidden = false;
  if (sheet || !el) { popKind = 'sheet'; pop.className = 'pop sheet'; scrim.hidden = false; pop.style.left = ''; pop.style.top = ''; pop.style.width = ''; return; }
  popKind = 'mini'; pop.className = 'pop mini'; scrim.hidden = true; pop.innerHTML = compactPanel(c, key); placePop(el, 340);
}
export function hidePop(): void { clearTimeout(popTimer); clearTimeout(hideTimer); pop.hidden = true; scrim.hidden = true; popKey = null; popKind = null; }

export function initPopover(): void {
  const chordEl = (e: Event) => (e.target as Element).closest<HTMLElement>('[data-chord]');
  const inPop = (e: Event) => !!(e.target as Element).closest('#pop');
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || !S.voiceHover || (!pop.hidden && popKind !== 'mini')) return;
    if (inPop(e)) { clearTimeout(hideTimer); return; }
    const el = chordEl(e);
    clearTimeout(popTimer);
    if (el) { clearTimeout(hideTimer); if (popKey === el.dataset.chord && !pop.hidden) return; popTimer = setTimeout(() => showPop(el.dataset.chord, el, false), 450); }
    else if (!pop.hidden) hideTimer = setTimeout(hidePop, 260);
  });
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const el = chordEl(e);
    if (!el || inPop(e)) return;
    lpXY = [e.clientX, e.clientY]; clearTimeout(lpTimer);
    lpTimer = setTimeout(() => { suppress = true; showPop(el.dataset.chord, el, false); }, 480);
  });
  document.addEventListener('pointermove', e => { if (lpXY && Math.hypot(e.clientX - lpXY[0], e.clientY - lpXY[1]) > 12) { clearTimeout(lpTimer); lpXY = null; } });
  ['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => { clearTimeout(lpTimer); lpXY = null; }));
  document.addEventListener('click', e => {
    if (suppress) { suppress = false; e.stopPropagation(); e.preventDefault(); return; }
    if (!pop.hidden && popKind !== 'sheet' && !inPop(e)) { lastClosed = popKind; hidePop(); setTimeout(() => { lastClosed = null; }, 0); }
  }, true);
  document.addEventListener('contextmenu', e => { if (chordEl(e)) e.preventDefault(); });
  window.addEventListener('scroll', () => { if (!pop.hidden && popKind === 'mini') hidePop(); }, { passive: true });
}
