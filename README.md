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

## Letterforms

Game letters are drawn from SVG path data, never from font files. Put source
fonts in `fonts/` (gitignored) and register them in `scripts/typefaces.json`.
Then run:

```sh
npm run glyphs
```

This writes `src/data/glyphs/<id>.json`. A world uses a typeface through its
`typeface` field in `src/data/worlds.json`. See `fonts/README.md` for the
placeholder font (Alfa Slab One, OFL).

## Where things live

- `src/styles.css`: color tokens for light and dark mode.
- `src/motion.js`: every motion and gesture value.
- `src/lib/animate.js`: tween and spring animation that can be interrupted.
- `src/lib/geometry.js`: grid, layout and answer-check math.
- `src/components/Stage.jsx`: the gameplay surface (target, canvas, tray, dragging, checking).
- `src/screens/Game.jsx`, `src/screens/Editor.jsx`: the two screens.
