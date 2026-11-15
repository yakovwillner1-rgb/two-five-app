import type { Family } from '../theory/types';

/** Per mode (by degree of the parent scale): [how it sounds, where to use it]. */
export const MODE_TEXT: Record<Family, [string, string][]> = {
  major: [
    ['The plain major scale. Bright, settled, home.', 'Major 7 chords that are home (the I). The 4th rubs against the 3rd, so pass through it.'],
    ['Minor with a natural 6th. Warm and cool at once, not sad.', 'The ii chord in a 2‑5‑1, and minor vamps like So What.'],
    ['Minor with a ♭2. Dark, with a Spanish edge.', 'The iii chord, and sus♭9 or flamenco sounds.'],
    ['Major with a ♯4. Floating and dreamy, the film-score sound.', 'Any maj7 chord that is not home, especially the IV. Try it on the I for a modern sound.'],
    ['Major with a ♭7. Bluesy and open.', 'Dominant 7 chords: the V in a 2‑5‑1, blues, rock.'],
    ['Natural minor. Sad and plain.', 'The vi chord, and minor keys.'],
    ['♭2 and ♭5. Unstable, it never sounds like home.', 'Half-diminished chords: the vii in major, the ii in minor.'],
  ],
  melodic: [
    ['Minor 3rd with a major 6th and 7th. The smooth, modern "jazz minor".', 'Minor tonic chords: m6 and m(maj7).'],
    ['Dorian with a ♭2. Dark but light on its feet.', 'sus♭9 chords.'],
    ['Lydian with a ♯5. Bright and unresolved.', 'maj7♯5 chords.'],
    ['Mixolydian with a ♯4. A bright dominant, the 7♯11 sound.', 'Dominants that do not resolve down a 5th: tritone subs, the IV7 in a blues.'],
    ['Mixolydian with a ♭6. A dominant that leans toward minor.', 'A V7 going to a minor chord (7♭13).'],
    ['Locrian with a natural 2nd. A softer half-diminished.', 'The ii in a minor 2‑5. Smoother than plain Locrian.'],
    ['Every tension at once: ♭9, ♯9, ♯11, ♭13. The 4th acts as the major 3rd.', 'A V7 right before it resolves, to major or minor.'],
  ],
  harmonic: [
    ['Natural minor with a raised 7th. Classical and exotic.', 'Minor tonic chords: m(maj7).'],
    ['Locrian with a natural 6th.', 'The ii in a minor 2‑5 (the Dark setting).'],
    ['Major with a ♯5. Tense and bright.', 'maj7♯5 chords.'],
    ['Dorian with a ♯4. Eastern European, klezmer flavor.', 'Minor 7 chords when you want an exotic color.'],
    ['A ♭2 with a major 3rd. Middle Eastern and flamenco.', 'The V7 resolving to a minor chord (7♭9 ♭13).'],
    ['Lydian with a ♯2. Bright and exotic.', 'maj7 chords for an unusual color.'],
    ['Stacked minor 3rds. The diminished sound.', 'Diminished 7 chords: the vii°7 in harmonic minor.'],
  ],
};
