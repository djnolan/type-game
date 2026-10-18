// Converts each world's typeface (src/data/worlds.json) into SVG path data.
// Source fonts live in /fonts (gitignored, never bundled or served). Only the
// generated JSON in src/data/glyphs is committed and shipped.
//
// Every font first goes through scripts/instance-font.py (fontTools), which pins
// variable fonts at the world's axis values and writes a static TTF to
// fonts/.instances. opentype.js only ever reads that static instance.
//
// Usage: npm run glyphs            (all worlds)
//        npm run glyphs -- <world> (one world, e.g. `npm run glyphs -- 4`)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const worlds = JSON.parse(fs.readFileSync(path.join(root, 'src/data/worlds.json'), 'utf8'));
const outDir = path.join(root, 'src/data/glyphs');
const instanceDir = path.join(root, 'fonts/.instances');
const python = process.env.PYTHON || 'python3';

// A–Z, a–z and 0–9 (each font's default numeral style).
const CHARS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'abcdefghijklmnopqrstuvwxyz', ...'0123456789'];
const DECIMALS = 1;

const round = (n) => Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;

function makeInstance(world, source, axes) {
  fs.mkdirSync(instanceDir, { recursive: true });
  const out = path.join(instanceDir, `world-${world}.ttf`);
  try {
    const used = execFileSync(
      python,
      [path.join(root, 'scripts/instance-font.py'), source, out, JSON.stringify(axes)],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    return { file: out, axes: JSON.parse(used) };
  } catch (e) {
    if (e.code === 'ENOENT')
      throw new Error(`${python} not found. Install Python 3 and fontTools (pip install fonttools brotli).`);
    throw new Error((e.stderr || e.message).trim());
  }
}

function buildWorld({ world, name, typeface }) {
  const { family, source, axes = {} } = typeface;
  const file = path.join(root, source);
  if (!fs.existsSync(file)) {
    console.warn(`skip world ${world}: missing ${source} (see fonts/README.md)`);
    return;
  }
  const instance = makeInstance(world, file, axes);
  const font = opentype.parse(fs.readFileSync(instance.file).buffer);
  const upm = font.unitsPerEm;

  const glyphs = {};
  for (const ch of CHARS) {
    const glyph = font.charToGlyph(ch);
    if (!glyph || glyph.index === 0) throw new Error(`world ${world}: ${family} has no glyph for "${ch}"`);
    // Font units, y-down, origin at the left of the advance on the baseline.
    const p = glyph.getPath(0, 0, upm);
    const bb = p.getBoundingBox();
    glyphs[ch] = {
      d: p.toPathData(DECIMALS),
      advance: round(glyph.advanceWidth),
      bbox: [round(bb.x1), round(bb.y1), round(bb.x2), round(bb.y2)],
    };
  }

  // Level scale is defined against cap height, so measure it from the outlines
  // (top of the flat H) rather than trusting OS/2, which variable fonts don't
  // always update per instance.
  const capHeight = -glyphs.H.bbox[1];
  const data = {
    id: `world-${world}`,
    name: `${family} ${Object.entries(instance.axes)
      .map(([tag, v]) => `${tag} ${v}`)
      .join(' · ')}`,
    family,
    axes: instance.axes,
    unitsPerEm: upm,
    ascender: font.ascender,
    descender: font.descender,
    capHeight,
    glyphs,
  };
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `world-${world}.json`);
  fs.writeFileSync(out, JSON.stringify(data) + '\n');
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(
    `world ${world} (${name}): ${data.name}, ${CHARS.length} glyphs, ${kb} KB -> ${path.relative(root, out)}`,
  );
}

const only = process.argv[2];
if (only && !worlds.some((w) => String(w.world) === only)) {
  console.error(`No world ${only} in src/data/worlds.json`);
  process.exit(1);
}
let failed = false;
for (const w of worlds) {
  if (only && String(w.world) !== only) continue;
  try {
    buildWorld(w);
  } catch (e) {
    console.error(`world ${w.world}: ${e.message}`);
    failed = true;
  }
}

// Glyph files for worlds no longer in the config would still be bundled.
if (!only) {
  const keep = new Set(worlds.map((w) => `world-${w.world}.json`));
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.json') && !keep.has(f)) {
      fs.rmSync(path.join(outDir, f));
      console.log(`removed stale ${path.join('src/data/glyphs', f)}`);
    }
  }
}
process.exitCode = failed ? 1 : 0;
