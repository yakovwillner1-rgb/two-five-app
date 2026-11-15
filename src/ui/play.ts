import { getOut, screenOn, sendOff, sendOn } from '../audio/midiOut';
import { tone } from '../audio/player';
import { audio } from '../audio/synth';
import { midi } from '../midi/input';
import { S, curMode, curTitle } from '../state';
import { fmt, mod, pcOf } from '../theory/notes';
import { PlaySession, buildSteps, type Step } from '../theory/playcheck';
import { cref, soundBox } from './pieces';

/* Play it: Web MIDI input + on-screen piano, checked by the pure PlaySession. */
const held = new Set<number>(), ptrNote: Record<number, number> = {};
let ses: PlaySession | null = null, sig = '', t0 = 0, elapsed = 0;
let chkT: ReturnType<typeof setTimeout> | undefined, flashT: ReturnType<typeof setTimeout> | undefined;

const steps = (): Step[] => buildSteps({ px: S.px, pc: S.pc, mode: S.mode, from: S.from, to: S.to, flavor: S.flavor, prog: S.prog, allKeys: S.pall, modeDetail: () => curMode(), rng: Math.random });
const playSig = (): string => JSON.stringify([S.px, S.pc, S.mode, S.from, S.to, S.flavor, S.prog, S.mfam, S.mdeg, S.mroot, S.mview, S.pstrict, S.pall]);
export function resetPL(): void {
  clearTimeout(chkT);
  sig = playSig(); t0 = 0; elapsed = 0;
  ses = new PlaySession(steps(), S.pstrict, held, S.px === 'random' ? steps : undefined);
}

export function noteOn(n: number, src: 'screen' | 'midi'): void {
  if (held.has(n)) return;
  const out = getOut();
  if (src === 'screen' && out) { screenOn.add(n); sendOn(out, n, 85); }
  else if (!out && (src === 'screen' || S.psound)) { const c = audio(); tone(n, c.currentTime + 0.01, 1.6, 0.15); }
  if (S.tab !== 'play' || !ses) { held.add(n); return; }
  if (!ses.done && !t0) t0 = performance.now();
  const r = ses.noteOn(n);
  if (!r.counted) { drawPlay(); return; }
  if (r.mark === 'bad') flash('bad');
  if (r.finished) finish();
  if (r.needsChordCheck) { clearTimeout(chkT); chkT = setTimeout(checkChord, 90); }
  drawPlay();
}
export function noteOff(n: number): void {
  if (screenOn.has(n)) { screenOn.delete(n); const o = getOut(); if (o) sendOff(o, n); }
  if (ses) ses.noteOff(n); else held.delete(n);
  if (S.tab === 'play') drawKeys();
}
function checkChord(): void {
  if (!ses) return;
  const r = ses.checkChord();
  if (r === 'none') return;
  flash('good');
  if (r === 'finished') finish();
  drawPlay();
}
function finish(): void { elapsed = (performance.now() - t0) / 1000; flash('good'); }
function flash(k: 'good' | 'bad'): void {
  const e = document.getElementById('ptarget');
  if (!e) return;
  e.classList.remove('fl-good', 'fl-bad'); void e.offsetWidth; e.classList.add('fl-' + k);
  clearTimeout(flashT); flashT = setTimeout(() => e.classList.remove('fl-good', 'fl-bad'), 380);
}

function midiHTML(): string {
  const none: [string, string, string] = ['warn', 'MIDI is on, but no keyboard is connected. Plug one in and it shows up here.', ''];
  const M = ({
    idle: ['', 'Connect a MIDI keyboard and the app checks what you play. The on-screen keys below work too.', 'Connect MIDI keyboard'],
    asking: ['warn', 'Waiting for permission. Allow MIDI devices if your browser asks.', ''],
    unsupported: ['warn', 'This browser can\'t read MIDI keyboards. Use Chrome or Edge on your Mac. The on-screen keys below still work.', ''],
    blocked: ['warn', 'MIDI is blocked here. Open your own copy of the app in Chrome and allow MIDI when it asks.', 'Try again'],
    on: midi.names.length ? ['ok', 'Listening to ' + midi.names.map(n => '<b>' + n.replace(/</g, '&lt;') + '</b>').join(', '), ''] : none,
  } as Record<string, [string, string, string]>)[midi.state];
  return `<span class="dot ${M[0]}"></span><span class="mtext">${M[1]}</span>${M[2] ? `<button class="pill sm go" data-a="midi">${M[2]}</button>` : ''}${midi.acc ? `<span class="sndslot">${soundBox()}</span>` : ''}`;
}
const pstats = (): string => `<div class="pstats"><span>Wrong notes <b>${ses!.wrong}</b></span>${S.px === 'random' ? `<span>Rounds done <b>${ses!.rounds}</b></span>` : ''}<button class="pill sm" data-a="pagain">Restart</button></div>`;
function targetHTML(): string {
  const P = ses!;
  if (P.done) {
    const st0 = P.steps[0], what = st0.kind === 'scale' ? st0.seq.length + ' notes' : P.steps.length + ' chords';
    return `<div class="pdone"><div class="eyebrow">Finished</div><div class="pbig" style="color:#59d18f">${P.wrong === 0 ? 'Clean run' : 'Done'}</div>
      <p class="phow">${what} in <b>${elapsed.toFixed(1)} seconds</b> with <b>${P.wrong}</b> wrong note${P.wrong === 1 ? '' : 's'}.</p>
      <div class="controls" style="margin-top:14px"><button class="pill go" data-a="pagain">Go again</button></div></div>`;
  }
  const st = P.steps[P.i];
  if (st.kind === 'scale') {
    const m = st.mode;
    return `<div class="pchips">${st.names.map((n, i) => `<span class="pc ${i < P.si ? 'done' : i === P.si ? 'cur' : ''}">${fmt(n)}</span>`).join('')}</div>
      <div class="eyebrow" style="margin-top:14px">Mode scale · up one octave and back down</div><div class="pbig">${fmt(m.notes[0])} ${m.name}</div>
      <p class="phow">Next note: <b>${fmt(st.names[P.si])}</b>. Any octave counts.</p>${pstats()}`;
  }
  const c = st.chord;
  const how = S.pstrict ? `Play the <b>${st.voicing.name}</b> voicing, bottom to top: <b>${st.voicing.notes.map(x => fmt(x.note)).join(' · ')}</b>. Any octave counts.`
    : `Any voicing with the 3rd (<b>${fmt(c.tones[1])}</b>) and the 7th (<b>${fmt(c.tones[3])}</b>). Every other note has to fit ${fmt(c.mode.notes[0])} ${c.mode.name}.`;
  return `<div class="pchips">${P.steps.map((x, i) => `<span class="pc ${i < P.i ? 'done' : i === P.i ? 'cur' : ''}">${x.kind === 'chord' ? x.chord.symbol : ''}</span>`).join('<span class="arr">→</span>')}</div>
    <div class="eyebrow" style="margin-top:14px">${st.label}${S.px === 'random' ? ' · round ' + (P.rounds + 1) : ''}</div>
    <div class="pbig" data-chord="${cref(c)}">${c.symbol}</div><p class="phow">${how}</p>${pstats()}`;
}
function pianoSVG(): string {
  const P = ses!, lo = innerWidth < 900 ? 48 : 36, hi = 84, W = 30, H = 150, BW = 18, BH = 94, wh = [0, 2, 4, 5, 7, 9, 11];
  const st = P.done ? null : P.steps[P.i], ghost: Record<number, string> = {};
  if (S.phint && st) {
    if (st.kind === 'scale') { const nx = st.seq[P.si]; if (nx != null) ghost[60 + mod(nx - 60, 12)] = fmt(st.names[P.si]); }
    else if (S.pstrict) st.voicing.notes.forEach(i => { let m = i.midi; while (m < lo) m += 12; ghost[m] = fmt(i.note); });
    else {
      const r = pcOf(st.chord.tones[0]), m = 55 + mod(r - 55, 12);
      let prev = -1;
      st.chord.tones.forEach(n => { let x = pcOf(n) + 48; while (x <= prev || x < m) x += 12; prev = x; ghost[x] = fmt(n); });
    }
  }
  const col = { ok: '#59d18f', bad: 'var(--c5)', on: 'var(--c0)' }, NN = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'], name = (m: number) => NN[mod(m, 12)];
  const pos: Record<number, number> = {};
  let x = 0;
  for (let m = lo; m <= hi; m++) if (wh.includes(mod(m, 12))) { pos[m] = x; x += W; }
  let w = '', b = '';
  for (let m = lo; m <= hi; m++) {
    const isW = wh.includes(mod(m, 12)), h = held.has(m) ? (P.marks[m] || 'on') : '', g = ghost[m];
    if (isW) {
      const X = pos[m];
      w += `<rect data-n="${m}" x="${X + .5}" y=".5" width="${W - 1}" height="${H}" rx="4" class="pk-w"${h ? ` style="fill:${col[h]}"` : ''}/>`;
      if (g && !h) w += `<circle cx="${X + W / 2}" cy="${H - 30}" r="8" fill="var(--gold)"/>`;
      if (g || h) w += `<text x="${X + W / 2}" y="${H - 10}" class="pkl">${g || name(m)}</text>`;
      else if (m === 60) w += `<text x="${X + W / 2}" y="${H - 10}" class="pkl c4">C4</text>`;
    } else {
      const X = pos[m - 1] + W - BW / 2;
      b += `<rect data-n="${m}" x="${X}" y=".5" width="${BW}" height="${BH}" rx="3" class="pk-b"${h ? ` style="fill:${col[h]}"` : ''}/>`;
      if (g && !h) b += `<circle cx="${X + BW / 2}" cy="${BH - 20}" r="6.5" fill="var(--gold)"/>`;
      if (g || h) b += `<text x="${X + BW / 2}" y="${BH - 6}" class="pkl kb" style="fill:${h ? '#0d1015' : 'var(--gold)'}">${g || name(m)}</text>`;
    }
  }
  return `<svg viewBox="0 0 ${x + 1} ${H + 1}" role="img" aria-label="Piano keyboard">${w}${b}</svg>`;
}
export function drawMidi(): void { const M = document.getElementById('midibar'); if (M) M.innerHTML = midiHTML(); }
function drawKeys(): void { const K = document.getElementById('pkwrap'); if (K && ses) K.innerHTML = pianoSVG(); }
export function drawPlay(): void {
  if (S.tab !== 'play' || !ses) return;
  const T = document.getElementById('ptarget');
  if (T) T.innerHTML = targetHTML();
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
  const src = S.px === 'move' ? 'Uses the move set on the Move tab.' : S.px === 'prog' ? 'Uses the chords on the Progression tab.' : S.px === 'mode' ? 'Uses the mode picked on the Modes tab. Change the root with the key button.' : 'Random 2‑5s into the chords of the home key.';
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Play it · ${S.px === 'mode' ? 'Modes' : curTitle()}</div><h2>Play it and get <em>checked</em></h2></div>
   <div class="panel pctl">
     <div class="pcrow"><span class="lbl">Practice</span><div class="seg" role="group" aria-label="What to practice">${([['move', 'The move'], ['prog', 'Progression'], ['random', 'Random 2‑5s'], ['mode', 'Mode scale']] as const).map(([k, l]) => `<button data-a="px" data-v="${k}" aria-pressed="${S.px === k}">${l}</button>`).join('')}</div></div>
     ${S.px !== 'mode' ? `<div class="pcrow"><span class="lbl">Check</span><div class="seg" role="group" aria-label="How strict">${([[0, 'Any voicing'], [1, 'Exact voicing']] as const).map(([k, l]) => `<button data-a="pstrict" data-v="${k}" aria-pressed="${S.pstrict === !!k}">${l}</button>`).join('')}</div></div>` : ''}
     <div class="pcrow sws">${sw('phint', S.phint, 'Show the notes')}${S.px === 'random' ? sw('pall', S.pall, 'All 12 keys') : ''}${S.soundOut ? '' : sw('psound', S.psound, 'Sound for MIDI notes')}</div>
   </div>
   <div class="midibar" id="midibar"></div>
   <div class="panel ptarget" id="ptarget"></div>
   <div class="pkwrap" id="pkwrap"></div>
   <p class="hint">${src} Green notes fit, red notes don't.${S.phint ? ' Gold dots show what to play.' : ''} Leave "Sound for MIDI notes" off when Logic is playing your keyboard.</p>
  </div>`;
}
