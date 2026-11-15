import './styles.css';
import { stopAll } from './audio/player';
import { connectMIDI, midi, midiHooks } from './midi/input';
import { S, load } from './state';
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
if (!TITLES[S.tab]) S.tab = 'move';
render();
if (S.midiOn && midi.state === 'idle') connectMIDI();

/* Offline support. The worker is only built for production (see vite.config.ts). */
if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

/* Debug/test hook (same idea as the single-file app's window.__t). */
(window as unknown as { __t: unknown }).__t = { S, render, noteOn, noteOff, showPop, showPicker, resetPL, stopAll };
