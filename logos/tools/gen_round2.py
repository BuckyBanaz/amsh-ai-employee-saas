"""Round 2 premium AMSh logo concepts. Text is converted to SVG paths so no font files are needed."""
import io
import os

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.environ.get("LOGO_FONTS_DIR", os.path.join(HERE, "fonts"))  # Google Fonts TTFs (Sora, Unbounded, Michroma, Geist, ...)
OUT = os.path.join(HERE, "..", "concepts")

DARK_BG = "#070B1A"
INK_DARK = "#FFFFFF"
INK_LIGHT = "#0B1020"

_font_cache = {}


def _font(file, wght):
    key = (file, wght)
    if key not in _font_cache:
        f = TTFont(os.path.join(FONTS, file))
        if wght is not None and "fvar" in f:
            f = instancer.instantiateVariableFont(f, {"wght": wght})
        buf = io.BytesIO()
        f.save(buf)
        data = buf.getvalue()
        _font_cache[key] = (TTFont(io.BytesIO(data)), data)
    return _font_cache[key]


def _shape(file, wght, text):
    font, data = _font(file, wght)
    hbfont = hb.Font(hb.Face(data))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    return font, list(zip(buf.glyph_infos, buf.glyph_positions))


def text_path(file, text, size, wght=None, tracking=0.0, ox=0.0, oy=0.0):
    """Return (path d, ink bounds) for text with its baseline-left at (ox, oy)."""
    font, glyphs = _shape(file, wght, text)
    upm = font["head"].unitsPerEm
    gs = font.getGlyphSet()
    order = font.getGlyphOrder()
    s = size / upm
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    bpen = BoundsPen(gs)
    x = 0.0
    for info, pos in glyphs:
        name = order[info.codepoint]
        t = (s, 0, 0, -s, ox + (x + pos.x_offset) * s, oy - pos.y_offset * s)
        gs[name].draw(TransformPen(pen, t))
        gs[name].draw(TransformPen(bpen, t))
        x += pos.x_advance + tracking * upm
    return pen.getCommands(), bpen.bounds


def fit_text(file, text, wght, tracking, x0, max_w, target_h, center_y):
    """Size text so its ink height is target_h (shrinking to max_w), vertically centred on center_y."""
    _, b = text_path(file, text, 100, wght, tracking)
    w100, h100 = b[2] - b[0], b[3] - b[1]
    size = 100 * target_h / h100
    if w100 * size / 100 > max_w:
        size = 100 * max_w / w100
    _, b = text_path(file, text, size, wght, tracking)
    ox = x0 - b[0]
    oy = center_y - (b[1] + b[3]) / 2
    d, b = text_path(file, text, size, wght, tracking, ox, oy)
    return d, b


# ---------------------------------------------------------------- icons (512 space)
CONCEPTS = {}

CONCEPTS["concept-5"] = dict(
    title="Waveform AM",
    font=("Sora.ttf", 600, -0.01, "AMSh"),
    defs="""<linearGradient id="g5" x1="64" y1="0" x2="448" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8B5CF6"/><stop offset="0.5" stop-color="#0066FF"/><stop offset="1" stop-color="#22D3EE"/>
    </linearGradient>""",
    mark="""<path d="M72 372 L162 136 L246 372 L310 184 L364 300 L418 184 L444 372" fill="none" stroke="url(#g5)" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="162" cy="300" r="22" fill="#8B5CF6"/>""",
)

CONCEPTS["concept-6"] = dict(
    title="AI orb + spark",
    font=("Unbounded.ttf", 500, 0.0, "amsh"),
    defs="""<radialGradient id="g6" cx="190" cy="170" r="300" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7DD3FC"/><stop offset="0.45" stop-color="#0066FF"/><stop offset="1" stop-color="#3B0CA3"/>
    </radialGradient>""",
    mark="""<circle cx="256" cy="256" r="200" fill="url(#g6)"/>
    <path d="M256 128 Q266 246 384 256 Q266 266 256 384 Q246 266 128 256 Q246 246 256 128 Z" fill="#FFFFFF"/>
    <path d="M352 140 Q356 176 392 180 Q356 184 352 220 Q348 184 312 180 Q348 176 352 140 Z" fill="#FFFFFF" fill-opacity="0.85"/>""",
)

CONCEPTS["concept-7"] = dict(
    title="Prism A",
    font=("Michroma-Regular.ttf", None, 0.06, "AMSH"),
    defs="""<linearGradient id="g7a" x1="64" y1="72" x2="256" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#67E8F9"/><stop offset="1" stop-color="#0066FF"/>
    </linearGradient>
    <linearGradient id="g7b" x1="256" y1="72" x2="448" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0066FF"/><stop offset="1" stop-color="#4C1D95"/>
    </linearGradient>""",
    mark="""<path d="M256 64 L256 300 L180 444 L60 444 Z" fill="url(#g7a)"/>
    <path d="M256 64 L452 444 L332 444 L256 300 Z" fill="url(#g7b)"/>""",
)

CONCEPTS["concept-8"] = dict(
    title="Human + AI",
    font=("Geist.ttf", 600, -0.02, "AMSh"),
    defs="""<linearGradient id="g8a" x1="60" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0066FF"/><stop offset="1" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="g8b" x1="192" y1="0" x2="452" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#A78BFA"/><stop offset="1" stop-color="#6D28D9"/>
    </linearGradient>
    <clipPath id="c8"><circle cx="190" cy="256" r="136"/></clipPath>""",
    mark="""<circle cx="190" cy="256" r="136" fill="url(#g8a)"/>
    <circle cx="322" cy="256" r="136" fill="url(#g8b)"/>
    <circle cx="322" cy="256" r="136" fill="#22D3EE" clip-path="url(#c8)"/>""",
)


def svg(view_w, view_h, body, defs=""):
    d = f"\n  <defs>\n    {defs}\n  </defs>" if defs else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_w} {view_h}">{d}\n{body}\n</svg>\n'


def write(name, content):
    with open(os.path.join(OUT, name), "w") as fh:
        fh.write(content)


for key, c in CONCEPTS.items():
    file, wght, tracking, word = c["font"]
    # App icon: mark on a dark rounded tile
    tile = f'  <g id="icon">\n    <rect width="512" height="512" rx="116" fill="{DARK_BG}"/>\n    <g transform="translate(51 51) scale(0.8)">\n    {c["mark"]}\n    </g>\n  </g>'
    write(f"{key}-icon.svg", svg(512, 512, tile, c["defs"]))

    # Combination mark (icon + wordmark), 1024x512, transparent background
    icon_box, x_icon = 300, 64
    icon = f'  <g id="icon" transform="translate({x_icon} {256 - icon_box / 2:.0f}) scale({icon_box / 512:.4f})">\n    {c["mark"]}\n  </g>'
    x_text = x_icon + icon_box + 44
    d, _ = fit_text(file, word, wght, tracking, x_text, 1024 - x_text - 56, 118, 256)
    for variant, ink in (("", INK_DARK), ("-light", INK_LIGHT)):
        body = f'{icon}\n  <g id="wordmark">\n    <path d="{d}" fill="{ink}"/>\n  </g>'
        write(f"{key}{variant}.svg", svg(1024, 512, body, c["defs"]))

# ---------------------------------------------------------------- font strip
FONT_OPTIONS = [
    ("Sora", "Sora.ttf", 600, -0.01),
    ("Space Grotesk", "SpaceGrotesk.ttf", 600, -0.01),
    ("Syne", "Syne.ttf", 700, 0.0),
    ("Unbounded", "Unbounded.ttf", 500, 0.0),
    ("Michroma", "Michroma-Regular.ttf", None, 0.04),
    ("Orbitron", "Orbitron.ttf", 700, 0.04),
    ("Outfit", "Outfit.ttf", 500, 0.0),
    ("Geist", "Geist.ttf", 600, -0.02),
]
os.makedirs(os.path.join(OUT, "..", "fonts"), exist_ok=True)
for label, file, wght, tracking in FONT_OPTIONS:
    d, _ = fit_text(file, "AMSh", wght, tracking, 24, 552, 120, 100)
    slug = label.lower().replace(" ", "-")
    with open(os.path.join(OUT, "..", "fonts", f"{slug}.svg"), "w") as fh:
        fh.write(svg(600, 200, f'  <path d="{d}" fill="#FFFFFF"/>'))
print("done")
