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

The dev-only routes and the world switcher exist under `npm run dev`. For a build that includes them,
use `VITE_ENABLE_EDITOR=true npm run build`.

To reset progress, clear the site's local storage or finish every level and
tap "Start over".

## Levels

Each level is one JSON file in `src/data/levels/`. Levels play in file-name
order and are grouped by `world`.

```json
{
  "id": "w1-01",
  "world": 1,
  "scale": 0.4,
  "letters": [
    { "char": "L", "x": 2, "y": 6 },
    { "char": "O", "x": 4, "y": 8 }
  ]
}
```

- `scale`: the letters' cap height as a fraction of the circle's diameter.
- `x`, `y`: grid point of the letter's anchor. The anchor is the left edge of
  the outline, on the baseline. `(0, 0)` is the top-left corner of the
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
| 1     | Oldstyle  | EB Garamond | Regular (wght 400)    | 10   |
| 2     | Modern    | Bodoni Moda | wght 400, opsz 96     | 12   |
| 3     | Slab      | Zilla Slab  | Bold (wght 700)       | 16   |
| 4     | Grotesque | Archivo     | wght 900, wdth 125    | 20   |
| 5     | Geometric | Jost        | Thin (wght 100)       | 24   |

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
(A–Z, `*` and metrics). Only those files are committed and shipped.

`grid` is read by the app directly, so changing it needs no rebuild. Levels
already authored for that world keep their grid coordinates, so recheck them.

### Dev world switcher

In dev builds a row of world buttons sits above the game and in the level
editor.

- **Game:** plays the current level in another world's typeface and grid, with
  letter positions moved to the matching points on the new grid. Choose the
  level's own world to turn the preview off. The choice lasts for the browser
  tab.
- **Editor:** sets the draft's world and moves its letters to the new grid.
  Positions always come from your last hand-placed layout, so flipping through
  worlds and back returns the original positions.

## Where things live

- `src/styles.css`: color tokens for light and dark mode.
- `src/motion.js`: every motion and gesture value.
- `src/lib/animate.js`: tween and spring animation that can be interrupted.
- `src/lib/geometry.js`: grid, layout and answer-check math.
- `src/components/Stage.jsx`: the gameplay surface (target, canvas, tray, dragging, checking).
- `src/screens/Game.jsx`, `src/screens/Editor.jsx`: the two screens.
