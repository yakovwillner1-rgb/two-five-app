# 2-5 Into Anything — full spec

Live: https://yakovwillner1-rgb.github.io/two-five-app/
Until Phase 0 the whole app was one file, `index.html` (~100 KB, vanilla JS; see git history). Its
theory code is kept verbatim in `tests/legacy/legacyTheory.js` as the reference for parity tests.

---------------------------------------------------------------------------------------------------
## Product direction (read first)

**This is a passing-chord app, not a 2-5 app.** The 2-5 is one technique among many. Everywhere the
app today says "2-5", the target design says "passing chord", and the user picks (or the style
picks) which technique to use. Concretely, after Phase 1:

- **Move → "Connect"**: FROM chord → TO chord → every passing technique that connects them
  (secondary ii–V is one card among secondary dominant, tritone sub, backdoor, diminished, chromatic,
  borrowed, etc.), ranked by the selected genre × feel.
- **Progression**: each chord gets a "+ passing" control instead of "+ 2-5": pick a technique per
  chord, or "Auto" (style chooses), or "Surprise me". "Passing into every chord" replaces
  "2-5 into every chord".
- **Cheat sheet**: for every chord in the key, the top passing options per technique, not just its 2-5.
- **2-5 color (Auto/Bright/Dark)** is folded into the style system (genre × feel); bright/dark
  remain as feel options.
- **Drill**: "spell the passing chord", "name the technique by ear", across all techniques.
- **Play it**: practice any connection, progression or reharm, whatever techniques it uses.
- **Voicings**: unchanged behavior, applied to every passing chord.
- **Copy/UI text**: remove "2-5" framing from headings, empty states and help text except where
  the technique itself is a ii–V. Name/title: keep "2-5 Into Anything" until Ralph picks a new
  name (ask him; renaming the repo changes the live URL).

Phase 0 still ports today's behavior 1:1 (2-5 framing included). The reframe happens in Phase 1.

---------------------------------------------------------------------------------------------------
## 0. Existing features (must keep working)

- **Home key** picker: circle-of-fifths popover, ‹ › arrows, swipe, Major/Minor keys.
- **Move** (Move and Passing are one tab since Ralph's request): start chord → land chord, from the
  key or typed. Lists every way to get there (the passing-chord engine), ranked by genre and feel;
  the 2-5 is one of the ways, bright and dark. The chosen way shows the path, why-it-works text,
  voice-leading lines (3rds/7ths), cards with chord tones and keyboard, and for 2-5 chords the scale
  to play (links to Modes).
- **2-5 color**: Bright (m7→7, Major or Melodic Minor chart) and Dark (m7♭5→7, Harmonic Minor) are
  two ways on the Move tab. The Auto/Bright/Dark switch remains on Cheat sheet and Drill.
- **Progression**: a chain of chords (from the key or typed) with presets. Between each chord and
  the next you choose which passing to use, or none. Playback with highlight, loop.
  Each chord can take an extension ("+ extension": 9, 11, 13 … from the scales that fit); the passing
  chords on both sides pick up extensions that connect to it, as on Move.
- **Extensions** (reference page + a panel on Move): each chord's scale with chord tones, available
  tensions and avoid notes; extended chords that fit; how each tension moves into the next chord; what
  each chord type leads to. Rules and sources: `docs/THEORY_SOURCES.md`.
- **Extensions in the move**: on Move, pick an extension on the start and landing chord. Plain passing
  7th chords take the extension that connects best (scale by resolution), ways are re-ranked by how
  smoothly the picked notes carry through ("ext %"), and the why-panel says where each note goes.
- **Listen**: play a chord (Web MIDI or on-screen keys, with a tap-to-hold latch). After the hold
  time the chord is named (inversions, missing 5th, rootless voicings; other readings one tap away),
  logged, and the app lists where it usually goes and the ranked ways to get there. Any of it can be
  added to Progression or opened in Move. No microphone.
- **Melody on top** (Phase 2): pick a chord and a melody note (tap a key, type it, or play it on a
  MIDI keyboard). The note is checked (chord tone / available tension / avoid note / outside the
  scale, with fixes) and every voicing with that note on top is listed: close, drop 2, drop 3,
  drop 2&4, block chords, rootless A/B, Barry Harris 6th-diminished, So What / quartal, upper
  structures, spread, cluster. "Keep" builds a voice-leading line; the next chord's voicings are then
  ordered smoothest first, with each voice's motion. Kept voicings can be practised in Play it.
  Optional "Goes to" chord (decides the scale) and genre (its favorite voicing types come first).
- **Reharm** (Phase 3): bring in a tune as a MIDI file (.mid), a MusicXML score or lead sheet
  (.musicxml, .xml, .mxl) or a typed chord chart. The app shows the key and the chord chart (heard
  from the notes, or the written chord symbols), each chord correctable; a voicing for every chord
  with the voice leading from the chord before; and light / medium / wild reharms in the chosen
  genre and feel, each change explained. Under a melody only chords the melody fits are used. Play
  (synth or MIDI out), download a .mid on the tune's own bars and tempo, or practise in Play it.
  PDFs and photos are not read (see OPEN_QUESTIONS 60).
- **Cheat sheet**: every chord in the key with its 2-5.
- **Modes**: Major / Melodic minor / Harmonic minor families, "Same root" vs "From one scale",
  brightness ladder, formula vs major, character note, drone playback, compare with major.
- **Charts**: the four 7-row chord/scale charts (source: Jeff Schneider's "The Last Chord/Scale
  Chart You'll Ever Need").
- **Drill**: 2-5 spelling flashcards + modes by ear.
- **Play it**: Web MIDI input + on-screen multitouch piano; checks the move / progression /
  random 2-5s / mode scale / the voicings kept on the Melody tab (always exact); "Any voicing" (3rd+7th required, rest must fit the scale) vs
  "Exact voicing"; green/red keys, gold hint dots, time + wrong-note stats.
- **Voicings**: hover (Mac) / long-press (iPad) shows one fitting voicing (Rootless A for non-dominant,
  Rootless B for dominant) + "All voicings" sheet with 10 voicings. Dominant rootless voicings use the
  13 instead of the 5 (A = 3-13-7-9, B = 7-9-3-13).
- **Sound**: built-in synth, or MIDI out to any port (IAC Driver Bus 1 → Logic + Kontakt). The app
  never listens to the port it sends to (feedback guard). Stop sends note-offs (no stuck notes).
- Keyboard shortcuts: Space play/stop, ←/→ key, 1–7 land on chord, Esc close popup.
- State persisted in localStorage. PWA: manifest, icons, offline service worker.
- Layout: sidebar ≥1000 px, bottom tab bar below; sticky player bar. Dark theme, Fraunces/Manrope.

---------------------------------------------------------------------------------------------------
## Phase 0 — Port to Vite + TypeScript (no new features)

- Move theory code into `src/theory/` with types: `Note` (letter + accidental), `PitchClass`,
  `Interval`, `Chord` (root Note, quality, tones, extensions), `Scale`/`Mode`, `Key`.
- Port UI 1:1. Port tests for: all chords of the 4 scale types in 12 keys (spelling + quality),
  secondary 2-5 per target, voicing builders, Play-it checking logic (simulate note on/off).
- GitHub Actions deploy; service worker per CLAUDE.md.
- **Done when:** live site behaves identically, `npm test` green, Lighthouse PWA installable.

---------------------------------------------------------------------------------------------------
## Phase 1 — Passing-chord engine, style system, explanations + reframe the app around it

The **Move tab becomes "Connect"** (see Product direction): pick FROM and TO chords (diatonic, or
type any chord symbol). Show every technique that connects them, as cards ranked by the current
style. Each card: chord symbols, roman-numeral analysis, voicing on a keyboard, play button (plays
FROM → passing → TO through the current sound output), and the "why" text. Then convert
Progression, Cheat sheet, Drill and Play it to the technique-based model described above; the
secondary ii–V is just the `secIIV` technique.

### 1.1 Technique catalogue (each is a pure function `(from, to, key, ctx) → Suggestion[]`)
| id | technique | rule |
|---|---|---|
| secDom | Secondary dominant | V7 of TO (TO must not be dim/m7♭5) |
| secIIV | Secondary ii–V | existing logic (bright/dark by TO quality) |
| tritone | Tritone sub | ♭II7 of TO (dominant a tritone from V/TO) |
| iiSubV | ii–subV | related ii of the tritone sub, then subV7 |
| backdoor | Backdoor ii–V | iv7 → ♭VII7 → TO (TO major or dominant) |
| dimPass | Diminished passing | ♯°7 between two chords whose roots are a whole step apart (♯I°7 between I and ii, ♯IV°7 between IV and V/I⁶₄) |
| dimCT | Common-tone °7 | °7 sharing the root of TO (e.g. C°7 → Cmaj7) |
| chromAbove / chromBelow | Chromatic approach | same quality as TO, a half step above/below |
| planing | Planing | slide the TO voicing shape in parallel from a step above/below |
| lineCliche | Line cliché | one inner voice moves chromatically (m, m(maj7), m7, m6) |
| borrowed | Modal interchange | iv, iv6, ♭VI, ♭VII, ♭II, ♭III from the parallel minor; minor plagal iv → I |
| susSub | Sus / pedal | IV/V or V7sus4 replaces V |
| coltrane | Coltrane cycle | major-third cycle inserted into ii–V–I |
| upperStruct | Upper-structure dominant | triad over the dominant (II/V = 13♯11, ♭VI/V = ♯9♭13, ♭III/V etc.) |
| turnaround | Turnaround variants | I–vi–ii–V, I–VI7–ii–V7, iii–VI7–ii–V7, Tadd Dameron (I–♭III–♭VI–♭II), gospel 7-3-6 (vii–III7–vi) |
| gospelWalk | Gospel walk-up | I → I/3 → IV → ♯IV°7 → I/5 |

Each suggestion carries: `chords[]`, `romanNumerals[]`, `techniqueId`, `tension` 0–1,
`colorTags` (bright/dark/tense/lush/sad/dreamy), `outsideNotes[]` vs home key, and `voiceLeading`
(from the voicing engine, see Phase 2).

### 1.2 Style system (`src/data/styles.ts`, plain data, easy to tune)
- **Genres:** jazz, gospel, neo-soul/R&B, funk, pop, lo-fi, bossa, film.
- **Feels:** bright, dark, tense, lush, sad, dreamy.
- A style = genre × feel. Each has: technique weights (0–1), allowed extensions, preferred voicing
  types, max tension, harmonic rhythm (chords per bar).
- Starting values (tune later, keep in data, not code):
  - jazz: secIIV 1, tritone .9, iiSubV .8, backdoor .6, upperStruct .7, coltrane .3
  - gospel: dimPass 1, gospelWalk 1, secDom .9, borrowed .8 (minor plagal), upperStruct .6
  - neo-soul: planing 1, chromAbove .8, borrowed .7, susSub .7, extensions 9/11/13, clusters
  - funk: chromAbove 1, planing .8, susSub .7; dominant 9/13 and m11; harmonic rhythm low
  - pop: secDom .8, borrowed .9 (♭VI, ♭VII, iv), susSub .6; triads + add9; low tension
  - lo-fi: maj9/m9/m11 planing .9, borrowed .7, chromBelow .6; tension low-mid
  - bossa: secIIV .9, tritone .7, dimPass .5; 6/9, maj7, m6
  - film: borrowed 1, coltrane .4, planing .6; maj7♯11, ♭VI, ♭II
  - feel modifiers: bright → favor major/Lydian, raise ♮/♯ colors; dark → favor ♭9 ♭13, borrowed
    minor, m7♭5; tense → upper structures, altered; lush → 9/11/13, spread voicings; sad → minor iv,
    ♭VI; dreamy → planing, maj7♯11, sus.

### 1.3 Explanations (rule-generated templates)
Every suggestion explains, in ≤4 short bullets:
- **Function** ("V of ii", "tritone sub of V/IV").
- **Voice leading**: the exact notes that move and where ("B♭ in C7 falls to A in Fmaj7").
- **Borrowed notes** and where from ("A♭ is borrowed from C minor").
- **Why it pulls**: tritone resolution / half-step approach / common tone / chromatic line.

### 1.4 Test cases (must pass; add many more)
- C major, Cmaj7 → Fmaj7: secDom C7; secIIV Gm7–C7; tritone G♭7; iiSubV D♭m7–G♭7.
- C major → Am7 (vi): secDom E7; dark secIIV Bm7♭5–E7; bright secIIV Bm7–E7.
- Backdoor to Cmaj7: Fm7–B♭7.
- dimPass Cmaj7 → Dm7: C♯°7 (C♯ E G B♭). Fmaj7 → C/G: F♯°7.
- Common-tone °7 into Cmaj7: C°7 (C E♭ G♭ B𝄫).
- Coltrane over Dm7–G7–Cmaj7: Dm7 | E♭7 A♭maj7 | B7 Emaj7 | G7 | Cmaj7.
- Tadd Dameron in C: Cmaj7 – E♭maj7 – A♭maj7 – D♭maj7 → Cmaj7.
- Upper structure: D triad over C7 = C13♯11 (C E B♭ + D F♯ A); E♭ triad over G7 = G7♯9♭13.
- Spelling: tritone sub of A7 is E♭7 (not D♯7); secondary dominant of ii in G♭ major is E♭7.

**Done when:** Connect tab live and Progression / Cheat sheet / Drill / Play it all use the
technique model; no leftover "2-5"-only wording outside ii–V contexts; all catalogue tests green;
every card plays through IAC and the built-in synth; style switch visibly reorders/filters results.

---------------------------------------------------------------------------------------------------
## Phase 2 — Melody on top (lead voicing)

Input: chord + melody note (click a key, type it, or play it on the S88). Output: ranked voicings
with that note on top, smoothest voice leading from the previous chord.

- **Voicing types:** close, drop 2, drop 3, drop 2&4, rootless A/B (Levine: A = 3-5-7-9 /
  dominant 3-13-7-9; B = 7-9-3-5 / dominant 7-9-3-13 — note the current app voices dominant
  Rootless B as 7-9-3-5; switch it to 7-9-3-13), block chords (Shearing locked hands:
  4-note close + melody doubled an octave below), Barry Harris 6th-diminished (6th chord on chord
  tones, diminished on passing tones), quartal (So What: three 4ths + major 3rd), upper structures,
  spread (LH 1-7 or 1-10, RH 3-5-9/13), neo-soul clusters (2nds inside).
- **Melody check:** classify melody note as chord tone / available tension / avoid note
  (e.g. 4 over maj7, ♭9 over m7). For avoid notes, offer a fix (maj7 → maj7♯11? sus? reharm via
  Passing engine) and explain.
- **Voice leading:** choose the voicing that minimizes total semitone movement from the previous
  voicing; keep common tones; report each voice's motion.
- **Range rules:** LH not below E2 for 3rds (low-interval limits), melody stays where the user put it.
- **Tests:** Cmaj7 with E5 on top → drop 2 = C4 G4 B4 E5. Rootless A Dm7 = F A C E; Rootless B G7 =
  F A B E. Melody F over Cmaj7 → flagged avoid.

**Done when:** Lead-voicing view works with mouse, touch and MIDI input; voice-leading line display;
"send to Play it" to practice the voicings.

---------------------------------------------------------------------------------------------------
## Phase 3 — Reharm from a Logic MIDI file

Flow: upload `.mid` (Logic: select region → File → Export → Selection as MIDI File) → analysis →
pick style → 2–3 reharms (light / medium / wild) → A/B → explain → output.

### 3.1 Parsing
- Standard MIDI File types 0 and 1, running status, tempo map, time signatures, PPQ. Write a small
  parser or vendor a pinned library into the repo (must work offline). Merge tracks; let the user
  pick a melody track if there are several.

### 3.2 Analysis
- **Key:** Krumhansl–Schmuckler profile over duration-weighted pitch classes; let the user override.
- **Grid:** bars from time signature; harmonic rhythm candidates of 1 bar, ½ bar, 1 beat.
- **Melody:** top note of each onset cluster (skyline), or the chosen track.
- **Chords:** per segment, duration-weighted pitch-class set (ignore melody notes when a separate
  melody exists), lowest note as bass; score against chord templates (triads, 6, 7, 9, 11, 13,
  sus, dim, alt) preferring the bass as root; allow rootless detection (bass from LH else infer).
- **Show the detected chart** and let the user edit any chord before reharming.

### 3.3 Reharm
- For each chord boundary, run the Passing engine (prev → next) with the style weights; insert or
  substitute where the melody allows (melody note must be chord tone or available tension of the
  new chord, else reject or re-voice).
- Levels: light (substitutions only on weak beats / long chords), medium, wild (Coltrane, upper
  structures, planing).
- Voice every chord with Phase 2 under the original melody.
- **Outputs:** play live through MIDI out (record into Logic), download `.mid` (melody track +
  reharm track, original tempo/time sig), send to Play it.
- **Explain** every change with the Phase 1 templates, plus a one-line summary per reharm
  ("Turned the turnaround into a tritone-sub chain; bar 7 gets a backdoor").

**Done when:** a real file from Ralph round-trips: upload → detect (correctable) → reharm →
play/export → drag into Logic → lines up with the original region.

---------------------------------------------------------------------------------------------------
## Phase 4 — Practice + polish
- Save favorite reharms and passing-chord cards (localStorage, export/import JSON).
- Drill: "name the technique" by ear; "play the passing chord" in Play it.
- iPad: everything except MIDI works by touch.

---------------------------------------------------------------------------------------------------
## Checklist
- [x] Phase 0 port + tests + Actions deploy + SW fix (on branch `phase-0-vite-ts-port`; live-site check
      pending: merge to `main` and set Pages source to "GitHub Actions")
- [x] Phase 1 Passing engine, styles, explanations (see `docs/OPEN_QUESTIONS.md` 6–24 for defaults
      waiting on Ralph; IAC/Logic playback not checked with real devices)
- [x] Phase 2 Lead voicing (Melody tab; Claude's picks for 44–56 and open points 57–58 in `docs/OPEN_QUESTIONS.md`;
      not checked with a real MIDI keyboard or on iPad)
- [x] Phase 3 MIDI reharm, plus MusicXML scores / lead sheets and typed charts (Reharm tab; open
      points in `docs/OPEN_QUESTIONS.md` 59–68; **not yet tried with a real Logic export**, which is
      the spec's "done when")
- [ ] Phase 4 Practice + polish
