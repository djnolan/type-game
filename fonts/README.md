# Source fonts (not committed)

Everything in this folder except this README is gitignored. It sits outside
`src/` and `public/`, so Vite never bundles or serves it.

Each typeface goes in its own subfolder and is registered in
`scripts/typefaces.json`. Then run:

```sh
npm run glyphs
```

This writes `src/data/glyphs/<id>.json`, which holds the A–Z and `*` outlines
plus metrics. Only that file ships.

The prototype placeholder is Alfa Slab One (SIL OFL), from the
`@fontsource/alfa-slab-one` npm package:

```sh
npm pack @fontsource/alfa-slab-one
tar xzf fontsource-alfa-slab-one-*.tgz
mkdir -p fonts/placeholder
cp package/files/alfa-slab-one-latin-400-normal.woff fonts/placeholder/AlfaSlabOne-Regular.woff
```
