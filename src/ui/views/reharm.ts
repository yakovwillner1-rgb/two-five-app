import { playNotes, playRaw, stopAll } from '../../audio/player';
import { FEEL_LABELS, GENRES, GENRE_IDS } from '../../data/styles';
import { FEELS } from '../../data/techniques';
import { SmfError, barsOf, bpmOf, parseSmf, tickToSec, writeSmf, type Bar, type SNote, type Smf } from '../../midi/smf';
import { S, curKey, curTitle, type KeptVoicing } from '../../state';
import { detectChart, detectKey, joinChart, skyline, type ANote, type KeyGuess, type Seg } from '../../theory/analyze';
import { homeKey, homeTitle } from '../../theory/home';
import { melodyCheck } from '../../theory/lead';
import { noteName } from '../../theory/notes';
import { LEVELS, reharmonize, voiceChart, type ChartChord, type Level, type Reharm, type VoicedChord } from '../../theory/reharm';
import { parseChord, romanNumeral } from '../../theory/symbols';
import { esc } from '../passing';

/*
 * Reharm: load a MIDI file (exported from Logic), see the key and chords the app hears, correct
 * them, then get three reharmonizations under the same melody. Each can be played, compared with
 * the original, downloaded as a MIDI file that lines up with the original, or sent to Play it.
 * The file itself is kept in memory only (not saved).
 */
const R = {
  file: null as Smf | null, name: '', error: '',
  /** 'sky' = top notes of everything, else the index of the melody track */
  mel: 'sky' as 'sky' | number,
  /** key guesses of the loaded file, best first */
  keys: [] as KeyGuess[],
  /** corrected chords: tick where the slice starts → chord symbol as typed */
  edits: {} as Record<number, string>,
  msg: '',
};
export const LEVEL_IDS: Level[] = ['light', 'medium', 'wild'];
const RHYTHMS = [['auto', 'Auto'], ['bar', 'Every bar'], ['half', 'Half bar'], ['beat', 'Every beat']] as const;

/* ---------- the built-in example ---------- */
/** A short tune so the tab can be tried without a file: | Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 |, melody on its own track. */
export function demoFile(): Uint8Array {
  const Q = 480, B = 4 * Q, ch = (bar: number, ms: number[]): SNote[] => ms.map(m => ({ tick: bar * B, dur: B - 20, midi: m, vel: 70, ch: 1 }));
  const mel = (tick: number, dur: number, midi: number): SNote => ({ tick, dur: dur - 20, midi, vel: 96, ch: 0 });
  return writeSmf({
    ppq: Q, tempos: [{ tick: 0, us: 652174 }], timeSigs: [{ tick: 0, num: 4, den: 4 }],
    tracks: [
      { name: 'Melody', notes: [mel(0, 3 * Q, 76), mel(3 * Q, Q, 74), mel(B, 2 * Q, 72), mel(B + 2 * Q, 2 * Q, 76), mel(2 * B, 2 * Q, 77), mel(2 * B + 2 * Q, 2 * Q, 81), mel(3 * B, 2 * Q, 74), mel(3 * B + 2 * Q, 2 * Q, 71), mel(4 * B, B, 72)] },
      { name: 'Chords', notes: [...ch(0, [48, 55, 59, 64]), ...ch(1, [45, 55, 60, 64]), ...ch(2, [50, 57, 60, 65]), ...ch(3, [43, 53, 59, 62]), ...ch(4, [48, 55, 59, 64])] },
    ],
  });
}

/* ---------- loading ---------- */
/** Make a detected key the home key. The progression on the Progression tab is left alone (the mode switch at the top would reset it). */
function useKey(g: KeyGuess): void {
  S.mode = g.mode; S.pc = g.pc;
  S.fromExt = null; S.toExt = null; S.lext = null; S.lnx = null;
}
export function loadBytes(bytes: Uint8Array, name: string): void {
  R.edits = {}; R.msg = ''; R.error = '';
  try {
    const f = parseSmf(bytes);
    R.file = f; R.name = name;
    /* several tracks: the one with the highest average pitch is offered as the melody */
    const avg = f.tracks.map(t => t.notes.reduce((s, n) => s + n.midi, 0) / t.notes.length);
    R.mel = f.tracks.length > 1 ? avg.indexOf(Math.max(...avg)) : 'sky';
    R.keys = detectKey(f.tracks.flatMap(t => t.notes));
    if (R.keys[0]) useKey(R.keys[0]);
    S.rview = 'light';
  } catch (e) {
    R.file = null;
    R.error = e instanceof SmfError ? e.message : 'This file could not be read as a MIDI file.';
  }
}

/* ---------- model ---------- */
export interface ReharmModel { f: Smf; bars: Bar[]; all: ANote[]; melody: ANote[]; segs: Seg[]; chart: ChartChord[]; re: Reharm | null; voiced: VoicedChord[] }
export function model(): ReharmModel | null {
  const f = R.file;
  if (!f) return null;
  const key = curKey(), bars = barsOf(f);
  const all: ANote[] = f.tracks.flatMap((t, i) => t.notes.map(n => ({ tick: n.tick, dur: n.dur, midi: n.midi, track: i })));
  const melody = R.mel === 'sky' ? skyline(all, f.ppq / 16) : all.filter(n => n.track === R.mel);
  const comp = R.mel === 'sky' ? all : all.filter(n => n.track !== R.mel);
  const segs = detectChart(comp.length ? comp : all, bars, key, S.rrhythm).map(s => {
    const typed = R.edits[s.start] ? parseChord(R.edits[s.start]) : null;
    return typed ? { ...s, chord: typed } : s;
  });
  const chart = joinChart(segs), style = { genre: S.pgenre, feel: S.pfeel };
  const level = S.rview === 'orig' ? null : S.rview;
  const re = level ? reharmonize(chart, melody, bars, key, style, level) : null;
  const voiced = voiceChart(re ? re.chords : chart.map(c => ({ ...c, added: false })), melody, key, style, level ?? 'light');
  return { f, bars, all, melody, segs, chart, re, voiced };
}

/* ---------- output ---------- */
const sec = (m: ReharmModel, tick: number): number => tickToSec(tick, m.f);
function play(): void {
  const m = model();
  if (!m) return;
  const span = (tick: number, dur: number) => ({ t: sec(m, tick), dur: Math.max(0.08, sec(m, tick + dur) - sec(m, tick)) });
  if (S.rview === 'orig') {
    playRaw(m.all.map(n => ({ ...span(n.tick, n.dur), midi: n.midi, vol: m.melody.includes(n) ? 0.16 : 0.1 })), m.segs.map((s, i) => ({ t: sec(m, s.start), id: 'rs' + i })), 'x');
    return;
  }
  const notes = [
    ...m.melody.map(n => ({ ...span(n.tick, n.dur), midi: n.midi, vol: 0.17 })),
    ...m.voiced.flatMap(c => c.notes.map(n => ({ ...span(c.start, c.end - c.start), midi: n.midi, vol: 0.09 }))),
  ];
  playRaw(notes, m.voiced.map((c, i) => ({ t: sec(m, c.start), id: 'rc' + i })), 'x');
}
/** The reharm as a MIDI file: the melody track and the reharm track, on the original ticks, tempo and time signature. */
export function reharmFile(m: { f: Smf; melody: ANote[]; voiced: VoicedChord[] }, label: string): Uint8Array {
  return writeSmf({
    ppq: m.f.ppq, tempos: m.f.tempos, timeSigs: m.f.timeSigs,
    tracks: [
      { name: 'Melody', notes: m.melody.map(n => ({ tick: n.tick, dur: n.dur, midi: n.midi, vel: 96, ch: 0 })) },
      { name: 'Reharm ' + label, notes: m.voiced.flatMap(c => c.notes.map(n => ({ tick: c.start, dur: Math.max(1, c.end - c.start - Math.round(m.f.ppq / 24)), midi: n.midi, vel: 72, ch: 1 }))) },
    ],
  });
}
function download(): void {
  const m = model();
  if (!m) return;
  const label = S.rview === 'orig' ? 'original chords' : S.rview;
  const blob = new Blob([reharmFile(m, label) as BlobPart], { type: 'audio/midi' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${R.name.replace(/\.midi?$/i, '') || 'reharm'} - ${label}.mid`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  R.msg = `Saved "${a.download}". Drag it into Logic at the start of the original region: it has the same tempo, time signature and bar positions.`;
}
function toPlayIt(): void {
  const m = model();
  if (!m) return;
  const key = curKey();
  S.lkept = m.voiced.map((c): KeptVoicing => {
    const notes: KeptVoicing['notes'] = c.notes.map(n => ({ m: n.midi, n: noteName(n.note), lab: n.label, h: 'L' }));
    /* the melody note is part of what you play, spelled the way the chord spells it */
    if (c.top !== null) { const mc = melodyCheck(c.chord, c.top, null, key); notes.push({ m: c.top, n: noteName(mc.note), lab: mc.label, h: 'R' }); }
    return { sym: c.chord.symbol, name: c.voicing, notes };
  });
  S.px = 'lead'; S.tab = 'play';
}

/* ---------- actions ---------- */
/** Clicks on the Reharm tab. Returns true when handled and the tab should be drawn again, 'none' when handled without a redraw. */
export function reharmAction(a: string, d: DOMStringMap): boolean | 'none' {
  switch (a) {
    case 'rdemo': loadBytes(demoFile(), 'Example tune.mid'); return true;
    case 'rclose': R.file = null; R.error = ''; R.msg = ''; return true;
    case 'rmel': R.mel = d.v === 'sky' ? 'sky' : +d.v!; R.edits = {}; return true;
    case 'rrhythm': S.rrhythm = d.v as typeof S.rrhythm; R.edits = {}; return true;
    case 'rkey': { const g = R.keys[+d.i!]; if (g) { useKey(g); R.edits = {}; } return true; }
    case 'rview': S.rview = d.v as typeof S.rview; R.msg = ''; return true;
    case 'rplay': if (S.playing) stopAll(); else play(); return 'none';
    case 'rdown': download(); return true;
    case 'rsend': toPlayIt(); window.scrollTo(0, 0); return true;
    case 'rhear': { const c = model()?.voiced[+d.i!]; if (c) playNotes([...c.notes.map(n => n.midi), ...(c.top !== null ? [c.top] : [])]); return 'none'; }
    case 'ralt': R.edits[+d.t!] = d.s!; return true;
    case 'rreset': delete R.edits[+d.t!]; return true;
  }
  return false;
}
/** A chord typed into the correction box of a slice. */
export function reharmTyped(tick: number, value: string | null): void {
  if (!value) { delete R.edits[tick]; return; }
  if (parseChord(value)) { R.edits[tick] = value; R.msg = ''; } else R.msg = `Can't read "${value}" as a chord. Try Dm7, G7b9, Ebmaj7 or C/G.`;
}
/** The correction sheet for one slice of the detected chart. */
export function editSheetHTML(i: number): string {
  const m = model(), s = m?.segs[i];
  if (!m || !s) return '';
  const opts = [...(s.chord ? [s.chord] : []), ...s.alts].filter((c, k, arr) => arr.findIndex(x => x.symbol === c.symbol) === k);
  return `<div class="vh"><span class="vs" style="font-size:1.5rem">Bar ${s.bar + 1}</span><span class="small">What chord is it? Pick a reading or type the chord.</span><button class="vx" data-a="vclose" aria-label="Close">×</button></div>
    <div class="ways">${opts.map(c => `<button class="way" data-a="ralt" data-t="${s.start}" data-s="${esc(c.symbol)}" aria-pressed="${c.symbol === s.chord?.symbol}"><span class="wn">${c.symbol}</span><span class="wc">${romanNumeral(c, curKey())}</span></button>`).join('')}</div>
    <div class="psymrow" style="margin-top:12px"><input class="psym" data-f="rchord" data-t="${s.start}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type the chord and press Enter: Dm7, G7b9, C/G" aria-label="Type the chord for bar ${s.bar + 1}">${R.edits[s.start] ? `<button class="pill sm" data-a="rreset" data-t="${s.start}">Back to what was heard</button>` : ''}</div>`;
}

/* ---------- view ---------- */
function barsHTML(m: ReharmModel, cells: { bar: number; html: string; span: number }[]): string {
  const byBar = new Map<number, { html: string; span: number }[]>();
  cells.forEach(c => { if (!byBar.has(c.bar)) byBar.set(c.bar, []); byBar.get(c.bar)!.push(c); });
  return `<div class="rbars">${m.bars.map(b => `<div class="rbar"><span class="rbn">${b.index + 1}</span><div class="rbc">${(byBar.get(b.index) ?? [{ html: '<span class="rcell rest">–</span>', span: 1 }]).map(c => `<div style="flex:${c.span} 1 0">${c.html}</div>`).join('')}</div></div>`).join('')}</div>`;
}
function heardHTML(m: ReharmModel): string {
  const key = curKey();
  const cells = m.segs.map((s, i) => ({
    bar: s.bar, span: s.end - s.start,
    html: `<button class="rcell${R.edits[s.start] ? ' edited' : ''}${s.chord ? '' : ' rest'}" data-a="redit" data-i="${i}" data-ev="rs${i}" aria-label="Bar ${s.bar + 1}: ${s.chord?.symbol ?? 'no chord'}. Tap to correct."><b>${s.chord?.symbol ?? '–'}</b><small>${s.chord ? romanNumeral(s.chord, key) : 'carries on'}</small></button>`,
  }));
  return barsHTML(m, cells);
}
function reharmHTML(m: ReharmModel): string {
  const key = curKey();
  /* a chord that runs over a bar line is shown once, in the bar where it starts */
  const cells = m.voiced.map((c, i) => ({
    bar: c.bar, span: c.end - c.start,
    html: `<button class="rcell${c.added ? ' added' : ''}" data-a="rhear" data-i="${i}" data-ev="rc${i}" aria-label="Hear ${c.chord.symbol}"><b>${c.chord.symbol}</b><small>${romanNumeral(c.chord, key)}</small></button>`,
  }));
  return barsHTML(m, cells);
}
function changesHTML(re: Reharm): string {
  if (!re.changes.length) return '';
  const labels = (n: number) => (n === 4 ? ['What it is', 'Voice leading', 'Borrowed notes', 'Why it pulls'] : ['What it is', 'Borrowed notes', 'Why it pulls']);
  return `<div class="rchanges">${re.changes.map(c => {
    const main = c.lines.filter(l => !l.startsWith('Melody: ')), mel = c.lines.filter(l => l.startsWith('Melody: ')), lab = labels(main.length);
    return `<div class="rchange"><div class="rch"><span class="tag">Bar ${c.bar + 1}</span><b>${c.from.symbol} → <em>${c.way.chords.map(x => x.symbol).join(' → ')}</em> → ${c.to.symbol}</b><span class="small">${c.way.name}${c.way.variantLabel ? ' · ' + c.way.variantLabel : ''}</span></div>
      ${main.map((l, i) => `<p><span class="whyl">${lab[i] ?? ''}</span>${l.replace(/^Voice leading: /, '')}</p>`).join('')}
      ${mel.length ? `<p><span class="whyl">Melody</span>${mel.map(l => l.replace(/^Melody: /, '')).join('<br>')}</p>` : ''}</div>`;
  }).join('')}</div>`;
}
const HOWTO = 'In Logic: select the region, then <b>File → Export → Selection as MIDI File</b>. A region with the melody and the chords on separate tracks reads best.';

export function viewReharm(): string {
  const m = model();
  const pickFile = `<label class="pill go rfilebtn">Choose a MIDI file<input class="rfile" type="file" accept=".mid,.midi,audio/midi,audio/x-midi" hidden></label><button class="pill" data-a="rdemo">Try the example tune</button>`;
  if (!m) {
    return `<div class="stack">
     <div style="text-align:center"><div class="eyebrow">Reharm · from a MIDI file</div><h2>Reharmonize what you <em>played</em></h2></div>
     <div class="panel"><h3>1 · Load your MIDI file</h3><p class="small" style="margin:0 0 12px">${HOWTO}</p><div class="controls" style="justify-content:flex-start">${pickFile}</div>
       ${R.error ? `<p class="small rerr">${esc(R.error)}</p>` : ''}
       <p class="small" style="margin:12px 0 0">The file stays on this device: nothing is uploaded.</p></div>
     <div class="panel"><h3>What happens next</h3><ol class="rsteps"><li>The app reads the key, the melody and the chords, and shows the chart. You correct anything it got wrong.</li><li>You pick a genre and feel. It writes three reharms under your melody: light, medium and wild.</li><li>Play each against the original, read why every change works, then download it as a MIDI file for Logic or practise it in Play it.</li></ol></div>
    </div>`;
  }
  const f = m.f, g = R.keys[0];
  const sig = [...new Set(m.bars.map(b => `${b.num}/${b.den}`))].join(', ');
  const tracks = f.tracks.length > 1
    ? `<div class="pcrow"><span class="lbl">Melody</span><div class="seg wrap" role="group" aria-label="Which track is the melody">${f.tracks.map((t, i) => `<button data-a="rmel" data-v="${i}" aria-pressed="${R.mel === i}">${esc(t.name)}</button>`).join('')}<button data-a="rmel" data-v="sky" aria-pressed="${R.mel === 'sky'}">Top notes of everything</button></div></div>`
    : '<p class="small" style="margin:0">One track: the melody is read as the top note of everything that is played (the skyline).</p>';
  const keyAlts = R.keys.slice(0, 4).map((k, i) => `<button data-a="rkey" data-i="${i}" aria-pressed="${k.pc === S.pc && k.mode === S.mode}">${homeTitle(homeKey(k.pc, k.mode))}</button>`).join('');
  const edits = Object.keys(R.edits).length;
  const re = m.re, lv = S.rview === 'orig' ? null : LEVELS[S.rview];
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Reharm · ${curTitle()}</div><h2>Reharmonize what you <em>played</em></h2></div>
   <div class="panel"><h3>1 · ${esc(R.name)}</h3>
     <p class="small" style="margin:0 0 10px">${m.bars.length} bars · ${sig} · ${bpmOf(f)} bpm${f.tempos.length > 1 ? ' at the start' : ''} · ${f.tracks.length} track${f.tracks.length === 1 ? '' : 's'} · ${m.all.length} notes</p>
     ${tracks}
     <div class="controls" style="justify-content:flex-start;margin-top:12px">${pickFile}<button class="pill sm" data-a="rclose">Close file</button></div>
     ${R.error ? `<p class="small rerr">${esc(R.error)}</p>` : ''}</div>
   <div class="panel"><h3>2 · What the app hears</h3>
     <div class="pcrow"><span class="lbl">Key</span><div class="seg wrap" role="group" aria-label="Key of the tune">${keyAlts}</div></div>
     <p class="small" style="margin:6px 0 10px">${g ? `Best match: <b>${homeTitle(homeKey(g.pc, g.mode))}</b> (its notes are held longest). ` : ''}The home key button at the top sets any other key.</p>
     <div class="pcrow"><span class="lbl">Chords change</span><div class="seg wrap" role="group" aria-label="How often the chords change">${RHYTHMS.map(([k, l]) => `<button data-a="rrhythm" data-v="${k}" aria-pressed="${S.rrhythm === k}">${l}</button>`).join('')}</div></div>
     ${heardHTML(m)}
     <p class="small" style="margin:10px 0 0">Tap any chord to correct it${edits ? ` (${edits} corrected, marked with a dot)` : ''}. "–" means nothing new was heard: the chord before carries on.</p></div>
   <div class="panel"><h3>3 · Reharm</h3>
     <div class="pcrow"><span class="lbl">Genre</span><div class="seg wrap" role="group" aria-label="Genre">${GENRE_IDS.map(k => `<button data-a="pgenre" data-v="${k}" aria-pressed="${S.pgenre === k}">${GENRES[k].label}</button>`).join('')}</div></div>
     <div class="pcrow"><span class="lbl">Feel</span><div class="seg wrap" role="group" aria-label="Feel">${FEELS.map(k => `<button data-a="pfeel" data-v="${k}" aria-pressed="${S.pfeel === k}">${FEEL_LABELS[k]}</button>`).join('')}</div></div>
     <div class="pcrow"><span class="lbl">Version</span><div class="seg wrap" role="group" aria-label="Which version">${[['orig', 'Original'], ...LEVEL_IDS.map(l => [l, LEVELS[l].label])].map(([k, l]) => `<button data-a="rview" data-v="${k}" aria-pressed="${S.rview === k}">${l}</button>`).join('')}</div></div>
     <p class="small" style="margin:6px 0 10px">${lv ? lv.about : 'Your chords, as heard above, voiced under the melody.'}</p>
     ${re ? `<p class="rsum">${re.summary}</p>` : ''}
     ${reharmHTML(m)}
     <p class="small" style="margin:10px 0 0">${re ? 'Gold chords are new. ' : ''}Tap a chord to hear its voicing under the melody note.</p>
     <div class="controls" style="justify-content:flex-start;margin-top:12px"><button class="pill go" data-a="rplay">▶ Play / stop ${S.rview === 'orig' ? 'the original recording' : 'this version'}</button><button class="pill" data-a="rdown">Download .mid</button><button class="pill" data-a="rsend">Practice in Play it</button></div>
     ${R.msg ? `<p class="small lmsg">${esc(R.msg)}</p>` : ''}
     <p class="small" style="margin:10px 0 0">Sound goes to the output chosen under Sound (built-in synth, or a MIDI port into Logic). The download has two tracks: the melody and the chords, on the original bars and tempo.</p></div>
   ${re && re.changes.length ? `<div class="panel why"><h3>Why each change works</h3>${changesHTML(re)}</div>` : ''}
  </div>`;
}
