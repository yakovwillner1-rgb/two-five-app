import { playSeq, type PlayEvent } from '../../audio/player';
import { FEEL_LABELS, GENRES, GENRE_IDS } from '../../data/styles';
import { FEELS } from '../../data/techniques';
import { S, curChords, curKey, curTitle } from '../../state';
import { fmt, pcOf } from '../../theory/notes';
import { passingChords } from '../../theory/passing/engine';
import { rankSuggestions, type Ranked } from '../../theory/passing/rank';
import type { Suggestion } from '../../theory/passing/types';
import { fromChart, parseChord, passVoicing, romanNumeral, type PChord } from '../../theory/symbols';
import type { Note } from '../../theory/types';
import { kbAbs, type KeyItem } from '../keyboards';
import { tilesHTML } from '../pieces';

/* Passing tab: every technique that connects FROM to TO, ranked by the chosen style. */
let cards: Suggestion[] = [], fromC: PChord, toC: PChord;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
/** FROM / TO: the typed symbol when it can be read, else the picked chord of the key. */
function pick(sym: string | null, deg: number): { chord: PChord; bad: boolean } {
  const typed = sym ? parseChord(sym) : null;
  return { chord: typed ?? fromChart(curChords()[deg]), bad: !!sym && !typed };
}
const ROLE = { root: 'var(--gold)', guide: 'var(--c2)', color: 'var(--c0)' };
const keys = (c: PChord): string => {
  const items: KeyItem[] = passVoicing(c).map(v => ({ m: v.midi, n: v.note, lab: v.label, col: ROLE[v.role] }));
  return kbAbs(items, 24, true);
};
/** Notes to play: bass first (the slash bass when there is one), each pitch class once. */
function playTones(c: PChord): Note[] {
  const out: Note[] = [], seen = new Set<number>();
  [...(c.bass ? [c.bass] : []), ...c.tones].forEach(n => { if (!seen.has(pcOf(n))) { seen.add(pcOf(n)); out.push(n); } });
  return out;
}
export function playCard(i: number): void {
  const s = cards[i];
  if (!s) return;
  const b = 60 / S.tempo, ev: PlayEvent[] = [];
  let t = 0;
  const add = (c: PChord, beats: number, id: string) => { ev.push({ t, dur: beats * b, tones: playTones(c), id }); t += beats * b; };
  if (!s.replacesFrom) add(fromC, 2, `x${i}f`);
  s.chords.forEach((c, j) => add(c, 2, `x${i}c${j}`));
  add(toC, 4, `x${i}t`);
  playSeq(ev, 'x');
}
export function playCardChord(i: number, j: number): void {
  const s = cards[i];
  if (!s) return;
  const c = j === -1 ? fromC : j === -2 ? toC : s.chords[j], id = j === -1 ? `x${i}f` : j === -2 ? `x${i}t` : `x${i}c${j}`;
  playSeq([{ t: 0, dur: 2.4, tones: playTones(c), id }], 'x');
}

function cardHTML(r: Ranked, i: number, dim: boolean): string {
  const s = r.suggestion, key = curKey();
  const chip = (c: PChord, rn: string, cls: string, j: number) => `<button class="pchip ${cls}" data-a="pcchord" data-i="${i}" data-j="${j}" data-ev="${j === -1 ? `x${i}f` : j === -2 ? `x${i}t` : `x${i}c${j}`}" aria-label="Play ${c.symbol}"><span>${c.symbol}</span><small>${rn}</small></button>`;
  const seq = [
    ...(s.replacesFrom ? [] : [chip(fromC, romanNumeral(fromC, key), 'r0', -1)]),
    ...s.chords.map((c, j) => chip(c, s.romanNumerals[j], j === s.chords.length - 1 ? 'r5' : 'r2', j)),
    chip(toC, romanNumeral(toC, key), 'r1', -2),
  ].join('<span class="arr">→</span>');
  const bars = Math.max(1, Math.round(s.tension * 5));
  return `<article class="pcard${dim ? ' off' : ''}">
    <div class="pch"><div class="pname">${s.name}${s.variantLabel ? ` <span class="pvar">${s.variantLabel}</span>` : ''}</div>
      <div class="ptags">${s.colorTags.map(t => `<span class="ptag${t === S.pfeel ? ' on' : ''}">${t}</span>`).join('')}
        <span class="ptens" title="Tension ${Math.round(s.tension * 100)}%"><span class="lbl" style="margin:0">Tension</span><span class="bright" style="margin:0">${[0, 1, 2, 3, 4].map(k => `<i class="${k < bars ? 'on' : ''}"></i>`).join('')}</span></span></div></div>
    <div class="pseq">${seq}</div>
    <div class="pkbs">${s.chords.map(c => `<div class="pkb"><div class="formula">${c.symbol}${c.upper ? ' · ' + fmt(c.upper.root) + ' triad on top' : ''}</div>${keys(c)}</div>`).join('')}</div>
    <ul class="pwhy">${s.explanation.map(b => `<li>${b}</li>`).join('')}</ul>
    <div class="btns"><button class="hear r1" data-a="pplay" data-i="${i}">▶ Play ${s.replacesFrom ? '' : fromC.symbol + ' → '}… → ${toC.symbol}</button></div>
  </article>`;
}

export function viewPass(): string {
  const H = curChords(), key = curKey();
  const f = pick(S.pfromSym, S.pfrom), t = pick(S.ptoSym, S.pto);
  fromC = f.chord; toC = t.chord;
  const style = { genre: S.pgenre, feel: S.pfeel }, ranked = rankSuggestions(passingChords(fromC, toC, key), style);
  const list = S.pshowAll ? [...ranked.shown, ...ranked.hidden] : ranked.shown;
  cards = list.map(r => r.suggestion);
  const input = (which: 'from' | 'to', val: string | null, bad: boolean) => `<div class="psymrow"><input class="psym${bad ? ' bad' : ''}" data-f="${which}" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="or type any chord: Ebmaj7, F#m7b5, C/G" value="${esc(val || '')}" aria-label="Type the ${which === 'from' ? 'FROM' : 'TO'} chord">${val ? `<button class="pill sm" data-a="psymx" data-f="${which}">Clear</button>` : ''}${bad ? '<span class="small" style="color:var(--c5)">Can\'t read that chord. Using the picked one.</span>' : ''}</div>`;
  const g = GENRES[S.pgenre];
  const hiddenNote = ranked.hidden.length
    ? `<p class="hint">${S.pshowAll ? 'Showing' : 'Hiding'} ${ranked.hidden.length} idea${ranked.hidden.length === 1 ? '' : 's'} that ${g.label} rarely uses or that ${ranked.hidden.length === 1 ? 'is' : 'are'} above its tension limit. <button class="linkbtn" data-a="pshow">${S.pshowAll ? 'Hide them' : 'Show them'}</button></p>` : '';
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Passing chords · ${curTitle()}</div><h2>From <em>${fromC.symbol}</em> to <em>${toC.symbol}</em></h2></div>
   <div class="panel pick">
     <span class="lab">From</span><div>${tilesHTML(H, S.pfromSym && !f.bad ? -1 : S.pfrom, 'pfrom', 'r0', true)}${input('from', S.pfromSym, f.bad)}</div>
     <span class="lab">To</span><div>${tilesHTML(H, S.ptoSym && !t.bad ? -1 : S.pto, 'pto', 'r1', true)}${input('to', S.ptoSym, t.bad)}</div>
   </div>
   <div class="panel pstyle">
     <div class="pcrow"><span class="lbl">Genre</span><div class="seg wrap" role="group" aria-label="Genre">${GENRE_IDS.map(k => `<button data-a="pgenre" data-v="${k}" aria-pressed="${S.pgenre === k}">${GENRES[k].label}</button>`).join('')}</div></div>
     <div class="pcrow"><span class="lbl">Feel</span><div class="seg wrap" role="group" aria-label="Feel">${FEELS.map(k => `<button data-a="pfeel" data-v="${k}" aria-pressed="${S.pfeel === k}">${FEEL_LABELS[k]}</button>`).join('')}</div></div>
   </div>
   <p class="small" style="text-align:center;margin:0">${ranked.shown.length} way${ranked.shown.length === 1 ? '' : 's'} to get there, most typical for ${g.label} · ${FEEL_LABELS[S.pfeel].toLowerCase()} first. Tap a chord to hear it.</p>
   <div class="pcards">${list.map((r, i) => cardHTML(r, i, i >= ranked.shown.length)).join('') || '<div class="empty">No passing chords for this pair in this style. Try another genre or target.</div>'}</div>
   ${hiddenNote}
  </div>`;
}
