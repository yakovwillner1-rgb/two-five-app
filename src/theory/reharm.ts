import { GENRES, type Style } from '../data/styles';
import type { Bar } from '../midi/smf';
import { feltBeat, melodyAt, type ANote } from './analyze';
import { leadVoicings, melodyCheck, rankLead, voiceMotion, type LeadVoicing, type Motion } from './lead';
import { fmt, mod, pcOf } from './notes';
import { passingChords } from './passing/engine';
import { scoreOf } from './passing/rank';
import type { Suggestion } from './passing/types';
import { passVoicing, type PChord } from './symbols';
import { plainOf } from './tensions';
import type { Key, Note } from './types';

/*
 * Reharmonizing a chord chart under a melody. Pure: chart + melody + key + style + level → a new chart.
 * At every change of chord the passing engine (Phase 1) lists the ways to get from one chord to the
 * next. A way is used only where the melody allows it: every melody note that sounds over a new
 * chord must be a chord tone or an available tension of that chord (Phase 2 melody check).
 * The original chords stay where they are; passing chords take the end of the chord before.
 * Rules: docs/THEORY_SOURCES.md rule 35.
 */
export type Level = 'light' | 'medium' | 'wild';
export interface ChartChord { start: number; end: number; chord: PChord; bar: number }
export interface RChord extends ChartChord { /** a passing chord put in by the reharm */ added: boolean; /** index into `changes` */ change?: number }
export interface Change {
  /** bar (0-based) where the passing chords start, and the tick */
  bar: number; at: number;
  way: Suggestion; from: PChord; to: PChord;
  /** what it is, voice leading, borrowed notes, why it pulls, then one line per melody note it sits under */
  lines: string[];
}
export interface Reharm { level: Level; chords: RChord[]; changes: Change[]; summary: string }

/** What each level may do. Tunable, like the style weights. */
export const LEVELS: Record<Level, { label: string; /** most passing chords at one spot */ maxChords: number; /** ways above this tension are not used */ maxTension: number; /** a chord must last this many beats before anything is put in front of the next */ minBeats: number; about: string }> = {
  light: { label: 'Light', maxChords: 1, maxTension: 0.45, minBeats: 3, about: 'One calm passing chord, only after a chord that lasts three beats or more, on its last beat.' },
  medium: { label: 'Medium', maxChords: 2, maxTension: 0.75, minBeats: 2, about: 'One or two passing chords wherever a chord lasts two beats or more.' },
  wild: { label: 'Wild', maxChords: 4, maxTension: 1, minBeats: 2, about: 'The tense ways first (Coltrane cycles, upper structures, tritone subs), up to four passing chords.' },
};
/** A melody note shorter than this share of a beat over a chord is a passing note: it is not checked. */
export const PASSING_SHARE = 0.25;

const beatAt = (bars: Bar[], tick: number): number => feltBeat(bars.find(b => tick >= b.start && tick < b.end) ?? bars[bars.length - 1]);
const barAt = (bars: Bar[], tick: number): number => (bars.find(b => tick >= b.start && tick < b.end) ?? bars[bars.length - 1]).index;

/** Melody notes that sound long enough over [a, b) to be heard against the chord. */
function heard(melody: ANote[], a: number, b: number, beat: number): ANote[] {
  return melody.filter(n => Math.min(n.tick + n.dur, b) - Math.max(n.tick, a) >= beat * PASSING_SHARE);
}
/** Does every melody note over the chord fit it (chord tone or available tension)? */
export function melodyFits(c: PChord, next: PChord | null, melody: ANote[], a: number, b: number, beat: number, key: Key): boolean {
  return heard(melody, a, b, beat).every(n => { const r = melodyCheck(c, n.midi, next, key).role; return r === 'chord' || r === 'tension'; });
}

/** Ticks each passing chord gets, or 0 when the chord before is too short for `n` of them at this level. */
export function slotLength(level: Level, n: number, beats: number, beat: number): number {
  const L = LEVELS[level];
  if (n > L.maxChords || beats < L.minBeats) return 0;
  /* one chord after a long chord gets two beats (medium, wild); otherwise one beat each */
  const each = n === 1 && beats >= 4 && level !== 'light' ? 2 : 1;
  /* the original chord keeps at least as long as what is put after it */
  return beats >= 2 * n * each ? each * beat : beats >= 2 * n ? beat : 0;
}

export function reharmonize(chart: ChartChord[], melody: ANote[], bars: Bar[], key: Key, style: Style, level: Level): Reharm {
  const L = LEVELS[level], used: Record<string, number> = {}, chords: RChord[] = [], changes: Change[] = [];
  chart.forEach((cur, i) => {
    const next = chart[i + 1];
    let end = cur.end;
    const added: RChord[] = [];
    if (next) {
      const beat = beatAt(bars, cur.end - 1), beats = Math.round((cur.end - cur.start) / beat);
      const ways = passingChords(cur.chord, next.chord, key)
        /* a way that goes back through the chord we are leaving (G7 → Dm7 → G7 → C) is not a passing move */
        .filter(s => !s.chords.some(c => plainOf(c).symbol === plainOf(cur.chord).symbol))
        .filter(s => !s.replacesFrom && s.tension <= Math.min(L.maxTension, level === 'wild' ? 1 : GENRES[style.genre].maxTension))
        .map((s, k) => {
          /* wild leans to the tense ways; every level leans away from a technique it has already used */
          const base = scoreOf(s, style) * (level === 'wild' ? 0.4 + s.tension : 1) * 0.6 ** (used[s.techniqueId] ?? 0);
          return { s, base, k };
        })
        .filter(x => x.base > 0)
        .sort((a, b) => b.base - a.base || a.s.tension - b.s.tension || a.k - b.k);
      for (const { s } of ways) {
        const slot = slotLength(level, s.chords.length, beats, beat);
        if (!slot) continue;
        const from = cur.end - slot * s.chords.length;
        const fits = s.chords.every((c, j) => melodyFits(c, s.chords[j + 1] ?? next.chord, melody, from + j * slot, from + (j + 1) * slot, beat, key));
        if (!fits) continue;
        used[s.techniqueId] = (used[s.techniqueId] ?? 0) + 1;
        end = from;
        const lines = [...s.explanation];
        s.chords.forEach((c, j) => {
          const m = melodyAt(melody, from + j * slot, from + (j + 1) * slot);
          if (m) lines.push('Melody: ' + melodyCheck(c, m.midi, s.chords[j + 1] ?? next.chord, key).text);
          added.push({ start: from + j * slot, end: from + (j + 1) * slot, chord: c, bar: barAt(bars, from + j * slot), added: true, change: changes.length });
        });
        changes.push({ bar: barAt(bars, from), at: from, way: s, from: cur.chord, to: next.chord, lines });
        break;
      }
    }
    chords.push({ ...cur, end, added: false }, ...added);
  });
  return { level, chords, changes, summary: summaryOf(level, changes) };
}

/** One line: what the reharm did. */
export function summaryOf(level: Level, changes: Change[]): string {
  if (!changes.length) return `${LEVELS[level].label}: no change. Nothing in this style fits under the melody at this level.`;
  const parts = changes.map(c => `bar ${c.bar + 1}: ${c.way.name.charAt(0).toLowerCase() + c.way.name.slice(1)} (${c.way.chords.map(x => x.symbol).join(' → ')}) into ${c.to.symbol}`);
  return `${LEVELS[level].label}: ${changes.length} change${changes.length === 1 ? '' : 's'}. ${parts.join('; ').replace(/^b/, 'B')}.`;
}

/* ---------- voicing the chart under the melody ---------- */
export interface VNote { midi: number; note: Note; label: string }
export interface VoicedChord extends RChord {
  /** the notes of the chord part, low to high. Under a melody the melody note is left to the melody track; with no melody the top note is part of it */
  notes: VNote[];
  /** the melody note the voicing was built under, when there is one */
  top: number | null;
  /** with no melody over the chord: the top note that was chosen for it (it is in `notes`) */
  lead: number | null;
  /** name of the voicing type, e.g. "Rootless A + melody", or "Root position" for the fallback */
  voicing: string;
  /** how the notes got here from the chord before (null for the first chord) */
  motion: Motion | null;
}
/** Where the top voice starts when there is no melody: the chord tone nearest to C5. */
export const TOP_START = 72;
/**
 * With no melody over a chord, the top note is chosen: the chord tone (not the root of a 7th chord)
 * nearest to the top note of the chord before, so the top voice moves as little as possible.
 */
export function chooseTop(c: PChord, prevTop: number | null): number {
  const pcs = c.tones.filter((_t, i) => c.tones.length <= 3 || i > 0).map(pcOf), aim = prevTop ?? TOP_START;
  let best = aim, dist = 99;
  pcs.forEach(pc => {
    for (let m = pc + 48; m <= 88; m += 12) {
      if (m < 62) continue;
      const d = Math.abs(m - aim);
      if (d < dist || (d === dist && m < best)) { dist = d; best = m; }
    }
  });
  return best;
}
/**
 * Voice every chord (Phase 2). Under a melody: the voicing sits under the melody note that sounds
 * when the chord starts. With no melody: the top note is chosen by `chooseTop`. Either way the
 * smoothest voicing from the chord before wins. A chord whose melody note clashes with it gets a
 * plain root-position voicing. The root is added in the bass (C2–B2) when the voicing has none,
 * so the chord part sounds complete on its own.
 */
export function voiceChart(chords: RChord[], melody: ANote[], key: Key, style: Style, level: Level): VoicedChord[] {
  let prev: number[] | null = null, prevTop: number | null = null, prevAll: number[] | null = null;
  return chords.map((c, i) => {
    const next = chords[i + 1]?.chord ?? null, m = melodyAt(melody, c.start, c.end);
    const lead = m ? null : chooseTop(c.chord, prevTop), top = m ? m.midi : lead!;
    const usable = (v: LeadVoicing): boolean => v.type !== 'block' && !(v.type === 'sixthDim' && v.sounds !== undefined && /°7$/.test(v.sounds)) && (v.type !== 'upper' || level === 'wild');
    const list = leadVoicings(c.chord, top, next, key).filter(usable);
    const pick = list.length ? rankLead(list, prev, GENRES[style.genre].voicings)[0].voicing : null;
    let notes: VNote[], voicing: string;
    if (pick) {
      notes = (m ? pick.notes.slice(0, -1) : pick.notes).map(n => ({ midi: n.midi, note: n.note, label: n.label }));
      voicing = m ? pick.name : pick.name.replace(' + melody', '');
      prev = pick.notes.map(n => n.midi);
      prevTop = top;
    } else {
      notes = passVoicing(c.chord).map(n => ({ midi: n.midi, note: n.note, label: n.label }));
      voicing = 'Root position';
      prev = notes.map(n => n.midi);
      prevTop = Math.max(...prev);
    }
    /* voice leading is measured on the voicing itself (with the melody note over it). The bass root
       added below is left out: a bass line follows the roots and leaps by 4ths and 5ths */
    const all = [...notes.map(n => n.midi), ...(m && pick ? [m.midi] : [])];
    const motion = prevAll ? voiceMotion(prevAll, all) : null;
    prevAll = all;
    const bass = c.chord.bass ?? c.chord.root;
    if (!notes.some(n => mod(n.midi, 12) === pcOf(bass))) notes = [{ midi: 36 + pcOf(bass), note: bass, label: c.chord.bass ? fmt(bass) : 'R' }, ...notes];
    notes.sort((a, b) => a.midi - b.midi);
    return { ...c, notes, top: m && pick ? m.midi : null, lead: pick ? lead : null, voicing, motion };
  });
}
