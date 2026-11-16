# Handoff — 15 Nov 2026

For whoever picks this up next (a new Claude Code session or a person). Read `CLAUDE.md` and
`docs/SPEC.md` first; this file only says where things stand and what is easy to get wrong.

## Where things stand
- **Live:** https://yakovwillner1-rgb.github.io/two-five-app/ — Phases 0, 1, 2 and 3 are merged
  (PRs #1–#10). `main` is the only branch that matters; feature branches are merged and can go.
- **Tests:** 442 pass (`npm test`). Build: `npm run build`.
- **Not started:** Phase 4 (save favorites and export/import JSON; Drill "name the technique by
  ear" and "play the passing chord"; an iPad pass). Wait for Ralph's go.

## What each tab is (12 tabs)
| Tab | File | In one line |
|---|---|---|
| Move | `src/ui/views/move.ts` | FROM → TO, every passing technique ranked by genre × feel; extensions on both chords |
| Progression | `src/ui/views/prog.ts` | chain of chords, a passing per step, an extension per chord |
| Melody | `src/ui/views/lead.ts` | chord + melody note → melody check and every voicing with that note on top |
| Reharm | `src/ui/views/reharm.ts` | MIDI / MusicXML / typed chart → chart, voicings, voice leading, 3 reharms |
| Listen | `src/ui/views/listen.ts` | names the chord you hold, says where it goes |
| Play it | `src/ui/play.ts` | checks what you play (move, progression, random 2-5s, mode, kept voicings) |
| Drill, Cheat sheet, Modes, Extensions, Charts, Guide | `src/ui/views/*.ts` | unchanged reference and practice pages |

Pure logic (no DOM), each with tests of known answers:
- `src/theory/passing/` — technique catalogue, ranking, explanations, extension coloring.
- `src/theory/lead.ts` — voicings under a melody, melody check, voice-leading motion.
- `src/theory/recognize.ts`, `next.ts` — chord from held notes, where a chord goes next.
- `src/theory/analyze.ts` — key (Krumhansl–Schmuckler), skyline melody, chord chart of a recording.
- `src/theory/reharm.ts` — reharm levels, voicing a whole chart.
- `src/theory/chartText.ts` — typed chord charts.
- `src/midi/smf.ts`, `musicxml.ts` — MIDI file read/write; MusicXML and .mxl read.

## Not verified (say so again when asked "does it work")
- **A real Logic export** (MIDI or MusicXML) has never been loaded. Only hand-built files and the
  built-in examples. This is SPEC's "done when" for Phase 3. Ask Ralph for one file and tune
  `CHORD_SCORE` in `src/theory/analyze.ts` against it.
- **A real .mxl** from a notation app (the zip reader is tested with a hand-built archive).
- **Real MIDI keyboard (S88), IAC → Logic, iPad multitouch, anything by ear.** All checks so far
  are unit tests plus clicking through the built app with simulated notes.
- **From memory, not checked in a book:** Krumhansl–Kessler profile numbers (rule 31), Barry
  Harris rules (24), tension substitution (21), 6th-for-7th under a root melody (30). Each is
  flagged in `docs/THEORY_SOURCES.md`.

## Decisions waiting on Ralph
- `docs/OPEN_QUESTIONS.md` 2–43 and 57–68 are open. 44–56 were answered by Claude at Ralph's
  request ("answer with what you think is best"); they are marked as Claude's picks.
- **PDF / photo sheet music is not read** and cannot be within the hard rules (static site, no
  network, no AI call). Ralph asked for "upload a piece of sheet music"; he got MusicXML + typed
  charts and was told why. If he wants PDFs, it needs a separate converter (question 60).
- The app name is still "2-5 Into Anything"; SPEC says ask Ralph before renaming (it changes the URL).

## How work gets shipped here
1. Branch from `main`, small commits, `npm test` before each.
2. `gh pr create` (needs `export PATH="/opt/homebrew/bin:$PATH"`), then check with the PR tools.
3. **Merge only when Ralph says so, per PR.** An approval for PR A does not cover a follow-up
   fix PR B; the permission classifier blocks that, and it is right to.
4. `gh pr merge N --merge`, `gh run watch`, open the live site, `git switch main && git pull --ff-only`.
5. Stacked PRs: merge the base first, `gh pr edit N --base main`, then merge the next.

## Things that bit us
- **Slow CI:** a wide sweep test took 5.5 s on the GitHub runner and failed the deploy on the 5 s
  default. It now has a 60 s timeout (`tests/passing/color.test.ts`). Keep sweeps small or give
  them a timeout.
- **`setMode()` resets the progression.** When code sets the key (file load on Reharm), assign
  `S.mode` / `S.pc` directly (see `useKey` in `reharm.ts`).
- **Legacy parity tests** (`tests/legacy/`) compare against the old single-file app. One rule was
  changed on purpose (dominant rootless voicings use the 13); those two voicings are excluded
  there for dominants. Do not "fix" the parity test by reverting the rule.
- **Preview:** the Browser preview serves `dist/`, so run `npm run build` first. Debug hook in the
  page: `window.__t = { S, render, noteOn, noteOff, … }`.
- **Phone tab bar** scrolls sideways since tab 12. `render.ts` keeps the current tab in view.
- **Service worker:** network-first HTML, build hash in the cache name. After a deploy, load the
  live site twice before judging what version it shows.

## Sensible next steps (none started)
1. Get a real Logic MIDI export and a real MusicXML lead sheet from Ralph; fix what breaks.
2. Phase 4 as specced.
3. Open questions most likely to matter in use: 37 (sustain pedal in Listen), 62 (substitution,
   not only passing chords, in reharms), 64 (comping rhythm in the downloaded chord track),
   67 (typed melody), 68 (group the 12 tabs).
