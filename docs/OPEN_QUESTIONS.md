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
