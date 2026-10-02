// Converts each typeface in scripts/typefaces.json into SVG path data.
// Source fonts live in /fonts (gitignored, never bundled or served). Only the
// generated JSON in src/data/glyphs is committed and shipped.
//
// Usage: npm run glyphs            (all typefaces)
//        npm run glyphs -- <id>    (one typeface)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const typefaces = JSON.parse(fs.readFileSync(path.join(root, 'scripts/typefaces.json'), 'utf8'));
const outDir = path.join(root, 'src/data/glyphs');

const CHARS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '*'];
const DECIMALS = 1;

const round = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;

function buildTypeface(id, { name, source }) {
  const file = path.join(root, source);
  if (!fs.existsSync(file)) {
    console.warn(`skip ${id}: missing ${source}`);
    return;
  }
  const font = opentype.parse(fs.readFileSync(file).buffer);
  const upm = font.unitsPerEm;
  const os2 = font.tables.os2 || {};

  const glyphs = {};
  for (const ch of CHARS) {
    const glyph = font.charToGlyph(ch);
    if (!glyph || glyph.index === 0) throw new Error(`${id}: no glyph for "${ch}"`);
    // Font units, y-down, origin at the left of the advance on the baseline.
    const p = glyph.getPath(0, 0, upm);
    const bb = p.getBoundingBox();
    glyphs[ch] = {
      d: p.toPathData(DECIMALS),
      advance: round(glyph.advanceWidth),
      bbox: [round(bb.x1), round(bb.y1), round(bb.x2), round(bb.y2)],
    };
  }

  const capHeight = os2.sCapHeight || -glyphs.H.bbox[1];
  const data = {
    id,
    name,
    unitsPerEm: upm,
    ascender: font.ascender,
    descender: font.descender,
    capHeight,
    glyphs,
  };
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${id}.json`);
  fs.writeFileSync(out, JSON.stringify(data) + '\n');
  console.log(`${id}: ${CHARS.length} glyphs -> ${path.relative(root, out)}`);
}

const only = process.argv[2];
for (const [id, def] of Object.entries(typefaces)) {
  if (!only || only === id) buildTypeface(id, def);
}
