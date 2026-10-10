# Source fonts (not committed)

Everything in this folder except this README is gitignored. It sits outside
`src/` and `public/`, so Vite never bundles or serves it.

Each world's font file is set by `typeface.source` in `src/data/worlds.json`.
`npm run glyphs` reads it, writes a static instance to `fonts/.instances/`
and then writes `src/data/glyphs/world-<n>.json`, which holds the A–Z, a–z and 0–9
outlines plus metrics. Only that JSON ships.

The script needs Python 3 with fontTools (`pip install fonttools brotli`;
brotli reads `.woff2`). Any `.ttf`, `.otf`, `.woff` or `.woff2` works, static
or variable.

## The five world typefaces

All are SIL OFL, from Google Fonts. The paths in `worlds.json` point at the
Latin files from the Fontsource npm packages, which hold every glyph the game
uses:

```sh
for p in @fontsource-variable/eb-garamond @fontsource-variable/bodoni-moda \
         @fontsource/zilla-slab @fontsource-variable/archivo @fontsource-variable/jost; do
  npm pack "$p"
done
for t in fontsource-*.tgz; do mkdir -p "${t%.tgz}" && tar xzf "$t" -C "${t%.tgz}"; done

mkdir -p fonts/eb-garamond fonts/bodoni-moda fonts/zilla-slab fonts/archivo fonts/jost
cp fontsource-variable-eb-garamond-*/package/files/eb-garamond-latin-wght-normal.woff2 fonts/eb-garamond/
cp fontsource-variable-bodoni-moda-*/package/files/bodoni-moda-latin-standard-normal.woff2 fonts/bodoni-moda/
cp fontsource-zilla-slab-*/package/files/zilla-slab-latin-700-normal.woff2 fonts/zilla-slab/
cp fontsource-variable-archivo-*/package/files/archivo-latin-standard-normal.woff2 fonts/archivo/
cp fontsource-variable-jost-*/package/files/jost-latin-wght-normal.woff2 fonts/jost/
rm -rf fontsource-*
```

(The `standard` files keep every axis: Bodoni Moda's `opsz`, Archivo's `wdth`.)

You can also use the variable TTFs from the family's "Get font" download on
fonts.google.com (e.g. `BodoniModa[opsz,wght].ttf`). Put the file in the
world's folder and update `source` in `worlds.json`.

For a purchased font, drop it in its own folder here and point `source` at it.
