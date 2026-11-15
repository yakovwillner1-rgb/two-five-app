# Theory sources: chord scales, extensions and how they lead on

Research done for the Extensions feature. Every rule in `src/theory/tensions.ts` is listed here with
where it comes from. "Sourced" = stated by the sources below. "Computed" = the app works it out from
the notes; no book is claimed for it.

## Sources
Books (the standard texts; I could only read them through the reviews and summaries below):
- Mulholland & Hojnacki, *The Berklee Book of Jazz Harmony* (2013).
- Nettles & Graf, *The Chord Scale Theory & Jazz Harmony* (1997).
- Terefenko, *Jazz Theory: From Basic to Advanced Study* (2014).
- Levine, *The Jazz Theory Book* (1995).

Read directly:
- Salley, review of the Berklee book and Terefenko, *Music Theory Online* 21.1 (2015):
  https://www.mtosmt.org/issues/mto.15.21.1/mto.15.21.1.salley.php
- Berklee glossary: https://www.berklee.edu/node/1031154
- Wikipedia, "Avoid note": https://en.wikipedia.org/wiki/Avoid_note
- Wikipedia, "Chord-scale system": https://en.wikipedia.org/wiki/Chord-scale_system
- The Jazz Piano Site: available tensions (https://thejazzpianosite.com/?p=325), avoid notes
  (https://www.thejazzpianosite.com/?p=435), tritone substitution scales (https://www.thejazzpianosite.com/?p=368)
- Jazzadvice: https://www.jazzadvice.com/lessons/dominant-seventh-chords-alterations/ and
  https://www.jazzadvice.com/lessons/v7-to-i-10-options-for-expanding-your-dominant-7th-vocabulary/
- Anton Schwartz, "Reverse engineering our dominant scales": https://antonjazz.com/2012/11/dominant-scales/
- Rootless voicings (Dm9 F‑A‑C‑E → G13 F‑A‑B‑E → Cmaj9 E‑G‑B‑D): https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-chord-voicings/rootless-voicings/
Could not open (blocked): the Open Music Theory chapter on chord-scale theory.

## Rules

| # | Rule | Status |
|---|---|---|
| 1 | A chord scale = chord tones + available tensions + avoid notes. | Sourced: Berklee glossary; Salley on Mulholland & Hojnacki. |
| 2 | A scale note a **whole step above a chord tone** is an available tension. | Sourced: The Jazz Piano Site; consistent with every table below. Tested for every scale in the app. |
| 3 | A scale note a **half step above a chord tone** is a harmonic avoid note (fine in a melody as a passing note, not held in a chord). | Sourced: Mulholland & Hojnacki p. 21 via Salley; Berklee glossary; Wikipedia. |
| 4 | Dominants are the exception: ♭9, ♯9 and ♭13 are available; the 11 is not (half step above the 3rd). | Sourced: Salley ("exceptions, such as lowered ninths or thirteenths on extended dominants"); The Jazz Piano Site. |
| 5 | Avoid notes by mode: Ionian 4 · Dorian none · Phrygian ♭2, ♭6 · Lydian none · Mixolydian 4 · Aeolian ♭6 · Locrian ♭2. | Sourced: The Jazz Piano Site (avoid notes page). |
| 6 | **Disputed:** the 13 on a Dorian m7. Berklee texts and Terefenko avoid it on a ii chord (with the ♭3 it makes the tritone of the V7); Levine and The Jazz Piano Site allow it. | Both views sourced. The app shows it with a "use with care" note. |
| 7 | Dominant scales: Mixolydian (9, 13) · Lydian dominant (9, ♯11, 13) · altered (♭9, ♯9, ♯11, ♭13) · half-whole diminished (♭9, ♯9, ♯11, 13) · whole tone (9, ♯11, ♭13) · Phrygian dominant (♭9, ♭13). | Sourced: Wikipedia; Jazzadvice; Schwartz; The Jazz Piano Site. |
| 8 | Altered and Lydian dominant are each other's tritone sub (G altered = D♭ Lydian dominant). | Sourced: Schwartz; The Jazz Piano Site. |
| 9 | Which dominant scale: down a fifth to **major** → natural 9 and 13; down a fifth to **minor** → ♭9 and ♭13; **not** falling a fifth (tritone sub, ♭VII7, IV7) → ♯11 with 9 and 13. | Sourced: Salley (V/iii gets altered ninths, V/ii a natural ninth); Jazzadvice (♯11 when the V7 does not resolve by a fifth; altered tensions when it does); Wikipedia (Phrygian dominant on V of minor chords). |
| 10 | **Disputed:** V7 of ii. Berklee gives Mixolydian ♭13 (natural 9, ♭13); many players use ♭9 ♭13. | The app offers Phrygian dominant first and Mixolydian ♭13 as a listed alternative. Forum quote of the Berklee book + Salley. |
| 11 | Major chords: Ionian on the home chord (avoid the 4th), Lydian on other major chords (no avoid note). Russell prefers Lydian everywhere. | Sourced: Wikipedia (Russell vs Mehegan/Baker/Levine); The Jazz Piano Site. |
| 12 | In V7 → I the 7th falls to the 3rd of I, the 3rd rises to the root, and the ♭9 falls a half step to the 5th. | Sourced: Jazzadvice. |
| 13 | In ii–V–I the 9 of the ii is the 13 of the V (common tone), and the 13 of the V is the 3rd of the I. | Sourced: rootless voicing tables (Dm9 → G13 → Cmaj9). |
| 14 | Where every other tension goes (♯9, ♯11, ♭13 …). | **Computed**, not sourced: keep a common tone if the next chord has it (as a chord tone or an available tension), else move a half step to a chord tone, else a whole step. I found no source that fixes one resolution per tension. |
| 15 | "Leads to" (ii → V up a fourth, V → I down a fifth, tritone sub down a half step, backdoor ♭VII7 up a whole step, leading-tone °7 up a half step, common-tone °7 same root). | Standard functional harmony; already in SPEC §1.1. |
| 16 | **Extensions inside a move.** When the start or landing chord has extensions, each plain passing 7th chord takes an extended version from the scales of rule 9 (first scale preferred), and each way is scored by how the picked extensions connect: common tone 1, half step 0.75, whole step 0.5, leap 0. The 3rd and 7th of a dominant are not counted as free voices (rule 12). | The scales and the Dm9 → G13 → Cmaj9 case are sourced (rules 9, 13). The order common tone > half step > whole step is rule 14. The **numbers** (0.75, 0.5, the 0.25 scale preference, score × (0.5 + fit)) are my tuning, not from a source. |
| 17 | **Where a chord of the key goes next** (Listen tab). Major: iii → vi → ii or IV → V or vii° → I; V → vi is the deceptive cadence, IV → I the plagal cadence; I can go anywhere. Minor: ♭VII → ♭III → ♭VI → ii° or iv → V → i. A chord from outside the key goes where its type points (rule 15). | The standard chart of diatonic progressions: musictheory.net, "Common Chord Progressions" (https://www.musictheory.net/lessons/57). It is the chart taught from Kostka & Payne, *Tonal Harmony*, which I could not open to check page by page. |
| 18 | **Naming a chord from held notes** (Listen tab). Lowest note = root when the notes allow it; a missing 5th is still the chord; another chord tone in the bass = inversion (slash chord); 3rd + 7th + extension without a root = rootless voicing. | Standard practice, not one source. The **order** between readings of the same notes (root in bass > missing 5th > inversion > rootless, then chords inside the key, then common chord types) is my choice. G13 and D♭7♯9♭13 sharing a rootless voicing follows rule 8. |

## Known limits
- Chord-scale theory is a teaching system, not a law. Wikipedia lists the usual criticisms (it is
  "vertical" and says little about lines or rhythm). The app uses it for one thing: which notes can
  sit in a chord, and which chord they point to.
- Melodic use of avoid notes (as passing notes) is fine; the app only marks them for chords.
