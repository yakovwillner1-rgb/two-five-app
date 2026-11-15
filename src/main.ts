import './styles.css';
import { stopAll } from './audio/player';
import { connectMIDI, midi, midiHooks } from './midi/input';
import { S, load } from './state';
import { KINDS, type KindId } from './theory/symbols';
import { initActions } from './ui/actions';
import { refreshSound } from './ui/pieces';
import { drawMidi, noteOff, noteOn, resetPL } from './ui/play';
import { initPopover, showPicker, showPop } from './ui/popover';
import { TITLES, render } from './ui/render';

midiHooks.noteOn = n => noteOn(n, 'midi');
midiHooks.noteOff = noteOff;
midiHooks.changed = () => { drawMidi(); refreshSound(); };

initPopover();
initActions();

Object.assign(S, load());
/* Settings saved by earlier versions: progression items were { d, a } with a = "2-5 in front". */
S.prog = (S.prog as unknown as { d: number; a?: boolean; sym?: string; ext?: string; via?: string | null }[]).map(p => ({ d: p.d, ...(p.sym ? { sym: p.sym } : {}), ...(p.ext && p.ext in KINDS ? { ext: p.ext as KindId } : {}), via: p.via !== undefined ? p.via : p.a ? 'secIIV' : null }));
if (!TITLES[S.tab]) S.tab = 'move';
render();
if (S.midiOn && midi.state === 'idle') connectMIDI();

/* Offline support. The worker is only built for production (see vite.config.ts). */
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

/* Debug/test hook (same idea as the single-file app's window.__t). */
(window as unknown as { __t: unknown }).__t = { S, render, noteOn, noteOff, showPop, showPicker, resetPL, stopAll };
