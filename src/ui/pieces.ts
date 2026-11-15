import { midi } from '../midi/input';
import { S } from '../state';
import { FAM, FAMILIES, famOf } from '../theory/modes';
import { fmt, pcOf } from '../theory/notes';
import { allVoicings, buildVoicing, defaultVoicingIndex, VDEF } from '../theory/voicings';
import type { Chord, Family, HomeChord, Note, Voicing } from '../theory/types';
import { kb, kbAbs, voicingItems } from './keyboards';

/* Shared HTML pieces + the registry that links rendered chords back to their data. */
let REG: Record<string, Chord> = {}, rc = 0;
/** Register a chord for this render; returns the key to put in data-chord / data-k. */
export const cref = (o: Chord): string => { const k = 'k' + rc++; REG[k] = o; return k; };
export const chordByKey = (k: string | undefined): Chord | undefined => (k ? REG[k] : undefined);
export function resetReg(): void { REG = {}; rc = 0; }
/** Voicings currently shown in the popover (data-v indexes into this). */
export let VOICES: Voicing[] = [];
/** Chords behind the "Hear" buttons of the current view. */
export const cache: { chords: Record<string, { tones: Note[] }>; qz: Chord[] } = { chords: {}, qz: [] };

export function voicingPanel(c: Chord): string {
  VOICES = allVoicings(c);
  const cell = (v: Voicing, i: number) => `<button class="vc" data-a="voice" data-v="${i}"><span class="vn">${v.name} <small>· ${v.sub}</small></span>${kbAbs(voicingItems(v), 24)}<span class="vt">${v.notes.map(x => fmt(x.note)).join(' ')}</span></button>`;
  const grp = (g: string) => VOICES.map((v, i) => (v.group === g ? cell(v, i) : '')).join('');
  return `<div class="vh"><span class="vs">${c.symbol}</span><span class="small">Tap a voicing to hear it</span><button class="vx" data-a="vclose" aria-label="Close voicings">×</button></div>
   <div class="vleg"><span><i class="lg" style="background:var(--gold)"></i>Root</span><span><i class="lg" style="background:var(--c2)"></i>3rd and 7th (the sound of the chord)</span><span><i class="lg" style="background:var(--c0)"></i>5th, 9th, 11th</span></div>
   <div class="vgh">Basic</div><div class="vg">${grp('Basic')}</div><div class="vgh">Jazz piano</div><div class="vg">${grp('Jazz')}</div>`;
}
export function compactPanel(c: Chord, key: string): string {
  const pick = defaultVoicingIndex(c), v = buildVoicing(c, VDEF[pick]);
  VOICES = [v];
  const why = pick === 7 ? 'Jazz pianists play dominants this way. It moves smoothly from a Rootless A on the ii.' : pick === 6 ? 'The standard jazz piano voicing. A bass player or your left hand covers the root.' : 'Stacked minor 3rds, the plain shape for this chord.';
  return `<div class="vh"><span class="vs">${c.symbol}</span><span class="small">${v.name} · ${v.sub}</span></div>
   <button class="vc one" data-a="voice" data-v="0" aria-label="Play ${v.name}">${kbAbs(voicingItems(v), 12)}<span class="vt">${v.notes.map(x => fmt(x.note) + ' (' + x.label + ')').join('  ')}</span></button>
   <p class="small" style="margin:8px 0 10px">${why}</p>
   <div class="vfoot"><button class="pill sm" data-a="voice" data-v="0">▶ Hear it</button><button class="pill sm go" data-a="vall" data-k="${key}">All voicings →</button></div>`;
}

export const noteCells = (arr: Note[], ct: Note[]): string => arr.map(n => `<span class="n${ct.some(c => pcOf(c) === pcOf(n)) ? ' ct' : ''}">${fmt(n)}</span>`).join('');

export function card(info: Chord, cls: string, top: string, id: string): string {
  const L = ['R', '3', '5', '7'], k = cref(info), fm = famOf(info);
  return `<article class="card ${cls}"><div class="ch"><span class="cs" data-chord="${k}">${info.symbol}</span><span class="cn">${top}</span></div>
    <div><div class="lbl">Chord tones</div><div class="notes">${info.tones.map((n, i) => `<span class="nw"><span class="n ct">${fmt(n)}</span><small>${L[i]}</small></span>`).join('')}</div></div>
    ${kb(info.tones)}
    <div><div class="lbl">Scale to play</div><button class="mode mlink" data-a="learn" data-fam="${fm[0]}" data-deg="${fm[1]}" data-pc="${pcOf(info.mode.notes[0])}">${fmt(info.mode.notes[0])} ${info.mode.name} ›</button>
      <div class="notes" style="margin:6px 0 4px">${noteCells(info.mode.notes, info.tones)}</div><div class="formula">${info.mode.formula.join(' ')}</div></div>
    <div class="btns"><button class="hear" data-a="one" data-id="${id}">▶ Hear ${info.symbol}</button><button class="hear" data-a="vopen" data-k="${k}">Voicings</button></div></article>`;
}
export function tilesHTML(H: HomeChord[], sel: number, act: string, cls: string, small?: boolean): string {
  return `<div class="tiles">${H.map(c => `<button class="tile ${cls}${small ? ' small' : ''}" data-a="${act}" data-d="${c.degree}" data-chord="${cref(c)}" aria-pressed="${sel === c.degree}" ${act === 'to' && !c.landable ? 'disabled title="Half-diminished chords are not used as landing spots"' : ''}><span class="tn">${c.rn}</span><span class="ts">${c.symbol}</span></button>`).join('')}</div>`;
}
export function tempoHTML(): string { return `<div class="tempo"><button data-a="tempo" data-v="-6" aria-label="Slower">−</button><output>${S.tempo} bpm</output><button data-a="tempo" data-v="6" aria-label="Faster">+</button></div>`; }
export const famSeg = (act: string, cur: Family): string => `<div class="seg" role="group" aria-label="Scale family">${FAMILIES.map(k => `<button data-a="${act}" data-v="${k}" aria-pressed="${cur === k}">${FAM[k].label}</button>`).join('')}</div>`;

/* Sound picker: built-in synth or a MIDI output port. */
function soundSelect(): string {
  const opts: [string, string][] = [['', 'Built-in sound'], ...midi.outs.map(n => [n, n] as [string, string])];
  if (S.soundOut && !midi.outs.includes(S.soundOut)) opts.push([S.soundOut, S.soundOut + ' (not connected)']);
  return `<select class="soundsel" aria-label="Where the sound comes from">${opts.map(([v, l]) => `<option value="${v.replace(/"/g, '&quot;')}" ${(S.soundOut || '') === v ? 'selected' : ''}>${l.replace(/</g, '&lt;')}</option>`).join('')}</select>`;
}
export function soundBox(): string {
  return `<div class="sndbox"><span class="eyebrow">Sound</span>${midi.acc ? soundSelect() : `<span>Built-in sound</span><button class="linkbtn" data-a="midi">Connect MIDI to play through Logic</button>`}</div>`;
}
export function refreshSound(): void { document.querySelectorAll('.sndslot').forEach(e => { e.innerHTML = soundBox(); }); }
