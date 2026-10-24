"""Reproducible font transports; pip install fonttools==4.67.0 brotli.

Preserve the original font, optical-size axis, every supported Latin character
and the CSS-declared 400–500 weight range. No typography tokens change.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import re
import fontTools
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "apps/web/src/assets/fonts"
CSS = ROOT / "apps/web/src/styles/reader-fonts.css"
SOURCE = FONTS / "newsreader-latin.woff2"
ORIGINAL_RANGE = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
BASIC_RANGE = "U+0000-007F, U+00A0, U+00B0, U+2010-2027, U+202F, U+2032-2033, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"

def codepoints(value):
    result = set()
    for item in value.split(","):
        bounds = item.strip().removeprefix("U+").split("-")
        start = int(bounds[0], 16)
        result.update(range(start, int(bounds[-1], 16) + 1))
    return result

def css_range(values):
    runs = []
    for value in sorted(values):
        if runs and value == runs[-1][-1] + 1:
            runs[-1].append(value)
        else:
            runs.append([value])
    return ", ".join(f"U+{run[0]:04X}" + (f"-{run[-1]:04X}" if len(run) > 1 else "") for run in runs)

def sha(data):
    return hashlib.sha256(data).hexdigest()

original_bytes = SOURCE.read_bytes()
original = TTFont(BytesIO(original_bytes), recalcTimestamp=False)
allowed = codepoints(ORIGINAL_RANGE) & set(original.getBestCmap())
basic = codepoints(BASIC_RANGE) & allowed
groups = [("newsreader-latin-basic.woff2", basic), ("newsreader-latin-additional.woff2", allowed - basic)]
outputs = []
max_deviation = 0
for name, characters in groups:
    font = instantiateVariableFont(TTFont(BytesIO(original_bytes), recalcTimestamp=False), {"wght": (400, 500)}, inplace=True, optimize=False)
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.layout_features = ["*"]
    options.glyph_names = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(FONTS / name)
    decoded = TTFont(FONTS / name, recalcTimestamp=False)
    assert characters <= set(decoded.getBestCmap())
    assert [(axis.axisTag, axis.minValue, axis.maxValue) for axis in decoded["fvar"].axes] == [("wght", 400, 500), ("opsz", 6, 72)]
    # Compare decomposed outlines and advances at the supported weights and
    # optical sizes, including intermediate values, against the original font.
    for weight in [400, 425, 450, 475, 500]:
        for optical in [6, 12, 18, 24, 36, 48, 72]:
            old = original.getGlyphSet(location={"wght": weight, "opsz": optical})
            new = decoded.getGlyphSet(location={"wght": weight, "opsz": optical})
            for character in characters:
                a, b = original.getBestCmap()[character], decoded.getBestCmap()[character]
                pa, pb = DecomposingRecordingPen(old), DecomposingRecordingPen(new)
                old[a].draw(pa); new[b].draw(pb)
                assert len(pa.value) == len(pb.value)
                difference = abs(old[a].width - new[b].width)
                for (command_a, points_a), (command_b, points_b) in zip(pa.value, pb.value):
                    assert command_a == command_b and len(points_a) == len(points_b)
                    for point_a, point_b in zip(points_a, points_b):
                        difference = max(difference, *(abs(x - y) for x, y in zip(point_a, point_b)))
                max_deviation = max(max_deviation, difference)
                # Variable-font region interpolation quantizes to font units.
                # Three units are under 0.05 CSS pixels at the 16px body size.
                assert difference < 3, (name, character, weight, optical, difference)
    data = (FONTS / name).read_bytes()
    outputs.append({"file": name, "sha256": sha(data), "bytes": len(data), "characters": sorted(characters), "unicodeRange": css_range(characters)})

assert set(outputs[0]["characters"]).isdisjoint(outputs[1]["characters"])
assert set(outputs[0]["characters"]) | set(outputs[1]["characters"]) == allowed
faces = "\n".join(f"""/* Newsreader: Latin {'basic' if index == 0 else 'additional'} */
@font-face {{
  font-family: 'Newsreader';
  font-style: normal;
  font-weight: 400 500;
  font-display: swap;
  src: url(../assets/fonts/{item['file']}) format('woff2');
  unicode-range: {item['unicodeRange']};
}}""" for index, item in enumerate(outputs))
block = "/* BEGIN generated Newsreader Latin transports */\n" + faces + "\n/* END generated Newsreader Latin transports */"
css = CSS.read_text()
pattern = r"/\* BEGIN generated Newsreader Latin transports \*/.*?/\* END generated Newsreader Latin transports \*/" if "BEGIN generated Newsreader" in css else r"/\* Newsreader: latin \*/\n@font-face \{.*?\n\}"
css, count = re.subn(pattern, lambda _: block, css, count=1, flags=re.S)
assert count == 1
CSS.write_text(css)
manifest = {"schema": "newsreader-transports/v1", "source": SOURCE.name, "sourceSha256": sha(original_bytes), "sourceBytes": len(original_bytes), "fontToolsVersion": fontTools.__version__, "cssBlockSha256": sha(block.encode()), "originalUnicodeRange": ORIGINAL_RANGE, "maxOutlineOrAdvanceDeviationFontUnits": max_deviation, "outputs": outputs}
(FONTS / "newsreader-transports.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"originalBytes": len(original_bytes), "initialBytes": outputs[0]["bytes"], "totalBytes": sum(item["bytes"] for item in outputs), "coveredCharacters": len(allowed), "maxDeviationFontUnits": max_deviation}))
