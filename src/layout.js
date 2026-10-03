// Tray layout: the size and position of the letter tray, in CSS px. Tune here.
//
// The tray sits at the bottom of the screen, from top to bottom:
//   pick-up zone margin → tallest ascender → baseline → deepest descender
//   → gap → scroll track → bottom margin.
// Ascender and descender depths come from the world's glyphs (all of A–Z,
// a–z and 0–9), so every character is fully visible whichever set is shown.
export const tray = {
  // Cap height of tray letters: this many px, or this fraction of the screen
  // width on narrow screens, whichever is smaller.
  capHeight: 40,
  capHeightMaxWidthFraction: 0.11,
  // Space between characters, and at both ends of the row.
  letterGap: 14,
  sidePadding: 20,
  // Space between the deepest descender and the scroll track.
  trackGap: 12,
  // Scroll track height, tick spacing, and space below it.
  trackHeight: 32,
  tickStep: 30,
  bottomMargin: 14,
  // Extra touch area above the tallest letter that still picks letters up.
  pickUpMargin: 14,
};
