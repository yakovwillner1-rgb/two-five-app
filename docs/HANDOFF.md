# Handoff — 16 Nov 2026 (after v2 design + the Connect learning loop)

For whoever picks this up next. Read `CLAUDE.md`, `docs/SPEC.md` and `docs/DESIGN.md` first; this file says where things stand
and what is easy to get wrong.

## Baseline
- **Live:** https://yakovwillner1-rgb.github.io/two-five-app/ = `main` at the merge of PR #11 (the **v2 design**). Load it twice
  after a deploy (service worker).
- **PR #12** `theory-wording`: copy-only edits that separate conventions, interpretations and universal claims (from a Codex
  review). Open, not merged, reviewable on its own. Nothing in this branch depends on it.
- **Branch `ux/connect-v2`** (this work, PR open): ports Codex's functional improvements onto v2 and adopts the agreed navigation.
  Not merged until Ralph says so.
- Codex's own branch (`ux/connect-learning-loop`) was never pushed; only a zip reached us. It was built on v2 but its "clarity
  pass" flattened the look (no raised controls, no blobs, borders, dropdown pickers). We kept only its functional ideas, rebuilt in
  v2. Its theory-copy edits live in PR #12. Do not merge the zip as is.

## What the app is now
12 tabs in 4 groups (sidebar ≥1000px: headings with tabs; below: 4 group icons at the bottom and the group's tabs as a row at the top;
each group remembers its last tab in `S.groupLast`):
- **Explore:** Move, Cheat sheet · **Build:** Progression, Melody, Reharm · **Practice:** Play it, Listen, Drill ·
  **Reference:** Modes, Extensions, Charts, Guide.

### Move (`src/ui/views/move.ts`): choose → hear → understand → explore → apply
1. **Choose:** the start and land hero cards have a *change* chip. It opens a tray under the path with the chords of the key as
   big tiles. Typing a symbol and extensions are inside "Type a chord or add an extension". `S.pickSide` (not saved).
2. **Hear:** the route as the animated hero path (beat-synced, see DESIGN.md). Each card lists the notes actually played.
3. **Understand:** one *Listen for this* cue under the path, from the played pitches (`listeningCue`), the two pitches marked on the
   cards and keyboard, and **Hear just this line**.
4. **Explore:** three contrasting routes (different techniques); *All routes, style and feel* expands the full list, genre and feel.
5. **Apply:** *Save as A to compare*, *Practice this →*. With A saved, a slim A (saved) / B (current) strip appears: Hear A, Hear B,
   A then B, Clear A. B is simply the current selection.
Why-it-works, guide tones, scales/extensions and chord details are collapsed `<details>` (progressive).

### One resolved piece of musical material (`src/study/model.ts`)
`resolveStudy(chords, title, key, beats)` turns a route into events: symbol, beats, **actual MIDI pitches**, note names and chord
labels. Displayed notes, the keyboard, playback (`PlayEvent.midis`), A/B and Play it all read it. `listeningCue` pairs voices by
register only when both chords have the same number of notes; with different sizes it only describes an exactly held pitch. It is
a listening aid, not a full voice analysis. Technique explanation text describes the technique in general, not the played notes.

### Played voices vs reference graphics
- **Played** (what you hear): the *Notes played* keyboard (`playedStage` in `keyboards.ts`): keys of the playing chord light up in
  its role colour; the 3rd and 7th dots sit on their real played pitches and slide to the next chord. Cue pitches have an outline.
- **Reference** (chord-member diagrams, not the played voicing): the chord-tone keyboards on the detail cards and the guide-tone
  lines (3rds/7ths by name). They are labelled "reference".

### Practice
`S.px = 'study'` practises `S.practiceStudy`, the route captured by *Practice this*, so non-ii–V routes are practised as chosen
(the old fallback to a ii–V is gone). It checks the ordered pitch classes of each chord, any octave. It does **not** check exact
register, rhythm or duration. Finishing offers **Try another target →** (next landable degree) and *Back to Move*.

### Layout
Header, scrolling `<main>` and transport are separate regions (the transport never floats over content); on phones the bottom nav has
reserved space. Because the page scrolls inside `<main>`, use `toTop()` (`src/ui/scroll.ts`), not `window.scrollTo`.

### Persistence
`localStorage["twofive-v1"]` gained `groupLast`, `studyA`, `practiceStudy` (older saves get defaults). Theme is separate
(`twofive-theme`). No schema validation, versioned migration or study export yet.

## Verification (and what is not)
- `npm test`: 447 pass (26 files, one combined run). `npm run build` clean.
- Walkthrough in the built app: route selection (a non-ii–V route), save A, A-then-B, stop, hear a single line, practice the route
  with simulated notes to completion, try another target, groupLast saved. Phone 390 / tablet 820 / desktop 1366, with the tray
  and every `<details>` open: no horizontal overflow, no transport/nav overlap on any of the 12 tabs (390). Text contrast audited in
  light and dark on Move (tray open, A/B shown), Play it (route) and the other tabs: no failures.
- **Not verified:** a real S88 / IAC / Logic, iPad Safari and multitouch, 60fps on an iPad, sound by ear, beat sync by ear, learning
  efficacy, a real Logic MIDI/MusicXML export, a real .mxl, the live site after the next deploy.
- **From memory, not checked in a book:** Krumhansl–Kessler profiles (rule 31), Barry Harris rules (24), tension substitution (21),
  6th-for-7th under a root melody (30). Flagged in `docs/THEORY_SOURCES.md`.

## Decisions still waiting on Ralph
- `docs/OPEN_QUESTIONS.md` 2–43 and 57–68 (44–56 are Claude's picks). PR #12's wording is a separate yes/no.
- PDF / photo sheet music is not read (question 60). App name is still "2-5 Into Anything" (renaming changes the URL).
- Plan steps not yet built: Step 4 (ways grouped by family, ▶ on every card, audition with ‹ ›/↑↓), Step 1 (header style/connection
  chips, Settings sheet), Step 5 (game layer: XP, mastery rings, daily challenge). Deferred on purpose: adaptive review, mastery
  scores, a lesson catalogue, notation, accounts.

## How work gets shipped here
1. Branch from `main`, small commits, `npm test` before each. `gh` needs `export PATH="/opt/homebrew/bin:$PATH"`.
2. **Merge only when Ralph says so, per PR.** `gh pr merge N --merge`, `gh run watch`, open the live site twice.
3. The Browser preview serves `dist/`: run `npm run build` first, and unregister the service worker and clear caches when a stale
   build shows (`navigator.serviceWorker.getRegistrations()`). Debug hook: `window.__t = { S, render, noteOn, noteOff, … }`.

## Things that bit us
- **Slow CI:** wide sweep tests need a 60 s timeout (`tests/passing/color.test.ts`).
- **`setMode()` resets the progression.** When code sets the key (file load on Reharm), assign `S.mode` / `S.pc` directly.
- **Legacy parity tests** (`tests/legacy/`) exclude two dominant rootless voicings on purpose (they use the 13). Do not revert the rule.
- **Service worker:** network-first HTML, build hash in the cache name.
- **Motion:** only transform/opacity; events come from `playSeq` as the `twofive:ev` document event; everything is off under
  reduced motion (`src/ui/motion.ts`, rules in DESIGN.md). FLIP keys are `data-flip`.
- **Styles:** `styles.css` has accumulated sections (base, look v2, rollout, layout regions, Move). Add to the matching section
  rather than appending conflicting overrides; a consolidation pass would help but is not a prerequisite for small fixes.
