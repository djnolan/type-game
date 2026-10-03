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
- End-of-level and end-of-world screens and transitions
- Polished motion language (keep motion functional for now; see Motion)
- Sound and haptics
- Scaling, rotating, or flipping letters
- Timers and scoring

## Gameplay screen

Top to bottom:

1. **Header.** Back button on the left. World progress indicator on the right.
2. **Target circle.** The puzzle: letters cropped by the circle, merged into one solid shape. Shown in reverse (background-colored letters knocked out of a solid circle) so the player's letters fill the spaces when dragged up to check.
3. **Canvas circle.** Same size as the target, with a dot grid in the background. The player builds their answer here.
4. **Done button.** A small circular button with an accent-colored dot, beside the canvas.
5. **Letter tray.** A full A–Z row of large letters, cropped at the bottom of the screen, with a tick-mark track under it.

### Progress indicator
- One dot per world (5 worlds).
- A completed world shows its asterisk badge.
- The current world's dot fills like a circular progress bar as its levels are completed.
- Future worlds are empty circles.

## Core interactions

### Letter tray
- Contains the full A–Z, uppercase only. Numerals are not needed for now.
- **Swipe horizontally** on the tray or track to scroll it.
- **Pull a letter upward** to pick it up and drag it. The gesture must clearly separate scrolling from dragging.
- **Each letter can be used once per puzzle.** When a letter is placed, its tray spot becomes a blank slot. When that letter is removed from the canvas, it returns to its slot.

### Dragging and placing
- Only movement in this version. No scaling or rotating.
- As a letter is dragged from the tray toward the canvas, it scales smoothly to the puzzle's letter size.
- Letters **snap to the grid**. The grid density is set per world and gets finer in later worlds.
- Letters can be placed partly outside the circle. Cropping is a core part of the puzzles, so the placement area extends past the circle edge, and the circle clips what shows.
- Placed letters can be **picked up and moved again**.
- A letter can be **removed** by dragging it back to the tray or off the canvas.
- All letters render in the same foreground color. Overlaps merge into one shape. There is no inversion or XOR.

### Checking an answer
1. Player taps **Done**.
2. The UI clears away, leaving the canvas circle draggable.
3. The player's letters switch to the **accent color** so they read against the target.
4. The player drags the canvas circle up onto the target. Near alignment, it snaps into place.
5. **Pass:** the match must be perfect. Because the target always sits on the world's grid, a perfect match is always possible.
6. **Fail:** unlimited retries. The canvas returns, with the player's letters kept, so they can adjust.

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
- A dev-only world switcher previews the gameplay screen and level editor in any world.

### Level editor (dev-only)
- Reuses the gameplay canvas and tray. The grid matches the chosen world.
- The designer places letters, sets the letter scale, and previews the result in the target circle.
- Exports and imports level JSON.
- Hidden from players (e.g. a dev-only route).

## Letterforms as vectors

The game should never load font files for the game pieces. Only the UI font loads as a web font.

**Why:** the world typefaces may be purchased fonts, and their licenses may not cover bundling the font files in a web app or native app. Shipping only the outlines of the glyphs the game uses avoids distributing the fonts themselves.

- Convert each world's typeface to SVG path data ahead of time (e.g. a build script using opentype.js). Output one glyph data file per world containing A–Z, the asterisk, and the metrics needed for positioning. Include only the glyphs the game uses.
- **Source font files never ship.** Keep them in a local folder that is gitignored and outside anything the build bundles or serves. Only the generated path data is committed and shipped.
- The game renders letters from that path data only.
- All five world typefaces go through this same pipeline. Variable fonts are first pinned to a static instance (fontTools' instancer), since opentype.js handles variable fonts poorly. Adding or swapping a font means dropping it in the local folder, editing the world config and rerunning the script.

## Rewards

- Completing a world earns an **asterisk badge, drawn from that world's typeface's own asterisk glyph**.
- In the prototype, the badge only needs to appear in the progress indicator.

## Visual design

- Minimal, close to brutalist. A stark, high-contrast palette with **one accent color**. The letterforms are the hero.
- Thin outlines on the circles and controls. Very light dot grid.
- **UI font: DM Sans.**
- Colors are not final and won't be pure black and white. Define all colors as tokens (background, foreground, accent, grid, outline) so they're easy to tweak.
- **Light and dark mode.** Follow the system setting by default. Dark mode gets its own token values, not an automatic inversion.

## Motion

A smooth, playful motion language will matter a lot in the finished game, but it will be designed later. This prototype focuses on gameplay.

For now:
- Keep motion simple and functional: drag follows the finger, letters snap, and the canvas snaps onto the target.
- Keep any motion values in one place, and use a structure that can take spring-based, interruptible motion later.

## Technical notes

- **React + Vite, with SVG rendering.** Clipping to a circle and merging letter shapes come for free in SVG.
- Mobile-first, portrait, touch and pointer input. Should also work with a mouse on desktop.
- Save progress locally.

## Open questions

- What does the player see on a failed check — just a retry, or a hint about what's off?
- End-of-level and end-of-world screens and transitions
- Final color palette and accent
- Motion language and references
- Sound and haptics
- Whether scale or rotate mechanics are needed for difficulty (decide after playtesting)
- Exact number of levels per world
