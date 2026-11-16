import { mod, pcOf } from '../theory/notes';
import type { ChordStep } from '../theory/playcheck';
import type { PChord } from '../theory/symbols';
import { scaleChoices } from '../theory/tensions';
import type { Chord, Key, Note, Voicing } from '../theory/types';
import type { Study } from './model';

const THIRDS = ['3', '♭3', '4'], SEVENTHS = ['7', '♭7', '𝄫7', '6'], FIFTHS = ['5', '♭5', '♯5'];

/**
 * Play-it steps for a whole route (Move or Progression), made from the same resolved study that is shown and played:
 * "Exact voicing" is the notes of that study (low to high, any octave); "Any voicing" needs the 3rd and the 7th (or 5th on a
 * triad) and nothing outside the chord's scale. Whatever the technique, typed chords included: nothing is swapped for a ii–V.
 */
export function routeSteps(study: Study, chords: PChord[], key: Key, labels: string[]): ChordStep[] {
  return chords.map((c, i) => {
    const e = study.events[i], next = chords[i + 1] ?? null;
    const find = (L: string[]) => c.tones.find((_t, k) => k > 0 && L.includes(c.labels[k]));
    const third = find(THIRDS) ?? c.tones[0], fifth = find(FIFTHS) ?? third, seventh = find(SEVENTHS) ?? fifth;
    const choice = scaleChoices(c, next, key)[0], scaleNotes: Note[] = choice ? choice.scale.notes.map(n => n.note) : c.tones;
    const scale = new Set<number>([...scaleNotes, ...c.tones].map(pcOf));
    e.midis.forEach(m => scale.add(mod(m, 12)));
    const spelled = (m: number, k: number): Note => c.tones.find(t => pcOf(t) === mod(m, 12)) ?? (c.bass && pcOf(c.bass) === mod(m, 12) ? c.bass : { letter: 'C', acc: 0 }) ?? scaleNotes[k];
    const voicing: Voicing = {
      group: 'Jazz', name: e.grip ?? 'The voicing you hear', sub: '',
      notes: e.midis.map((m, k) => ({ midi: m, note: e.names ? c.tones.find(t => pcOf(t) === mod(m, 12)) ?? spelled(m, k) : spelled(m, k), label: e.labels?.[k] ?? '', role: 'color' as const })),
    };
    const chord = { symbol: c.symbol, tones: [c.tones[0], third, fifth, seventh], quality: '', mode: { notes: scaleNotes, name: choice?.scale.name ?? 'chord' } } as unknown as Chord;
    return { kind: 'chord', chord, label: labels[i] ?? c.symbol, voicing, voicingPcs: e.midis.map(m => mod(m, 12)), third: pcOf(third), seventh: pcOf(seventh), scale };
  });
}
