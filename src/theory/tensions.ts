import { fmt, mod, pcOf, transpose } from './notes';
import { IV, degreeLabel, famOfKind, makeChord, type KindId, type PChord } from './symbols';
import type { Interval, Key, Note } from './types';

/*
 * Chord scales, available tensions and avoid notes (chord-scale theory).
 * Rules and sources: docs/THEORY_SOURCES.md. In short:
 *  - a chord scale = chord tones + available tensions + avoid notes;
 *  - a scale note a whole step above a chord tone is an available tension;
 *  - a scale note a half step above a chord tone is a harmonic avoid note;
 *  - dominant chords are the exception: ♭9, ♯9 and ♭13 are available, the 11 (a half step above
 *    the 3rd) is not.
 */
const { m2, M2, A2, m3, M3, P4, A4, d5, P5, A5, m6, M6, d7, m7, M7 } = IV;

export type ScaleId =
  | 'ionian' | 'lydian' | 'dorian' | 'phrygian' | 'aeolian' | 'melodicMinor'
  | 'mixolydian' | 'lydianDominant' | 'mixolydianb13' | 'phrygianDominant' | 'altered' | 'halfWhole' | 'wholeTone' | 'mixolydianSus'
  | 'locrian' | 'locrianNat2' | 'wholeHalf' | 'lydianAug';
interface ScaleDef {
  name: string;
  /** where the scale comes from */
  parent: string;
  /** the plain chord whose tones are the chord tones */
  kind: KindId;
  /** scale notes above the root */
  ivs: Interval[];
  /** labels of the avoid notes */
  avoid: string[];
  /** tensions that are in the scale but that the books disagree on */
  caution?: Record<string, string>;
  /** extended chords built only from this scale */
  options: KindId[];
}
export const SCALES: Record<ScaleId, ScaleDef> = {
  ionian: { name: 'Ionian', parent: 'major scale', kind: 'maj7', ivs: [M2, M3, P4, P5, M6, M7], avoid: ['11'], options: ['maj9', '6/9', '6'] },
  lydian: { name: 'Lydian', parent: '4th mode of major', kind: 'maj7', ivs: [M2, M3, A4, P5, M6, M7], avoid: [], options: ['maj7♯11', 'maj9', '6/9'] },
  dorian: { name: 'Dorian', parent: '2nd mode of major', kind: 'm7', ivs: [M2, m3, P4, P5, M6, m7], avoid: [],
    caution: { '13': 'Books disagree: Berklee texts and Terefenko treat the 13 on a ii chord as an avoid note (with the ♭3 it forms the tritone of the V7 and gives the V away early); Levine and others use it freely.' }, options: ['m9', 'm11', 'm6'] },
  phrygian: { name: 'Phrygian', parent: '3rd mode of major', kind: 'm7', ivs: [m2, m3, P4, P5, m6, m7], avoid: ['♭9', '♭13'], options: ['m7add11'] },
  aeolian: { name: 'Aeolian', parent: '6th mode of major (natural minor)', kind: 'm7', ivs: [M2, m3, P4, P5, m6, m7], avoid: ['♭13'], options: ['m9', 'm11'] },
  melodicMinor: { name: 'Melodic minor', parent: 'melodic minor scale', kind: 'm(maj7)', ivs: [M2, m3, P4, P5, M6, M7], avoid: [], options: ['m6', 'm(maj7)'] },
  mixolydian: { name: 'Mixolydian', parent: '5th mode of major', kind: '7', ivs: [M2, M3, P4, P5, M6, m7], avoid: ['11'], options: ['9', '13'] },
  lydianDominant: { name: 'Lydian dominant', parent: '4th mode of melodic minor', kind: '7', ivs: [M2, M3, A4, P5, M6, m7], avoid: [], options: ['9♯11', '13♯11', '7♯11'] },
  mixolydianb13: { name: 'Mixolydian ♭13', parent: '5th mode of melodic minor', kind: '7', ivs: [M2, M3, P4, P5, m6, m7], avoid: ['11'], options: ['9♭13', '7♭13'] },
  phrygianDominant: { name: 'Phrygian dominant', parent: '5th mode of harmonic minor (Mixolydian ♭9 ♭13)', kind: '7', ivs: [m2, M3, P4, P5, m6, m7], avoid: ['11'], options: ['7♭9', '7♭9♭13'] },
  altered: { name: 'Altered', parent: '7th mode of melodic minor (super Locrian)', kind: '7', ivs: [m2, A2, M3, A4, m6, m7], avoid: [], options: ['7♯9♭13', '7♭9♯11'] },
  halfWhole: { name: 'Half-whole diminished', parent: 'diminished scale starting with a half step', kind: '7', ivs: [m2, A2, M3, A4, P5, M6, m7], avoid: [], options: ['13♭9', '7♯9', '7♭9♯11'] },
  wholeTone: { name: 'Whole tone', parent: 'whole-tone scale', kind: '7', ivs: [M2, M3, A4, m6, m7], avoid: [], options: [] },
  mixolydianSus: { name: 'Mixolydian (sus)', parent: '5th mode of major', kind: '7sus4', ivs: [M2, M3, P4, P5, M6, m7], avoid: ['3'], options: ['9sus4'] },
  locrian: { name: 'Locrian', parent: '7th mode of major', kind: 'm7♭5', ivs: [m2, m3, P4, d5, m6, m7], avoid: ['♭9'], options: [] },
  locrianNat2: { name: 'Locrian ♮2', parent: '6th mode of melodic minor', kind: 'm7♭5', ivs: [M2, m3, P4, d5, m6, m7], avoid: [], options: [] },
  wholeHalf: { name: 'Whole-half diminished', parent: 'diminished scale starting with a whole step', kind: '°7', ivs: [M2, m3, P4, d5, m6, d7, M7], avoid: [], options: [] },
  lydianAug: { name: 'Lydian augmented', parent: '3rd mode of melodic minor', kind: 'maj7♯5', ivs: [M2, M3, A4, A5, M6, M7], avoid: ['13'], options: [] },
};
export const SCALE_IDS = Object.keys(SCALES) as ScaleId[];

export type ToneRole = 'chord' | 'tension' | 'avoid';
export interface ScaleNote { note: Note; label: string; role: ToneRole; caution?: string }
export interface ChordScale { id: ScaleId; name: string; parent: string; root: Note; chord: PChord; notes: ScaleNote[] }

/** A chord scale on a root: every note sorted into chord tone, available tension or avoid note. */
export function chordScale(id: ScaleId, root: Note): ChordScale {
  const d = SCALES[id], chord = makeChord(root, d.kind), chordPcs = new Set(chord.tones.map(pcOf));
  const notes: ScaleNote[] = [{ note: root, label: 'R', role: 'chord' }, ...d.ivs.map((i): ScaleNote => {
    const n = transpose(root, i), label = degreeLabel(i);
    const role: ToneRole = d.avoid.includes(label) ? 'avoid' : chordPcs.has(pcOf(n)) ? 'chord' : 'tension';
    return { note: n, label: role === 'chord' ? chord.labels[chord.tones.findIndex(t => pcOf(t) === pcOf(n))] : label, role, caution: d.caution?.[label] };
  })];
  return { id, name: d.name, parent: d.parent, root, chord, notes };
}
export const tensionsOf = (s: ChordScale): ScaleNote[] => s.notes.filter(n => n.role === 'tension');
export const avoidOf = (s: ChordScale): ScaleNote[] => s.notes.filter(n => n.role === 'avoid');

export interface ScaleChoice { scale: ChordScale; why: string }
const semis = (a: Note, b: Note): number => mod(pcOf(b) - pcOf(a), 12);

/**
 * The scales that fit a chord, best first. For dominants the choice follows where the chord goes:
 * down a fifth to major → Mixolydian (9, 13); down a fifth to minor → Phrygian dominant (♭9, ♭13);
 * anything else (tritone sub, backdoor ♭VII7, IV7) → Lydian dominant (9, ♯11, 13).
 */
export function scaleChoices(c: PChord, next: PChord | null, key: Key): ScaleChoice[] {
  const fam = famOfKind(c), r = c.root, mk = (id: ScaleId, why: string): ScaleChoice => ({ scale: chordScale(id, r), why });
  const deg = semis(key.tonic, r);
  if (c.kind === '7sus4' || c.kind === '9sus4' || c.kind === 'sus4') return [mk('mixolydianSus', 'A sus chord: the 4th replaces the 3rd, so the 3rd is the note to stay off.')];
  if (fam === 'dom') {
    const step = next ? semis(r, next.root) : -1, toMinor = !!next && ['min', 'hdim'].includes(famOfKind(next));
    if (step === 5 && toMinor) return [
      mk('phrygianDominant', `It resolves down a fifth to a minor chord: ♭9 and ♭13 are notes of ${fmt(next!.root)} harmonic minor.`),
      mk('altered', 'Every tension altered (♭9 ♯9 ♯11 ♭13): the strongest pull into the next chord.'),
      mk('mixolydianb13', 'Berklee\'s choice for V7 of ii: natural 9 with ♭13.'),
    ];
    if (step === 5) return [
      mk('mixolydian', 'It resolves down a fifth to a major-type chord: the natural 9 and 13 belong to that key.'),
      mk('altered', 'Every tension altered (♭9 ♯9 ♯11 ♭13): more pull into the next chord.'),
      mk('halfWhole', '♭9 and ♯9 with a natural 13: the diminished-scale dominant.'),
    ];
    return [
      mk('lydianDominant', next && step === 11 ? 'It resolves down a half step (a tritone sub): the ♯11 is the root of the dominant it replaces.' : 'It does not resolve down a fifth, so the ♯11 replaces the avoid-note 11 and nothing needs to resolve.'),
      mk('mixolydian', 'The plain dominant scale.'),
    ];
  }
  if (fam === 'maj') {
    const home = deg === 0 && key.mode === 'major' || deg === 3 && key.mode === 'minor';
    const io = mk('ionian', home ? 'It is the home chord of the key.' : 'The plain major scale on this root.');
    const ly = mk('lydian', home ? 'The ♯11 removes the avoid-note 4th: a modern color for a home chord.' : 'A major chord that is not home (like the IV): the ♯11 keeps the notes of the key and has no avoid note.');
    return home ? [io, ly] : [ly, io];
  }
  if (fam === 'aug') return [mk('lydianAug', 'A major 7 chord with a raised 5th.')];
  if (c.kind === 'm6' || c.kind === 'm(maj7)') return [mk('melodicMinor', 'A minor chord with a major 6th or 7th is a tonic minor: melodic minor.')];
  if (fam === 'min') {
    const dor = mk('dorian', 'A minor 7 chord acting as a ii (it sets up a dominant): Dorian.');
    const isII = !!next && famOfKind(next) === 'dom' && semis(r, next.root) === 5;
    if (isII) return [dor];
    const major = key.mode === 'major';
    if (major && deg === 4 || !major && deg === 7) return [mk('phrygian', 'It is the iii chord of the key: Phrygian keeps the notes of the key.'), dor];
    if (major && deg === 9 || !major && deg === 0) return [mk('aeolian', major ? 'It is the vi chord of the key: Aeolian (natural minor) keeps the notes of the key.' : 'It is the home chord of the minor key: natural minor.'), dor];
    return [dor];
  }
  if (fam === 'hdim') return [mk('locrian', 'The half-diminished chord\'s own mode.'), mk('locrianNat2', 'Locrian with a natural 9: removes the avoid-note ♭9.')];
  return [mk('wholeHalf', 'A diminished 7 chord: every tension sits a whole step above a chord tone.')];
}

/* ---- extended chords and how their tensions move on ---- */
/** The plain chord an extended kind is built on: m9 → m7, 13♯11 → 7, 6/9 → maj7. Others are their own base. */
const BASE: Partial<Record<KindId, KindId>> = {};
(Object.keys(SCALES) as ScaleId[]).forEach(id => SCALES[id].options.forEach(k => { if (!(k in BASE)) BASE[k] = SCALES[id].kind; }));
export const baseKind = (k: KindId): KindId => BASE[k] ?? k;
/** The chord without its extensions (same root and bass). */
export const plainOf = (c: PChord): PChord => (c.upper || baseKind(c.kind) === c.kind ? c : makeChord(c.root, baseKind(c.kind), c.bass));
/** The notes a chord adds on top of root, 3rd, 5th and 7th. */
export function chordTensions(c: PChord): { note: Note; label: string }[] {
  const out: { note: Note; label: string }[] = [];
  c.tones.forEach((note, i) => { if (!CORE.has(c.labels[i]) && !(c.upper && i < 3)) out.push({ note, label: c.labels[i] }); });
  return out;
}
export const CORE = new Set(['R', '3', '♭3', '5', '♭5', '♯5', '7', '♭7', '𝄫7', '4']);
export interface TensionMove { note: Note; label: string; /** signed semitones into the next chord; 0 = common tone */ semis: number; to: Note; toLabel: string; text: string }
export interface ExtOption { chord: PChord; scale: ChordScale; why: string; moves: TensionMove[] }

export const ORD: Record<string, string> = { R: 'root', '3': '3rd', '♭3': '3rd', '5': '5th', '♭5': '♭5', '♯5': '♯5', '7': '7th', '♭7': '7th', '𝄫7': '7th', '4': '4th', '6': '6th', '9': '9th', '♭9': '♭9', '♯9': '♯9', '11': '11th', '♯11': '♯11', '13': '13th', '♭13': '♭13' };
/**
 * Where each tension of `c` goes in the next chord, by the usual voice-leading order: keep a common
 * tone (as a chord tone or an available tension of the next chord), else move a half step to a
 * chord tone, else a whole step.
 */
export function tensionMoves(c: PChord, next: PChord, key: Key): TensionMove[] {
  const nextScale = scaleChoices(next, null, key)[0].scale;
  const chordT = next.tones.map((n, i) => ({ n, label: next.labels[i], tension: false }));
  const tensT = tensionsOf(nextScale).filter(t => !next.tones.some(n => pcOf(n) === pcOf(t.note))).map(t => ({ n: t.note, label: t.label, tension: true }));
  const out: TensionMove[] = [];
  chordTensions(c).forEach(({ note: x, label }) => {
    const find = (list: typeof chordT, d: number) => list.find(t => mod(pcOf(t.n) - pcOf(x), 12) === mod(d, 12));
    const tries: [typeof chordT, number][] = [[chordT, 0], [tensT, 0], [chordT, -1], [chordT, 1], [chordT, -2], [chordT, 2], [tensT, -1], [tensT, 1]];
    for (const [list, d] of tries) {
      const t = find(list, d);
      if (!t) continue;
      const what = `the ${ORD[t.label] ?? t.label} of ${next.symbol}`;
      const text = d === 0 ? `${fmt(x)} (${label}) stays: it is ${what}` : `${fmt(x)} (${label}) ${d < 0 ? 'falls' : 'rises'} a ${Math.abs(d) === 1 ? 'half' : 'whole'} step to ${fmt(t.n)}, ${what}`;
      out.push({ note: x, label, semis: d, to: t.n, toLabel: t.label, text });
      break;
    }
  });
  return out;
}

/** Extended versions of a chord that fit its scale choices, with how each one's tensions move into the next chord. */
export function extensionOptions(c: PChord, next: PChord | null, key: Key): ExtOption[] {
  if (c.bass || c.upper) return [];
  const out: ExtOption[] = [], seen = new Set<KindId>([c.kind]);
  for (const ch of scaleChoices(c, next, key)) {
    for (const kind of SCALES[ch.scale.id].options) {
      if (seen.has(kind)) continue;
      seen.add(kind);
      const chord = makeChord(c.root, kind);
      out.push({ chord, scale: ch.scale, why: ch.why, moves: next ? tensionMoves(chord, next, key) : [] });
    }
  }
  return out;
}

/* ---- what a chord with a given scale usually leads to ---- */
export interface Lead { chords: PChord[]; why: string }
/** Typical next chords for a chord that takes this scale (root motion is the reason in every case). */
export function leadsTo(id: ScaleId, root: Note): Lead[] {
  const T = (i: Interval, k: KindId) => makeChord(transpose(root, i), k);
  switch (id) {
    case 'mixolydian': return [{ chords: [T(P4, 'maj7')], why: 'V7 → I: down a fifth to a major chord.' }];
    case 'phrygianDominant': return [{ chords: [T(P4, 'm7')], why: 'V7 → i: down a fifth to a minor chord.' }];
    case 'mixolydianb13': return [{ chords: [T(P4, 'm7')], why: 'V7 → minor chord a fifth down (the ♭13 is that chord\'s ♭3).' }];
    case 'altered': return [{ chords: [T(P4, 'maj7')], why: 'Down a fifth to major.' }, { chords: [T(P4, 'm7')], why: 'Down a fifth to minor.' }];
    case 'halfWhole': return [{ chords: [T(P4, 'maj7')], why: 'Down a fifth to major.' }];
    case 'wholeTone': return [{ chords: [T(P4, 'maj7')], why: 'Down a fifth.' }];
    case 'lydianDominant': return [{ chords: [T(M7, 'maj7')], why: 'Tritone sub: down a half step.' }, { chords: [T(M2, 'maj7')], why: 'Backdoor ♭VII7: up a whole step.' }];
    case 'mixolydianSus': return [{ chords: [T({ steps: 0, semis: 0 }, '7')], why: 'The 4th drops to the 3rd.' }, { chords: [T(P4, 'maj7')], why: 'Or straight down a fifth.' }];
    case 'dorian': return [{ chords: [T(P4, '7')], why: 'ii → V: up a fourth to a dominant.' }];
    case 'phrygian': return [{ chords: [T(P4, 'm7')], why: 'iii → vi: up a fourth.' }];
    case 'aeolian': return [{ chords: [T(P4, 'm7')], why: 'vi → ii: up a fourth.' }];
    case 'locrian': case 'locrianNat2': return [{ chords: [T(P4, '7♭9'), T(m7, 'm7')], why: 'Minor ii–V: up a fourth to a V7♭9, then to the minor chord.' }];
    case 'lydian': return [{ chords: [T(M2, '7')], why: 'IV → V: up a whole step.' }, { chords: [T(P5, 'maj7')], why: 'IV → I: plagal.' }];
    case 'wholeHalf': return [{ chords: [T(m2, 'm7')], why: 'Leading-tone °7: up a half step.' }, { chords: [T({ steps: 0, semis: 0 }, 'maj7')], why: 'Common-tone °7: same root.' }];
    default: return [];
  }
}
