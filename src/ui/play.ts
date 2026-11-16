import { getOut, screenOn, sendOff, sendOn } from '../audio/midiOut';
import { tone } from '../audio/player';
import { audio } from '../audio/synth';
import { midi } from '../midi/input';
import { S, curMode, curTitle } from '../state';
import { fmt, mod, note, pcOf } from '../theory/notes';
import { PlaySession, buildSteps, voicingStep, type Step } from '../theory/playcheck';
import { burstAt, confetti, countUp, reduced, ripple } from './motion';
import { cref, soundBox } from './pieces';
import { ROLE_VAR, roleOfSymbol } from './role';
import type { Flavor } from '../theory/types';
import { moveModel } from './views/move';
import { progSteps } from './views/prog';

/* Play it: Web MIDI input + on-screen piano, checked by the pure PlaySession. */
const held = new Set<number>(), ptrNote: Record<number, number> = {};
/** Set by the Listen tab: called whenever the held notes change while it is open. */
export const heldHook = { changed: (_held: Set<number>): void => {} };
/** Set by the Melody tab: called when the held notes change while it is open; `ghost` marks keys on the piano there. */
export const leadHook = { changed: (_held: Set<number>): void => {}, ghost: (): Record<number, string> => ({}) };
/** Let go of every held note (latched on-screen keys). */
export function releaseAll(): void { [...held].forEach(noteOff); }
let ses: PlaySession | null = null, sig = '', t0 = 0, elapsed = 0;
/* combo / accuracy of this run: a unit is one chord (or one scale note); it is clean when no wrong note came in it */
let combo = 0, bestCombo = 0, units = 0, cleanUnits = 0, unitKey = '', unitWrong = 0, scoreShown = false, comboBump = false;
let chkT: ReturnType<typeof setTimeout> | undefined, flashT: ReturnType<typeof setTimeout> | undefined;

/* Play it checks chords it has a scale for: the chords of the key and their 2-5s. A 2-5 chosen on the
   Move or Progression tab is used with its color; other passing chords and typed chords are skipped
   until the voicing engine (Phase 2) can check them. */
function steps(): Step[] {
  /* voicings kept on the Melody tab: each one exactly as kept */
  if (S.px === 'lead' && S.lkept.length) return S.lkept.map((k, i) => voicingStep(k.sym, `${k.name} · ${i + 1} of ${S.lkept.length}`, k.notes.map(n => ({ midi: n.m, name: fmt(note(n.n)) }))));
  const sel = S.px === 'move' ? moveModel().sel : null;
  const flavor: Flavor = sel?.techniqueId === 'secIIV' ? (sel.variant as Flavor) : S.flavor;
  const vias = S.px === 'prog' ? progSteps() : [];
  const prog = S.prog.map((p, i) => ({ p, via: vias[i]?.via })).filter(x => !x.p.sym)
    .map(({ p, via }) => ({ d: p.d, a: via?.techniqueId === 'secIIV' && via.chords.length === 2, flavor: via?.techniqueId === 'secIIV' ? (via.variant as Flavor) : undefined }));
  return buildSteps({ px: S.px === 'lead' ? 'move' : S.px, pc: S.pc, mode: S.mode, from: S.from, to: S.to, flavor, prog, allKeys: S.pall, modeDetail: () => curMode(), rng: Math.random });
}
const playSig = (): string => JSON.stringify([S.px, S.pc, S.mode, S.from, S.to, S.flavor, S.way, S.pgenre, S.pfeel, S.prog, S.mfam, S.mdeg, S.mroot, S.mview, S.pstrict, S.pall, S.px === 'lead' ? S.lkept : 0]);
export function resetPL(): void {
  clearTimeout(chkT);
  sig = playSig(); t0 = 0; elapsed = 0;
  combo = bestCombo = units = cleanUnits = 0; unitKey = ''; unitWrong = 0; scoreShown = false; comboBump = false;
  ses = new PlaySession(steps(), S.pstrict, held, S.px === 'random' ? steps : undefined);
}

export function noteOn(n: number, src: 'screen' | 'midi'): void {
  if (held.has(n)) return;
  const out = getOut();
  if (src === 'screen' && out) { screenOn.add(n); sendOn(out, n, 85); }
  else if (!out && (src === 'screen' || S.psound)) { const c = audio(); tone(n, c.currentTime + 0.01, 1.6, 0.15); }
  if (S.tab !== 'play' || !ses) { held.add(n); if (S.tab === 'listen') heldHook.changed(held); if (S.tab === 'lead') leadHook.changed(held); keyRipple(n, 'on'); return; }
  if (!ses.done && !t0) t0 = performance.now();
  const r = ses.noteOn(n);
  if (!r.counted) { drawPlay(); return; }
  if (r.mark === 'bad') flash('bad');
  if (r.finished) finish();
  if (r.needsChordCheck) { clearTimeout(chkT); chkT = setTimeout(checkChord, 90); }
  drawPlay();
  keyRipple(n, r.mark === 'bad' ? 'bad' : r.mark === 'ok' ? 'ok' : 'on');
}
export function noteOff(n: number): void {
  if (screenOn.has(n)) { screenOn.delete(n); const o = getOut(); if (o) sendOff(o, n); }
  if (ses) ses.noteOff(n);
  held.delete(n);
  if (S.tab === 'play') drawKeys();
  if (S.tab === 'listen') heldHook.changed(held);
  if (S.tab === 'lead') leadHook.changed(held);
}
function checkChord(): void {
  if (!ses) return;
  const st = ses.steps[ses.i], sym = st && st.kind === 'chord' ? st.chord.symbol : st && st.kind === 'voicing' ? st.symbol : '';
  const r = ses.checkChord();
  if (r === 'none') return;
  flash('good');
  burstAt(document.getElementById('ptarget'), sym ? ROLE_VAR[roleOfSymbol(sym)] : 'var(--c2)', 18);
  if (r === 'finished') finish();
  drawPlay();
}
function finish(): void { elapsed = (performance.now() - t0) / 1000; flash('good'); }
/** A ring from the pressed key, in the colour of its mark (green right, red wrong, blue just held). */
function keyRipple(n: number, mark: 'ok' | 'bad' | 'on'): void {
  const K = document.getElementById('pkwrap');
  if (K) ripple(K, K.querySelector(`[data-n="${n}"]`), mark === 'ok' ? 'var(--ok-fill)' : mark === 'bad' ? 'var(--c5)' : 'var(--c0)');
}
function flash(k: 'good' | 'bad'): void {
  const e = document.getElementById('ptarget');
  if (!e) return;
  e.classList.remove('fl-good', 'fl-bad'); void e.offsetWidth; e.classList.add('fl-' + k);
  clearTimeout(flashT); flashT = setTimeout(() => e.classList.remove('fl-good', 'fl-bad'), 380);
}

function midiHTML(): string {
  const none: [string, string, string] = ['warn', 'MIDI is on, but no keyboard is connected. Plug one in and it shows up here.', ''];
  const M = ({
    idle: ['', 'Connect a MIDI keyboard and the app reads what you play. The on-screen keys below work too.', 'Connect MIDI keyboard'],
    asking: ['warn', 'Waiting for permission. Allow MIDI devices if your browser asks.', ''],
    unsupported: ['warn', 'This browser can\'t read MIDI keyboards. Use Chrome or Edge on your Mac. The on-screen keys below still work.', ''],
    blocked: ['warn', 'MIDI is blocked here. Open your own copy of the app in Chrome and allow MIDI when it asks.', 'Try again'],
    on: midi.names.length ? ['ok', 'Listening to ' + midi.names.map(n => '<b>' + n.replace(/</g, '&lt;') + '</b>').join(', '), ''] : none,
  } as Record<string, [string, string, string]>)[midi.state];
  return `<span class="dot ${M[0]}"></span><span class="mtext">${M[1]}</span>${M[2] ? `<button class="pill sm go" data-a="midi">${M[2]}</button>` : ''}${midi.acc ? `<span class="sndslot">${soundBox()}</span>` : ''}`;
}
const pstats = (): string => `<div class="pstats">${combo >= 2 ? `<span class="combo${combo >= 5 ? ' hot' : ''}${comboBump ? ' bump' : ''}">combo <b>×${combo}</b></span>` : ''}<span>Wrong notes <b>${ses!.wrong}</b></span>${S.px === 'random' ? `<span>Rounds done <b>${ses!.rounds}</b></span>` : ''}<button class="pill sm" data-a="pagain">Restart</button></div>`;
function targetHTML(): string {
  const P = ses!;
  if (P.done) {
    const st0 = P.steps[0], what = st0.kind === 'scale' ? st0.seq.length + ' notes' : P.steps.length + ' chords';
    const acc = units ? Math.round((cleanUnits / units) * 100) : 100, stars = P.wrong === 0 ? 3 : acc >= 70 ? 2 : 1;
    return `<div class="score" data-time="${elapsed}" data-acc="${acc}" data-combo="${bestCombo}"><div class="eyebrow">Finished · ${what}</div><div class="big">${P.wrong === 0 ? 'Clean run!' : 'Nice work'}</div>
      <div class="stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map(k => `<span class="${k <= stars ? '' : 'off'}">★</span>`).join('')}</div>
      <div class="stats3"><div class="stat"><b id="sc-time">0.0s</b><span>Time</span></div><div class="stat"><b id="sc-acc">0%</b><span>Accuracy</span></div><div class="stat"><b id="sc-combo">×0</b><span>Best combo</span></div></div>
      <p class="phow">${P.wrong} wrong note${P.wrong === 1 ? '' : 's'}</p>
      <div class="controls" style="margin-top:10px"><button class="pill go" data-a="pagain">Go again</button></div></div>`;
  }
  const st = P.steps[P.i];
  if (st.kind === 'scale') {
    const m = st.mode;
    return `<div class="pchips">${st.names.map((n, i) => `<span class="pc ${i < P.si ? 'done' : i === P.si ? 'cur' : ''}">${fmt(n)}</span>`).join('')}</div>
      <div class="eyebrow" style="margin-top:14px">Mode scale · up one octave and back down</div><div class="pbig">${fmt(m.notes[0])} ${m.name}</div>
      <p class="phow">Next note: <b>${fmt(st.names[P.si])}</b>. Any octave counts.</p>${pstats()}`;
  }
  const chips = `<div class="pchips">${P.steps.map((x, i) => `<span class="pc ${x.kind === 'chord' ? roleOfSymbol(x.chord.symbol) : x.kind === 'voicing' ? roleOfSymbol(x.symbol) : ''} ${i < P.i ? 'done' : i === P.i ? 'cur' : ''}">${x.kind === 'chord' ? x.chord.symbol : x.kind === 'voicing' ? x.symbol : ''}</span>`).join('<span class="arr">→</span>')}</div>`;
  if (st.kind === 'voicing') {
    return `${chips}<div class="eyebrow" style="margin-top:14px">${st.label}</div><div class="pbig">${st.symbol}</div>
      <p class="phow">Play this voicing, bottom to top: <b>${st.names.join(' · ')}</b>. Any octave counts.</p>${pstats()}`;
  }
  const c = st.chord;
  const how = S.pstrict ? `Play the <b>${st.voicing.name}</b> voicing, bottom to top: <b>${st.voicing.notes.map(x => fmt(x.note)).join(' · ')}</b>. Any octave counts.`
    : `Any voicing with the 3rd (<b>${fmt(c.tones[1])}</b>) and the 7th (<b>${fmt(c.tones[3])}</b>). Every other note has to fit ${fmt(c.mode.notes[0])} ${c.mode.name}.`;
  return `${chips}
    <div class="eyebrow" style="margin-top:14px">${st.label}${S.px === 'random' ? ' · round ' + (P.rounds + 1) : ''}</div>
    <div class="pbig" data-chord="${cref(c)}">${c.symbol}</div><p class="phow">${how}</p>${pstats()}`;
}
function pianoSVG(): string {
  const P = S.tab === 'play' ? ses : null, lo = innerWidth < 900 ? 48 : 36, hi = 84, W = 30, H = 150, BW = 18, BH = 94, wh = [0, 2, 4, 5, 7, 9, 11];
  const st = !P || P.done ? null : P.steps[P.i], ghost: Record<number, string> = {};
  if (S.phint && st && P) {
    if (st.kind === 'scale') { const nx = st.seq[P.si]; if (nx != null) ghost[60 + mod(nx - 60, 12)] = fmt(st.names[P.si]); }
    else if (st.kind === 'voicing') { const up = st.midis[0] < lo ? Math.ceil((lo - st.midis[0]) / 12) * 12 : 0; st.midis.forEach((m, i) => { ghost[m + up] = st.names[i]; }); }
    else if (S.pstrict) st.voicing.notes.forEach(i => { let m = i.midi; while (m < lo) m += 12; ghost[m] = fmt(i.note); });
    else {
      const r = pcOf(st.chord.tones[0]), m = 55 + mod(r - 55, 12);
      let prev = -1;
      st.chord.tones.forEach(n => { let x = pcOf(n) + 48; while (x <= prev || x < m) x += 12; prev = x; ghost[x] = fmt(n); });
    }
  }
  if (S.tab === 'lead') Object.assign(ghost, leadHook.ghost());
  const NN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'], name = (m: number) => NN[mod(m, 12)];
  const pos: Record<number, number> = {};
  let x = 0;
  for (let m = lo; m <= hi; m++) if (wh.includes(mod(m, 12))) { pos[m] = x; x += W; }
  let w = '', b = '';
  for (let m = lo; m <= hi; m++) {
    const isW = wh.includes(mod(m, 12)), h = held.has(m) ? (P?.marks[m] || 'on') : '', g = ghost[m];
    if (isW) {
      const X = pos[m];
      w += `<rect data-n="${m}" x="${X + .5}" y=".5" width="${W - 1}" height="${H}" rx="4" class="pk-w${h ? ' k-' + h : ''}"/>`;
      if (g && !h) w += `<circle class="ghostdot" cx="${X + W / 2}" cy="${H - 30}" r="9" fill="var(--gold)"/>`;
      if (g || h) w += `<text x="${X + W / 2}" y="${H - 10}" class="pkl">${g || name(m)}</text>`;
      else if (m === 60) w += `<text x="${X + W / 2}" y="${H - 10}" class="pkl c4">C4</text>`;
    } else {
      const X = pos[m - 1] + W - BW / 2;
      b += `<rect data-n="${m}" x="${X}" y=".5" width="${BW}" height="${BH}" rx="3" class="pk-b${h ? ' k-' + h : ''}"/>`;
      if (g && !h) b += `<circle class="ghostdot" cx="${X + BW / 2}" cy="${BH - 20}" r="7" fill="var(--gold)"/>`;
      if (g || h) b += `<text x="${X + BW / 2}" y="${BH - 6}" class="pkl kb" style="fill:${h ? 'var(--on-fill)' : 'var(--gold)'}">${g || name(m)}</text>`;
    }
  }
  return `<svg viewBox="0 0 ${x + 1} ${H + 1}" role="img" aria-label="Piano keyboard">${w}${b}</svg>`;
}
export function drawMidi(): void { const M = document.getElementById('midibar'); if (M) M.innerHTML = midiHTML(); }
export function drawKeys(): void { const K = document.getElementById('pkwrap'); if (K && (ses || S.tab === 'listen' || S.tab === 'lead')) K.innerHTML = pianoSVG(); }
function trackUnits(): void {
  const P = ses!, key = P.done ? 'done' : `${P.rounds}.${P.i}.${P.si}`;
  if (P.wrong > unitWrong && combo > 0) combo = 0;
  if (key !== unitKey) {
    if (unitKey) { units++; if (P.wrong === unitWrong) { cleanUnits++; combo++; bestCombo = Math.max(bestCombo, combo); comboBump = true; } else combo = 0; }
    unitKey = key; unitWrong = P.wrong;
  }
}
export function drawPlay(): void {
  if (S.tab !== 'play' || !ses) return;
  trackUnits();
  const T = document.getElementById('ptarget'), P = ses;
  if (T && !(P.done && scoreShown && T.querySelector('.score'))) {
    T.innerHTML = targetHTML(); comboBump = false;
    const st = P.done ? null : P.steps[P.i], sym = st && st.kind === 'chord' ? st.chord.symbol : st && st.kind === 'voicing' ? st.symbol : '';
    T.style.setProperty('--rc', P.done ? 'var(--accent)' : sym ? ROLE_VAR[roleOfSymbol(sym)] : 'var(--c0)');
    if (P.done && !scoreShown) {
      scoreShown = true;
      const sc = T.querySelector<HTMLElement>('.score');
      if (sc) {
        countUp(T.querySelector('#sc-time'), +sc.dataset.time!, 900, v => v.toFixed(1) + 's');
        countUp(T.querySelector('#sc-acc'), +sc.dataset.acc!, 1000, v => Math.round(v) + '%', 150);
        countUp(T.querySelector('#sc-combo'), +sc.dataset.combo!, 800, v => '×' + Math.round(v), 300);
        if (P.wrong === 0 && !reduced()) confetti(80);
      }
    }
  }
  drawMidi(); drawKeys();
}
export function bindPiano(): void {
  const K = document.getElementById('pkwrap');
  if (!K) return;
  K.addEventListener('pointerdown', e => {
    const r = (e.target as Element).closest<SVGElement>('[data-n]');
    if (!r) return;
    e.preventDefault();
    const n = +r.dataset.n!;
    /* latch (Listen): a tap toggles the key, so a chord can be built with a mouse */
    if (S.tab === 'listen' && S.llatch) { if (held.has(n)) noteOff(n); else noteOn(n, 'screen'); return; }
    ptrNote[e.pointerId] = n;
    try { K.setPointerCapture(e.pointerId); } catch (_) { /* not capturable */ }
    noteOn(n, 'screen');
  });
  const up = (e: PointerEvent) => { const n = ptrNote[e.pointerId]; if (n != null) { delete ptrNote[e.pointerId]; noteOff(n); } };
  K.addEventListener('pointerup', up); K.addEventListener('pointercancel', up);
}
export function viewPlay(): string {
  if (!ses || sig !== playSig()) resetPL();
  const sw = (a: string, on: boolean, l: string) => `<button class="switch" role="switch" data-a="${a}" aria-checked="${on}">${l}<i></i></button>`;
  const src = S.px === 'move' ? 'Uses the move set on the Move tab.' : S.px === 'prog' ? 'Uses the chords on the Progression tab.' : S.px === 'mode' ? 'Uses the mode picked on the Modes tab. Change the root with the key button.' : S.px === 'lead' ? (S.lkept.length ? 'Uses the voicings you kept on the Melody tab, exactly as kept.' : 'No voicings kept yet: keep some on the Melody tab. Showing the move until then.') : 'Random 2‑5s into the chords of the home key.';
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Play it · ${S.px === 'mode' ? 'Modes' : curTitle()}</div><h2>Play it and get <em>checked</em></h2></div>
   <div class="panel pctl">
     <div class="pcrow"><span class="lbl">Practice</span><div class="seg" role="group" aria-label="What to practice">${([['move', 'The move'], ['prog', 'Progression'], ['random', 'Random 2‑5s'], ['mode', 'Mode scale'], ['lead', 'Voicings']] as const).map(([k, l]) => `<button data-a="px" data-v="${k}" aria-pressed="${S.px === k}">${l}</button>`).join('')}</div></div>
     ${S.px !== 'mode' && !(S.px === 'lead' && S.lkept.length) ? `<div class="pcrow"><span class="lbl">Check</span><div class="seg" role="group" aria-label="How strict">${([[0, 'Any voicing'], [1, 'Exact voicing']] as const).map(([k, l]) => `<button data-a="pstrict" data-v="${k}" aria-pressed="${S.pstrict === !!k}">${l}</button>`).join('')}</div></div>` : ''}
     <div class="pcrow sws">${sw('phint', S.phint, 'Show the notes')}${S.px === 'random' ? sw('pall', S.pall, 'All 12 keys') : ''}${S.soundOut ? '' : sw('psound', S.psound, 'Sound for MIDI notes')}</div>
   </div>
   <div class="midibar" id="midibar"></div>
   <div class="panel ptarget" id="ptarget"></div>
   <div class="pkwrap" id="pkwrap"></div>
   <p class="hint">${src} Green notes fit, red notes don't.${S.phint ? ' Gold dots show what to play.' : ''} Leave "Sound for MIDI notes" off when Logic is playing your keyboard.</p>
  </div>`;
}
