import { toTop } from '../scroll';
import { playGrip, playNotes, playRaw, stopAll } from '../../audio/player';
import { gripText, styleForGenre, voiceLead, type Grip } from '../../theory/guitar';
import { chordBox } from '../fretboard';
import { FEEL_LABELS, GENRES, GENRE_IDS } from '../../data/styles';
import { FEELS } from '../../data/techniques';
import { ScoreError, parseMusicXml, scoreText, type GivenChord } from '../../midi/musicxml';
import { SmfError, barsOf, bpmOf, parseSmf, tickToSec, writeSmf, type Bar, type SNote, type STrack, type Tempo, type TimeSig } from '../../midi/smf';
import { S, curKey, curTitle, keptSet, type KeptVoicing } from '../../state';
import { detectChart, detectKey, joinChart, skyline, type ANote, type KeyGuess, type Seg } from '../../theory/analyze';
import { chartNotes, parseChartText, TEXT_PPQ } from '../../theory/chartText';
import { homeKey, homeTitle } from '../../theory/home';
import { melodyCheck, pitchName } from '../../theory/lead';
import { noteName } from '../../theory/notes';
import { LEVELS, reharmonize, voiceChart, type ChartChord, type Level, type Reharm, type VoicedChord } from '../../theory/reharm';
import { parseChord, romanNumeral } from '../../theory/symbols';
import { esc } from '../passing';

/*
 * Reharm: bring in a tune and get its chords, voicings, voice leading and three reharmonizations.
 * A tune can come from
 *  - a MIDI file (exported from Logic): the chords are heard from the notes;
 *  - a MusicXML score or lead sheet (.musicxml, .xml, .mxl): written chord symbols are used when
 *    there are any, else the chords are heard from the notes;
 *  - a chord chart typed as text: | Cmaj7 | Dm7 G7 |.
 * The tune is kept in memory only (not saved, never uploaded).
 */
export interface Tune {
  name: string; kind: 'midi' | 'score' | 'text';
  ppq: number; tempos: Tempo[]; timeSigs: TimeSig[]; end: number; tracks: STrack[];
  /** chord symbols that came with the tune (score or typed chart) */
  given: GivenChord[];
  /** key the tune states itself (key signature, or a "key:" line) */
  key: { pc: number; mode: 'major' | 'minor' } | null;
}
const R = {
  tune: null as Tune | null, error: '',
  /** 'sky' = top notes of everything, else the index of the melody track */
  mel: 'sky' as 'sky' | number,
  /** key guesses, best first */
  keys: [] as KeyGuess[],
  /** corrected chords: tick where the chord starts → chord symbol as typed */
  edits: {} as Record<number, string>,
  /** use the written chord symbols, or hear the chords from the notes */
  src: 'given' as 'given' | 'heard',
  /** what is in the typed-chart box */
  text: '',
  msg: '', warn: '',
};
export const LEVEL_IDS: Level[] = ['light', 'medium', 'wild'];
const RHYTHMS = [['auto', 'Auto'], ['bar', 'Every bar'], ['half', 'Half bar'], ['beat', 'Every beat']] as const;
export const EXAMPLE_CHART = '4/4  key: C\n| Cmaj7 | Am7 | Dm7 | G7 |\n| Em7 A7 | Dm7 G7 | Cmaj7 | % |';

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
/** Make a key the home key. The progression on the Progression tab is left alone (the mode switch at the top would reset it). */
function useKey(g: { pc: number; mode: 'major' | 'minor' }): void {
  S.mode = g.mode; S.pc = g.pc;
  S.fromExt = null; S.toExt = null; S.lext = null; S.lnx = null;
}
function open(t: Tune): void {
  R.tune = t; R.edits = {}; R.msg = ''; R.error = ''; R.src = 'given';
  const notes = t.tracks.flatMap(x => x.notes);
  /* several tracks: a MIDI file offers the highest one as the melody; a score offers its first part */
  const avg = t.tracks.map(x => x.notes.reduce((s, n) => s + n.midi, 0) / Math.max(1, x.notes.length));
  R.mel = !t.tracks.length ? 'sky' : t.kind === 'score' ? 0 : t.tracks.length > 1 ? avg.indexOf(Math.max(...avg)) : 'sky';
  R.keys = detectKey(notes.length ? notes : chartNotes(t.given, t.end));
  /* a key the tune states itself goes first */
  if (t.key) R.keys = [{ ...t.key, r: 1 }, ...R.keys.filter(k => !(k.pc === t.key!.pc && k.mode === t.key!.mode))];
  if (R.keys[0]) useKey(R.keys[0]);
  S.rview = 'light';
}
function fail(e: unknown, what: string): void {
  R.tune = null;
  R.error = e instanceof SmfError || e instanceof ScoreError ? e.message : `This ${what} could not be read.`;
}
/** A MIDI file. */
export function loadBytes(bytes: Uint8Array, name: string): void {
  R.warn = '';
  try { const f = parseSmf(bytes); open({ name, kind: 'midi', ppq: f.ppq, tempos: f.tempos, timeSigs: f.timeSigs, end: f.end, tracks: f.tracks, given: [], key: null }); } catch (e) { fail(e, 'MIDI file'); }
}
/** A MusicXML score or lead sheet, as text. */
export function loadScore(xml: string, name: string): void {
  R.warn = '';
  try {
    const s = parseMusicXml(xml), approx = s.given.filter(g => g.approx).length;
    open({ name: s.title || name, kind: 'score', ppq: s.ppq, tempos: s.tempos, timeSigs: s.timeSigs, end: s.end, tracks: s.tracks, given: s.given, key: s.key });
    if (approx) R.warn = `${approx} chord symbol${approx === 1 ? ' uses' : 's use'} a chord type the app does not have: the nearest plain chord is shown. Tap a chord to correct it.`;
  } catch (e) { fail(e, 'score'); }
}
/** A chord chart typed as text. */
export function loadChart(text: string): void {
  R.text = text; R.warn = '';
  const c = parseChartText(text);
  if (!c.given.length) { R.tune = null; R.error = c.unread.length ? `No chords could be read. Not understood: ${c.unread.slice(0, 6).join(', ')}.` : 'Type some chords first, like | Cmaj7 | Dm7 G7 |.'; return; }
  open({ name: 'Typed chart', kind: 'text', ppq: TEXT_PPQ, tempos: [{ tick: 0, us: Math.round(6e7 / S.tempo) }], timeSigs: [{ tick: 0, ...c.timeSig }], end: c.end, tracks: [], given: c.given, key: c.key });
  if (c.unread.length) R.warn = `Not read as chords and left out: ${c.unread.slice(0, 8).join(', ')}.`;
}
/** Any file the user picks: MIDI, MusicXML, or compressed MusicXML. Other kinds get a plain explanation. */
export async function loadFile(bytes: Uint8Array, name: string): Promise<void> {
  const head = String.fromCharCode(...bytes.subarray(0, 4));
  if (head === 'MThd') { loadBytes(bytes, name); return; }
  if (head === '%PDF' || /\.(pdf|png|jpe?g|heic|gif|tiff?)$/i.test(name)) {
    R.tune = null; R.warn = '';
    R.error = 'A PDF or a photo of sheet music cannot be read: the app would have to guess every note from a picture. Export the score as MusicXML from your notation app (Logic, MuseScore, Sibelius, Dorico, Finale), or type the chords below.';
    return;
  }
  try { loadScore(await scoreText(bytes), name.replace(/\.(musicxml|xml|mxl)$/i, '')); } catch (e) { fail(e, 'file'); }
}

/* ---------- model ---------- */
export interface ReharmModel { f: Tune; bars: Bar[]; all: ANote[]; melody: ANote[]; segs: Seg[]; chart: ChartChord[]; re: Reharm | null; voiced: VoicedChord[]; /** the chords shown are the written ones */ written: boolean; /** there are notes to hear chords from */ canHear: boolean }
export function model(): ReharmModel | null {
  const f = R.tune;
  if (!f) return null;
  const key = curKey(), bars = barsOf(f);
  const all: ANote[] = f.tracks.flatMap((t, i) => t.notes.map(n => ({ tick: n.tick, dur: n.dur, midi: n.midi, track: i })));
  const own = R.mel === 'sky' ? all : all.filter(n => n.track === R.mel);
  const melody = skyline(own, f.ppq / 16), comp = R.mel === 'sky' ? all : all.filter(n => n.track !== R.mel);
  const canHear = all.length > 0 && (f.kind === 'midi' || comp.length > 0 || !f.given.length);
  const written = f.given.length > 0 && (R.src === 'given' || !canHear);
  const barOf = (tick: number): number => (bars.find(b => tick >= b.start && tick < b.end) ?? bars[bars.length - 1]).index;
  const raw: Seg[] = written
    ? f.given.map((g, i) => ({ start: g.tick, end: f.given[i + 1]?.tick ?? Math.max(f.end, g.tick + 1), bar: barOf(g.tick), chord: g.chord, alts: [], score: 1 }))
    : detectChart(comp.length ? comp : all, bars, key, S.rrhythm);
  const segs = raw.map(s => { const typed = R.edits[s.start] ? parseChord(R.edits[s.start]) : null; return typed ? { ...s, chord: typed } : s; });
  const chart = joinChart(segs), style = { genre: S.pgenre, feel: S.pfeel };
  const level = S.rview === 'orig' ? null : S.rview;
  const re = level ? reharmonize(chart, melody, bars, key, style, level) : null;
  const voiced = voiceChart(re ? re.chords : chart.map(c => ({ ...c, added: false })), melody, key, style, level ?? 'light');
  return { f, bars, all, melody, segs, chart, re, voiced, written, canHear };
}

/* ---------- output ---------- */
const sec = (m: ReharmModel, tick: number): number => tickToSec(tick, m.f);
function play(): void {
  const m = model();
  if (!m) return;
  const span = (tick: number, dur: number) => ({ t: sec(m, tick), dur: Math.max(0.08, sec(m, tick + dur) - sec(m, tick)) });
  /* the original as it was played, when the tune has its own accompaniment */
  if (S.rview === 'orig' && m.all.length > m.melody.length) {
    playRaw(m.all.map(n => ({ ...span(n.tick, n.dur), midi: n.midi, vol: m.melody.includes(n) ? 0.16 : 0.1 })), m.voiced.map((c, i) => ({ t: sec(m, c.start), id: 'rc' + i })), 'x');
    return;
  }
  const notes = [
    ...m.melody.map(n => ({ ...span(n.tick, n.dur), midi: n.midi, vol: 0.17 })),
    ...m.voiced.flatMap((c, ci) => chordMidis(m, ci).map((midi, k) => ({ ...span(c.start, c.end - c.start), t: span(c.start, c.end - c.start).t + (S.inst === 'guitar' ? k * 0.022 : 0), midi, vol: midi === c.lead ? 0.13 : 0.09, ...(S.inst === 'guitar' ? { inst: 'guitar' as const } : {}) }))),
  ];
  playRaw(notes, m.voiced.map((c, i) => ({ t: sec(m, c.start), id: 'rc' + i })), 'x');
}
/** The version as a MIDI file: the melody track (when the tune has one) and the chord track, on the tune's own ticks, tempo and time signature. */
export function reharmFile(m: Pick<ReharmModel, 'f' | 'melody' | 'voiced'>, label: string, grips?: Grip[]): Uint8Array {
  const gap = Math.round(m.f.ppq / 24);
  return writeSmf({
    ppq: m.f.ppq, tempos: m.f.tempos, timeSigs: m.f.timeSigs,
    tracks: [
      ...(m.melody.length ? [{ name: 'Melody', notes: m.melody.map(n => ({ tick: n.tick, dur: n.dur, midi: n.midi, vel: 96, ch: 0 })) }] : []),
      { name: 'Chords ' + label, notes: m.voiced.flatMap((c, i) => (grips?.[i] ? grips[i].notes.map(n => n.midi) : c.notes.map(n => n.midi)).map(midi => ({ tick: c.start, dur: Math.max(1, c.end - c.start - gap), midi, vel: 72, ch: 1 }))) },
    ],
  });
}
function download(): void {
  const m = model();
  if (!m) return;
  const label = S.rview === 'orig' ? 'original chords' : S.rview;
  const blob = new Blob([reharmFile(m, label, S.inst === 'guitar' ? guitarGrips(m) : undefined) as BlobPart], { type: 'audio/midi' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${m.f.name.replace(/\.midi?$/i, '') || 'reharm'} - ${label}.mid`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  R.msg = m.f.kind === 'midi'
    ? `Saved "${a.download}". Drag it into Logic at the start of the original region: it has the same tempo, time signature and bar positions.`
    : `Saved "${a.download}". Drag it into Logic: the chords are voiced as shown, one chord track${m.melody.length ? ' and the melody' : ''}.`;
}
function toPlayIt(): void {
  const m = model();
  if (!m) return;
  const key = curKey();
  if (S.inst === 'guitar') {
    const grips = guitarGrips(m);
    keptSet(m.voiced.map((c, i): KeptVoicing => ({ sym: c.chord.symbol, name: grips[i].name + ' · ' + grips[i].sub, notes: grips[i].notes.map((n, k) => ({ m: n.midi, n: noteName(n.note), lab: n.label, h: k === grips[i].notes.length - 1 ? 'R' : 'L' })), grip: grips[i] })));
    S.px = 'lead'; S.tab = 'play';
    return;
  }
  keptSet(m.voiced.map((c): KeptVoicing => {
    const notes: KeptVoicing['notes'] = c.notes.map(n => ({ m: n.midi, n: noteName(n.note), lab: n.label, h: n.midi === c.lead ? 'R' : 'L' }));
    /* the melody note is part of what you play, spelled the way the chord spells it */
    if (c.top !== null) { const mc = melodyCheck(c.chord, c.top, null, key); notes.push({ m: c.top, n: noteName(mc.note), lab: mc.label, h: 'R' }); }
    return { sym: c.chord.symbol, name: c.voicing, notes };
  }));
  S.px = 'lead'; S.tab = 'play';
}

/* ---------- actions ---------- */
/** Clicks on the Reharm tab. Returns true when handled and the tab should be drawn again, 'none' when handled without a redraw. */
export function reharmAction(a: string, d: DOMStringMap): boolean | 'none' {
  switch (a) {
    case 'rdemo': loadBytes(demoFile(), 'Example tune.mid'); return true;
    case 'rtext': loadChart(document.querySelector<HTMLTextAreaElement>('.rtext')?.value ?? R.text); return true;
    case 'rtextdemo': loadChart(EXAMPLE_CHART); return true;
    case 'rclose': R.tune = null; R.error = ''; R.msg = ''; R.warn = ''; return true;
    case 'rmel': R.mel = d.v === 'sky' ? 'sky' : +d.v!; R.edits = {}; return true;
    case 'rsrc': R.src = d.v === 'heard' ? 'heard' : 'given'; R.edits = {}; return true;
    case 'rrhythm': S.rrhythm = d.v as typeof S.rrhythm; R.edits = {}; return true;
    case 'rkey': { const g = R.keys[+d.i!]; if (g) { const written = model()?.written; useKey(g); if (!written) R.edits = {}; } return true; }
    case 'rview': S.rview = d.v as typeof S.rview; R.msg = ''; return true;
    case 'rplay': if (S.playing) stopAll(); else play(); return 'none';
    case 'rdown': download(); return true;
    case 'rsend': toPlayIt(); toTop(); return true;
    case 'rgrip': { const g = RGR[+d.i!]; if (g) playGrip(g.notes.map(n => n.midi)); return 'none'; }
    case 'rhear': { const mm = model(); if (mm && S.inst === 'guitar') { const g = guitarGrips(mm)[+d.i!]; if (g) playGrip(g.notes.map(n => n.midi)); return 'none'; } const c = mm?.voiced[+d.i!]; if (c) playNotes([...c.notes.map(n => n.midi), ...(c.top !== null ? [c.top] : [])]); return 'none'; }
    case 'ralt': R.edits[+d.t!] = d.s!; return true;
    case 'rreset': delete R.edits[+d.t!]; return true;
  }
  return false;
}
/** A chord typed into the correction box of one chord of the chart. */
export function reharmTyped(tick: number, value: string | null): void {
  if (!value) { delete R.edits[tick]; return; }
  if (parseChord(value)) { R.edits[tick] = value; R.msg = ''; } else R.msg = `Can't read "${value}" as a chord. Try Dm7, G7b9, Ebmaj7 or C/G.`;
}
/** The correction sheet for one chord of the chart. */
export function editSheetHTML(i: number): string {
  const m = model(), s = m?.segs[i];
  if (!m || !s) return '';
  const opts = [...(s.chord ? [s.chord] : []), ...s.alts].filter((c, k, arr) => arr.findIndex(x => x.symbol === c.symbol) === k);
  return `<div class="vh"><span class="vs" style="font-size:1.5rem">Bar ${s.bar + 1}</span><span class="small">What chord is it? ${opts.length > 1 ? 'Pick a reading or type the chord.' : 'Type the chord.'}</span><button class="vx" data-a="vclose" aria-label="Close">×</button></div>
    <div class="ways">${opts.map(c => `<button class="way" data-a="ralt" data-t="${s.start}" data-s="${esc(c.symbol)}" aria-pressed="${c.symbol === s.chord?.symbol}"><span class="wn">${c.symbol}</span><span class="wc">${romanNumeral(c, curKey())}</span></button>`).join('')}</div>
    <div class="psymrow" style="margin-top:12px"><input class="psym" data-f="rchord" data-t="${s.start}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type the chord and press Enter: Dm7, G7b9, C/G" aria-label="Type the chord for bar ${s.bar + 1}">${R.edits[s.start] ? `<button class="pill sm" data-a="rreset" data-t="${s.start}">Back to ${m.written ? 'what was written' : 'what was heard'}</button>` : ''}</div>`;
}

/* ---------- view ---------- */
function barsHTML(m: ReharmModel, cells: { bar: number; html: string; span: number }[]): string {
  const byBar = new Map<number, { html: string; span: number }[]>();
  cells.forEach(c => { if (!byBar.has(c.bar)) byBar.set(c.bar, []); byBar.get(c.bar)!.push(c); });
  return `<div class="rbars">${m.bars.map(b => `<div class="rbar"><span class="rbn">${b.index + 1}</span><div class="rbc">${(byBar.get(b.index) ?? [{ html: '<span class="rcell rest"><b>–</b></span>', span: 1 }]).map(c => `<div style="flex:${Math.max(1, c.span)} 1 0">${c.html}</div>`).join('')}</div></div>`).join('')}</div>`;
}
function chartHTML(m: ReharmModel): string {
  const key = curKey();
  return barsHTML(m, m.segs.map((s, i) => ({
    bar: s.bar, span: Math.min(s.end, m.bars[s.bar]?.end ?? s.end) - s.start,
    html: `<button class="rcell${R.edits[s.start] ? ' edited' : ''}${s.chord ? '' : ' rest'}" data-a="redit" data-i="${i}" aria-label="Bar ${s.bar + 1}: ${s.chord?.symbol ?? 'no chord'}. Tap to correct."><b>${s.chord?.symbol ?? '–'}</b><small>${s.chord ? romanNumeral(s.chord, key) : 'carries on'}</small></button>`,
  })));
}
function versionHTML(m: ReharmModel): string {
  const key = curKey();
  /* a chord that runs over a bar line is shown once, in the bar where it starts */
  return barsHTML(m, m.voiced.map((c, i) => ({
    bar: c.bar, span: Math.min(c.end, m.bars[c.bar]?.end ?? c.end) - c.start,
    html: `<button class="rcell${c.added ? ' added' : ''}" data-a="rhear" data-i="${i}" data-ev="rc${i}" aria-label="Hear ${c.chord.symbol}"><b>${c.chord.symbol}</b><small>${romanNumeral(c.chord, key)}</small></button>`,
  })));
}
const signed = (n: number): string => (n === 0 ? 'stays' : (n > 0 ? '↑' : '↓') + Math.abs(n));
/** Every chord's voicing, top note first, with how far each note moved from the chord before. */
/** Guitar: the smoothest grips through the chart (the melody is not matched here; use the Melody tab for that). */
let RGR: Grip[] = [];
export const guitarGrips = (m: ReharmModel): Grip[] => voiceLead(m.voiced.map(c => c.chord), styleForGenre(S.pgenre));
/** The notes of chord i for the chosen instrument: what is shown, played, exported and practised. */
export function chordMidis(m: ReharmModel, i: number): number[] {
  if (S.inst === 'guitar') { RGR = guitarGrips(m); return RGR[i]?.notes.map(n => n.midi) ?? []; }
  return m.voiced[i].notes.map(n => n.midi);
}
function guitarVoicingsHTML(m: ReharmModel): string {
  RGR = guitarGrips(m);
  const cols = m.voiced.map((c, i) => `${i > 0 ? '<div class="lvarr">→</div>' : ''}<button class="lvcol${c.added ? ' added' : ''}" data-a="rgrip" data-i="${i}" data-ev="rc${i}" aria-label="Hear ${c.chord.symbol}"><span class="cs2">${c.chord.symbol}</span><span class="small">${RGR[i] ? RGR[i].name : ''} · bar ${c.bar + 1}</span>${RGR[i] ? chordBox(RGR[i], c.chord.symbol) + `<span class="small">${gripText(RGR[i])}</span>` : ''}</button>`).join('');
  return `<div class="panel"><h3>Guitar grips, chord to chord</h3>
    <p class="small" style="margin:0 0 10px">One shape per chord, picked so your hand moves as little as possible and notes that can stay put do. Tap a chord to hear it. These shapes do not follow the melody; for that, use the Melody tab.</p>
    <div class="lvline scrollx">${cols}</div></div>`;
}
function voicingsHTML(m: ReharmModel): string {
  if (S.inst === 'guitar') return guitarVoicingsHTML(m);
  const key = curKey();
  let total = 0, voices = 0, common = 0;
  const cols = m.voiced.map((c, i) => {
    const mo = c.motion, by = new Map<number, number>();
    if (mo) { mo.moves.forEach(x => by.set(x.to, x.semis)); total += mo.total; voices += mo.moves.length; common += mo.common; }
    const mel = c.top !== null ? melodyCheck(c.chord, c.top, null, key) : null;
    const rows = [
      ...(mel ? [{ midi: c.top!, name: pitchName(c.top!, mel.note), lab: mel.label, hc: 'var(--gold)' }] : []),
      ...[...c.notes].reverse().map(n => ({ midi: n.midi, name: pitchName(n.midi, n.note), lab: n.label, hc: n.midi === c.lead ? 'var(--gold)' : 'var(--c0)' })),
    ].map(r => {
      const mv = by.get(r.midi);
      return `<span class="lvn${mv === 0 ? ' stay' : ''}" style="--hc:${r.hc}"><b>${r.name}</b><small>${r.lab}${mv === undefined ? (mo ? ' · bass' : '') : ' · ' + signed(mv)}</small></span>`;
    }).join('');
    return `${i > 0 ? `<div class="lvarr">→<small>${mo ? mo.total : ''}</small></div>` : ''}<button class="lvcol${c.added ? ' added' : ''}" data-a="rhear" data-i="${i}" data-ev="rc${i}" aria-label="Hear ${c.chord.symbol}, ${c.voicing}"><span class="cs2">${c.chord.symbol}</span><span class="small">${c.voicing} · bar ${c.bar + 1}</span>${rows}</button>`;
  }).join('');
  const avg = voices ? (total / voices).toFixed(1) : '0';
  return `<div class="panel"><h3>Voicings, and how the notes move</h3>
    <p class="small" style="margin:0 0 10px">One column per chord, top note first${m.melody.length ? ' (gold = the melody note)' : ' (gold = the top note the app chose: the chord tone nearest to the one before)'}. Under every note you see how far it moved from the chord before, in half steps. The number on each arrow is the total. Each voicing is the smoothest one from the chord before it${m.melody.length ? ', under the melody' : ''}. A low root added for the bass is marked "bass" and not counted.</p>
    <div class="lvline scrollx">${cols}</div>
    <p class="small" style="margin:10px 0 0">In all: <b>${avg}</b> semitones per voice on average, <b>${common}</b> note${common === 1 ? '' : 's'} held over from one chord to the next. Tap a column to hear it. For every other voicing of one chord, use the Melody tab.</p></div>`;
}
function changesHTML(re: Reharm): string {
  const labels = (n: number) => (n === 4 ? ['What it is', 'How the notes move', 'Notes from outside the key', 'Why it pulls'] : ['What it is', 'Notes from outside the key', 'Why it pulls']);
  return `<div class="rchanges">${re.changes.map(c => {
    const main = c.lines.filter(l => !l.startsWith('Melody: ')), mel = c.lines.filter(l => l.startsWith('Melody: ')), lab = labels(main.length);
    return `<div class="rchange"><div class="rch"><span class="tag">Bar ${c.bar + 1}</span><b>${c.from.symbol} → <em>${c.way.chords.map(x => x.symbol).join(' → ')}</em> → ${c.to.symbol}</b><span class="small">${c.way.name}${c.way.variantLabel ? ' · ' + c.way.variantLabel : ''}</span></div>
      ${main.map((l, i) => `<p><span class="whyl">${lab[i] ?? ''}</span>${l.replace(/^Voice leading: /, '')}</p>`).join('')}
      ${mel.length ? `<p><span class="whyl">Melody</span>${mel.map(l => l.replace(/^Melody: /, '')).join('<br>')}</p>` : ''}</div>`;
  }).join('')}</div>`;
}
const PICK = '<label class="pill go rfilebtn">Choose a file<input class="rfile" type="file" accept=".mid,.midi,.musicxml,.xml,.mxl,audio/midi,audio/x-midi,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml" hidden></label>';
const textBox = (): string => `<textarea class="rtext" rows="4" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="| Cmaj7 | Am7 | Dm7 G7 | Cmaj7 |" aria-label="Type a chord chart">${esc(R.text)}</textarea>
  <p class="small" style="margin:8px 0 10px">Bars between <b>|</b> lines. Two chords in a bar share it. <b>%</b> repeats the bar before. Optional first line: a time signature and key, like <b>3/4 key: F</b>.</p>
  <div class="controls" style="justify-content:flex-start"><button class="pill go" data-a="rtext">Read this chart</button><button class="pill" data-a="rtextdemo">Try an example chart</button></div>`;

function emptyHTML(): string {
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Reharm · from your music</div><h2>Bring in a tune, get voicings and <em>reharms</em></h2></div>
   ${R.error ? `<div class="panel rerrbox"><p class="rerr" style="margin:0">${esc(R.error)}</p></div>` : ''}
   <div class="panel"><h3>A MIDI file, a score or a lead sheet</h3>
     <ul class="rsteps" style="margin-bottom:12px"><li><b>MIDI file</b> (.mid). In Logic: select the region, then File → Export → Selection as MIDI File. The chords are heard from the notes.</li>
       <li><b>Score or lead sheet</b> as MusicXML (.musicxml, .xml, .mxl). In Logic: File → Export → Score as MusicXML. MuseScore, Sibelius, Dorico and Finale export it too. Written chord symbols are used as they are.</li></ul>
     <div class="controls" style="justify-content:flex-start">${PICK}<button class="pill" data-a="rdemo">Try the example tune</button></div>
     <p class="small" style="margin:12px 0 0">The file stays on this device: nothing is uploaded. A PDF or a photo of sheet music cannot be read; export MusicXML or type the chords.</p></div>
   <div class="panel"><h3>Or type the chords of a lead sheet</h3>${textBox()}</div>
   <div class="panel"><h3>What you get</h3><ol class="rsteps"><li>The key and the chord chart, which you can correct chord by chord.</li><li>A voicing for every chord, each one the smoothest from the chord before, with every voice's movement shown.</li><li>Three versions with extra passing chords (light, medium, wild) in the genre and feel you pick, with the reason for every change. Under a melody, only chords the melody fits are used.</li><li>Play it, download it as a MIDI file for Logic, or practise the voicings in Play it.</li></ol></div>
  </div>`;
}

export function viewReharm(): string {
  const m = model();
  if (!m) return emptyHTML();
  const f = m.f, g = R.keys[0];
  const sig = [...new Set(m.bars.map(b => `${b.num}/${b.den}`))].join(', ');
  const kindName = { midi: 'MIDI file', score: 'Score', text: 'Typed chart' }[f.kind];
  const info = [`${m.bars.length} bars`, sig, ...(f.kind === 'text' ? [] : [`${bpmOf(f)} bpm${f.tempos.length > 1 ? ' at the start' : ''}`]), ...(f.tracks.length ? [`${f.tracks.length} ${f.kind === 'score' ? 'staff or part' : 'track'}${f.tracks.length === 1 ? '' : 's'}`, `${m.all.length} notes`] : ['no melody']), ...(f.given.length ? [`${f.given.length} chord symbols`] : [])].join(' · ');
  const tracks = f.tracks.length > 1
    ? `<div class="pcrow"><span class="lbl">Melody</span><div class="seg wrap" role="group" aria-label="Which part is the melody">${f.tracks.map((t, i) => `<button data-a="rmel" data-v="${i}" aria-pressed="${R.mel === i}">${esc(t.name)}</button>`).join('')}<button data-a="rmel" data-v="sky" aria-pressed="${R.mel === 'sky'}">Top notes of everything</button></div></div>`
    : f.tracks.length ? '<p class="small" style="margin:0">The melody is read as the top note of everything that is played.</p>'
      : '<p class="small" style="margin:0">A chart with no melody: the app chooses a top note for each chord so the top voice moves as little as possible.</p>';
  const keyAlts = R.keys.slice(0, 4).map((k, i) => `<button data-a="rkey" data-i="${i}" aria-pressed="${k.pc === S.pc && k.mode === S.mode}">${homeTitle(homeKey(k.pc, k.mode))}</button>`).join('');
  const keyNote = !g ? '' : f.key ? `<b>${homeTitle(homeKey(g.pc, g.mode))}</b> is ${f.kind === 'text' ? 'the key you typed' : 'the key signature of the score'}. ` : `Best match: <b>${homeTitle(homeKey(g.pc, g.mode))}</b> (its notes are held longest). `;
  const srcRow = f.given.length && m.canHear ? `<div class="pcrow"><span class="lbl">Chords</span><div class="seg wrap" role="group" aria-label="Where the chords come from"><button data-a="rsrc" data-v="given" aria-pressed="${m.written}">Written chord symbols</button><button data-a="rsrc" data-v="heard" aria-pressed="${!m.written}">Heard from the notes</button></div></div>` : '';
  const rhythmRow = m.written ? '' : `<div class="pcrow"><span class="lbl">Chords change</span><div class="seg wrap" role="group" aria-label="How often the chords change">${RHYTHMS.map(([k, l]) => `<button data-a="rrhythm" data-v="${k}" aria-pressed="${S.rrhythm === k}">${l}</button>`).join('')}</div></div>`;
  const edits = Object.keys(R.edits).length;
  const re = m.re, lv = S.rview === 'orig' ? null : LEVELS[S.rview];
  const hasOwn = m.all.length > m.melody.length;
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Reharm · ${curTitle()}</div><h2>Voicings and <em>reharms</em> for your tune</h2></div>
   <div class="panel"><h3>1 · ${kindName}: ${esc(f.name)}</h3>
     <p class="small" style="margin:0 0 10px">${info}</p>
     ${tracks}
     ${R.warn ? `<p class="small rwarn">${esc(R.warn)}</p>` : ''}
     ${f.kind === 'text' ? `<div style="margin-top:12px">${textBox()}</div>` : ''}
     <div class="controls" style="justify-content:flex-start;margin-top:12px">${PICK}<button class="pill sm" data-a="rclose">Close this tune</button></div>
     ${R.error ? `<p class="small rerr">${esc(R.error)}</p>` : ''}</div>
   <div class="panel"><h3>2 · ${m.written ? 'The chart' : 'What the app hears'}</h3>
     <div class="pcrow"><span class="lbl">Key</span><div class="seg wrap" role="group" aria-label="Key of the tune">${keyAlts}</div></div>
     <p class="small" style="margin:6px 0 10px">${keyNote}The home key button at the top sets any other key.</p>
     ${srcRow}${rhythmRow}
     ${chartHTML(m)}
     <p class="small" style="margin:10px 0 0">Tap any chord to correct it${edits ? ` (${edits} corrected, marked with a dot)` : ''}. "–" means no new chord: the chord before carries on.</p></div>
   <div class="panel"><h3>3 · Versions</h3>
     <div class="pcrow"><span class="lbl">Genre</span><div class="seg wrap" role="group" aria-label="Genre">${GENRE_IDS.map(k => `<button data-a="pgenre" data-v="${k}" aria-pressed="${S.pgenre === k}">${GENRES[k].label}</button>`).join('')}</div></div>
     <div class="pcrow"><span class="lbl">Feel</span><div class="seg wrap" role="group" aria-label="Feel">${FEELS.map(k => `<button data-a="pfeel" data-v="${k}" aria-pressed="${S.pfeel === k}">${FEEL_LABELS[k]}</button>`).join('')}</div></div>
     <div class="pcrow"><span class="lbl">Version</span><div class="seg wrap" role="group" aria-label="Which version">${[['orig', 'Original chords'], ...LEVEL_IDS.map(l => [l, LEVELS[l].label + ' reharm'])].map(([k, l]) => `<button data-a="rview" data-v="${k}" aria-pressed="${S.rview === k}">${l}</button>`).join('')}</div></div>
     <p class="small" style="margin:6px 0 10px">${lv ? lv.about : 'The chords of the chart above, with a voicing for each.'}</p>
     ${re ? `<p class="rsum">${re.summary}</p>` : ''}
     ${versionHTML(m)}
     <p class="small" style="margin:10px 0 0">${re ? 'Gold chords are new. ' : ''}Tap a chord to hear its voicing.</p>
     <div class="controls" style="justify-content:flex-start;margin-top:12px"><button class="pill go" data-a="rplay">▶ Play / stop ${S.rview === 'orig' ? (hasOwn ? 'the original as played' : 'the original chords') : 'this version'}</button><button class="pill" data-a="rdown">Download .mid</button><button class="pill" data-a="rsend">Practice in Play it</button></div>
     ${R.msg ? `<p class="small lmsg">${esc(R.msg)}</p>` : ''}
     <p class="small" style="margin:10px 0 0">Sound goes to the output chosen under Sound (built-in synth, or a MIDI port into Logic). The download has ${m.melody.length ? 'two tracks: the melody and the chords' : 'one track: the chords'}, on the tune's own bars and tempo.</p></div>
   ${voicingsHTML(m)}
   ${re && re.changes.length ? `<div class="panel why"><h3>Why each change works</h3>${changesHTML(re)}</div>` : ''}
  </div>`;
}
