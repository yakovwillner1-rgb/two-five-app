# Design system (v2)

Feel: a game you want to open. Bright, vibrant, sleek; playful in motion and color, clean in layout.
**Chords are the hero**: huge, bold, colorful cards. Everything else is smaller and quieter around them.
Light is the default; dark is an option (moon/sun button in the header), made with the same care.

**Tune the look in one place: `src/tokens.css`.** `src/styles.css` only reads tokens (no hex colors).
Theme = `html[data-theme="dark"]` (absent = light), stored under `localStorage["twofive-theme"]`
(`src/ui/theme.ts`; an inline script in `index.html` applies it before first paint).

## Direction
- **Color = harmonic function** (Hookpad idea). start chord = periwinkle `--c0`, ii = mint `--c2`,
  V = coral `--c5`, land = sunflower `--gold`. Electric violet `--accent` is for primary actions,
  selected states and rewards. Role colors are big gradient fills with a glow, never thin outlines.
  `src/ui/role.ts` maps a chord symbol to its role (Play it chips, bursts).
- **Fewer boxes.** Panels are tinted glass (`--glass`), no outline, soft shadow. Grouping comes from
  spacing and color blocks. Tappable things are white, raised, and rounded.
- **Type.** Outfit everywhere; chord symbols 800 weight, `clamp(2.1rem, 25cqi, 5.2rem)` on path cards,
  up to 7.5rem in Play it. `Noto Music` is the fallback for ♭ ♯ 𝄪 𝄫.
- **Background.** Tinted `--bg` with four very slow drifting blobs behind the header (`.blobs`).
- **Less text.** Short labels; long help goes behind an `i` (Step 1+).

## Tokens (values in the file)
| Group | Tokens |
|---|---|
| Surfaces | `--bg --bg-glow --panel --panel2 --line --bar --scrim --glass --glass-2 --tint` |
| Text | `--ink` `--ink2` `--muted` (all AA on `--bg`, `--panel`, `--glass`) |
| Roles | `--c0 --c2 --c5 --gold`; text on any fill: `--on-fill`; lighten target `--lift` |
| Accent | `--accent --on-accent --accent-text --accent-soft --grad-accent` |
| Status | `--ok --ok-fill --warn-text` |
| Keyboard | `--key-white --key-stroke --key-black --key-label` |
| Blobs | `--blob-1…4 --blob-op` |
| Type | `--display --body --mono --fs-base` |
| Shape | `--r-xs … --r-xl --r-pill --edge` |
| Shadow | `--shadow-soft --shadow-edge --shadow-block --shadow-pop --glow` |
| Motion | `--t-fast 120ms --t-med 220ms --t-slow 420ms --ease-spring --ease-out` |

Role text on a light panel uses `--rct` (role color mixed 32% into `--ink`). Fills use `--on-fill`.

## Contrast
A script audited every text node on all 12 tabs in light and dark (default states and a Drill
answer): all >= 4.5:1 (>= 3:1 for large/bold text). Re-run it after changing a color token.

## Components
**Chord card** (`.blk`, `.bar.tg`, `.half`): role gradient, 800-weight symbol, role label above, name
below, raised `--shadow-block`. States: hover none (it is not a button); press `:active` sinks 5px;
`.live` (playing) lifts 6px, scales 1.045, ring `--rc`; pops in when its chord changes.
**Button** (`.pill`, `.pill.go`, `.pill.sm`): white, raised edge. Hover lifts 2px (mouse only),
press sinks by `--edge` and scales .98, selected = ink fill, primary (`.go`) = violet gradient.
**Chip / tile** (`.chip`, `.tile`): same as button; a selected chord tile fills with its role color.
**Keyboard**: white keys, dark keys; played keys fill green (right), red (wrong) or blue (held) with a
glow; gold dots mark what to play (they breathe).

## Motion rules
All motion is transform / opacity only (CSS transitions and keyframes, Web Animations API in
`src/ui/motion.ts`). No libraries. Under `prefers-reduced-motion` the timing tokens go to 0, CSS
animation is disabled, the blobs stop, and `motion.ts` skips every effect.

| What | When | Duration · easing |
|---|---|---|
| Press | `:active` on buttons, chips, tiles, cards | `--t-fast` (120ms) · spring |
| Hover lift | mouse only (`@media (hover:hover)`) | `--t-fast` · spring, -2px |
| Chord pop | a path/progression card whose chord changed | `--t-slow` (420ms) + 80 · spring, scale .82 → 1.09 → 1 |
| FLIP slide | any `[data-flip]` element whose position changed (ways list on style change, path cards) | `--t-slow` + 120 · ease-out |
| New card | a `[data-flip]` element that did not exist before | `--t-slow` · spring, scale .85 → 1 |
| Playing chord | `twofive:ev` from the player at each chord start | card: lifts, ring pulses once per beat (`--beat` = 60/BPM); a scale kick of min(0.8 beat, 600ms) |
| Arrow light | after each playing card | travels in the last beat of the chord (ms = min(chord length, 1 beat)) so it arrives as the next chord starts |
| Voice-leading dots | Move stage: 3rd and 7th | `--vl` = clamp(0.35 × chord length, .18s, .7s) · spring; slide to the next chord's note |
| Key ripple | every on-screen or MIDI note on (Play it, Listen, Melody) | 480ms · ease-out, ring 0.4 → 2.8, color = mark (green / red / blue) |
| Right chord | Play it, chord accepted | 18-dot burst in the chord's role color, 520-760ms |
| Wrong note | Play it | target panel shakes 320ms, red glow |
| Combo | Play it, each clean chord (x2+) | pill bumps 420ms; hot gradient from x5 |
| Score screen | Play it, run finished | title/stars pop (stars 120ms apart); time 900ms, accuracy 1000ms (+150), combo 800ms (+300) count up, ease-out cubic; confetti (80) only on a clean run |
| Circle of fifths | tap a key | ring turns 520ms (spring) so the key is on top, labels stay upright, its two fifth-neighbors pulse (640ms, after half the turn), then the key changes |
| Drill | right answer pops, wrong answer shakes | 420ms / 320ms |
| Blobs | always | 40-60s ease-in-out drift, transform only |

BPM sync: everything that follows playback uses `S.tempo` (`--beat`) and the chord's own length, so it
stays in time when the tempo changes. Events come from `playSeq` in `src/audio/player.ts` as the
`twofive:ev` document event `{ id, dur }`.

## Move page parts (Connect loop)
- **Chord tray** (`.tray`): opens under the path from a card's *change* chip; big role-coloured tiles; typing/extensions behind a `<details>`.
- **Cue** (`.cue`): one sentence from the actually played pitches + *Hear just this line*; the two pitches are marked on cards and keys.
- **Notes played** (`.vl`): keys light in the playing chord's role colour; 3rd/7th dots at their real pitch. Chord-tone diagrams elsewhere are
  labelled *reference*: never mix the two.
- **A / B** (`.compare`): glass strip, A labelled *saved*, B labelled *current*; `.cmp.live` rings the one being heard.
- **Folds** (`details.fold`): why it works, guide tones, scales, chord details; closed by default.
- **Layout:** header, scrolling `<main>`, transport are separate regions; wrap and grow text, never shrink labels to fit.

## Guitar parts
- **Chord box** (`chordBox`): standard vertical box, low E on the left; × = don't play, ○ = open string, number on the left = starting fret.
  Dots: root gold, 3rd/7th mint, others periwinkle (same meaning as the piano legend).
- **Neck** (`neckStage`): lies down like you hold it (high E on top); one dot per string slides along its string to the next chord
  (`--vl` timing, spring). Root gold, 3rd violet, 7th ink, others periwinkle.
- The header Piano/Guitar switch is a `.seg`; on phones the header is two rows plus the key row.

## Not built yet (later steps)
Level-up moment and XP (Step 5, game layer), personal bests, daily challenge.
