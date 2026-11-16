import { beat, playSources, type PlayEvent } from '../../audio/player';
import { FEEL_LABELS, GENRES, GENRE_IDS } from '../../data/styles';
import { FEELS } from '../../data/techniques';
import { S, curChords, curKey, curTitle } from '../../state';
import { chordInfo } from '../../theory/chords';
import { fmt } from '../../theory/notes';
import type { Ranked } from '../../theory/passing/rank';
import type { Suggestion } from '../../theory/passing/types';
import { famOfKind, fromChart, romanNumeral, type PChord } from '../../theory/symbols';
import type { Chord, HomeChord } from '../../theory/types';
import { extensionOptions, scaleChoices } from '../../theory/tensions';
import { optionChip, scaleChips, tensionLine } from '../extensions';
import { chordKeys, esc, extChoices, findWay, pickChord, playTones, rankedWays, wayButton, wayKey, withExt } from '../passing';
import { vlStage } from '../keyboards';
import { cache, card, cref, tilesHTML } from '../pieces';

/* Move: get from one chord to another. Every passing technique is a "way"; the 2-5 is one of them. */
interface MoveModel { H: HomeChord[]; from: PChord; to: PChord; fromChoices: PChord[]; toChoices: PChord[]; badFrom: boolean; badTo: boolean; shown: Ranked[]; hidden: Ranked[]; list: Suggestion[]; sel: Suggestion | null }
export function moveModel(): MoveModel {
  const H = curChords();
  if (!H[S.to].landable) S.to = H.findIndex(c => c.landable && c.degree !== S.from);
  const f = pickChord(S.fromSym, S.from), t = pickChord(S.toSym, S.to);
  /* the picked extensions are part of the chords, so every way below is fitted to them */
  const toChoices = extChoices(t.chord, null), fromChoices = extChoices(f.chord, t.chord);
  f.chord = withExt(f.chord, S.fromExt, t.chord); t.chord = withExt(t.chord, S.toExt, null);
  const { shown, hidden } = rankedWays(f.chord, t.chord);
  const list = (S.pshowAll ? [...shown, ...hidden] : shown).map(r => r.suggestion);
  /* keep the chosen way when it still exists for this pair (also when hidden), else the best one */
  const sel = findWay(f.chord, t.chord, S.way) ?? list[0] ?? null;
  return { H, from: f.chord, to: t.chord, fromChoices, toChoices, badFrom: f.bad, badTo: t.bad, shown, hidden, list, sel };
}
/** Play button: FROM (4 beats) → each passing chord (2 beats) → TO (4 beats). */
playSources.move = (): PlayEvent[] => {
  const m = moveModel(), b = beat(), ev: PlayEvent[] = [];
  let t = 0;
  const add = (c: PChord, beats: number, id: string) => { ev.push({ t, dur: beats * b, tones: playTones(c), id }); t += beats * b; };
  if (!m.sel?.replacesFrom) add(m.from, 4, 'mf');
  (m.sel?.chords ?? []).forEach((c, j) => add(c, 2, 'm' + j));
  add(m.to, 4, 'mt');
  return ev;
};

/** The chart chord behind a 2-5 chord, so its card can show the scale to play and the voicings. */
function chartOf(m: MoveModel, j: number): Chord | null {
  const s = m.sel;
  if (!s || s.techniqueId !== 'secIIV') return null;
  const source = s.variant === 'dark' ? 'harmonic' : famOfKind(m.to) === 'min' ? 'melodic' : 'major';
  const c = chordInfo(m.to.root, source, s.chords.length === 2 ? (j === 0 ? 1 : 4) : 4);
  return c.symbol === s.chords[j].symbol ? c : null;
}
function detail(c: PChord, cls: string, top: string, id: string, chart: Chord | null): string {
  cache.chords[id] = { tones: playTones(c) };
  if (chart) return card(chart, cls, top, id);
  return `<article class="card ${cls}"><div class="ch"><span class="cs">${c.symbol}</span><span class="cn">${top}</span></div>
    <div><div class="lbl">Chord tones</div><div class="notes">${c.tones.map((n, i) => `<span class="nw"><span class="n ct">${fmt(n)}</span><small>${c.labels[i]}</small></span>`).join('')}</div></div>
    ${chordKeys(c)}
    ${c.upper ? `<div class="small">${fmt(c.upper.root)} major triad on top of the ${fmt(c.root)}7 shell.</div>` : ''}
    <div class="btns"><button class="hear" data-a="one" data-id="${id}">▶ Hear ${c.symbol}</button></div></article>`;
}
/** A guide-tone line across the chords: the 3rd (or 4th on a sus chord), or the 7th (or 6th). */
function line(lab: string, seq: PChord[], cls: string[], want: string[]): string {
  return `<div><span class="tag">${lab}</span>${seq.map((c, i) => {
    const k = c.labels.findIndex(l => want.includes(l));
    return `<span class="n ${k < 0 ? '' : 'ct'} ${cls[i]}">${k < 0 ? '–' : fmt(c.tones[k])}</span>${i < seq.length - 1 ? '<span class="arr">→</span>' : ''}`;
  }).join('')}</div>`;
}

export function viewMove(): string {
  const m = moveModel(), key = curKey(), s = m.sel, g = GENRES[S.pgenre];
  cache.chords = {};
  const input = (which: 'from' | 'to', val: string | null, bad: boolean) => `<div class="psymrow"><input class="psym${bad ? ' bad' : ''}" data-f="${which}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="or type any chord: Ebmaj7, F#m7b5, C/G" value="${esc(val || '')}" aria-label="Type the ${which === 'from' ? 'start' : 'landing'} chord">${val ? `<button class="pill sm" data-a="symx" data-f="${which}">Clear</button>` : ''}${bad ? '<span class="small" style="color:var(--c5)">Can\'t read that chord. Using the picked one.</span>' : ''}</div>`;
  const extRow = (which: 'from' | 'to', list: PChord[], cur: PChord) => (list.length < 2 ? '' : `<div class="extpick"><span class="lbl">Extensions</span><div class="seg wrap" role="group" aria-label="Extensions on the ${which === 'from' ? 'start' : 'landing'} chord">${list.map(c => `<button data-a="ext" data-f="${which}" data-k="${esc(c.kind)}" aria-pressed="${c.kind === cur.kind}">${c.symbol}</button>`).join('')}</div></div>`);
  /* the chart chord (for the voicing popover and the scale card) only while the chord is not extended */
  const chartFrom = (!S.fromSym || m.badFrom) && fromChart(m.H[S.from]).symbol === m.from.symbol ? m.H[S.from] : null;
  const chartTo = (!S.toSym || m.badTo) && fromChart(m.H[S.to]).symbol === m.to.symbol ? m.H[S.to] : null;
  const tip = S.tipDone ? '' : `<div class="tip"><p><b>How it works:</b> pick the chord you start on and the chord you want to land on. Every way to get there is listed below; the 2‑5 is one of them. Add an extension (9, 11, 13 …) to either chord and the ways adapt. Pick a way, then press play or the space bar. Hover a chord on a Mac, or press and hold it on iPad, for a voicing.</p><button class="pill sm" data-a="tipx">Got it</button></div>`;
  const ways = m.list.map((x, i) => wayButton(x, `data-a="way" data-k="${wayKey(x)}"`, !!s && wayKey(x) === wayKey(s), i >= m.shown.length)).join('');
  const hiddenNote = m.hidden.length ? `<p class="hint">${S.pshowAll ? 'Showing' : 'Hiding'} ${m.hidden.length} way${m.hidden.length === 1 ? '' : 's'} that ${g.label} rarely uses or that ${m.hidden.length === 1 ? 'is' : 'are'} above its tension limit. <button class="linkbtn" data-a="pshow">${S.pshowAll ? 'Hide them' : 'Show them'}</button></p>` : '';
  const chords = s ? s.chords : [], showFrom = !s?.replacesFrom;
  const seq = [...(showFrom ? [m.from] : []), ...chords, m.to];
  const cls = [...(showFrom ? ['r0'] : []), ...chords.map((_c, j) => (j === chords.length - 1 ? 'r5' : 'r2')), 'r1'];
  const blk = (c: PChord, cl: string, id: string, top: string, note: string, ref?: string) => `<div class="blk ${cl}" data-ev="${id}" data-flip="h:${id}"${ref ? ` data-chord="${ref}"` : ''}><div class="bt">${top}</div><div class="bs">${c.symbol}</div><div class="bn">${note}</div></div>`;
  const fromRef = chartFrom ? cref(chartFrom) : undefined, toRef = chartTo ? cref(chartTo) : undefined;
  const path = [
    ...(showFrom ? [blk(m.from, 'r0', 'mf', romanNumeral(m.from, key) + ' · start', 'start chord', fromRef)] : []),
    ...chords.map((c, j) => { const ch = chartOf(m, j); return blk(c, cls[(showFrom ? 1 : 0) + j], 'm' + j, s!.romanNumerals[j], s!.name.toLowerCase(), ch ? cref(ch) : undefined); }),
    blk(m.to, 'r1', 'mt', romanNumeral(m.to, key) + ' · land', 'target', toRef),
  ].join('<div class="ar" aria-hidden="true"><i></i></div>');
  const ids = [...(showFrom ? ['mf'] : []), ...chords.map((_c, j) => 'm' + j), 'mt'];
  const cards = [
    ...chords.map((c, j) => detail(c, cls[(showFrom ? 1 : 0) + j], s!.romanNumerals[j], 'm' + j, chartOf(m, j))),
    detail(m.to, 'r1', romanNumeral(m.to, key) + ' · target', 'mt', chartTo),
  ].join('');
  cache.chords.mf = { tones: playTones(m.from) };
  /* each chord of the path: its scale, its tensions, and extended versions that lead into the next chord */
  const ext = `<div class="panel"><h3>Scales and other extensions</h3><p class="small" style="margin:0 0 10px">Each chord's scale decides which extensions fit. Tap an extended chord to hear it go into the next chord. The lines under it say where each added note moves.</p>
    <div class="extrows">${seq.map((c, i) => {
      const next = i < seq.length - 1 ? seq[i + 1] : null, ch = scaleChoices(c, next, key)[0], opts = extensionOptions(c, next, key);
      return `<div class="extrow ${cls[i]}"><div class="exth"><span class="cs2">${c.symbol}</span>${next ? `<span class="arr">→</span><span class="small">${next.symbol}</span>` : '<span class="small">landing chord</span>'}<span class="cn">${ch.scale.name}</span></div>
        <div class="small">${ch.why}</div>${scaleChips(ch.scale)}${tensionLine(ch.scale)}
        ${opts.length ? `<div class="extopts">${opts.map((o, j) => optionChip(o, `e${i}_${j}`, next)).join('')}</div>` : ''}</div>`;
    }).join('')}</div>
    <p class="small" style="margin:10px 0 0">Rules and sources: see <button class="linkbtn" data-a="tab" data-v="ext">Extensions</button> under Reference.</p></div>`;
  /* bullets come as: what it is, [voice leading], borrowed notes, why it pulls */
  const labels = s && s.explanation.length === 4 ? ['What it is', 'Voice leading', 'Borrowed notes', 'Why it pulls'] : ['What it is', 'Borrowed notes', 'Why it pulls'];
  const why = s ? s.explanation.map((l, i) => `<p><span class="whyl">${labels[i]}</span>${l.replace(/^Voice leading: /, '')}</p>`).join('')
    + (s.ext?.lines.length ? `<p><span class="whyl">Extensions</span>${s.ext.lines.join('<br>')}</p>` : '') : '';
  const extOn = !!s?.ext;
  return `<div class="stack">${tip}
   <div style="text-align:center"><div class="eyebrow">In ${curTitle()}</div><h2 class="sr">Get from ${m.from.symbol} to ${m.to.symbol}</h2></div>
   <div class="stage"><div class="pathx">${path}</div>${vlStage(seq, ids)}</div>
   <div class="panel pick">
     <span class="lab">Start on</span><div>${tilesHTML(m.H, S.fromSym && !m.badFrom ? -1 : S.from, 'from', 'r0', true)}${input('from', S.fromSym, m.badFrom)}${extRow('from', m.fromChoices, m.from)}</div>
     <span class="lab">Land on</span><div>${tilesHTML(m.H, S.toSym && !m.badTo ? -1 : S.to, 'to', 'r1')}${input('to', S.toSym, m.badTo)}${extRow('to', m.toChoices, m.to)}</div>
     <p class="small extnote">${extOn ? 'The passing chords below took extensions that connect to yours, and the ways are re-ranked by how smoothly your added notes carry through (the “ext” mark).' : 'Pick an extension on either chord: the passing chords pick up matching extensions and the ways re-rank.'}</p>
   </div>
   <div class="panel wayspanel">
     <div class="waysh"><h3 style="margin:0">Ways to get there</h3><span class="small">${m.shown.length} for ${g.label} · ${FEEL_LABELS[S.pfeel].toLowerCase()} first. Tap one to use it.</span></div>
     <div class="pcrow"><span class="lbl">Genre</span><div class="seg wrap" role="group" aria-label="Genre">${GENRE_IDS.map(k => `<button data-a="pgenre" data-v="${k}" aria-pressed="${S.pgenre === k}">${GENRES[k].label}</button>`).join('')}</div></div>
     <div class="pcrow"><span class="lbl">Feel</span><div class="seg wrap" role="group" aria-label="Feel">${FEELS.map(k => `<button data-a="pfeel" data-v="${k}" aria-pressed="${S.pfeel === k}">${FEEL_LABELS[k]}</button>`).join('')}</div></div>
     <div class="ways">${ways || '<div class="empty">No passing chords for this pair in this style. Try another genre or target.</div>'}</div>${hiddenNote}
   </div>
   ${s ? `<div class="duo"><div class="panel why"><h3>What's happening · ${s.name}${s.variantLabel ? ' (' + s.variantLabel + ')' : ''}</h3>${why}</div>
   <div class="panel"><h3>Voice‑leading lines</h3><p class="small" style="margin:0">The 3rds and 7ths move by small steps. Hum these and you hear the whole move.</p>
     <div class="lines">${line('3rds', seq, cls, ['3', '♭3', '4'])}${line('7ths', seq, cls, ['7', '♭7', '𝄫7', '6'])}</div></div></div>` : ''}
   ${ext}
   <div class="cards">${cards}</div>
   </div>`;
}
