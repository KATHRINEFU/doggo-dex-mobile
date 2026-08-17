"""
Builds the three App Store screenshots at exact accepted pixel dimensions.

  1. 1284 x 2778  (6.5"/6.7" portrait)  — Scan
  2. 1242 x 2688  (6.5" portrait)       — Dex
  3. 2778 x 1284  (6.5"/6.7" landscape) — Journal + Scan pair
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image

from render_lib import Canvas, font, linear_gradient, radial_glow, rounded_mask
from screens import Phone

OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "attached_assets",
    "appstore",
)


def caption(c: Canvas, headline: str, sub: str, y: float, s: float, color="#FFFFFF", sub_color=(255, 255, 255, 190)):
    W = c.size[0]
    c.text((W / 2, y), headline, font("serif-bold", 44 * s), color, anchor="ma",
           shadow=(6, 18, 40, 130), shadow_blur=14 * s, shadow_dy=2 * s)
    c.text((W / 2, y + 62 * s), sub, font("medium", 22 * s), sub_color, anchor="ma")


def framed(phone_img: Image.Image, s: float, radius: float) -> Image.Image:
    """Rounded device screen with a thin bezel highlight."""
    w, h = phone_img.size
    bez = max(2, int(6 * s))
    out = Canvas(w + bez * 2, h + bez * 2)
    out.rect((0, 0, w + bez * 2, h + bez * 2), radius=radius + bez, fill=(10, 22, 40, 235))
    img = phone_img.copy()
    img.putalpha(rounded_mask((w, h), radius))
    out.overlay(img, bez, bez)
    out.rect((0, 0, w + bez * 2, h + bez * 2), radius=radius + bez,
             outline=(255, 255, 255, 60), width=max(1, int(1.6 * s)))
    return out.img


# ------------------------------------------------------------ portrait 1 --
def shot_scan(w: int, h: int, path: str):
    s = w / 1284
    c = Canvas(w, h)
    c.overlay(linear_gradient((w, h), ["#0B2340", "#123A63", "#0A1B33"], [0, 0.55, 1], (0.2, 0), (0.8, 1)))
    c.overlay(radial_glow((int(w * 1.7), int(w * 1.7)), (90, 200, 250, 90)), -w * 0.35, -w * 0.5)

    caption(c, "Point. Snap. Identified.", "On-device AI names the breed in about a second.", 128 * s, s)

    ph_w = int(w * 0.76)
    ph = Phone(ph_w, int(ph_w * (2778 / 1284)))
    screen = ph.scan().img
    dev = framed(screen, s, 62 * s)
    x = (w - dev.width) // 2
    y = int(322 * s)
    c.shadow((x, y, x + dev.width, y + dev.height), radius=68 * s, blur=46 * s,
             color=(3, 10, 24, 190), dy=26 * s)
    c.overlay(dev, x, y)
    c.save(path)
    return path


# ------------------------------------------------------------ portrait 2 --
def shot_dex(w: int, h: int, path: str):
    s = w / 1242
    c = Canvas(w, h)
    c.overlay(linear_gradient((w, h), ["#4BB8FA", "#3A8FDC", "#1E4E8C"], [0, 0.5, 1], (0.25, 0), (0.75, 1)))
    c.overlay(radial_glow((int(w * 1.6), int(w * 1.6)), (255, 255, 255, 70)), -w * 0.3, -w * 0.45)

    caption(c, "Build your Doggo Dex.", "100 breeds to find, four rarity tiers to chase.", 124 * s, s)

    ph_w = int(w * 0.76)
    ph = Phone(ph_w, int(ph_w * (2688 / 1242)))
    screen = ph.dex().img
    dev = framed(screen, s, 60 * s)
    x = (w - dev.width) // 2
    y = int(312 * s)
    c.shadow((x, y, x + dev.width, y + dev.height), radius=66 * s, blur=44 * s,
             color=(9, 33, 66, 190), dy=24 * s)
    c.overlay(dev, x, y)
    c.save(path)
    return path


# ----------------------------------------------------------- landscape 3 --
def shot_landscape(w: int, h: int, path: str):
    s = w / 2778
    c = Canvas(w, h)
    c.overlay(linear_gradient((w, h), ["#0B2340", "#1A4C82", "#0A1B33"], [0, 0.5, 1], (0.15, 0), (0.85, 1)))
    c.overlay(radial_glow((int(w), int(w)), (90, 200, 250, 80)), -w * 0.1, -h * 0.6)

    # Left copy column
    lx = int(w * 0.075)
    ly = int(h * 0.30)
    c.text((lx, ly), "Every walk", font("serif-bold", 108 * s), "#FFFFFF",
           shadow=(4, 14, 34, 140), shadow_blur=18 * s)
    c.text((lx, ly + 118 * s), "counts.", font("serif-bold", 108 * s), "#5AC8FA",
           shadow=(4, 14, 34, 140), shadow_blur=18 * s)
    for i, line in enumerate([
        "XP, daily streaks and collectible badges",
        "turn dog spotting into a game worth",
        "keeping up.",
    ]):
        c.text((lx, ly + 268 * s + i * 46 * s), line, font("regular", 32 * s), (255, 255, 255, 205))

    chips = [("sun", "12-day streak", "#FB923C"), ("award", "3 badges earned", "#FBBF24"),
             ("hash", "37 breeds found", "#5AC8FA")]
    cy = ly + 448 * s
    cx = lx
    for ic, label, col in chips:
        tw = Canvas.text_width(label, font("semibold", 26 * s))
        cw = tw + 96 * s
        c.rect((cx, cy, cx + cw, cy + 68 * s), radius=34 * s, fill=(255, 255, 255, 26),
               outline=(255, 255, 255, 60), width=max(1, 1.4 * s))
        c.icon(ic, 28 * s, col, cx=cx + 40 * s, cy=cy + 34 * s)
        c.text((cx + 66 * s, cy + 34 * s), label, font("semibold", 26 * s), "#FFFFFF", anchor="lm")
        cx += cw + 20 * s

    # Two phones on the right
    ph_h = int(h * 0.86)
    ph_w = int(ph_h * (1284 / 2778))

    back = Phone(ph_w, ph_h).scan().img
    front = Phone(ph_w, ph_h).journal().img

    bx = int(w * 0.545)
    by = int((h - ph_h) / 2)
    dev_b = framed(back, s * 2.1, 52 * s * 2.1)
    c.shadow((bx, by, bx + dev_b.width, by + dev_b.height), radius=60 * s * 2.1, blur=40 * s * 2.1,
             color=(3, 10, 24, 170), dy=20 * s * 2.1)
    c.overlay(dev_b, bx, by)

    fx = int(w * 0.755)
    fy = by + int(h * 0.045)
    dev_f = framed(front, s * 2.1, 52 * s * 2.1)
    c.shadow((fx, fy, fx + dev_f.width, fy + dev_f.height), radius=60 * s * 2.1, blur=44 * s * 2.1,
             color=(3, 10, 24, 200), dy=22 * s * 2.1)
    c.overlay(dev_f, fx, fy)

    c.save(path)
    return path


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print(shot_scan(1284, 2778, os.path.join(OUT, "01-scan-1284x2778.jpg")))
    print(shot_dex(1242, 2688, os.path.join(OUT, "02-dex-1242x2688.jpg")))
    print(shot_landscape(2778, 1284, os.path.join(OUT, "03-progress-2778x1284.jpg")))
