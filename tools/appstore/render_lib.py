"""
Shared drawing helpers for PawDex / Doggo Dex App Store creatives.

Everything is composited with Pillow. Layouts are authored in iOS logical
points and rendered at an arbitrary integer/float scale so the same code can
emit 1284x2778, 1242x2688, etc. without re-tuning any numbers.
"""

from __future__ import annotations

import glob
import json
import os
from typing import Iterable, Sequence

from PIL import Image, ImageDraw, ImageFilter, ImageFont

try:
    import numpy as np
except Exception:  # pragma: no cover
    np = None

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MOBILE = os.path.join(ROOT, "artifacts", "mobile")


# ---------------------------------------------------------------- fonts ----

def _first(pattern: str) -> str:
    hits = sorted(glob.glob(pattern, recursive=True))
    if not hits:
        raise FileNotFoundError(pattern)
    return hits[0]


_INTER_DIR = _first(
    os.path.join(ROOT, "node_modules/.pnpm/@expo-google-fonts+inter*/node_modules/@expo-google-fonts/inter")
)

INTER = {
    "regular": os.path.join(_INTER_DIR, "400Regular/Inter_400Regular.ttf"),
    "medium": os.path.join(_INTER_DIR, "500Medium/Inter_500Medium.ttf"),
    "semibold": os.path.join(_INTER_DIR, "600SemiBold/Inter_600SemiBold.ttf"),
    "bold": os.path.join(_INTER_DIR, "700Bold/Inter_700Bold.ttf"),
    "extrabold": os.path.join(_INTER_DIR, "800ExtraBold/Inter_800ExtraBold.ttf"),
    "black": os.path.join(_INTER_DIR, "900Black/Inter_900Black.ttf"),
}

# The app asks for Georgia; DejaVu Serif is the closest transitional serif
# available in this environment.
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"

_ICON_BASE = os.path.dirname(
    _first(
        os.path.join(
            ROOT,
            "node_modules/.pnpm/@expo+vector-icons*/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf",
        )
    )
)
_GLYPH_BASE = os.path.join(os.path.dirname(_ICON_BASE), "glyphmaps")

_font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}
_glyph_cache: dict[str, dict] = {}


def font(name: str, size_px: float) -> ImageFont.FreeTypeFont:
    """Load a font by INTER key, 'serif', 'serif-bold', or an explicit path."""
    path = INTER.get(name)
    if path is None:
        path = {"serif": SERIF, "serif-bold": SERIF_BOLD}.get(name, name)
    key = (path, int(round(size_px)))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, key[1])
    return _font_cache[key]


def _glyphs(family: str) -> dict:
    if family not in _glyph_cache:
        with open(os.path.join(_GLYPH_BASE, f"{family}.json")) as fh:
            _glyph_cache[family] = json.load(fh)
    return _glyph_cache[family]


def icon(name: str, size_px: float, color, family: str = "Feather") -> Image.Image:
    """Render a vector icon glyph to a tightly-cropped RGBA image."""
    size_px = max(1, int(round(size_px)))
    table = _glyphs(family)
    if name not in table:
        raise KeyError(f"{family} has no icon named {name!r}")
    fnt = ImageFont.truetype(os.path.join(_ICON_BASE, f"{family}.ttf"), size_px)
    pad = size_px
    img = Image.new("RGBA", (size_px + pad * 2, size_px + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(img).text(
        (img.width / 2, img.height / 2), chr(table[name]), font=fnt, fill=color, anchor="mm"
    )
    return img.crop(img.getbbox() or (0, 0, 1, 1))


# ---------------------------------------------------------------- color ----

def rgba(hex_or_tuple, alpha: float | None = None):
    """'#RRGGBB' / '#RRGGBBAA' / (r,g,b[,a]) -> (r,g,b,a), optional alpha override."""
    if isinstance(hex_or_tuple, (tuple, list)):
        c = list(hex_or_tuple)
        if len(c) == 3:
            c.append(255)
    else:
        s = hex_or_tuple.lstrip("#")
        if len(s) == 3:
            s = "".join(ch * 2 for ch in s)
        c = [int(s[i : i + 2], 16) for i in (0, 2, 4)]
        c.append(int(s[6:8], 16) if len(s) == 8 else 255)
    if alpha is not None:
        c[3] = int(round(255 * alpha)) if alpha <= 1 else int(alpha)
    return tuple(c)


def mix(a, b, t: float):
    a, b = rgba(a), rgba(b)
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(4))


# ------------------------------------------------------------- gradients ---

def linear_gradient(
    size: tuple[int, int],
    colors: Sequence,
    locations: Sequence[float] | None = None,
    start: tuple[float, float] = (0.0, 0.0),
    end: tuple[float, float] = (0.0, 1.0),
) -> Image.Image:
    """Gradient matching expo-linear-gradient semantics (normalized start/end)."""
    w, h = int(size[0]), int(size[1])
    cols = [rgba(c) for c in colors]
    if locations is None:
        n = len(cols) - 1 or 1
        locations = [i / n for i in range(len(cols))]

    if np is not None:
        xs = np.linspace(0.0, 1.0, w, dtype=np.float32)[None, :]
        ys = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
        dx, dy = end[0] - start[0], end[1] - start[1]
        denom = dx * dx + dy * dy or 1e-6
        t = ((xs - start[0]) * dx + (ys - start[1]) * dy) / denom
        t = np.clip(t, 0.0, 1.0)
        out = np.zeros((h, w, 4), dtype=np.float32)
        locs = list(locations)
        for i in range(len(cols) - 1):
            lo, hi = locs[i], locs[i + 1]
            seg = np.clip((t - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
            m = (t >= lo) & (t <= hi) if i < len(cols) - 2 else (t >= lo)
            for ch in range(4):
                out[..., ch] = np.where(
                    m, cols[i][ch] + (cols[i + 1][ch] - cols[i][ch]) * seg, out[..., ch]
                )
        first = t < locs[0]
        for ch in range(4):
            out[..., ch] = np.where(first, cols[0][ch], out[..., ch])
        return Image.fromarray(out.round().astype("uint8"), "RGBA")

    img = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = min(max((y / max(h - 1, 1) - start[1]) / max(end[1] - start[1], 1e-6), 0.0), 1.0)
        col = cols[-1]
        for i in range(len(cols) - 1):
            lo, hi = locations[i], locations[i + 1]
            if t <= hi or i == len(cols) - 2:
                col = mix(cols[i], cols[i + 1], (t - lo) / max(hi - lo, 1e-6))
                break
        d.line([(0, y), (w, y)], fill=col)
    return img


def radial_glow(size: tuple[int, int], color, power: float = 2.0) -> Image.Image:
    """Soft radial falloff, transparent at the edges. Used for lighting accents."""
    w, h = int(size[0]), int(size[1])
    base = Image.new("RGBA", (w, h), rgba(color, 0.0))
    if np is None:
        return base
    xs = np.linspace(-1.0, 1.0, w, dtype=np.float32)[None, :]
    ys = np.linspace(-1.0, 1.0, h, dtype=np.float32)[:, None]
    r = np.clip(1.0 - np.sqrt(xs * xs + ys * ys), 0.0, 1.0) ** power
    c = rgba(color)
    arr = np.zeros((h, w, 4), dtype=np.float32)
    arr[..., 0], arr[..., 1], arr[..., 2] = c[0], c[1], c[2]
    arr[..., 3] = r * c[3]
    return Image.fromarray(arr.round().astype("uint8"), "RGBA")


# ----------------------------------------------------------------- masks ---

def rounded_mask(size: tuple[int, int], radius: float, supersample: int = 4) -> Image.Image:
    w, h = int(size[0]), int(size[1])
    s = supersample
    m = Image.new("L", (w * s, h * s), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        [0, 0, w * s - 1, h * s - 1], radius=max(0.0, radius) * s, fill=255
    )
    return m.resize((w, h), Image.LANCZOS)


def cover(img: Image.Image, w: float, h: float, focus_y: float = 0.5) -> Image.Image:
    """Center/́focus crop-to-fill, like CSS object-fit: cover."""
    w, h = max(1, int(round(w))), max(1, int(round(h)))
    scale = max(w / img.width, h / img.height)
    nw, nh = max(w, int(round(img.width * scale))), max(h, int(round(img.height * scale)))
    r = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = int(round((nh - h) * focus_y))
    return r.crop((left, top, left + w, top + h))


# -------------------------------------------------------------- painting ---

class Canvas:
    """RGBA canvas with helpers that all take pixel coordinates."""

    def __init__(self, w: float, h: float, bg=(0, 0, 0, 0)):
        self.img = Image.new("RGBA", (int(round(w)), int(round(h))), rgba(bg))

    # -- basics
    @property
    def size(self):
        return self.img.size

    @property
    def draw(self):
        return ImageDraw.Draw(self.img)

    def paste(self, im: Image.Image, x: float, y: float, mask: Image.Image | None = None):
        self.img.alpha_composite(
            im if im.mode == "RGBA" else im.convert("RGBA"), (int(round(x)), int(round(y)))
        ) if mask is None else self.img.paste(im, (int(round(x)), int(round(y))), mask)

    def overlay(self, im: Image.Image, x: float = 0, y: float = 0):
        self.img.alpha_composite(im.convert("RGBA"), (int(round(x)), int(round(y))))

    # -- shapes
    def rect(self, box, fill=None, radius: float = 0, outline=None, width: float = 1):
        """Antialiased rounded rectangle. box = (x0, y0, x1, y1)."""
        x0, y0, x1, y1 = [float(v) for v in box]
        w, h = max(1, int(round(x1 - x0))), max(1, int(round(y1 - y0)))
        s = 4
        layer = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.rounded_rectangle(
            [0, 0, w * s - 1, h * s - 1],
            radius=max(0.0, radius) * s,
            fill=rgba(fill) if fill is not None else None,
            outline=rgba(outline) if outline is not None else None,
            width=max(1, int(round(width * s))),
        )
        self.overlay(layer.resize((w, h), Image.LANCZOS), x0, y0)

    def circle(self, cx, cy, r, fill=None, outline=None, width=1):
        self.rect((cx - r, cy - r, cx + r, cy + r), fill=fill, radius=r, outline=outline, width=width)

    def image(self, im: Image.Image, box, radius: float = 0, focus_y: float = 0.5):
        x0, y0, x1, y1 = [float(v) for v in box]
        w, h = max(1, int(round(x1 - x0))), max(1, int(round(y1 - y0)))
        tile = cover(im.convert("RGBA"), w, h, focus_y)
        if radius > 0:
            tile.putalpha(rounded_mask((w, h), radius))
        self.overlay(tile, x0, y0)

    def gradient_rect(self, box, colors, locations=None, start=(0, 0), end=(0, 1), radius=0):
        x0, y0, x1, y1 = [float(v) for v in box]
        w, h = max(1, int(round(x1 - x0))), max(1, int(round(y1 - y0)))
        g = linear_gradient((w, h), colors, locations, start, end)
        if radius > 0:
            g.putalpha(Image.composite(g.getchannel("A"), Image.new("L", (w, h), 0), rounded_mask((w, h), radius)))
        self.overlay(g, x0, y0)

    def shadow(self, box, radius: float, blur: float, color=(0, 0, 0, 90), dy: float = 0, spread: float = 0):
        x0, y0, x1, y1 = [float(v) for v in box]
        x0, y0, x1, y1 = x0 - spread, y0 - spread, x1 + spread, y1 + spread
        pad = int(round(blur * 3))
        w, h = int(round(x1 - x0)) + pad * 2, int(round(y1 - y0)) + pad * 2
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle(
            [pad, pad, w - pad - 1, h - pad - 1], radius=radius + spread, fill=rgba(color)
        )
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
        self.overlay(layer, x0 - pad, y0 - pad + dy)

    def glass(self, box, radius: float, blur: float = 18, tint=(255, 255, 255, 150), border=None, border_w=1):
        """Approximate a BlurView: blur what is behind the box, then tint it."""
        x0, y0, x1, y1 = [int(round(v)) for v in box]
        x0c, y0c = max(0, x0), max(0, y0)
        x1c, y1c = min(self.img.width, x1), min(self.img.height, y1)
        if x1c <= x0c or y1c <= y0c:
            return
        region = self.img.crop((x0c, y0c, x1c, y1c)).filter(ImageFilter.GaussianBlur(blur))
        tinted = Image.alpha_composite(region, Image.new("RGBA", region.size, rgba(tint)))
        mask = rounded_mask(region.size, radius)
        # Shift the mask if the box was clipped by the canvas edge.
        if (x0c, y0c) != (x0, y0) or (x1c, y1c) != (x1, y1):
            full = rounded_mask((x1 - x0, y1 - y0), radius)
            mask = full.crop((x0c - x0, y0c - y0, x1c - x0, y1c - y0))
        self.img.paste(tinted, (x0c, y0c), mask)
        if border is not None:
            self.rect(box, radius=radius, outline=border, width=border_w)

    def blur_region(self, box, blur: float):
        x0, y0, x1, y1 = [int(round(v)) for v in box]
        region = self.img.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(blur))
        self.img.paste(region, (x0, y0))

    # -- text
    def text(
        self,
        xy,
        s: str,
        fnt: ImageFont.FreeTypeFont,
        fill,
        anchor: str = "la",
        tracking: float = 0.0,
        shadow=None,
        shadow_blur: float = 8,
        shadow_dy: float = 1,
    ) -> float:
        """Draw text with optional letter-spacing. Returns the advance width."""
        x, y = float(xy[0]), float(xy[1])
        width = self.text_width(s, fnt, tracking)
        ha, va = (anchor + "a")[0], (anchor + "a")[1]
        if ha == "m":
            x -= width / 2
        elif ha == "r":
            x -= width
        if shadow is not None:
            pad = int(round(shadow_blur * 3)) + 4
            layer = Image.new("RGBA", (int(width) + pad * 2, fnt.size * 3 + pad * 2), (0, 0, 0, 0))
            self._runs(ImageDraw.Draw(layer), pad, pad + fnt.size, s, fnt, rgba(shadow), tracking, va="a")
            self.overlay(layer.filter(ImageFilter.GaussianBlur(shadow_blur)), x - pad, y - pad - fnt.size + shadow_dy)
        self._runs(self.draw, x, y, s, fnt, rgba(fill), tracking, va)
        return width

    @staticmethod
    def _runs(d: ImageDraw.ImageDraw, x, y, s, fnt, fill, tracking, va):
        if tracking == 0:
            d.text((x, y), s, font=fnt, fill=fill, anchor="l" + va)
            return
        for ch in s:
            d.text((x, y), ch, font=fnt, fill=fill, anchor="l" + va)
            x += fnt.getlength(ch) + tracking

    @staticmethod
    def text_width(s: str, fnt: ImageFont.FreeTypeFont, tracking: float = 0.0) -> float:
        if tracking == 0:
            return fnt.getlength(s)
        return sum(fnt.getlength(c) for c in s) + tracking * max(len(s) - 1, 0)

    def icon(self, name, size_px, color, cx=None, cy=None, x=None, y=None, family="Feather"):
        im = icon(name, size_px, rgba(color), family)
        if cx is not None:
            x = cx - im.width / 2
        if cy is not None:
            y = cy - im.height / 2
        self.overlay(im, x, y)
        return im

    def save(self, path: str, quality: int = 95):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        out = self.img
        if path.lower().endswith((".jpg", ".jpeg")):
            bg = Image.new("RGB", out.size, (255, 255, 255))
            bg.paste(out, mask=out.getchannel("A"))
            bg.save(path, quality=quality, subsampling=0)
        else:
            out.save(path)
        return path


def wrap(s: str, fnt: ImageFont.FreeTypeFont, max_w: float, tracking: float = 0.0) -> list[str]:
    words, lines, cur = s.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if Canvas.text_width(trial, fnt, tracking) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines
