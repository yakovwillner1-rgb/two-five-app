# Open questions

Add theory or product questions here instead of guessing. Ralph answers them in chat.

## From the Phase 0 port (behavior kept exactly as it was; nothing guessed)

1. **FIXED (Progression rebuild).** "2‑5 into every chord" button (Progression tab) did not work in the old app.
   Its click handler shares the name `pall` with Play it's "All 12 keys" switch, so the button
   flips that switch instead. Ported as-is. Fix it? (Expected: turn the 2‑5 on/off for every
   landable chord in the progression.)
2. **Dark 2‑5 label vs chord symbol.** The color switch says "Dark: m7♭5 → 7♭9", but the V chord
   is shown as a plain `7` (e.g. `E7`, scale = Phrygian Dominant). Should the symbol read `E7♭9`?
3. **Rootless voicings on dominants.** Today: Rootless A = 3‑5‑7‑9 and Rootless B = 7‑9‑3‑5 for
   every chord. SPEC Phase 2 says dominants should be A = 3‑13‑7‑9, B = 7‑9‑3‑13. Left for Phase 2.
   Test case to confirm then: G7 Rootless B = F A B E; G7 Rootless A = B E F A.
4. **9th in voicings.** Rule today: use the 2nd note of the chord's mode, but replace a ♭9 with a
   natural 9 on every chord except dominant 7. So Bm7♭5 (Locrian) is voiced D F A C♯ and Em7
   (Phrygian) G B D F♯. Those 9ths are outside the scale. Keep, or drop the 9 on those chords?
5. **`SETUP.txt` still describes Netlify.** Update it to GitHub Pages?

## From Phase 1 (Passing engine). Each item is built with the default shown; say if it should change.

Theory rules
6. **DECIDED.** The 2-5 is always offered both bright and dark (Gm7–C7 and Gm7♭5–C7 → Fmaj7), because
   the old Bright/Dark switch allowed both and the merged Move tab replaces that switch.
7. **Diminished passing going down** (Em7 – E♭°7 – Dm7) is not offered; SPEC only names ♯°7 going up.
   Add it?
8. **Common-tone °7** is only offered into major and dominant chords (C°7 → Cmaj7), not minor. OK?
9. **Chord roots from far keys are respelled plainly:** C♭7 → B7, F♭ → E, E♯ → F, double accidentals
   removed (tritone subs, ii–subV, backdoor, chromatic, planing, Coltrane). Diminished passing chords
   keep the leading-tone spelling (B♯°7 → C♯m7, E♯°7 → F♯m7). Secondary dominants keep the strict
   spelling (V of D♯m7 is A♯7). OK?
10. **Chromatic approach from below** uses the plain root: Fm7 → F♯m7 (not E♯m7). OK?
11. **Planing** = same chord quality a whole step above or below (Em7 → Dm7, Cm7 → Dm7). A half step
    is covered by "Chromatic approach". Is that the split you want?
12. **Line cliché** is offered when FROM is minor and is played in place of FROM:
    Am – Am(maj7) – Am7 – Am6. Add the major one too (C – Cmaj7 – C7 → F)?
13. **Modal interchange, where each chord is offered** (major keys only):
    iv7 → I or V · iv6 → I · ♭VImaj7 → I or V · ♭VII7 → I · ♭VI–♭VII → I · ♭IImaj7 → I · ♭IIImaj7 → ii or IV.
    They are 7th chords (Fm7, A♭maj7, B♭7). ♭II is explained as "from C Phrygian". Right targets?
    Triads instead for pop?
14. **Minor home keys:** modal interchange, turnarounds and the gospel walk-up return nothing yet.
    What should they be in minor?
15. **Sus / pedal:** V7sus4 into any chord; IV over V (F/G) only into major or dominant chords. OK?
16. **Upper structures:** only the three in the SPEC (II, ♭VI, ♭III triads). Add ♭V (♭9 ♯11) and VI (13♭9)?
17. **Turnarounds** are offered whenever TO is the I chord, whatever FROM is. Gospel 7-3-6 is offered
    into vi as viiø7 – III7 (Bm7♭5 – E7 → Am7): same chords as the dark ii–V, shown under both names.
18. **Gospel walk-up** needs FROM = I. Into V or I: C/E – F – F♯°7 – C/G. Into IV: just C/E. Triads.
19. **Coltrane cycle** is only offered into major chords. It shows the whole ii–♭III7–♭VI–VII7–III–V
    chain (the ii is dropped when FROM already is the ii).

Numbers and labels (tunable data, not theory)
20. **Tension and color tags** per technique are first guesses (`src/data/techniques.ts`).
21. **Genre weights:** the ones in SPEC §1.2 are kept. All other weights are mine
    (`src/data/styles.ts`, after the "spec ↑" comment), e.g. jazz secDom .85, gospel turnaround .8.
22. **Feel** multiplies the score ×1.5 when a suggestion's tags include it, ×0.7 when not. The
    per-feel details in SPEC (Lydian, ♭9 ♭13 …) are only covered through those tags so far.
23. **Roman numerals:** secondary chords use slash style (V7/IV, ii7/IV, subV7/IV); everything else
    is measured from the home key (♭VImaj7, ♯iv°7, ♭ii7). IV over V is labeled V9sus4. OK?
24. **Genre extensions / voicing types / chords per bar** are stored but not used yet (Phase 2–3).
    Cards show plain 7th chords in a simple root-position voicing for now.

## From merging Move + Passing and rebuilding Progression
25. **Play it** can only check chords it has a scale for: chords of the key and their 2-5s. If you
    pick another passing (tritone sub, diminished …) on Move or Progression, Play it falls back to
    the 2-5 for "The move" and skips that passing in "Progression". Typed chords are skipped too.
    Checking any chord comes with the voicing engine in Phase 2. OK until then?
26. **The chosen way sticks** when you change the chords: if you picked "Tritone sub", the next pair
    also opens on its tritone sub (when it has one). Prefer it to reset to the top-ranked way?
27. **Line cliché** is not offered inside a progression (it replaces the chord before instead of
    sitting between two chords). It is on the Move tab.
28. **New chords in a progression start with no passing**; you add one with "+ passing". Presets
    still load with a 2-5 into every chord.

## From the Extensions research (see docs/THEORY_SOURCES.md)
29. **13 on a Dorian m7 (e.g. B on Dm7):** books disagree. Shown as available with a "use with care"
    note, and Dm6 is offered. Prefer it hidden on ii chords (the Berklee view)?
30. **V7 of ii (A7 → Dm7):** the app offers ♭9 ♭13 first (Phrygian dominant) and lists Berklee's
    natural 9 + ♭13 (Mixolydian ♭13) as an alternative. Swap the order?
31. **Where ♯9, ♯11, ♭13 and 13 resolve:** no source fixes one answer, so the app computes the nearest
    note of the next chord (common tone first, then half step). If you were taught specific
    resolutions (e.g. ♯9 → ♭9 → 5), tell me and I will make them rules with tests.
32. **Extensions are for listening so far:** tapping an extended chord plays it into the next chord,
    but does not replace the chord in the Move path or in a progression. Want "use this one"?
    **Update:** on Move you now pick the extension on the start and landing chord, and it is part of
    the move (see below). Not yet on Progression tiles (typed chords like Dm9 do work there).

## From putting extensions into the move
33. **How much the extensions change the ranking:** score × (0.5 + fit), where fit is 1 for a held
    note, 0.75 for a half step, 0.5 for a whole step. My numbers. Stronger or weaker?
34. **Which passing chords get extended:** only plain 7th chords (7, m7, maj7). Chords a technique
    already colors (V7♭9 of the dark 2-5, upper structures, slash and sus chords, triads) stay as
    they are. OK?
35. **Bright 2-5 into a minor chord with extensions** gives e.g. Bm11 → E7♭9♭13 → Am9. The Bm11
    carries C♯ (its Dorian 9) while Am has C. Keep, or hold the ii at m7 / m7add11 there?
36. **Plain chords stay plain:** with no extension picked, passing chords are not extended, even
    though each genre lists favorite extensions. Should the genre add them by default?

## From the Listen tab
37. **Hold time:** a chord counts after 0.5 s without a change (0.3 s and 1 s are offered). The
    sustain pedal is not read yet, so keys must stay down. Should the pedal hold notes?
38. **Same notes, two names:** the bass decides (C–E–G–A = C6 on C, Am7 on A). With neither root in
    the bass a 7th chord is preferred to a 6th chord (E–G–A–C = Am7/E). OK?
39. **Rootless voicings** are only read for 7th chords with an extension, and a reading with the
    root in the bass always comes first (F–A–B–E shows Fmaj7♯11, with G13 and D♭7♯9♭13 one tap
    away). Would you rather have rootless readings first when you play in the left-hand register?
40. **Spelling of roots outside the key:** flats (♭II, ♭III, ♭V, ♭VI, ♭VII), except diminished and
    half-diminished chords, which are raised degrees (C♯°7, F♯m7♭5 in C). OK?
41. **Next-chord list** follows the classical chart (rule 17). It leaves out pop moves such as
    V → IV and I → ♭VII. Add those as extra options, marked by genre?
42. **Melody, single notes, two-note shells** are not read yet (three different notes minimum).
    Planned with the melody work.
43. **Key detection** only suggests another key of the same mode when at least two more of the
    heard chords fit it. It never switches by itself.


## From Phase 2 (Melody on top): answered
Ralph asked Claude to pick what is best (15 Nov 2026). These are Claude's picks; say so if any is wrong.
44. **Dominant with no next chord:** added a "Goes to" picker on the Melody tab. With none picked, a
    dominant is still read as the V of the key chord a fifth below.
45. **Tension substitution:** kept. 9 replaces the root; 11, ♯11, 13, ♭13 replace the 5th; the 3rd
    and 7th always stay (they define the chord).
46. **Barry Harris:** kept as built (plain 7, 9, 13 dominants only; the maj7's 7th is a passing note).
47. **Cluster:** kept as built (3rd, 7th, 9th under the melody, only when a 2nd ends up inside).
48. **Half step right under the melody:** fixed. With the root on top of a major 7 chord the 6th
    takes the place of the 7th (close, drop, block, spread). THEORY_SOURCES rule 30.
49. **Avoid notes still get voicings:** kept, with the warning and fixes on top. Hearing the clash
    teaches more than an empty list.
50. **Registers:** kept (rootless from D3; spread root in C2–B2).
51. **Low-interval limit:** kept at 3rds only (E2), as the spec says. No sourced numbers for the rest.
52. **Order with no previous voicing:** now the genre's favorite voicing types first (the lists
    already in `src/data/styles.ts`), then by type. With a previous voicing, smoothness still wins
    and the genre only breaks ties. Genre picker added to the Melody tab.
53. **Play it → Voicings:** kept exact (bottom to top, any octave).
54. **♭13 on the V of a minor key** in the voicing sheet: kept. It is the note of the key.
55. **Minor upper structures:** added i (7♯9) and ♭ii (7♭9♭13). ♭iii (7♯9♯11) and ♯iv (13♭9♯11)
    are left out: the app has no chord type for those two symbols yet.
56. **Tab bar:** kept 11 tabs; the phone label is "Prog".

Still open from Phase 2:
57. **Genre voicing lists** in `src/data/styles.ts` are first guesses (e.g. Jazz: rootless, drop 2;
    Neo-soul: cluster, rootless, spread). "shell" is listed for some genres but there is no shell
    voicing under a melody yet. Tune the lists?
58. **13♯11 in four notes:** a close voicing has room for one note in the 5th's place, so C13♯11
    keeps the ♯11 and drops the 13 unless the 13 is the melody. Use five notes there instead?
