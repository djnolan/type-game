// A world's badge glyph (its typeface's asterisk), centered in a size×size box.
export default function Asterisk({ glyphs, size, className }) {
  const g = glyphs.glyphs['*'];
  const [x1, y1, x2, y2] = g.bbox;
  const s = (size * 0.8) / Math.max(x2 - x1, y2 - y1);
  const ox = size / 2 - ((x1 + x2) / 2) * s;
  const oy = size / 2 - ((y1 + y2) / 2) * s;
  return (
    <svg width={size} height={size} aria-hidden="true">
      <path d={g.d} transform={`translate(${ox} ${oy}) scale(${s})`} className={className} />
    </svg>
  );
}
