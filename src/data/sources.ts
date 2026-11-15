/* Where the chord-scale and tension rules come from. Shown on the Extensions page; details in docs/THEORY_SOURCES.md. */
export interface Source { title: string; note: string; url?: string }
export const SOURCES: Source[] = [
  { title: 'Mulholland & Hojnacki, The Berklee Book of Jazz Harmony (Berklee Press, 2013)', note: 'The Berklee system: tensions a half step above a chord tone are "harmonic avoid tones"; ♭9 and ♭13 are allowed on dominants; different tensions for different secondary dominants. Read through the review below, not the book itself.' },
  { title: 'Salley, review in Music Theory Online 21.1 (2015)', note: 'Scholarly review that summarizes and compares the Berklee book and Terefenko.', url: 'https://www.mtosmt.org/issues/mto.15.21.1/mto.15.21.1.salley.php' },
  { title: 'Nettles & Graf, The Chord Scale Theory & Jazz Harmony (Advance Music, 1997)', note: 'The standard text for chord scales, available tensions and avoid notes. Cited by the sources above; not read directly.' },
  { title: 'Terefenko, Jazz Theory: From Basic to Advanced Study (Routledge, 2014)', note: 'Avoid notes: the 11 on major chords, the major 3rd on sus chords, the major 13 on a m7 that acts as a ii. Cited via Salley and Wikipedia.' },
  { title: 'Levine, The Jazz Theory Book (Sher Music, 1995)', note: 'Scale for each chord; treats the Dorian 13 as usable. Cited by the sources above; not read directly.' },
  { title: 'Berklee College of Music, Glossary of Terms', note: 'Definitions of chord scale, available tension and harmonic avoid note.', url: 'https://www.berklee.edu/node/1031154' },
  { title: 'Wikipedia: Avoid note', note: 'Definition; the Dorian 6th "can imply a dominant chord".', url: 'https://en.wikipedia.org/wiki/Avoid_note' },
  { title: 'Wikipedia: Chord-scale system', note: 'History (George Russell 1953, Berklee), scale pairings, and criticisms of the method.', url: 'https://en.wikipedia.org/wiki/Chord-scale_system' },
  { title: 'The Jazz Piano Site: Available Tensions; Avoid Notes; Tritone Substitution', note: 'The whole-step / half-step rule, avoid notes per mode, which scales fit a dominant and its tritone sub.', url: 'https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-chords/available-tensions/' },
  { title: 'Jazzadvice: Dominant 7th chord alterations; V7 to I', note: 'Which scale gives which altered tension; ♭9 resolves to the 5th of I; ♯11 for dominants that do not fall a fifth.', url: 'https://www.jazzadvice.com/lessons/dominant-seventh-chords-alterations/' },
  { title: 'Jeff Schneider, The Last Chord/Scale Chart You\'ll Ever Need', note: 'The four charts the rest of this app is built from.' },
];
