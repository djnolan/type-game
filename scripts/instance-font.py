"""Writes a static TrueType instance of a font, for build-glyphs.mjs.

Variable fonts are pinned at the given axis values with fontTools' instancer.
Axes not listed are pinned at their defaults. Static fonts are only converted
to plain TTF (woff/woff2 decompressed), after checking that the requested
weight matches the font's own.

Usage: python3 scripts/instance-font.py <in> <out> '{"wght": 900, "wdth": 125}'
Prints the axis values used as JSON.
"""

import json
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def main(src, out, axes_json):
    axes = json.loads(axes_json)
    font = TTFont(src)

    if "fvar" in font:
        fvar = {a.axisTag: a for a in font["fvar"].axes}
        for tag, value in axes.items():
            if tag not in fvar:
                sys.exit(f"{src}: no {tag} axis (has {', '.join(fvar)})")
            a = fvar[tag]
            if not a.minValue <= value <= a.maxValue:
                sys.exit(f"{src}: {tag} {value} is outside {a.minValue:g}–{a.maxValue:g}")
        pinned = {tag: axes.get(tag, a.defaultValue) for tag, a in fvar.items()}
        font = instancer.instantiateVariableFont(font, pinned, static=True)
    else:
        pinned = {}
        extra = [tag for tag in axes if tag != "wght"]
        if extra:
            sys.exit(f"{src}: static font, so axes {', '.join(extra)} can't be set")
        weight = font["OS/2"].usWeightClass
        if "wght" in axes and axes["wght"] != weight:
            sys.exit(f"{src}: static font has weight {weight}, not {axes['wght']}")
        pinned["wght"] = weight

    font.flavor = None
    font.save(out)
    print(json.dumps(pinned))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
