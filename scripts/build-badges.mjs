// Pulls each world's ampersand and number outlines out of the badge art in
// design/badges into src/data/badges.json, mapped to a space where the badge
// circle is centred on 0 0 with radius 1 (see worldFace in src/lib/faces.js).
// Run with `npm run badges` after re-exporting the art.
import fs from 'fs';
const dir = 'design/badges';
const out = 'src/data/badges.json';
// The badge circle in the art's clip-group space, which every file shares.
const CX = 247.494, CY = 227.049, R = 156.896;
const read = (name) => fs.readFileSync(`${dir}/${name}`, 'utf8');
function grab(src, id) {
  const m = src.match(new RegExp(`<g id="${id}"[^>]*transform="matrix\\(([^)]*)\\)"[^>]*>\\s*<path d="([^"]+)"`));
  if (!m) throw new Error(id);
  const [a, b, c, d, e, f] = m[1].split(',').map(Number);
  if (b || c || Math.abs(a - d) > 1e-6) throw new Error('non-uniform ' + id);
  const r = (v, p = 5) => +v.toFixed(p);
  return { d: m[2], scale: r(a / R, 6), x: r((e - CX) / R), y: r((f - CY) / R) };
}
const art = {};
for (let n = 1; n <= 5; n++) {
  const src = n === 3 ? read('w3-full-badge.svg') : read(`w${n}-amp.svg`);
  const numSrc = n === 3 ? read('w3-start.svg') : src;
  if ((src.match(/matrix\(0\.717034,0,0,0\.717034,10\.0383,170\.698\)/g) || []).length < 2) throw new Error('clip ' + n);
  art[n] = { amp: grab(src, 'amp'), number: grab(numSrc, `number-${n}`) };
}
// World 3's art is its states, which all share one ampersand.
const s = read('w3-start.svg');
const a3 = grab(s, 'amp');
if (a3.d !== art[3].amp.d || a3.scale !== art[3].amp.scale) console.error('w3 amp differs between files');
fs.writeFileSync(out, JSON.stringify(art, null, 2) + '\n');
console.log(Object.entries(art).map(([n, v]) => `${n}: amp ${v.amp.d.length} chars s=${v.amp.scale}, num s=${v.number.scale}`).join('\n'));
