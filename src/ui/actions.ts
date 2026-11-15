import { playChords, playNotes, playScale, playSeq, stopAll, togglePlay } from '../audio/player';
import { bindMidi, connectMIDI } from '../midi/input';
import { S, curChords, curMode, earNotes, modeRootPc, rootCtx, save, setMode, type State, type Tab } from '../state';
import { chordInfo } from '../theory/chords';
import { HOME, approach, keyName } from '../theory/home';
import { mod } from '../theory/notes';
import { TYPES } from '../theory/scales';
import { parseChord, type KindId } from '../theory/symbols';
import type { Family, Flavor, HomeMode, ScaleType } from '../theory/types';
import type { Genre } from '../data/styles';
import type { Feel } from '../data/techniques';
import { VOICES, cache, chordByKey } from './pieces';
import { drawPlay, releaseAll, resetPL } from './play';
import { findWay, progChord } from './passing';
import { hidePop, pickerJustClosed, showPicker, showPop, showSheet } from './popover';
import { render, setDir } from './render';
import { drawLead, leadAction, leadTyped } from './views/lead';
import { listenAction } from './views/listen';
import { extPickerHTML, viaPickerHTML } from './views/prog';
import { newEar, newQ } from './views/quiz';
import { editSheetHTML, loadBytes, reharmAction, reharmTyped } from './views/reharm';

/* Tabs where swiping / arrow keys change the key. */
const SWIPE: Tab[] = ['move', 'map', 'chart', 'prog', 'modes', 'ext', 'lead'];

function step(n: number): void {
  if (rootCtx()) S.mroot = mod(modeRootPc() + n, 12); else S.pc = mod(S.pc + n, 12);
  setDir(n > 0 ? 'slide-l' : 'slide-r'); stopAll(); render();
}

function onClick(e: MouseEvent): void {
  const b = (e.target as Element).closest<HTMLElement>('[data-a]');
  if (!b || (b as HTMLButtonElement).disabled) return;
  const a = b.dataset.a, d = b.dataset, H = () => curChords();
  if (S.tab === 'listen' && a && listenAction(a, d)) { stopAll(); render(); return; }
  if (S.tab === 'lead' && a) {
    const r = leadAction(a, d);
    if (r === 'render') { stopAll(); render(); } else if (r === 'draw') { drawLead(); save(); }
    if (r) return;
  }
  if (S.tab === 'reharm' && a) {
    if (a === 'redit') { stopAll(); showSheet(editSheetHTML(+d.i!)); return; }
    const r = reharmAction(a, d);
    if (r === true) { stopAll(); render(); }
    if (r) return;
  }
  switch (a) {
    case 'mode': setMode(d.v as HomeMode); stopAll(); render(); break;
    case 'kprev': step(-1); break;
    case 'knext': step(1); break;
    case 'kpick': if (pickerJustClosed()) break; showPicker(b); break;
    case 'pick': if (rootCtx()) S.mroot = +d.pc!; else { setMode(d.m as HomeMode); S.pc = +d.pc!; } stopAll(); render(); break;
    case 'px': S.px = d.v as State['px']; render(); break;
    case 'pstrict': S.pstrict = d.v === '1'; render(); break;
    case 'phint': S.phint = !S.phint; render(); break;
    case 'pall': S.pall = !S.pall; resetPL(); render(); break;
    case 'psound': S.psound = !S.psound; b.setAttribute('aria-checked', String(S.psound)); save(); break;
    case 'midi': connectMIDI(); break;
    case 'pagain': resetPL(); drawPlay(); break;
    case 'tipx': S.tipDone = true; render(); break;
    case 'pchord': { const c = chordByKey(d.chord); if (c) playSeq([{ t: 0, dur: 2.4, tones: c.tones, id: d.ev }], 'x'); break; }
    case 'vtog': S.voiceHover = !S.voiceHover; hidePop(); b.setAttribute('aria-checked', String(S.voiceHover)); save(); break;
    case 'vopen': showPop(d.k, b, true); break;
    case 'vclose': hidePop(); break;
    case 'vall': showPop(d.k, null, true); break;
    case 'voice': playNotes(VOICES[+d.v!].notes.map(i => i.midi)); break;
    case 'learn': S.mfam = d.fam as Family; S.mdeg = +d.deg!; S.mroot = +d.pc!; S.mview = 'parallel'; S.tab = 'modes'; stopAll(); render(); window.scrollTo(0, 0); break;
    case 'mfam': S.mfam = d.v as Family; stopAll(); render(); break;
    case 'mview': S.mview = d.v as State['mview']; stopAll(); render(); break;
    case 'msel': S.mdeg = +d.d!; stopAll(); render(); break;
    case 'mchordplay': { const m = curMode(); playScale(m.notes, { chord: m.chord }); break; }
    case 'mcomp': playScale(curMode().notes, { compare: true }); break;
    case 'dmode': S.dmode = d.v as State['dmode']; stopAll(); render(); break;
    case 'efam': S.efam = d.v as Family; newEar(); stopAll(); render(); break;
    case 'eplay': playScale(earNotes()); break;
    case 'ecomp': playScale(earNotes(), { compare: true }); break;
    case 'eans': S.ear!.ans = +d.d!; S.escore.t++; if (S.ear!.ans === S.ear!.deg) S.escore.r++; stopAll(); render(); break;
    case 'enext': newEar(); render(); playScale(earNotes()); break;
    case 'eopen': S.mfam = S.ear!.fam; S.mdeg = S.ear!.deg; S.mroot = S.ear!.pc; S.mview = 'parallel'; S.tab = 'modes'; stopAll(); render(); window.scrollTo(0, 0); break;
    case 'tab': if (S.tab === 'listen' && S.llatch) releaseAll(); S.tab = d.v as Tab; stopAll(); render(); window.scrollTo(0, 0); break;
    case 'from': S.from = +d.d!; S.fromSym = null; S.fromExt = null; stopAll(); render(); break;
    case 'to': S.to = +d.d!; S.toSym = null; S.toExt = null; stopAll(); render(); break;
    case 'flavor': S.flavor = d.v as Flavor; stopAll(); render(); break;
    case 'loop': S.loop = !S.loop; b.setAttribute('aria-pressed', String(S.loop)); save(); break;
    case 'tempo': S.tempo = Math.max(50, Math.min(200, S.tempo + +d.v!)); document.querySelectorAll('.tempo output').forEach(o => { o.textContent = S.tempo + ' bpm'; }); save(); break;
    case 'play': togglePlay(); break;
    case 'one': { const id = d.id!, c = id.startsWith('qa') ? cache.qz[+id[2]] : cache.chords[id]; playSeq([{ t: 0, dur: 2.6, tones: c.tones, id }], 'x'); break; }
    case 'preset': S.prog = HOME[S.mode].presets[+d.i!][1].map((dg, i) => ({ d: dg, via: i > 0 ? 'secIIV' : null })); stopAll(); render(); break;
    case 'pdel': S.prog.splice(+d.i!, 1); stopAll(); render(); break;
    case 'padd': S.prog.push({ d: +d.d!, via: null }); S.progBad = null; stopAll(); render(); break;
    case 'pclear': S.prog = []; stopAll(); render(); break;
    case 'mapplay': { const dg = +d.d!, t = H()[dg], ap = approach(t, S.flavor)!; playChords([ap.ii, ap.V, t], ['q' + dg + 'a', 'q' + dg + 'b', 'q' + dg + 'c']); break; }
    case 'mapopen': S.to = +d.d!; S.fromSym = null; S.toSym = null; S.fromExt = null; S.toExt = null; S.way = 'secIIV'; if (S.from === S.to) S.from = 0; S.tab = 'move'; stopAll(); render(); window.scrollTo(0, 0); break;
    case 'chart': S.chart = d.v as ScaleType; stopAll(); render(); break;
    case 'row': { const T = TYPES[S.chart], c = chordInfo(keyName(S.pc, T.keys), S.chart, +d.d!); playSeq([{ t: 0, dur: 2.6, tones: c.tones, id: 'c' + d.d }], 'x'); break; }
    case 'ext': if (d.f === 'from') S.fromExt = (d.k || null) as KindId | null; else S.toExt = (d.k || null) as KindId | null; stopAll(); render(); break;
    case 'symx': if (d.f === 'from') { S.fromSym = null; S.fromExt = null; } else { S.toSym = null; S.toExt = null; } stopAll(); render(); break;
    case 'way': S.way = d.k || null; stopAll(); render(); break;
    case 'pgenre': S.pgenre = d.v as Genre; stopAll(); render(); break;
    case 'pfeel': S.pfeel = d.v as Feel; stopAll(); render(); break;
    case 'pshow': S.pshowAll = !S.pshowAll; stopAll(); render(); break;
    case 'via': stopAll(); showSheet(viaPickerHTML(+d.i!)); break;
    case 'pext': stopAll(); showSheet(extPickerHTML(+d.i!)); break;
    case 'pextset': { const p = S.prog[+d.i!]; if (d.k) p.ext = d.k as KindId; else delete p.ext; hidePop(); stopAll(); render(); break; }
    case 'viaset': S.prog[+d.i!].via = d.k || null; stopAll(); render(); break;
    case 'pall25': {
      const has = (i: number) => i > 0 && !!findWay(progChord(S.prog[i - 1]), progChord(S.prog[i]), 'secIIV');
      const on = !S.prog.every((p, i) => i === 0 || !has(i) || (p.via || '').startsWith('secIIV'));
      S.prog.forEach((p, i) => { if (i > 0 && on && has(i)) p.via = 'secIIV'; else if (!on && (p.via || '').startsWith('secIIV')) p.via = null; });
      stopAll(); render(); break;
    }
    case 'pnone': S.prog.forEach(p => { p.via = null; }); stopAll(); render(); break;
    case 'seq': { const sq = cache.seqs[d.id!]; if (sq) { let t = 0; playSeq(sq.map((tones, i) => { const dur = (i === sq.length - 1 ? 2.4 : 1.4); const e = { t, dur, tones }; t += dur; return e; }), 'x'); } break; }
    case 'extscale': { const sc = cache.scales[d.id!]; if (sc) playScale(sc); break; }
    case 'qshow': S.quiz!.rev = true; render(); break;
    case 'qhear': playChords(cache.qz, ['qa0', 'qa1', 'qa2']); break;
    case 'qok': case 'qno': S.score.t++; if (a === 'qok') S.score.r++; stopAll(); newQ(); render(); break;
  }
}

function onKey(e: KeyboardEvent): void {
  const t = e.target as HTMLElement;
  /* typing in a text box: no shortcuts (Esc leaves the box) */
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') { if (e.key === 'Escape') t.blur(); return; }
  if (e.key === 'Escape') { hidePop(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Space' && t.tagName !== 'BUTTON') { e.preventDefault(); togglePlay(); return; }
  if (t.closest && t.closest('#pop')) return;
  if (e.key === 'ArrowRight' && SWIPE.includes(S.tab)) { e.preventDefault(); step(1); }
  if (e.key === 'ArrowLeft' && SWIPE.includes(S.tab)) { e.preventDefault(); step(-1); }
  if (S.tab === 'move' && /^[1-7]$/.test(e.key)) { const dg = +e.key - 1; if (curChords()[dg].landable && (dg !== S.to || S.toSym)) { S.to = dg; S.toSym = null; S.toExt = null; stopAll(); render(); } }
}

export function initActions(): void {
  document.addEventListener('click', onClick);
  let sx = 0, sy = 0, sOK = false;
  const vEl = document.getElementById('view')!;
  vEl.addEventListener('touchstart', e => { sOK = SWIPE.includes(S.tab) && !(e.target as Element).closest('.scrollx,.tiles,.bars'); sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  vEl.addEventListener('touchend', e => {
    if (!sOK) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', onKey);
  document.addEventListener('change', e => {
    const t = e.target as HTMLSelectElement;
    if (t.classList.contains('rfile')) {
      const file = (t as unknown as HTMLInputElement).files?.[0];
      if (file) file.arrayBuffer().then(buf => { loadBytes(new Uint8Array(buf), file.name); stopAll(); render(); });
      return;
    }
    if (t.classList.contains('psym')) {
      const v = (t as unknown as HTMLInputElement).value.trim() || null;
      if (t.dataset.f === 'rchord') { reharmTyped(+t.dataset.t!, v); stopAll(); render(); return; }
      if (t.dataset.f === 'lead' || t.dataset.f === 'mel') { leadTyped(t.dataset.f, v); stopAll(); render(); return; }
      if (t.dataset.f === 'prog') {
        if (!v) return;
        const c = parseChord(v);
        if (c) { S.prog.push({ d: 0, sym: v, via: null }); S.progBad = null; } else S.progBad = v;
      } else if (t.dataset.f === 'from') { S.fromSym = v; S.fromExt = null; } else { S.toSym = v; S.toExt = null; }
      stopAll(); render();
      if (t.dataset.f === 'prog') document.querySelector<HTMLInputElement>('.psym[data-f="prog"]')?.focus();
      return;
    }
    if (!t.classList.contains('soundsel')) return;
    stopAll(); S.soundOut = t.value || null; save(); bindMidi();
  });
}
