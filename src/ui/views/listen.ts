import { toTop } from '../scroll';
import { GENRES, FEEL_LABELS } from '../../data/styles';
import { S, curChords, curKey, curTitle, type ProgChord } from '../../state';
import { homeKey, homeTitle } from '../../theory/home';
import { nextChords, type NextOption } from '../../theory/next';
import { fmt } from '../../theory/notes';
import type { Suggestion } from '../../theory/passing/types';
import { betterKey, recognize, type Reading } from '../../theory/recognize';
import { fromChart, parseChord, romanNumeral, type PChord } from '../../theory/symbols';
import { seqId } from '../extensions';
import { esc, playTones, progChord, rankedWays, wayButton, wayKey } from '../passing';
import { cache } from '../pieces';
import { drawKeys, drawMidi, heldHook, releaseAll } from '../play';

/*
 * Listen: play a chord (MIDI keyboard or the on-screen keys). Once the same notes have been held for
 * the hold time, the chord is named, logged, and the app shows where it usually goes next and the
 * ways to get there. Any of it can be added to the Progression tab.
 */
const L = {
  /** readings of the notes held right now, waiting for the hold time */
  pending: null as Reading[] | null,
  /** note names held when nothing can be named */
  loose: 0,
  /** the chord last heard: every reading, and the one in use */
  cur: [] as Reading[], pick: 0,
  /** chosen destination, and the way to it ("" = straight there, the default) */
  dest: 0, way: '',
  /** symbols of the chords heard, in order */
  log: [] as string[],
  msg: '',
};
let timer: ReturnType<typeof setTimeout> | undefined;
export const HOLDS = [300, 500, 1000];

const curChord = (): PChord | null => L.cur[L.pick]?.chord ?? null;

heldHook.changed = (held: Set<number>): void => {
  clearTimeout(timer);
  const notes = [...held], rs = recognize(notes, curKey());
  L.loose = rs.length ? 0 : notes.length;
  const same = rs.length > 0 && L.cur.length > 0 && rs[0].chord.symbol === L.cur[0].chord.symbol;
  L.pending = rs.length && !same ? rs : null;
  if (L.pending) timer = setTimeout(() => commit(rs), S.lhold);
  drawListen();
};
function commit(rs: Reading[]): void {
  L.pending = null; L.cur = rs; L.pick = 0; L.dest = 0; L.way = ''; L.msg = '';
  const sym = rs[0].chord.symbol;
  if (L.log[L.log.length - 1] !== sym) L.log.push(sym);
  drawListen();
}

/* ---- model ---- */
interface Model { c: PChord; opts: NextOption[]; dest: PChord | null; ways: Suggestion[]; sel: Suggestion | null }
function model(): Model | null {
  const c = curChord();
  if (!c) return null;
  const opts = nextChords(c, curKey());
  if (L.dest >= opts.length) L.dest = 0;
  const dest = opts[L.dest]?.chord ?? null;
  const ways = dest ? rankedWays(c, dest).shown.map(r => r.suggestion).filter(s => !s.replacesFrom).slice(0, 6) : [];
  const sel = ways.find(s => wayKey(s) === L.way) ?? null;
  return { c, opts, dest, ways, sel };
}

/* ---- adding to the progression ---- */
/** A chord of the key is stored by its degree (so Play it can check it), any other chord by its symbol. */
function progItem(c: PChord, via: string | null): ProgChord {
  const d = curChords().findIndex(h => fromChart(h).symbol === c.symbol);
  return d >= 0 ? { d, via } : { d: 0, sym: c.symbol, via };
}
/** Append a chord unless the progression already ends on it. */
function pushChord(c: PChord): void {
  const last = S.prog[S.prog.length - 1];
  if (!last || progChord(last).symbol !== c.symbol) S.prog.push(progItem(c, null));
}
const count = (): string => `${S.prog.length} chord${S.prog.length === 1 ? '' : 's'} there now`;

/** Clicks inside the Listen view. Returns true when the action was one of ours. */
export function listenAction(a: string, d: DOMStringMap): boolean {
  const m = model();
  switch (a) {
    case 'lhold': S.lhold = +d.v!; break;
    case 'llatch': S.llatch = !S.llatch; if (!S.llatch) releaseAll(); break;
    case 'lrelease': releaseAll(); break;
    case 'lpick': {
      const old = curChord()?.symbol;
      L.pick = +d.i!; L.dest = 0; L.way = ''; L.msg = '';
      if (old && L.log[L.log.length - 1] === old) L.log[L.log.length - 1] = curChord()!.symbol;
      break;
    }
    case 'ldest': L.dest = +d.i!; L.way = ''; L.msg = ''; break;
    case 'lway': L.way = d.k ?? ''; L.msg = ''; break;
    case 'laddc': if (m) { pushChord(m.c); L.msg = `Added ${m.c.symbol} to the progression (${count()}).`; } break;
    case 'ladd': if (m?.dest) {
      pushChord(m.c);
      S.prog.push(progItem(m.dest, m.sel ? wayKey(m.sel) : null));
      L.msg = `Added ${[m.c, ...(m.sel?.chords ?? []), m.dest].map(x => x.symbol).join(' → ')} to the progression (${count()}).`;
    } break;
    case 'lall': {
      L.log.forEach(s => { const c = parseChord(s); if (c) pushChord(c); });
      L.msg = `Added ${L.log.length} chord${L.log.length === 1 ? '' : 's'} to the progression (${count()}).`;
      break;
    }
    case 'lclear': L.log = []; L.cur = []; L.pending = null; L.msg = ''; break;
    case 'lkey': S.pc = +d.v!; L.msg = ''; break;
    case 'lmove': if (m?.dest) {
      S.fromSym = m.c.symbol; S.toSym = m.dest.symbol; S.fromExt = null; S.toExt = null;
      S.way = m.sel ? wayKey(m.sel) : null; S.tab = 'move'; toTop();
    } break;
    default: return false;
  }
  return true;
}

/* ---- HTML ---- */
function nowHTML(): string {
  const key = curKey(), c = curChord();
  const live = L.pending
    ? `<div class="lhear"><span class="small">Hearing <b>${L.pending[0].chord.symbol}</b> … keep holding</span><span class="lbar" style="--d:${S.lhold}ms"><i></i></span></div>`
    : L.loose ? `<div class="lhear"><span class="small">${L.loose < 3 ? 'Hold three or more different notes.' : 'No chord the app knows has exactly these notes.'}</span></div>` : '';
  if (!c) return `${live}<div class="eyebrow">Nothing heard yet</div><div class="pbig" style="opacity:.35">?</div><p class="phow">Play a chord and hold it for a moment. With a mouse, turn on <b>Latch keys</b> and tap the notes one by one.</p>`;
  const r = L.cur[L.pick];
  cache.chords.lc = { tones: playTones(c) };
  const alts = L.cur.length > 1 ? `<div class="lalts"><span class="lbl">Could also be</span>${L.cur.map((x, i) => (i === L.pick ? '' : `<button class="chip" data-a="lpick" data-i="${i}" title="${esc(x.note)}">${x.chord.symbol}</button>`)).join('')}</div>` : '';
  return `${live}<div class="eyebrow">You played · ${romanNumeral(c, key)} in ${curTitle()}</div><div class="pbig">${c.symbol}</div>
    <div class="notes" style="justify-content:center">${c.tones.map((n, i) => `<span class="nw"><span class="n ct">${fmt(n)}</span><small>${c.labels[i]}</small></span>`).join('')}</div>
    <p class="phow">${r.note}</p>${alts}
    <div class="controls" style="margin-top:12px"><button class="pill sm" data-a="one" data-id="lc">▶ Hear ${c.symbol}</button><button class="pill sm" data-a="laddc">+ Add ${c.symbol} to Progression</button></div>`;
}
function nextHTML(): string {
  const m = model(), key = curKey();
  if (!m) return '';
  const dests = m.opts.map((o, i) => `<button class="way" data-a="ldest" data-i="${i}" aria-pressed="${i === L.dest}"><span class="wn">${o.chord.symbol} <small>${romanNumeral(o.chord, key)}</small></span><span class="small">${o.why}</span></button>`).join('');
  let how = '';
  if (m.dest) {
    const path = [m.c, ...(m.sel?.chords ?? []), m.dest];
    seqId('lseq', path);
    const ways = `<button class="way" data-a="lway" data-k="" aria-pressed="${!m.sel}"><span class="wn">Straight there</span><span class="wc">${m.c.symbol} → ${m.dest.symbol}</span></button>${m.ways.map(s => wayButton(s, `data-a="lway" data-k="${wayKey(s)}"`, !!m.sel && wayKey(s) === wayKey(m.sel))).join('')}`;
    const why = m.sel ? [...m.sel.explanation, ...(m.sel.ext?.lines ?? [])].map(l => `<p>${l}</p>`).join('') : `<p>${m.opts[L.dest].why}</p>`;
    how = `<div class="panel"><div class="waysh"><h3 style="margin:0">How to get to ${m.dest.symbol}</h3><span class="small">Go straight there, or put a passing chord in between.</span><span class="small">Ranked for ${GENRES[S.pgenre].label} · ${FEEL_LABELS[S.pfeel].toLowerCase()} (set on Move)</span></div>
      <div class="ways">${ways}</div>
      <div class="lpath">${path.map(x => `<span>${x.symbol}</span>`).join('<span class="arr">→</span>')}</div>
      <div class="why">${why}</div>
      <div class="controls"><button class="pill sm" data-a="seq" data-id="lseq">▶ Hear it</button><button class="pill sm go" data-a="ladd">+ Add to Progression</button><button class="pill sm" data-a="lmove">Open in Move</button></div>
      ${L.msg ? `<p class="small lmsg">${L.msg} <button class="linkbtn" data-a="tab" data-v="prog">Open Progression</button></p>` : ''}</div>`;
  }
  return `<div class="panel"><h3>Where ${m.c.symbol} usually goes</h3><div class="ways">${dests || '<div class="empty">No rule for this chord yet.</div>'}</div></div>${how}`;
}
function logHTML(): string {
  if (!L.log.length) return '';
  const chords = L.log.map(s => parseChord(s)).filter((c): c is PChord => !!c);
  const b = betterKey(chords, curKey(), pc => homeKey(pc, S.mode));
  const hint = b ? `<p class="small">These chords fit <b>${homeTitle(homeKey(b.pc, S.mode))}</b> better: ${b.fits} of ${chords.length} are inside it, ${b.now} inside ${curTitle()}. <button class="linkbtn" data-a="lkey" data-v="${b.pc}">Switch key</button></p>` : '';
  return `<div class="panel"><h3>Heard so far</h3><div class="llog">${L.log.map(s => `<span class="chip">${s}</span>`).join('<span class="arr">→</span>')}</div>${hint}
    <div class="controls" style="margin-top:10px"><button class="pill sm" data-a="lall">+ Add all to Progression</button><button class="pill sm" data-a="lclear">Clear</button></div>
    ${L.msg && !model()?.dest ? `<p class="small lmsg">${L.msg}</p>` : ''}</div>`;
}
/** Redraw the parts that change while playing, without rebuilding the piano (keys may be held down). */
export function drawListen(): void {
  if (S.tab !== 'listen') return;
  const set = (id: string, html: string) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
  cache.seqs = {};
  set('lnow', nowHTML()); set('lnext', nextHTML()); set('llog', logHTML());
  drawMidi(); drawKeys();
}
export function viewListen(): string {
  const sw = (a: string, on: boolean, l: string) => `<button class="switch" role="switch" data-a="${a}" aria-checked="${on}">${l}<i></i></button>`;
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Listen · ${curTitle()}</div><h2>Play a chord, see where it <em>goes</em></h2></div>
   <div class="midibar" id="midibar"></div>
   <div class="panel pctl">
     <div class="pcrow"><span class="lbl">Hold for</span><div class="seg" role="group" aria-label="How long to hold a chord before it counts">${HOLDS.map(h => `<button data-a="lhold" data-v="${h}" aria-pressed="${S.lhold === h}">${h / 1000} s</button>`).join('')}</div><span class="small">A chord counts once its notes have not changed for this long.</span></div>
     <div class="pcrow sws">${sw('llatch', S.llatch, 'Latch keys (tap to hold)')}${S.llatch ? '<button class="pill sm" data-a="lrelease">Release all</button>' : ''}${S.soundOut ? '' : sw('psound', S.psound, 'Sound for MIDI notes')}</div>
   </div>
   <div class="pkwrap" id="pkwrap"></div>
   <div class="panel ptarget lnow" id="lnow">${nowHTML()}</div>
   <div class="stack" id="lnext">${nextHTML()}</div>
   <div id="llog">${logHTML()}</div>
   <p class="hint">Reads the notes you hold (MIDI or the keys above), not sound from a microphone. The lowest note decides between chords that share the same notes.</p>
  </div>`;
}
