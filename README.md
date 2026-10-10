# type-game

Web prototype of a typography puzzle game. Rebuild the target composition by
dragging letters from the A–Z tray onto the canvas. Then tap Done and drag the
canvas onto the target to check your answer. See `requirements.md`.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (no level editor)
```

## Routes

| Route                 | What                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `#/`                  | The game. Plays the first level you haven't completed.               |
| `#/editor`            | Level editor (dev only).                                             |
| `#/play/<level id>`   | Play any one level without saving progress (dev only).               |
| `#/play/draft`        | Play the editor's current draft (dev only).                          |

The dev-only routes exist under `npm run dev`. For a build that includes them,
use `VITE_ENABLE_EDITOR=true npm run build`.

The back arrow opens the world menu: swipe through the worlds and tap the
centred one to play it. Completed worlds and the current one can be entered;
later worlds are locked.

Tap the progress dots (top right) to open the placeholder world select. Jump
to any world or level from there, or tap "Start over from world 1" to clear all
saved progress. Skipping ahead doesn't mark the levels in between as completed,
and the level you jumped to is remembered across reloads.

## Levels

Each level is one JSON file in `src/data/levels/`. Levels play in file-name
order and are grouped by `world`.

```json
{
  "id": "w1-01",
  "world": 1,
  "scale": 0.4,
  "charset": "upper",
  "letters": [
    { "char": "L", "x": 2, "y": 6 },
    { "char": "O", "x": 4, "y": 8 }
  ]
}
```

- `scale`: the letters' cap height as a fraction of the circle's diameter.
- `charset`: which characters the tray offers: `upper` (A–Z), `lower` (a–z),
  `numerals` (0–9) or `mixed` (A–Z and a–z, paired as Aa Bb Cc …). Levels
  without it are `upper`. Every letter must be in the level's set. Choose it in
  the editor's Characters switch.
- `x`, `y`: grid point of the letter's anchor. The anchor is the left edge of
  the outline, on the baseline, so ascenders rise above it and descenders
  (g, p, y, oldstyle figures) hang below it. `(0, 0)` is the top-left corner of the
  circle's bounding square. Values can be negative or past the grid size,
  because letters can sit partly outside the circle.
- Grid density per world is set in `src/data/worlds.json` (cells across the
  diameter).

The editor exports this exact format. Save the file into `src/data/levels/`.

## Worlds and letterforms

Each world's settings live in one config, `src/data/worlds.json`: its name,
grid density (cells across the diameter), typeface, source font file and axis
values (`wght`, plus `opsz`, `wdth` etc. for variable fonts).

| World | Style     | Typeface    | Settings              | Grid |
| ----- | --------- | ----------- | --------------------- | ---- |
| 1     | Oldstyle  | EB Garamond | SemiBold (wght 600)   | 10   |
| 2     | Modern    | Bodoni Moda | wght 600, opsz 96     | 12   |
| 3     | Slab      | Zilla Slab  | Bold (wght 700)       | 16   |
| 4     | Grotesque | Archivo     | wght 700, wdth 110    | 20   |
| 5     | Geometric | Jost        | Light (wght 300)      | 24   |

Game letters are drawn from SVG path data, never from font files. Source fonts
go in `fonts/` (gitignored). See `fonts/README.md` for where to get them. To
swap a font or weight, edit `worlds.json` and run:

```sh
npm run glyphs        # every world
npm run glyphs -- 4   # one world
```

This needs Python 3 with fontTools (`pip install fonttools brotli`). Variable
fonts are pinned at the configured axis values with fontTools' instancer, then
opentype.js converts the static instance to `src/data/glyphs/world-<n>.json`
(A–Z, a–z, 0–9, `*` and metrics). Figures use each font's default numeral
style, so Zilla Slab's are oldstyle.. Only those files are committed and shipped.

`grid` is read by the app directly, so changing it needs no rebuild. Levels
already authored for that world keep their grid coordinates, so recheck them.

### Trying each world

The level editor's World buttons switch the draft between worlds, moving its
letters to the matching points on the new grid. Positions always come from your
last hand-placed layout, so flipping through worlds and back returns the
original positions. Use Play test to try the draft in the gameplay screen.

## Where things live

- `src/styles.css`: color tokens for light and dark mode.
- `src/motion.js`: every motion and gesture value, including every timing,
  distance and easing of the screen transitions (`transitions`). Switch the
  success feedback between `'rays'` and `'shimmer'` there.
- `src/layout.js`: tray letter size, spacing and position.
- `src/lib/charsets.js`: the character sets a level's tray can offer.
- `src/lib/animate.js`: tween and spring animation that can be interrupted.
- `src/lib/director.js`: the screen transitions (level complete, world
  complete, next world) and the world menu, played in a layer over the game
  with stand-in circles drawn by `src/lib/faces.js`. See `MOTION-SPEC.md`.
- `src/lib/easing.js`, `src/lib/sequence.js`: easing curves, and the
  promise-based tweens the transitions are scripted with.
- `src/lib/geometry.js`: grid, layout and answer-check math.
- `src/components/Stage.jsx`: the gameplay surface (target, canvas, tray,
  dragging, checking, and the wrong-answer shake).
- `src/screens/Game.jsx`, `src/screens/Editor.jsx`: the two screens.
