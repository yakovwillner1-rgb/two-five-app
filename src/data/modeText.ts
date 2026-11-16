import type { Family } from '../theory/types';

/** Per mode (by degree of the parent scale): [how it sounds, where to use it]. */
export const MODE_TEXT: Record<Family, [string, string][]> = {
  major: [
    ['The plain major scale. Bright, settled, like home.', 'The home chord (I) when it is a maj7. The 4th note can clash with the 3rd, so pass through it quickly.'],
    ['A minor scale with a major 6th. Warm and cool at once, not sad.', 'The ii chord in a two-five-one, and minor vamps like "So What".'],
    ['A minor scale with a ♭2. Dark, with a Spanish flavor.', 'The iii chord, and sus♭9 or flamenco sounds.'],
    ['A major scale with a ♯4. Floating and dreamy: the film-score sound.', 'Any maj7 chord that is not home, especially the IV. Try it on the I too for a modern sound.'],
    ['A major scale with a ♭7. Bluesy and open.', 'Dominant 7 chords: the V in a two-five-one, blues, rock.'],
    ['The natural minor scale. Sad and plain.', 'The vi chord, and songs in a minor key.'],
    ['A ♭2 and a ♭5. Unsettled: it never sounds like home.', 'Half-diminished chords: the vii in major, the ii in minor.'],
  ],
  melodic: [
    ['Minor with a major 6th and 7th. The smooth, modern "jazz minor" sound.', 'Minor home chords: m6 and m(maj7).'],
    ['Dorian with a ♭2. Dark but light on its feet.', 'sus♭9 chords.'],
    ['Lydian with a ♯5. Bright and unresolved.', 'maj7♯5 chords.'],
    ['Mixolydian with a ♯4. A bright dominant: the 7♯11 sound.', 'Dominant chords that do not drop a fifth: tritone subs, the IV7 in a blues.'],
    ['Mixolydian with a ♭6. A dominant that leans toward minor.', 'A V7 going to a minor chord (7♭13).'],
    ['Locrian with a natural 2nd. A softer half-diminished sound.', 'The ii in a minor two-five. Smoother than plain Locrian.'],
    ['Every extra note at once: ♭9, ♯9, ♯11, ♭13. The 4th acts like a major 3rd.', 'A V7 right before it lands, on a major or minor chord.'],
  ],
  harmonic: [
    ['Natural minor with a raised 7th. Classical and exotic.', 'Minor home chords: m(maj7).'],
    ['Locrian with a natural 6th.', 'The ii in a minor two-five (the "Dark" setting).'],
    ['Major with a ♯5. Tense and bright.', 'maj7♯5 chords.'],
    ['Dorian with a ♯4. Eastern European, klezmer flavor.', 'Minor 7 chords when you want an exotic color.'],
    ['A ♭2 with a major 3rd. Middle Eastern and flamenco.', 'The V7 going to a minor chord (7♭9 ♭13).'],
    ['Lydian with a ♯2. Bright and exotic.', 'maj7 chords for an unusual color.'],
    ['Notes stacked in minor thirds. The diminished sound.', 'Diminished 7 chords: the vii°7 in harmonic minor.'],
  ],
};
