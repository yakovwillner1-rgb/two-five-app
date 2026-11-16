# Design system

Look: a game you want to open. Bright, chunky, sleek. Playful in motion and color, clean in layout.
Light is the default; dark is an option (moon/sun button in the header), made with the same care.

**Tune everything in one place: `src/tokens.css`.** `src/styles.css` only reads tokens (no hex colors).
Theme is `html[data-theme="dark"]`; absent = light. Stored under `localStorage["twofive-theme"]`
(`src/ui/theme.ts`); an inline script in `index.html` applies it before first paint.

## Direction
- **Color with meaning.** start chord = periwinkle `--c0`, ii = mint `--c2`, V = coral `--c5`,
  land = sunflower `--gold`. Electric violet `--accent` is for primary actions, selected states and
  rewards. Color goes in big shapes (chord cards, tiles, keys), not thin outlines.
- **Type.** Outfit everywhere (chunky numerals, friendly). Chord symbols are the hero: 800 weight,
  large. `Noto Music` is the fallback for ♭ ♯ 𝄪 𝄫.
- **Shape.** Big radii (`--r-*`), a raised bottom edge (`--edge`) on every pressable thing that
  compresses on press, hard soft-shadows (`--shadow-*`).
- **Motion.** Springy (`--ease-spring`), short (`--t-fast/med/slow`). Chords pop when a way is picked;
  the playing chord lifts and rings (`.live`); keys glow in their role color. All motion is off under
  `prefers-reduced-motion` (the timing tokens go to 0 and animations are disabled).
- **Less text.** Short labels; long help goes behind an `i` (later steps).

## Tokens (see the file for values)
| Group | Tokens |
|---|---|
| Surfaces | `--bg --bg-glow --panel --panel2 --line --bar --scrim` |
| Text | `--ink` (14:1) `--ink2` (9:1) `--muted` (5.6:1) on `--bg`/`--panel` |
| Roles | `--c0 --c2 --c5 --gold`; text on any of them: `--on-fill` |
| Accent | `--accent --on-accent --accent-text --accent-soft` |
| Status | `--ok --ok-fill --warn-text` |
| Keyboard | `--key-white --key-stroke --key-black --key-label` |
| Type | `--display --body --mono --fs-base` |
| Shape | `--r-xs…--r-xl --r-pill --edge` |
| Shadow | `--shadow-soft --shadow-edge --shadow-block --shadow-pop --glow` |
| Motion | `--t-fast --t-med --t-slow --ease-spring --ease-out` |

Role text on a light panel: `--rct` = the role color mixed 32% into `--ink` (set in styles.css), so
small role-colored labels stay AA. Fills use `--on-fill` text.

## Contrast
Checked by script on all 12 tabs in light and dark (default states): every text node >= 4.5:1
(>= 3:1 for large/bold text). Re-run the audit after changing any color token.

## Components
### Chord card (`.blk`)
Solid role fill, symbol 800 weight (clamp 1.5–3rem), small role label on top, name below.
- default: raised `--shadow-block`.
- `.live` (playing): lifts 4px, scales 1.035, ring in the role color. Reduced motion: ring only.
- on pick: pops in (`@keyframes pop`).

### Button (`.pill`, `.pill.go`, `.pill.sm`)
- default: panel fill, 2px line border, raised edge `--shadow-edge`.
- hover: border becomes `--accent`. active: moves down by `--edge`, shadow gone (compresses).
- selected (`aria-pressed`): ink fill. primary (`.go`): violet fill, white text.
- disabled: 40% opacity, no shadow. focus-visible: 3px violet outline.

### Chip / tile (`.chip`, `.tile`)
- chip: mono-less pill-ish (`--r-sm`), same edge behavior as buttons.
- tile (chord picker): panel fill; selected = the role color fill (`--rc`) with `--on-fill` text, lifted 2px.
- `.tile.small`, `.tile:disabled` (greyed, no shadow).
