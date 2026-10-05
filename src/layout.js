// Tray layout: the size and position of the letter tray, in CSS px. Tune here.
//
// The tray sits at the bottom of the screen, from top to bottom:
//   pick-up zone margin → tallest ascender → baseline on the top edge of the
//   scroll track → scroll track → bottom margin.
// Descenders hang down in front of the track. The ascender height comes from
// the world's glyphs (all of A–Z, a–z and 0–9), so no character is cut off.
export const tray = {
  // Cap height of tray letters: this many px, or this fraction of the screen
  // width on narrow screens, whichever is smaller.
  capHeight: 48,
  capHeightMaxWidthFraction: 0.13,
  // Space between characters, and between the track and the screen edges.
  letterGap: 14,
  sidePadding: 20,
  // Space inside the track's ends, so the first and last letters sit within it.
  trackInset: 16,
  // Baseline position relative to the top edge of the track: 0 sits the
  // letters right on it, positive raises them.
  baselineAboveTrack: 0,
  // Scroll track height, tick spacing, and space below it.
  trackHeight: 32,
  tickStep: 30,
  bottomMargin: 14,
  // Extra touch area above the tallest letter that still picks letters up.
  pickUpMargin: 14,
};
