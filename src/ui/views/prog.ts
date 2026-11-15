import { beat, playSources, type PlayEvent } from '../../audio/player';
import { FEEL_LABELS, GENRES, GENRE_IDS } from '../../data/styles';
import { FEELS } from '../../data/techniques';
import { S, curChords, curKey, curTitle } from '../../state';
import { HOME } from '../../theory/home';
import type { Suggestion } from '../../theory/passing/types';
import { fmt } from '../../theory/notes';
import { romanNumeral, type PChord } from '../../theory/symbols';
import { chordTensions, plainOf } from '../../theory/tensions';
import { esc, extChoices, findWay, playTones, progBase, progChord, rankedWays, wayButton, wayKey } from '../passing';
import { cache, tilesHTML } from '../pieces';

/* Progression: a chain of chords. Between each chord and the next you choose which passing to use. */
export interface ProgStep { chord: PChord; via: Suggestion | null }
/** Ways from chord i−1 to chord i (line clichés are left out: they replace the chord before). */
export function stepWays(i: number): { shown: Suggestion[]; hidden: Suggestion[] } {
  if (i <= 0 || i >= S.prog.length) return { shown: [], hidden: [] };
  const r = rankedWays(progChord(S.prog[i - 1]), progChord(S.prog[i])), ok = (x: { suggestion: Suggestion }) => !x.suggestion.replacesFrom;
  return { shown: r.shown.filter(ok).map(x => x.suggestion), hidden: r.hidden.filter(ok).map(x => x.suggestion) };
}
export function progSteps(): ProgStep[] {
  return S.prog.map((p, i) => {
    const via = i > 0 ? findWay(progChord(S.prog[i - 1]), progChord(p), p.via) : null;
    return { chord: progChord(p), via: via && !via.replacesFrom ? via : null };
  });
}
/** Each passing chord 2 beats, each chord of the progression 4 beats. */
playSources.prog = (): PlayEvent[] => {
  const b = beat(), ev: PlayEvent[] = [];
  let t = 0;
  progSteps().forEach((st, i) => {
    (st.via?.chords ?? []).forEach((c, j) => { ev.push({ t, dur: 2 * b, tones: playTones(c), id: `p${i}v${j}` }); t += 2 * b; });
    ev.push({ t, dur: 4 * b, tones: playTones(st.chord), id: `p${i}c` }); t += 4 * b;
  });
  return ev;
};
/** Length in bars (4 beats each). */
export const progBars = (): number => progSteps().reduce((a, st) => a + 1 + (st.via ? st.via.chords.length / 2 : 0), 0);

/** The list shown when choosing the passing into chord i. */
export function viaPickerHTML(i: number): string {
  const steps = progSteps(), w = stepWays(i), cur = steps[i].via, from = steps[i - 1].chord, to = steps[i].chord;
  const btn = (s: Suggestion, dim: boolean) => wayButton(s, `data-a="viaset" data-i="${i}" data-k="${wayKey(s)}"`, !!cur && wayKey(cur) === wayKey(s), dim);
  return `<div class="vh"><span class="vs" style="font-size:1.5rem">${from.symbol} → ${to.symbol}</span><span class="small">Which passing? Ranked for ${GENRES[S.pgenre].label} · ${FEEL_LABELS[S.pfeel].toLowerCase()}</span><button class="vx" data-a="vclose" aria-label="Close">×</button></div>
    <div class="ways"><button class="way" data-a="viaset" data-i="${i}" data-k="" aria-pressed="${!cur}"><span class="wn">No passing chord</span><span class="wc">${from.symbol} → ${to.symbol}</span></button>
    ${w.shown.map(s => btn(s, false)).join('')}${w.hidden.map(s => btn(s, true)).join('')}</div>`;
}

/** The versions of chord i the extension picker offers (plain first). The scales depend on the chord after it. */
export function progExtChoices(i: number): PChord[] {
  const next = i < S.prog.length - 1 ? plainOf(progChord(S.prog[i + 1])) : null;
  return extChoices(progBase(S.prog[i]), next);
}
/** The list shown when choosing the extension on chord i. */
export function extPickerHTML(i: number): string {
  const cur = progChord(S.prog[i]), list = progExtChoices(i), next = i < S.prog.length - 1 ? progChord(S.prog[i + 1]) : null;
  const adds = (c: PChord): string => { const t = chordTensions(c); return t.length ? 'adds ' + t.map(x => `${fmt(x.note)} (${x.label})`).join(', ') : 'no extension'; };
  return `<div class="vh"><span class="vs" style="font-size:1.5rem">${list[0].symbol}</span><span class="small">Which extension? ${next ? `From the scales that fit on the way to ${next.symbol}.` : 'From the scales that fit this chord.'}</span><button class="vx" data-a="vclose" aria-label="Close">×</button></div>
    <div class="ways">${list.map((c, j) => `<button class="way" data-a="pextset" data-i="${i}" data-k="${j === 0 ? '' : esc(c.kind)}" aria-pressed="${c.kind === cur.kind}"><span class="wn">${c.symbol}</span><span class="wc">${adds(c)}</span></button>`).join('')}</div>
    <p class="small" style="margin:12px 0 0">The passing chords on both sides pick up extensions that connect to this one.</p>`;
}

export function viewProg(): string {
  const H = curChords(), M = HOME[S.mode], key = curKey(), steps = progSteps();
  cache.chords = {};
  let bars = '';
  steps.forEach((st, i) => {
    if (i > 0) {
      if (st.via) {
        bars += `<div class="bar ap" style="flex-grow:${st.via.chords.length}">${st.via.chords.map((c, j) => { const id = `p${i}v${j}`; cache.chords[id] = { tones: playTones(c) }; return `<button class="half ${j === st.via!.chords.length - 1 ? 'r5' : 'r2'}" data-a="one" data-id="${id}" data-ev="${id}" aria-label="Play ${c.symbol}"><span>${c.symbol}</span><small>${st.via!.romanNumerals[j]}</small></button>`; }).join('')}<button class="tog on" data-a="via" data-i="${i}" aria-label="Change the passing into ${st.chord.symbol}">${st.via.name}${st.via.variantLabel ? ' · ' + st.via.variantLabel : ''} ▾</button></div>`;
      } else {
        bars += `<div class="bar via"><button class="viaadd" data-a="via" data-i="${i}" aria-label="Choose a passing into ${st.chord.symbol}">+ passing</button></div>`;
      }
    }
    const id = `p${i}c`;
    cache.chords[id] = { tones: playTones(st.chord) };
    bars += `<div class="bar tg ${st.via ? 'r1' : 'r0'}" data-ev="${id}"><button class="tgb" data-a="one" data-id="${id}" aria-label="Play ${st.chord.symbol}"><span>${st.chord.symbol}</span><small>${romanNumeral(st.chord, key)}</small></button>${progExtChoices(i).length > 1 ? `<button class="tog${S.prog[i].ext ? ' on' : ''}" data-a="pext" data-i="${i}" aria-label="Choose an extension for ${st.chord.symbol}">${S.prog[i].ext ? 'extension ▾' : '+ extension'}</button>` : ''}<button class="x" data-a="pdel" data-i="${i}" aria-label="Remove ${st.chord.symbol}">×</button></div>`;
  });
  const can25 = (i: number) => i > 0 && !!findWay(steps[i - 1].chord, steps[i].chord, 'secIIV');
  const allOn = steps.some((_st, i) => can25(i)) && steps.every((st, i) => !can25(i) || st.via?.techniqueId === 'secIIV');
  const bad = S.progBad;
  S.progBad = null;
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Progression builder · ${curTitle()}</div><h2>Chord to chord, with the <em>passing</em> you choose</h2></div>
   <div class="presets">${M.presets.map((p, i) => `<button class="chip" data-a="preset" data-i="${i}">${p[0]}</button>`).join('')}</div>
   <div class="bars flexbars">${bars || '<div class="empty">Add chords from the row below.</div>'}</div>
   <div class="controls"><button class="pill" data-a="pall25" aria-pressed="${allOn}">2‑5 into every chord</button><button class="pill" data-a="pnone">No passing chords</button><button class="pill" data-a="pclear">Clear</button></div>
   <div class="panel pstyle">
     <div class="pcrow"><span class="lbl">Genre</span><div class="seg wrap" role="group" aria-label="Genre">${GENRE_IDS.map(k => `<button data-a="pgenre" data-v="${k}" aria-pressed="${S.pgenre === k}">${GENRES[k].label}</button>`).join('')}</div></div>
     <div class="pcrow"><span class="lbl">Feel</span><div class="seg wrap" role="group" aria-label="Feel">${FEELS.map(k => `<button data-a="pfeel" data-v="${k}" aria-pressed="${S.pfeel === k}">${FEEL_LABELS[k]}</button>`).join('')}</div></div>
     <p class="small" style="margin:0">Genre and feel set the order of the choices when you pick a passing.</p>
   </div>
   <div class="panel"><div class="lbl">Add a chord</div>${tilesHTML(H, -1, 'padd', 'r1')}
     <div class="psymrow"><input class="psym" data-f="prog" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="or type any chord and press Enter: Ebmaj7, F#m7b5, C/G" aria-label="Type a chord to add">${bad ? `<span class="small" style="color:var(--c5)">Can't read "${esc(bad)}".</span>` : ''}</div>
     <p class="small" style="margin:12px 0 0">Tap a chord to hear it. Tap <b>+ extension</b> under a chord to add a 9, 11 or 13. Tap <b>+ passing</b> between two chords to choose how to get from one to the next: the passing chords pick up extensions that connect to yours. Each passing chord takes two beats.</p></div>
  </div>`;
}
