# Motion & Screens Spec

This adds transitions and three screens to the existing, working game. It does **not** change gameplay, levels, letter dragging, the answer check, or how the canvas is dragged onto the target. Hook into the game's existing events (correct match, wrong match, last level of a world, and so on) and leave the underlying logic alone.

**Reference:** `motion-lab.html` is a working prototype of every sequence below. Open it in a browser to see the intended feel, and read its source for the exact sequencing. The `T` object at the top of its script holds all the tuned values. Use it as a reference, not code to paste in.

---

## Shared building blocks

### Motion config
- Put every duration, delay, distance and easing in one config object (values below) so they can be tuned in one place.
- Block game input while any transition is running.
- Distances below are in px for a 390px-wide screen. Scale them proportionally if the layout uses other units.

### Coin flip
The circle turns over around its vertical axis, like a spinning coin, to reveal new content.
- CSS 3D: `rotateY` on an inner element, with `perspective: 700px` on its parent.
- Swap the content when the circle is edge-on (angle passes 90°). For a 360° flip, the new content stays from 90° onward.
- While the back side faces the viewer (`cos(angle) < 0`), apply `scaleX(-1)` to the content so it isn't mirrored.
- Edge shading: darken the circle as it turns edge-on (overlay opacity `|sin(angle)| × 0.3`, clipped to the circle).
- Default easing: `easeInOutBack` (overshoot 1.25), so it turns slightly past and settles.

### Canvas enter
A new blank canvas (empty grid) rises from below the screen to its normal position.
- 620ms, `easeOutBack(1.4)`, so it overshoots slightly upward and then lands.
- Unless noted otherwise, it starts 260ms after the coin flip that comes before it.

---

## 1. Level complete

**Trigger:** a correct match, after the canvas has snapped onto the target. At this point the two circles act as one.

1. Show the combined circle in its solved state: the matched letters in the accent color, with an accent border. Hide the separate canvas.
2. Scale down to 0.94: 200ms, `easeOutCubic`.
3. Success feedback. Build both versions behind a config switch so I can choose:
   - **Rays:** 12 short accent-colored strokes shoot outward from just outside the circle. The head of each stroke leads and the tail catches up until it disappears. 480ms. Stroke width 3.5, rounded ends, travel distance about 46px.
   - **Shimmer:** a soft, light diagonal band sweeps across the accent letters only, clipped to the letter shapes. 560ms, `easeInOutCubic`.
4. Hold for 120ms.
5. Coin flip 180° to the next level's target: 700ms. Scale back from 0.94 to 1 during the first 320ms, so the scale change is hidden inside the flip.
6. Canvas enter, starting 260ms after the flip starts.
7. If the header has a level progress indicator, animate its fill during the flip.

## 2. Wrong answer

**Trigger:** a failed match. No color change and no icon.

1. **Both circles shake together**, like a head shaking no: a horizontal sine wave with 3 cycles, 11px amplitude shrinking to 0, over 460ms.
2. Pause for 120ms.
3. The canvas returns to its normal spot, keeping the player's letters as they were: 420ms, `easeOutBack(1.2)`.

## 3. World complete

**Trigger:** a correct match on the last level of a world.

1–4. Same as level complete: solved state, scale down, feedback, hold.

5. **Travel down** to the vertical center of the screen, scaling back to 1: 620ms, `easeInOutCubic`. At the same time, the header and letter tray fade out, and the tray slides down 40px, over the first 70% of that time.
6. **Lift and 360° flip** to the world badge. The flip takes 1000ms with `easeInOutBack`. At the same time, the circle rises 28px with `easeInOutCubic`.
7. **Dip, then the ribbon pops out.** The badge drops 14px (150ms, `easeInCubic`), then springs back up (350ms, `easeOutBack(2)`). As it springs back, the ribbon drops out from behind it (440ms, `easeOutBack(1.8)`).
   - **Ribbon (placeholder):** a vertical strip in the accent color with a V-notched bottom end, showing only the world number. It sits behind the badge. It starts fully hidden and ends hanging below the badge, with its top about 30px tucked behind the badge.
8. The heading "World N complete" (placeholder style) fades in while rising 12px: 320ms, `easeOutCubic`, starting 40% of the way into the ribbon pop. The **Continue** button does the same, 240ms after the heading.

**Badge:** use a solid circle as a placeholder. The final art comes later.

## 4. Continue to the next world

**Trigger:** tapping Continue on the world complete screen.

1. Continue fades out over 150ms.
2. The badge, ribbon and heading slide off the left edge of the screen: 440ms, `easeInCubic`. The heading also fades out.
3. A circle showing the new world's number (placeholder: the same size as the game circle, outline plus number) slides in from the right. It starts 160ms before step 2 ends: 560ms, `easeOutBack(1.3)`. It lands where the badge was.
4. Hold for 280ms.
5. Coin flip 180° to the first level of the new world, while moving up to the game circle's normal position: 850ms. The flip uses `easeInOutBack` and the movement uses `easeInOutCubic`. The header and tray fade back in over 320ms, starting 45% of the way through.
6. Canvas enter.

## 5. World menu (new screen)

### Layout
- A horizontal carousel with one circle per world. Circles are about 82% of the game circle's size, and the centered one sits near the vertical center of the screen.
- The previous and next circles are cut off by the screen edges.
- A "Worlds" title at the top.
- A label under the centered circle with the world number, style name and status. The text is a placeholder.

### Circle states
- **Complete:** shows the world badge. Can be selected.
- **Current/next:** shows the world number. Can be selected.
- **Future:** shows the world number in a muted color with a dashed outline. Can't be selected.

### Interaction
- Swipe horizontally to scroll. On release, snap to the nearest circle, taking the swipe's speed into account: 320ms, `easeOutBack(1.1)`.
- Tap a neighboring circle to snap to it. Tap the centered circle, if it can be selected, to enter that world.

### Entering a world from the menu
1. The other circles slide outward 150px and fade out, and the title and label fade out: 380ms, `easeInCubic`.
2. The selected circle flips 180° to that world's current level, while moving up to the game circle's position and scaling to full size: 850ms, using the same easings as next world, step 5.
3. The header and tray fade in, then the canvas enters, both timed as in next world, steps 5–6.

### Game to menu (back arrow)
This is the reverse of entering a world.
1. The canvas drops off the bottom (380ms, `easeInCubic`). The header, tray and Done button fade out (250ms).
2. The game circle flips 180° to its world's menu face (badge or number), while moving down to the menu position and shrinking to menu size: 800ms.
3. Starting 45% of the way into step 2, the neighboring circles slide in from 150px out and fade in, along with the title and label: 600ms, `easeOutCubic`.

---

## Easing reference

```js
const easeOutCubic   = t => 1 - (1 - t) ** 3;
const easeInCubic    = t => t ** 3;
const easeInOutCubic = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
const easeOutBack    = (k = 1.6) => t => 1 + (k + 1) * (t - 1) ** 3 + k * (t - 1) ** 2;
const easeInOutBack  = t => { const c = 1.25 * 1.525;   // overshoot 1.25
  return t < .5 ? ((2 * t) ** 2 * ((c + 1) * 2 * t - c)) / 2
               : ((2 * t - 2) ** 2 * ((c + 1) * (t * 2 - 2) + c) + 2) / 2; };
```

## Not in this spec (later)
- Final badge art, heading styling, and the number circle design
- Level progress shown on world circles in the menu
- Sound and haptics
