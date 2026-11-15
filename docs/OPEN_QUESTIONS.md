# Open questions

Add theory or product questions here instead of guessing. Ralph answers them in chat.

## From the Phase 0 port (behavior kept exactly as it was; nothing guessed)

1. **"2‑5 into every chord" button (Progression tab) does not work in the old app.**
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
6. **Secondary ii–V into a major chord:** only the bright one (Gm7–C7 → Fmaj7) is offered. Also offer
   the minor ii–V into major (Gm7♭5–C7 → Fmaj7)?
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
