import { playNotes, stopAll } from '../../audio/player';
import { S, curChords, curKey, curTitle, type KeptVoicing } from '../../state';
import { impliedNext, leadVoicings, melodyCheck, parsePitch, pitchName, rankLead, voiceMotion, type LeadVoicing, type MelodyCheck, type RankedVoicing } from '../../theory/lead';
import { fmt, note, noteName } from '../../theory/notes';
import type { KindId, PChord } from '../../theory/symbols';
import { kbAbs, type KeyItem } from '../keyboards';
import { esc, extChoices, pickChord, withExt } from '../passing';
import { tilesHTML } from '../pieces';
import { drawKeys, drawMidi, leadHook } from '../play';

/*
 * Melody on top: pick a chord and a melody note (tap a key, type it, or play it). The app checks the
 * note against the chord and lists every voicing with that note on top. Keep one and the next list is
 * ordered by the smoothest voice leading from it. Kept voicings can be practised in Play it.
 */
const HAND = { L: 'var(--c2)', R: 'var(--c0)' };
interface Model { chord: PChord; bad: boolean; choices: PChord[]; check: MelodyCheck; ranked: RankedVoicing[]; prev: KeptVoicing | null }
function model(): Model {
  /* a dominant is read as the V of the key chord a fifth below it, so its extensions come from that scale */
  const base = pickChord(S.lsym, S.ld), key = curKey(), nx = impliedNext(base.chord, null, key);
  const choices = extChoices(base.chord, nx), chord = withExt(base.chord, S.lext, nx);
  const prev = S.lkept[S.lkept.length - 1] ?? null;
  return {
    chord, bad: base.bad, choices, prev, check: melodyCheck(chord, S.lmel, null, key),
    ranked: rankLead(leadVoicings(chord, S.lmel, null, key), prev ? prev.notes.map(n => n.m) : null),
  };
}
const melName = (m: Model): string => pitchName(S.lmel, m.check.note);

/* a key played on the piano or a MIDI keyboard: the highest held note is the melody */
leadHook.changed = (held: Set<number>): void => {
  if (held.size) S.lmel = Math.max(...held);
  drawLead();
};
leadHook.ghost = (): Record<number, string> => ({ [S.lmel]: fmt(model().check.note) });

const signed = (n: number): string => (n === 0 ? 'stays' : (n > 0 ? '↑' : '↓') + Math.abs(n));
function keys(v: LeadVoicing): string {
  const items: KeyItem[] = v.notes.map((n, i) => ({ m: n.midi, n: n.note, lab: n.label, col: i === v.notes.length - 1 ? 'var(--gold)' : HAND[n.hand] }));
  return kbAbs(items, 24, true);
}
function voicingCard(r: RankedVoicing, i: number, m: Model): string {
  const v = r.voicing, lh = v.notes.filter(n => n.hand === 'L'), rh = v.notes.filter(n => n.hand === 'R');
  const names = (ns: LeadVoicing['notes']) => ns.map(n => pitchName(n.midi, n.note)).join(' ');
  const hands = lh.length ? `<span class="lvh"><i style="background:${HAND.L}"></i>Left: ${names(lh)}</span><span class="lvh"><i style="background:${HAND.R}"></i>Right: ${names(rh)}</span>` : `<span class="lvh"><i style="background:${HAND.R}"></i>${names(rh)}</span>`;
  const mo = r.motion;
  const motion = mo && m.prev ? `<div class="lvmove"><span class="lbl">From ${m.prev.sym} (${m.prev.name})</span><span class="small">${mo.total} semitone${mo.total === 1 ? '' : 's'} of movement in all, ${mo.common} note${mo.common === 1 ? '' : 's'} stay${mo.common === 1 ? 's' : ''}.</span>
      <div class="lvsteps">${[...mo.moves].reverse().map((x, k) => `<span class="${x.semis === 0 ? 'stay' : ''}">${pitchName(x.to, v.notes[v.notes.length - 1 - k].note)} <small>${signed(x.semis)}</small></span>`).join('')}</div></div>` : '';
  return `<article class="card lvcard${i === 0 && mo ? ' best' : ''}"><div class="ch"><span class="cs">${v.name}</span><span class="cn">${i === 0 && mo ? 'smoothest · ' : ''}${v.formula}</span></div>
    ${v.sounds ? `<div class="small">Sounds as <b>${v.sounds}</b>.</div>` : ''}
    ${keys(v)}
    <div class="lvhands">${hands}</div>
    <p class="small" style="margin:0">${v.why}</p>${motion}
    <div class="btns"><button class="hear" data-a="lhear" data-i="${i}">▶ Hear</button><button class="pill sm go" data-a="lkeep" data-i="${i}">Keep this one</button></div></article>`;
}
function checkHTML(m: Model): string {
  const c = m.check, cls = c.role === 'chord' || c.role === 'tension' ? 'ok' : 'warn';
  const tag = { chord: 'Chord tone', tension: 'Available tension', avoid: 'Avoid note', outside: 'Outside the scale' }[c.role];
  const fixes = c.fixes.length ? `<div class="lfixes"><span class="lbl">Ways to fix it</span>${c.fixes.map((f, i) => `<button class="lfix" data-a="lfix" data-i="${i}">${f.text}</button>`).join('')}<p class="small" style="margin:6px 0 0">The voicings below still put ${fmt(c.note)} on top, so you can hear the clash.</p></div>` : '';
  return `<div class="lcheck ${cls}"><span class="ltag">${tag}</span><span>${c.text}</span></div>${fixes}`;
}
function keptHTML(): string {
  if (!S.lkept.length) return '<div class="panel"><h3>Voice-leading line</h3><p class="small" style="margin:0">Keep a voicing and it starts a line here. The next chord\'s voicings are then listed smoothest first.</p></div>';
  const cols = S.lkept.map((k, i) => {
    const prev = i > 0 ? S.lkept[i - 1] : null, mo = prev ? voiceMotion(prev.notes.map(n => n.m), k.notes.map(n => n.m)) : null;
    const rows = [...k.notes].reverse().map((n, j) => {
      const mv = mo ? mo.moves[k.notes.length - 1 - j].semis : null;
      return `<span class="lvn${mv === 0 ? ' stay' : ''}" style="--hc:${j === 0 ? 'var(--gold)' : HAND[n.h]}"><b>${pitchName(n.m, note(n.n))}</b><small>${n.lab}${mv === null ? '' : ' · ' + signed(mv)}</small></span>`;
    }).join('');
    return `${i > 0 ? `<div class="lvarr">→<small>${mo!.total}</small></div>` : ''}<button class="lvcol" data-a="lkhear" data-i="${i}" aria-label="Hear ${k.sym}, ${k.name}"><span class="cs2">${k.sym}</span><span class="small">${k.name}</span>${rows}</button>`;
  }).join('');
  return `<div class="panel"><h3>Voice-leading line</h3><p class="small" style="margin:0 0 10px">Each column is a kept voicing, top note first. Under every note: how far it moved from the voicing before (in semitones). The number on each arrow is the total movement. Tap a column to hear it.</p>
    <div class="lvline scrollx">${cols}</div>
    <div class="controls" style="margin-top:12px"><button class="pill sm go" data-a="lplay">Practice these in Play it</button><button class="pill sm" data-a="lkall">▶ Hear the line</button><button class="pill sm" data-a="lundo">Remove last</button><button class="pill sm" data-a="lkclear">Clear</button></div></div>`;
}
function dynHTML(): string {
  const m = model(), n = m.ranked.length;
  return `<div class="panel"><div class="lmel"><span class="lbl">Melody note</span><span class="lmeln">${melName(m)}</span>
      <div class="seg" role="group" aria-label="Move the melody by an octave"><button data-a="loct" data-v="-12" ${S.lmel - 12 < 40 ? 'disabled' : ''}>Octave down</button><button data-a="loct" data-v="12" ${S.lmel + 12 > 96 ? 'disabled' : ''}>Octave up</button></div>
      <input class="psym lmelin" data-f="mel" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="or type it: E5, Bb4" aria-label="Type the melody note"></div>
    ${checkHTML(m)}</div>
   <div class="waysh"><h3 style="margin:0">${m.chord.symbol} with ${melName(m)} on top</h3><span class="small">${n} voicing${n === 1 ? '' : 's'}${m.prev ? `, smoothest from ${m.prev.sym} first` : ', by type'}. Gold = melody${n ? ', blue = left hand' : ''}.</span></div>
   ${n ? `<div class="cards extcards">${m.ranked.map((r, i) => voicingCard(r, i, m)).join('')}</div>` : `<div class="empty">No voicing puts ${melName(m)} on top of ${m.chord.symbol}: the note has a different 3rd or 7th than the chord. Try a fix above, another note or another chord.</div>`}
   ${keptHTML()}`;
}

/** Redraw what changes with the melody, without rebuilding the piano (a key may be held down). */
export function drawLead(): void {
  if (S.tab !== 'lead') return;
  const e = document.getElementById('ldyn');
  if (e) e.innerHTML = dynHTML();
  drawMidi(); drawKeys();
}
const play = (ns: number[]): void => playNotes([...ns].sort((a, b) => a - b));
/** Clicks on the Melody tab. Returns 'draw' for a light redraw, 'render' for a full one, null when not handled. */
export function leadAction(a: string, d: DOMStringMap): 'draw' | 'render' | 'none' | null {
  const m = () => model();
  switch (a) {
    case 'lchord': S.ld = +d.d!; S.lsym = null; S.lext = null; return 'render';
    case 'lext': S.lext = (d.k || null) as KindId | null; return 'render';
    case 'lsymx': S.lsym = null; S.lext = null; return 'render';
    case 'loct': { const x = S.lmel + +d.v!; if (x >= 40 && x <= 96) S.lmel = x; return 'draw'; }
    case 'lhear': { const v = m().ranked[+d.i!]?.voicing; if (v) play(v.notes.map(n => n.midi)); return 'none'; }
    case 'lkeep': {
      const mm = m(), v = mm.ranked[+d.i!]?.voicing;
      if (!v) return 'none';
      S.lkept.push({ sym: v.sounds && v.type === 'upper' ? v.sounds : mm.chord.symbol, name: v.name, notes: v.notes.map(n => ({ m: n.midi, n: noteName(n.note), lab: n.label, h: n.hand })) });
      play(v.notes.map(n => n.midi));
      return 'draw';
    }
    case 'lkhear': { const k = S.lkept[+d.i!]; if (k) play(k.notes.map(n => n.m)); return 'none'; }
    case 'lkall': {
      stopAll();
      S.lkept.forEach((k, i) => setTimeout(() => { if (S.tab === 'lead') play(k.notes.map(n => n.m)); }, i * 1500));
      return 'none';
    }
    case 'lundo': S.lkept.pop(); return 'draw';
    case 'lkclear': S.lkept = []; return 'draw';
    case 'lfix': {
      const f = m().check.fixes[+d.i!];
      if (!f) return 'none';
      if (f.midi != null) { S.lmel = f.midi; return 'draw'; }
      if (f.chord) {
        const deg = curChords().findIndex(h => h.symbol === f.chord!.symbol);
        if (deg >= 0) { S.ld = deg; S.lsym = null; } else S.lsym = f.chord.symbol;
        S.lext = null;
      }
      return 'render';
    }
    case 'lplay': S.px = 'lead'; S.tab = 'play'; window.scrollTo(0, 0); return 'render';
  }
  return null;
}
/** Typed input on the Melody tab: the chord box or the melody box. */
export function leadTyped(field: string, value: string | null): void {
  if (field === 'lead') { S.lsym = value; S.lext = null; return; }
  const p = value ? parsePitch(value) : null;
  if (p != null && p >= 40 && p <= 96) S.lmel = p;
}

export function viewLead(): string {
  const m = model(), H = curChords();
  const extRow = m.choices.length < 2 ? '' : `<div class="extpick"><span class="lbl">Extensions</span><div class="seg wrap" role="group" aria-label="Extensions on the chord">${m.choices.map(c => `<button data-a="lext" data-k="${esc(c.kind)}" aria-pressed="${c.kind === m.chord.kind}">${c.symbol}</button>`).join('')}</div></div>`;
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Melody on top · ${curTitle()}</div><h2>Voice <em>${m.chord.symbol}</em> under a melody note</h2></div>
   <div class="panel pick">
     <span class="lab">Chord</span><div>${tilesHTML(H, S.lsym && !m.bad ? -1 : S.ld, 'lchord', 'r1')}
       <div class="psymrow"><input class="psym${m.bad ? ' bad' : ''}" data-f="lead" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="or type any chord: Ebmaj7, F#m7b5, G13" value="${esc(S.lsym || '')}" aria-label="Type the chord">${S.lsym ? '<button class="pill sm" data-a="lsymx">Clear</button>' : ''}${m.bad ? '<span class="small" style="color:var(--c5)">Can\'t read that chord. Using the picked one.</span>' : ''}</div>${extRow}</div>
   </div>
   <div class="midibar" id="midibar"></div>
   <div class="pkwrap" id="pkwrap"></div>
   <p class="hint" style="margin-top:-6px">Tap a key, or play a note on your MIDI keyboard, to set the melody note (the highest note you hold). The gold dot marks it.</p>
   <div class="stack" id="ldyn">${dynHTML()}</div>
  </div>`;
}
