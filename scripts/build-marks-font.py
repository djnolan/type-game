"""Writes the DM Sans supplement that holds the level marks † and ‡.

The Fontsource DM Sans files the UI loads leave out ‡, and keep † only in the
latin-ext file, so this adds both from Google Fonts' full variable DM Sans,
pinned to the weight and optical size Fontsource's static files use. The
asterisk is in the regular Latin file already. styles.css loads the result
for U+2020–2021 only.

Get the source font from fonts.google.com (DM Sans, "Get font"), or from
github.com/google/fonts at ofl/dmsans/DMSans[opsz,wght].ttf, and put it in
fonts/ (gitignored).

Usage: python3 scripts/build-marks-font.py fonts/DMSans[opsz,wght].ttf
Needs fontTools and brotli (pip install fonttools brotli).
"""

import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = "src/fonts/dm-sans-marks-500.woff2"
MARKS = [0x2020, 0x2021]


def main(src):
    font = instancer.instantiateVariableFont(TTFont(src), {"wght": 500, "opsz": 14}, static=True)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = []
    options.name_IDs = ["*"]
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    sub.populate(unicodes=MARKS)
    sub.subset(font)
    font.flavor = "woff2"
    font.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
