"""
App promotion poster for PawDex.

Chill lifestyle mood: a real person out in the park using the app, with the
actual scan UI shown on a floating device beside her.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image

from render_lib import Canvas, font, linear_gradient, radial_glow, rounded_mask, cover
from screens import Phone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERO = os.path.join(ROOT, "attached_assets", "generated_images", "poster-lifestyle-hero.jpg")
LOGO = os.path.join(ROOT, "artifacts", "mobile", "assets", "images", "logo.png")
OUT = os.path.join(ROOT, "attached_assets", "appstore", "pawdex-poster-2400x3600.jpg")

W, H = 2400, 3600
NAVY = "#0B2340"


def build(path: str = OUT) -> str:
    c = Canvas(W, H)
    c.rect((0, 0, W, H), fill=NAVY)

    # ---- Hero photograph, full bleed across the top
    hero_h = 2180
    c.image(Image.open(HERO), (0, 0, W, hero_h), focus_y=0.46)

    # Warm golden lift in the upper right, where the sunlight falls
    c.overlay(radial_glow((1900, 1900), (255, 208, 130, 105)), W - 1500, -560)

    # Scrim so the headline area resolves into the brand navy
    c.overlay(linear_gradient((W, hero_h),
                              [(11, 35, 64, 150), (11, 35, 64, 0), (11, 35, 64, 0),
                               (11, 35, 64, 205), (11, 35, 64, 255)],
                              [0, 0.22, 0.5, 0.85, 1.0]), 0, 0)

    # ---- Brand lockup
    logo = Image.open(LOGO).convert("RGBA").resize((150, 150), Image.LANCZOS)
    c.overlay(logo, 140, 132)
    c.text((312, 207), "PawDex", font("serif-bold", 86), "#FFFFFF", anchor="lm",
           shadow=(4, 14, 34, 150), shadow_blur=18)
    c.text((316, 262), "DOG BREED DEX", font("semibold", 27), (255, 255, 255, 190),
           anchor="lm", tracking=6.5)

    # ---- Floating device showing the real scan screen
    ph_w = 880
    ph_h = int(ph_w * (2778 / 1284))
    screen = Phone(ph_w, ph_h).scan().img

    bez = 16
    dev = Canvas(ph_w + bez * 2, ph_h + bez * 2)
    dev.rect((0, 0, ph_w + bez * 2, ph_h + bez * 2), radius=104, fill=(8, 18, 34, 255))
    s_img = screen.copy()
    s_img.putalpha(rounded_mask((ph_w, ph_h), 90))
    dev.overlay(s_img, bez, bez)
    dev.rect((0, 0, ph_w + bez * 2, ph_h + bez * 2), radius=104,
             outline=(255, 255, 255, 70), width=3)

    dx, dy = 1370, 1450
    c.shadow((dx, dy, dx + dev.size[0], dy + dev.size[1]), radius=104, blur=70,
             color=(2, 8, 20, 210), dy=44)
    c.overlay(dev.img, dx, dy)

    # ---- Headline block
    lx = 150
    ty = 2290
    c.text((lx, ty), "Every walk", font("serif-bold", 152), "#FFFFFF",
           shadow=(3, 12, 30, 160), shadow_blur=22)
    c.text((lx, ty + 172), "counts.", font("serif-bold", 152), "#5AC8FA",
           shadow=(3, 12, 30, 160), shadow_blur=22)

    for i, line in enumerate([
        "Point your camera at any dog and PawDex",
        "names the breed on-device in about a second.",
        "Collect all 100. Keep the streak alive.",
    ]):
        c.text((lx, ty + 420 + i * 62), line, font("regular", 42), (255, 255, 255, 210))

    # ---- Feature chips
    chips = [("zap", "Instant on-device AI", "#5AC8FA"),
             ("grid", "100 breeds to collect", "#34D399"),
             ("sun", "Daily streaks & badges", "#FB923C")]
    cy = ty + 600
    for ic, label, col in chips:
        cw = Canvas.text_width(label, font("semibold", 38)) + 128
        c.rect((lx, cy, lx + cw, cy + 92), radius=46, fill=(255, 255, 255, 26),
               outline=(255, 255, 255, 62), width=2)
        c.icon(ic, 38, col, cx=lx + 56, cy=cy + 46)
        c.text((lx + 92, cy + 46), label, font("semibold", 38), "#FFFFFF", anchor="lm")
        cy += 112

    # ---- Store badge
    bw, bh = 560, 132
    bx, by = lx, H - 300
    c.rect((bx, by, bx + bw, by + bh), radius=28, fill="#FFFFFF")
    c.icon("download", 46, "#0B2340", cx=bx + 66, cy=by + bh / 2)
    c.text((bx + 108, by + 50), "Download on the", font("medium", 26), (11, 35, 64, 190), anchor="lm")
    c.text((bx + 108, by + 88), "App Store", font("bold", 40), "#0B2340", anchor="lm")

    c.text((bx + bw + 44, by + bh / 2), "doggodexapp.com", font("medium", 34),
           (255, 255, 255, 165), anchor="lm")

    c.save(path, quality=94)
    return path


if __name__ == "__main__":
    print(build())
