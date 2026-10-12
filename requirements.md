# Type Puzzle Game — Prototype Requirements

Working title: TBD

## Overview

A typography puzzle game. The player sees a target composition of overlapping letterforms cropped inside a circle. They rebuild it by eye, dragging letters from an A–Z tray onto a canvas circle below. When they think it matches, they press Done and drag their canvas up onto the target to check.

The game is inspired by graphic design school exercises: composing letterforms into dynamic, cropped, overlapping compositions. Each world features a typeface from a different historical style or era.

This first build is a **web prototype for iterating on core gameplay**. It may become a native app later, so build it mobile-first (portrait phone) and keep it touch-friendly.

## Prototype scope

**In scope**
- Gameplay screen, fully playable
- **One world with a few hand-authored levels**
- All five world typefaces converted to path data, so levels can be built in each (see World typefaces)
- A data structure that already supports 5 worlds
- Level editor (dev-only; see below)
- World/level progress indicator
- Light and dark mode

**Out of scope for now** (needed later)
- Title, world select, level select, badge collection, settings, and tutorial screens
- Polished motion language beyond the transitions in `MOTION-SPEC.md` (see Motion)
- Sound and haptics
- Scaling, rotating, or flipping letters
- Timers, and any scoring beyond level marks (see Scoring)

## Gameplay screen

Top to bottom:

1. **Header.** Back button on the left. World progress indicator on the right.
2. **Target circle.** The puzzle: letters cropped by the circle, merged into one solid shape. Shown in reverse (background-colored letters knocked out of a solid circle) so the player's letters fill the spaces when dragged up to check.
3. **Canvas circle.** Same size as the target, with a dot grid in the background. The player builds their answer here.
4. **Done button.** A small circular button beside the canvas. It shows, in the accent color, the mark the player would earn on their next check: * before the first check, then †, then ‡. After 3 misses it goes back to an accent dot (see Scoring).
5. **Letter tray.** A full A–Z row of large letters, cropped at the bottom of the screen. The letters sit on a single baseline rule, with tick marks below it (the scroll track, drawn with only its top edge).

### Progress indicator
- One dot per world (5 worlds).
- A completed world is a filled dot.
- The current world has a small foreground-colored dot in its centre, and a thicker ring that fills like a donut chart as its levels are completed.
- Future worlds are empty circles.

## Core interactions

### Letter tray
- Contains the full A–Z, uppercase only. Numerals are not needed for now.
- **Swipe horizontally** on the tray or track to scroll it.
- **Pull a letter upward** to pick it up and drag it. The gesture must clearly separate scrolling from dragging.
- **Each letter can be used once per puzzle.** When a letter is placed, its tray spot becomes a blank slot. When that letter is removed from the canvas, it returns to its slot.

### Dragging and placing
- Only movement in this version. No scaling or rotating.
- As a letter is dragged from the tray toward the canvas, it scales smoothly to the puzzle's letter size, starting from where it was picked up and reaching full size before it's over the canvas.
- Letters **snap to the grid**. The grid density is set per world and gets finer in later worlds.
- Letters can be placed partly outside the circle. Cropping is a core part of the puzzles, so the placement area extends past the circle edge, and the circle clips what shows. Some of the letterform itself must show: a drop where none of it would sends the letter back to the tray. A letter that's mostly outside can still be picked up by its hidden part.
- Placed letters can be **picked up and moved again**. While moved within the canvas, they stay cropped by the circle.
- A letter can be **removed** by dragging it back to the tray or off the canvas. As a placed letter is dragged out past the canvas, its cropped part fades in, showing that letting go returns it to the tray.
- All letters render in the same foreground color. Overlaps merge into one shape. There is no inversion or XOR.

### Checking an answer
1. Player taps **Done**.
2. The UI clears away, leaving the canvas circle draggable. A cancel (×) button takes Done's place; tapping it returns to building.
3. The player's letters fade quickly to the **accent color** so they read against the target. They fade back to the foreground color when the player returns to building (cancel, or after a failed check).
4. The player drags the canvas circle up onto the target. The drag is vertical only, and stops when the canvas's top edge reaches the target's. Reaching the target checks the answer right away, even before the player lets go. Near alignment on release, it snaps into place. If it's let go short of that, it drops back and stays draggable for another try.
5. **Pass:** the match must be perfect. Because the target always sits on the world's grid, a perfect match is always possible.
6. **Fail:** unlimited retries. The canvas returns, with the player's letters kept, so they can adjust. Each check counts toward the level's mark (see Scoring).

Since each letter is used once, the check compares each placed letter's grid position against the solution.

## Levels and worlds

- **5 worlds**, roughly 5–10 levels each. Levels unlock in order.
- Each world features one typeface from a different historical classification (see World typefaces below).
- Grid density increases per world.
- Difficulty comes mainly from:
  - letter scale increasing over time, which means more cropping
  - more complex overlapping and cropping
- Puzzles must be strong, dynamic compositions, not random arrangements. They will be **hand-authored by the designer**.
- Store levels as JSON. Each level holds its world, letter scale, and a list of letters with grid positions.

### World typefaces

In play order. All are free from Google Fonts (SIL OFL).

| World | Classification | Typeface    | Weight and axes                                    | Grid |
| ----- | -------------- | ----------- | -------------------------------------------------- | ---- |
| 1     | Oldstyle       | EB Garamond | SemiBold (600)                                     | 10   |
| 2     | Modern/Didone  | Bodoni Moda | SemiBold (600), largest optical size (opsz 96)     | 12   |
| 3     | Slab           | Zilla Slab  | Bold (700)                                         | 16   |
| 4     | Grotesque      | Archivo     | Bold (700), expanded width (wdth 110)              | 20   |
| 5     | Geometric      | Jost        | Light (300)                                        | 24   |

- Weights are chosen for maximum contrast between worlds, not to make every world bold. Thin overlapping strokes (Jost Light, Bodoni's hairlines) make puzzles as hard as heavy cropped shapes (Archivo).
- Each world's typeface, weight and axis values, and grid density live in one config (`src/data/worlds.json`). Swapping a font or weight means editing the config and rerunning the glyph script.
- Variable fonts (Bodoni Moda, Archivo, Jost, and EB Garamond's source) are pinned to a static instance at these values before conversion.
- Placed letters have a touch target wider than their outline, so thin letterforms are as easy to pick up as heavy ones.
- The level editor's world switcher moves a draft between worlds, so each typeface can be tried in the editor and, via Play test, the gameplay screen.

### Level editor (dev-only)
- Reuses the gameplay canvas and tray. The grid matches the chosen world.
- The designer places letters, sets the letter scale, and previews the result in the target circle.
- Exports and imports level JSON.
- Hidden from players (e.g. a dev-only route).

## Letterforms as vectors

The game should never load font files for the game pieces. Only the UI font loads as a web font.

**Why:** the world typefaces may be purchased fonts, and their licenses may not cover bundling the font files in a web app or native app. Shipping only the outlines of the glyphs the game uses avoids distributing the fonts themselves.

- Convert each world's typeface to SVG path data ahead of time (e.g. a build script using opentype.js). Output one glyph data file per world containing the characters the game uses (A–Z, a–z, 0–9) and the metrics needed for positioning. Include only the glyphs the game uses.
- **Source font files never ship.** Keep them in a local folder that is gitignored and outside anything the build bundles or serves. Only the generated path data is committed and shipped.
- The game renders letters from that path data only.
- All five world typefaces go through this same pipeline. Variable fonts are first pinned to a static instance (fontTools' instancer), since opentype.js handles variable fonts poorly. Adding or swapping a font means dropping it in the local folder, editing the world config and rerunning the script.

## Scoring

Simple scoring that discourages checking over and over.

### Level marks
- Each level rewards its first 3 checks. Solving on check 1 earns **\*** (asterisk), on check 2 **†** (dagger), on check 3 **‡** (double dagger). Solving after that passes the level with no mark. There's no other penalty, and checks stay unlimited.
- A check is the canvas reaching the target and being judged. Cancelling, or letting the canvas drop back short of the target, doesn't count.
- A level's checks are saved, so leaving the level or reloading doesn't reset them.
- Marks are UI elements, set in DM Sans (500), not the world typeface. The Fontsource DM Sans files lack ‡ (and keep † only in the latin-ext file), so a small supplement holding † and ‡ from the full Google Fonts DM Sans is loaded for U+2020–2021 (`src/fonts/`, built by `scripts/build-marks-font.py`). Mark logic and metrics live in `src/lib/marks.js`.
- When a level is solved with a mark, the solved circle fills with the accent color and shows the mark (see `MOTION-SPEC.md`, Level complete).

### World runs
- A **world run** is one playthrough of all of a world's levels, from level 1. The run records the mark for each level.
- A run's score is the total of its marks: * = 3, † = 2, ‡ = 1, no mark = 0.
- A world keeps its **best complete run**. A finished run replaces it only if it scores higher; a tie keeps the existing one.
- **Replaying:** choosing a completed world in the world menu starts a full replay from level 1 (if one of that world's levels is already on screen, it carries on from there instead). The replay goes through the world's levels in order. The existing badge stays until a replay is finished, and is replaced only if the new run scores higher. An unfinished replay doesn't affect it.
- Runs, checks and best runs are saved locally alongside progress.

## Rewards

- Completing a world earns a **badge: a custom-designed ampersand per world**. Until the art is ready, the badge is a placeholder (a UI-font ampersand knocked out of a solid circle, `badgeFace` in `src/lib/faces.js`).
- The badge reflects the world's best complete run (see Scoring). If every level in it has \*, the badge is the accent version; otherwise it's the standard badge.
- The badge shows the best run's marks. Placeholder: small marks spaced around the badge's edge in level order, from the top, clockwise, with an empty spot for each level that had no mark. The final badge art comes later.
- The badge appears on the world complete screen and in the world menu.

## Visual design

- Minimal, close to brutalist. A stark, high-contrast palette with **one accent color**. The letterforms are the hero.
- Thin outlines on the circles and controls. Very light dot grid.
- **UI font: DM Sans.**
- **Palette: warm paper and ink**, with a vermilion accent. Never pure black or pure white. Define all colors as tokens (background, foreground, accent, grid, outline) in `src/styles.css` so they're easy to tweak. The foreground is used for letters, outlines and UI text. Grid and muted colors are mixed from the background and foreground.

  | Token      | Light                   | Dark      |
  | ---------- | ----------------------- | --------- |
  | Background | `#EFEADF` (warm paper)  | `#1A1916` |
  | Foreground | `#1D1B18` (warm ink)    | `#E8E2D5` |
  | Accent     | `#E4502A` (vermilion)   | `#E4502A` |

- **Light and dark mode.** Follow the system setting by default. Dark mode gets its own token values, not an automatic inversion.

## Motion

A smooth, playful motion language will matter a lot in the finished game, but it will be designed later. This prototype focuses on gameplay.

For now:
- Keep motion simple and functional: drag follows the finger, letters snap, and the canvas snaps onto the target.
- Keep any motion values in one place, and use a structure that can take spring-based, interruptible motion later.
- Level complete, wrong answer, world complete, continue to the next world, and the world menu follow `MOTION-SPEC.md` (prototype: `motion-lab.html`).

## Technical notes

- **React + Vite, with SVG rendering.** Clipping to a circle and merging letter shapes come for free in SVG.
- Mobile-first, portrait, touch and pointer input. Should also work with a mouse on desktop.
- Save progress locally.

## Open questions

- What does the player see on a failed check — just a retry, or a hint about what's off?
- Is the drop zone the right size? A drop counts as on the canvas by where the finger is, not where the letter is, which keeps removal predictable even when letters are huge. A letter dropped with the finger just below the canvas goes back to the tray even if it's visibly over the canvas. If that trips players up, let the zone reach a bit further below the canvas (`dropBottom` in `src/lib/geometry.js`).
- Should a failed check reset all the letters back to the tray, as a penalty? Depends on how hard the levels turn out. For now, letters are kept.
- Final badge art (including how it shows the best run's marks, and the accent version), world complete heading styling and the world number circle design
- Final color palette and accent
- Motion language and references
- Sound and haptics
- Whether scale or rotate mechanics are needed for difficulty (decide after playtesting)
- Exact number of levels per world
