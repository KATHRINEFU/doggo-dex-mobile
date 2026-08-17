"""
Renders the PawDex app UI at App Store screenshot sizes.

Layout is authored in iOS logical points (428x926 = iPhone 6.7") and scaled to
whatever pixel size is requested, so the same code produces 1284x2778,
1242x2688, etc.
"""

from __future__ import annotations

import os
from PIL import Image

from render_lib import Canvas, font, wrap, rgba, mix, linear_gradient, radial_glow, rounded_mask, cover

BREEDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources")
MOBILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "artifacts", "mobile")

# ------------------------------------------------------------ app tokens ---
SKY = ["#4BB8FA", "#3A8FDC", "#2C5EAD"]
RARITY = {"common": "#34D399", "uncommon": "#60A5FA", "rare": "#A78BFA", "legendary": "#FBBF24"}
CARD_BG = (255, 255, 255, 28)
CARD_BORDER = (255, 255, 255, 46)

TIER_GRADIENTS = {
    "b10": ("#A8EDEA", "#66BB6A"),
    "b20": ("#84FAB0", "#08AEEA"),
    "b30": ("#A18CD1", "#FBC2EB"),
    "b40": ("#FDDB92", "#D1FDFF"),
}
TIER_ICON = {"b10": "maximize", "b20": "search", "b30": "heart", "b40": "mic"}


def photo(stem: str) -> Image.Image:
    return Image.open(os.path.join(BREEDS, f"{stem}.jpg")).convert("RGB")


# Demo state — a believable mid-game save file.
COUNT, TOTAL = 37, 100
XP, STREAK = 740, 12

# Photo ids were verified visually against a contact sheet; several Unsplash
# ids referenced by the app resolve to landscapes rather than dogs, so only
# confirmed dog photos are used here and each is paired with the breed it
# actually depicts. Rarities match artifacts/api-server/src/routes/dogs.ts.
HERO = "1600804340584-c7db2eacf0bf"  # golden retriever, vertical — camera feed

DEX = [
    ("Golden Retriever", "common", "1576201836106-db1758fd1c97", True, 4),
    ("Siberian Husky", "uncommon", "1568572933382-74d440642117", True, 3),
    ("Samoyed", "rare", "1596492784531-6e6eb5ea9993", True, 2),
    ("French Bulldog", "common", "1583337130417-3346a1be7dee", True, 4),
    ("Pembroke Welsh Corgi", "common", "1537151608828-ea2b11777ee8", True, 3),
    ("German Shepherd", "common", "1589941013453-ec89f33b5e95", True, 2),
    ("Rottweiler", "uncommon", "1567752881298-894bb81f9379", True, 1),
    ("Border Collie", "rare", "1587300003388-59208cc962cb", False, 0),
    ("Poodle", "common", "1583511655826-05700d52f4d9", False, 0),
    ("Pug", "common", "1517849845537-4d257902454a", False, 0),
]


class Phone:
    """Draws the app UI into a canvas sized in logical points * scale."""

    BASE_W = 428.0
    TOP_INSET, BOTTOM_INSET = 47.0, 34.0

    def __init__(self, px_w: int, px_h: int):
        """Scale is derived from the target width; the logical height follows the
        target aspect ratio so 1242x2688 and 1284x2778 both land exactly."""
        self.s = px_w / self.BASE_W
        self.W = self.BASE_W
        self.H = px_h / self.s
        self.c = Canvas(px_w, px_h)

    def p(self, v: float) -> float:
        return v * self.s

    # -------------------------------------------------------- status bar --
    def status_bar(self, dark_text: bool = False):
        c, s = self.c, self.s
        col = "#0F172A" if dark_text else "#FFFFFF"
        c.text((self.p(30), self.p(20)), "9:41", font("semibold", self.p(15.5)), col, anchor="lm")
        x = self.p(self.W - 28)
        # battery
        bw, bh = self.p(24), self.p(11.5)
        c.rect((x - bw, self.p(20) - bh / 2, x, self.p(20) + bh / 2), radius=self.p(3.4),
               outline=rgba(col, 0.45), width=max(1, self.p(1)))
        c.rect((x - bw + self.p(2), self.p(20) - bh / 2 + self.p(2), x - self.p(2), self.p(20) + bh / 2 - self.p(2)),
               radius=self.p(1.8), fill=col)
        c.rect((x + self.p(1.2), self.p(20) - self.p(2.6), x + self.p(2.8), self.p(20) + self.p(2.6)),
               radius=self.p(1), fill=rgba(col, 0.45))
        # wifi + cellular
        wx = x - bw - self.p(9)
        for i, hh in enumerate((3.5, 6, 8.5, 11)):
            bx = wx - self.p(17) + self.p(i * 4.6)
            c.rect((bx, self.p(20) + self.p(5.5) - self.p(hh), bx + self.p(3.1), self.p(20) + self.p(5.5)),
                   radius=self.p(1), fill=col if i < 3 else rgba(col, 0.4))
        c.icon("wifi", self.p(15), col, cx=wx - self.p(25), cy=self.p(20))

    # ------------------------------------------------------------ tabbar --
    def tab_bar(self, active: str = "index"):
        c, s = self.c, self.s
        pad = self.p(14)
        bar_h = self.p(62)
        y1 = self.p(self.H - self.BOTTOM_INSET + 2)
        y0 = y1 - bar_h
        box = (pad, y0, self.p(self.W) - pad, y1)
        c.shadow(box, radius=self.p(36), blur=self.p(14), color=(75, 184, 250, 60), dy=self.p(-4))
        c.glass(box, radius=self.p(36), blur=self.p(11), tint=(255, 255, 255, 205),
                border=(255, 255, 255, 220), border_w=max(1, self.p(1)))

        tabs = [("index", "home", "Home"), ("collection", "grid", "Dex"),
                (None, None, None), ("leaderboard", "award", "Rank"), ("medals", "user", "Profile")]
        inner_w = (self.p(self.W) - pad * 2) - self.p(12)
        cx0 = pad + self.p(6)
        slot = inner_w / 5
        for i, (name, ic, label) in enumerate(tabs):
            if name is None:
                continue
            cx = cx0 + slot * i + slot / 2
            on = name == active
            col = "#1A3A8F" if on else (0, 0, 0, 90)
            cy = y0 + bar_h / 2 - self.p(5)
            c.icon(ic, self.p(21), col, cx=cx, cy=cy)
            c.text((cx, cy + self.p(15)), label, font("medium", self.p(10)), col, anchor="ma")
            if on:
                c.circle(cx, cy + self.p(26), self.p(2), fill="#1A3A8F")

        # pokeballWrap sits at top: -(SIZE/2) - 6 relative to the bar.
        self.pokeball(self.p(self.W) / 2, y0 - self.p(40), self.p(68))

    def pokeball(self, cx: float, top: float, size: float):
        """Center action button — matches components/PokeBall.tsx."""
        c = self.c
        n = int(round(size))
        r = n / 2
        cy = top + r
        border = max(2.0, n * 0.048)
        band = max(3.0, n * 0.065)
        c.shadow((cx - r, cy - r, cx + r, cy + r), radius=r, blur=self.p(7),
                 color=(0, 0, 0, 120), dy=self.p(5))

        ball = Canvas(n, n)
        ball.rect((0, 0, n, r), fill="#E8232A")
        ball.rect((0, r, n, n), fill="#F5F5F5")
        ball.rect((0, r - band / 2, n, r + band / 2), fill="#1A1A2E")

        clipped = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        clipped.paste(ball.img, (0, 0), rounded_mask((n, n), r))

        ring = Canvas(n, n)
        ring.overlay(clipped)
        ring.circle(r, r, r - border / 2, outline="#1A1A2E", width=border)
        bo, bi = n * 0.34, n * 0.2
        ring.circle(r, r, bo / 2, fill="#F5F5F5", outline="#1A1A2E", width=band)
        ring.circle(r, r, bi / 2, fill="#FFFFFF", outline="#1A1A2E", width=max(1.0, band * 0.5))
        c.overlay(ring.img, cx - r, cy - r)

    # =================================================== SCREEN 1 — SCAN ==
    def scan(self):
        c, s = self.c, self.s
        W, H = self.p(self.W), self.p(self.H)

        # Live camera feed
        c.image(photo(HERO), (0, 0, W, H), focus_y=0.42)
        c.overlay(linear_gradient((int(W), int(H)), ["#0A1628", (10, 22, 40, 0)], [0, 0.45]), 0, 0)
        # Vignette (index.tsx)
        c.overlay(linear_gradient(
            (int(W), int(H)),
            [(6, 15, 31, 158), (6, 15, 31, 0), (6, 15, 31, 0), (6, 15, 31, 191)],
            [0, 0.2, 0.55, 1.0]), 0, 0)

        self.status_bar()

        # ---- Top HUD
        top = self.p(self.TOP_INSET + 24)
        badge_w, badge_h = self.p(150), self.p(48)
        c.glass((self.p(16), top, self.p(16) + badge_w, top + badge_h),
                radius=self.p(24), blur=self.p(9), tint=(10, 22, 40, 105))
        av_c = (self.p(16 + 14 + 16), top + badge_h / 2)
        c.circle(av_c[0], av_c[1], self.p(16), fill="#1565C0", outline="#5AC8FA", width=self.p(2))
        c.icon("user", self.p(17), "#FFFFFF", cx=av_c[0], cy=av_c[1])
        c.text((av_c[0] + self.p(24), av_c[1]), "Lv. 8 Alex", font("bold", self.p(11.5)), "#5AC8FA", anchor="lm")

        logo = Image.open(os.path.join(MOBILE, "assets/images/logo.png")).convert("RGBA")
        lg = logo.resize((int(self.p(44)), int(self.p(44))), Image.LANCZOS)
        lg.putalpha(Image.composite(lg.getchannel("A"), Image.new("L", lg.size, 0), rounded_mask(lg.size, self.p(22))))
        c.overlay(lg, W - self.p(16 + 44), top + (badge_h - self.p(44)) / 2)

        # ---- Reticle over the dog
        rc = (W / 2, self.p(430))
        c.circle(rc[0], rc[1], self.p(84), outline=(90, 200, 250, 90), width=self.p(1.5))
        c.circle(rc[0], rc[1], self.p(112), outline=(90, 200, 250, 38), width=self.p(1.5))
        cor, arm, th = self.p(96), self.p(30), self.p(3)
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = rc[0] + sx * cor, rc[1] + sy * cor
                c.rect((min(x, x + sx * arm), y - th / 2, max(x, x + sx * arm), y + th / 2), fill="#5AC8FA", radius=th / 2)
                c.rect((x - th / 2, min(y, y + sy * arm), x + th / 2, max(y, y + sy * arm)), fill="#5AC8FA", radius=th / 2)

        # ---- Match chip
        chip_w, chip_h = self.p(232), self.p(44)
        chip_x, chip_y = W / 2 - chip_w / 2, rc[1] + self.p(140)
        c.shadow((chip_x, chip_y, chip_x + chip_w, chip_y + chip_h), radius=chip_h / 2, blur=self.p(10),
                 color=(6, 15, 31, 120), dy=self.p(4))
        c.glass((chip_x, chip_y, chip_x + chip_w, chip_y + chip_h), radius=chip_h / 2, blur=self.p(10),
                tint=(10, 22, 40, 120), border=(255, 255, 255, 45), border_w=max(1, self.p(1)))
        c.circle(chip_x + self.p(24), chip_y + chip_h / 2, self.p(11), fill="#34D399")
        c.icon("check", self.p(13), "#0A1628", cx=chip_x + self.p(24), cy=chip_y + chip_h / 2)
        c.text((chip_x + self.p(44), chip_y + chip_h / 2 - self.p(8)), "Golden Retriever",
               font("bold", self.p(14.5)), "#FFFFFF", anchor="lm")
        c.text((chip_x + self.p(44), chip_y + chip_h / 2 + self.p(9)), "98% match  ·  On-device",
               font("medium", self.p(10.5)), (255, 255, 255, 165), anchor="lm")

        # ---- XP pop (sits between the HUD and the reticle so it never
        # collides with the match chip below)
        xw, xh = self.p(112), self.p(40)
        xx, xy = W / 2 - xw / 2, rc[1] - self.p(196)
        c.shadow((xx, xy, xx + xw, xy + xh), radius=self.p(22), blur=self.p(12), color=(90, 200, 250, 150), dy=self.p(4))
        c.rect((xx, xy, xx + xw, xy + xh), radius=self.p(22), fill="#5AC8FA")
        c.text((W / 2, xy + xh / 2), "+50 XP!", font("bold", self.p(15)), "#FFFFFF", anchor="mm")

        # ---- Bottom collection card
        pad = self.p(14)
        card_h = self.p(124)
        cy1 = self.p(self.H - self.BOTTOM_INSET) - self.p(106) + self.p(24)
        cy0 = cy1 - card_h
        box = (pad, cy0, W - pad, cy1)
        c.shadow(box, radius=self.p(28), blur=self.p(14), color=(6, 15, 31, 110), dy=self.p(6))
        c.glass(box, radius=self.p(28), blur=self.p(14), tint=(255, 255, 255, 44),
                border=(255, 255, 255, 70), border_w=max(1, self.p(1)))

        tx = pad + self.p(20)
        ty = cy0 + self.p(20)
        c.text((tx, ty), "COLLECTION PROGRESS", font("semibold", self.p(10)), (255, 255, 255, 180), tracking=self.p(1.2))
        c.text((tx, ty + self.p(16)), str(COUNT), font("serif-bold", self.p(34)), "#FFFFFF")
        wnum = Canvas.text_width(str(COUNT), font("serif-bold", self.p(34)))
        c.text((tx + wnum + self.p(4), ty + self.p(40)), f"/ {TOTAL}", font("medium", self.p(15)),
               (255, 255, 255, 170), anchor="ls")
        c.text((tx, ty + self.p(58)), "Breeds Collected", font("regular", self.p(12)), (255, 255, 255, 190))

        trk_y = cy1 - self.p(22)
        trk = (tx, trk_y, W - pad - self.p(96), trk_y + self.p(8))
        c.rect(trk, radius=self.p(4), fill=(255, 255, 255, 70))
        c.gradient_rect((trk[0], trk[1], trk[0] + (trk[2] - trk[0]) * (COUNT / TOTAL), trk[3]),
                        ["#5AC8FA", "#007AFF"], start=(0, 0), end=(1, 0), radius=self.p(4))

        pc = (W - pad - self.p(46), cy0 + card_h / 2)
        c.circle(pc[0], pc[1], self.p(31), fill=(255, 255, 255, 38), outline=(90, 200, 250, 120), width=self.p(1.5))
        c.icon("maximize", self.p(28), (90, 200, 250, 210), cx=pc[0], cy=pc[1])

        self.tab_bar("index")
        return self.c

    # ================================================ SCREEN 1A — RANK ==
    def rank(self):
        """Leaderboard tab, rendered from the current mobile screen structure."""
        c, s = self.c, self.s
        W, H = self.p(self.W), self.p(self.H)
        c.overlay(linear_gradient((int(W), int(H)), ["#4BB8FA", "#3A8FDC", "#2C5EAD"],
                                  [0, 0.5, 1], (0.3, 0), (0.7, 1)))
        c.overlay(radial_glow((int(W * 1.5), int(W * 1.5)), (255, 255, 255, 58)),
                  -W * 0.28, -H * 0.12)
        self.status_bar()

        x0 = self.p(16)
        y = self.p(self.TOP_INSET + 16)
        c.text((x0, y), "Leaderboard", font("serif-bold", self.p(28)), "#FFFFFF")
        c.text((x0, y + self.p(38)), "Top collectors worldwide",
               font("regular", self.p(14)), (255, 255, 255, 190))

        # Scope toggle matches leaderboard.tsx: a translucent group with a
        # bright selected segment.
        y += self.p(78)
        toggle = (x0, y, W - x0, y + self.p(44))
        c.rect(toggle, radius=self.p(12), fill=(255, 255, 255, 38),
               outline=(255, 255, 255, 35), width=max(1, self.p(1)))
        half = (toggle[2] - toggle[0] - self.p(8)) / 2
        c.rect((x0 + self.p(4), y + self.p(4), x0 + self.p(4) + half, y + self.p(40)),
               radius=self.p(10), fill=(255, 255, 255, 235))
        c.text((x0 + self.p(4) + half / 2, y + self.p(22)), "Global",
               font("semibold", self.p(13)), "#1E3A5F", anchor="mm")
        c.text((x0 + self.p(8) + half + half / 2, y + self.p(22)), "My Country",
               font("semibold", self.p(13)), (255, 255, 255, 215), anchor="mm")

        # A compact podium gives the ranking screen an immediate hero moment,
        # followed by rows using the app's actual rank/avatar/name/breed layout.
        y += self.p(74)
        podium_y = y + self.p(98)
        podium = [
            (x0 + self.p(195), "1st", "Maya Chen", "CAN", 82, "#FBBF24", "M"),
            (x0 + self.p(92), "2nd", "Noah Park", "USA", 64, "#CBD5E1", "N"),
            (x0 + self.p(298), "3rd", "Lena Ortiz", "ESP", 57, "#D97706", "L"),
        ]
        for px, place, name, flag, count, col, initial in podium:
            r = self.p(29 if place == "1st" else 25)
            c.circle(px, podium_y - r - self.p(16), r, fill=(255, 255, 255, 226),
                     outline=col, width=self.p(3))
            c.circle(px, podium_y - r - self.p(16), r - self.p(4), fill="#3B82F6")
            c.text((px, podium_y - r - self.p(16)), initial, font("bold", self.p(20)),
                   "#FFFFFF", anchor="mm")
            c.text((px, podium_y + self.p(5)), place, font("bold", self.p(14)), col, anchor="ma")
            c.text((px, podium_y + self.p(27)), name, font("semibold", self.p(11)),
                   "#FFFFFF", anchor="ma")
            c.text((px, podium_y + self.p(44)), f"{flag}  {count} breeds",
                   font("medium", self.p(10)), (255, 255, 255, 180), anchor="ma")

        y = podium_y + self.p(79)
        entries = [
            ("#4", "Alex", "USA", 37, True, "#64748B", "A"),
            ("#5", "Sofia Kim", "KOR", 35, False, "#64748B", "S"),
            ("#6", "Theo Martin", "FRA", 31, False, "#64748B", "T"),
            ("#7", "Priya Shah", "GBR", 29, False, "#64748B", "P"),
            ("#8", "Jordan Lee", "AUS", 26, False, "#64748B", "J"),
        ]
        for rank, name, flag, count, is_me, rank_col, initial in entries:
            rh = self.p(65)
            box = (x0, y, W - x0, y + rh)
            c.rect(box, radius=self.p(14), fill=(255, 255, 255, 228) if is_me else (255, 255, 255, 195),
                   outline=(90, 200, 250, 120) if is_me else (255, 255, 255, 25),
                   width=max(1, self.p(1)))
            c.text((x0 + self.p(31), y + rh / 2), rank, font("bold", self.p(15)),
                   rank_col, anchor="mm")
            ax = x0 + self.p(72)
            c.circle(ax, y + rh / 2, self.p(20), fill="#3B82F6",
                     outline="#5AC8FA" if is_me else None, width=self.p(2))
            c.text((ax, y + rh / 2), initial, font("bold", self.p(15)), "#FFFFFF", anchor="mm")
            c.text((x0 + self.p(103), y + self.p(25)), f"{name}  " + ("YOU" if is_me else ""),
                   font("semibold", self.p(14)), "#1E293B")
            c.text((x0 + self.p(103), y + self.p(46)), f"{flag}  " + ("United States" if is_me else "Collector"),
                   font("regular", self.p(10.5)), "#64748B")
            c.text((W - x0 - self.p(16), y + self.p(24)), str(count),
                   font("bold", self.p(16)), "#1E3A5F", anchor="ra")
            c.text((W - x0 - self.p(16), y + self.p(45)), "breeds",
                   font("regular", self.p(9.5)), "#64748B", anchor="ra")
            y += rh + self.p(10)

        self.tab_bar("leaderboard")
        return self.c

    # ============================================== SCREEN 1B — PROFILE ==
    def profile(self):
        """Profile modal, matching profile.tsx's gradient/cards and copy."""
        c, s = self.c, self.s
        W, H = self.p(self.W), self.p(self.H)
        c.overlay(linear_gradient((int(W), int(H)), ["#4BB8FA", "#3A8FDC", "#2C5EAD"],
                                  [0, 0.5, 1], (0.3, 0), (0.7, 1)))
        c.overlay(radial_glow((int(W * 1.5), int(W * 1.5)), (255, 255, 255, 55)),
                  -W * 0.28, -H * 0.12)
        self.status_bar()

        # Modal header
        top = self.p(self.TOP_INSET + 8)
        c.circle(self.p(39), top + self.p(19), self.p(19), fill=(255, 255, 255, 38),
                 outline=(255, 255, 255, 70), width=self.p(1))
        c.icon("x", self.p(20), (255, 255, 255, 225), cx=self.p(39), cy=top + self.p(19))
        c.text((W / 2, top + self.p(19)), "My Profile", font("bold", self.p(17)),
               "#FFFFFF", anchor="mm")

        # Avatar / identity block
        y = top + self.p(75)
        avatar_y = y + self.p(48)
        c.circle(W / 2, avatar_y, self.p(50), fill=(255, 255, 255, 47),
                 outline=(255, 255, 255, 170), width=self.p(3))
        c.circle(W / 2, avatar_y, self.p(43), fill="#2C6FBE")
        c.text((W / 2, avatar_y), "A", font("bold", self.p(36)), "#FFFFFF", anchor="mm")
        c.circle(W / 2 + self.p(35), avatar_y + self.p(35), self.p(14),
                 fill="#2C5EAD", outline="#FFFFFF", width=self.p(2))
        c.icon("camera", self.p(13), "#FFFFFF", cx=W / 2 + self.p(35), cy=avatar_y + self.p(35))
        c.text((W / 2, avatar_y + self.p(70)), "Alex", font("bold", self.p(21)),
               "#FFFFFF", anchor="ma")
        level_w = self.p(132)
        c.rect((W / 2 - level_w / 2, avatar_y + self.p(98),
                W / 2 + level_w / 2, avatar_y + self.p(126)), radius=self.p(14),
               fill=(255, 255, 255, 35), outline=(255, 255, 255, 65), width=self.p(1))
        c.text((W / 2, avatar_y + self.p(112)), "Lv.8 Trainer  ·  i",
               font("semibold", self.p(11)), (255, 255, 255, 220), anchor="mm")
        c.text((W / 2, avatar_y + self.p(148)), "alex@example.com",
               font("regular", self.p(11)), (255, 255, 255, 175), anchor="ma")

        # Three stats in the same order as profile.tsx.
        y = avatar_y + self.p(177)
        gap = self.p(10)
        sw = (W - self.p(40) - gap * 2) / 3
        for i, (ic, value, label, col) in enumerate([
            ("hash", "37", "Breeds", "#5AC8FA"),
            ("battery", "740", "XP", "#A7F3D0"),
            ("sun", "12", "Streak", "#FBBF24"),
        ]):
            x = self.p(20) + i * (sw + gap)
            c.rect((x, y, x + sw, y + self.p(88)), radius=self.p(16),
                   fill=(255, 255, 255, 35), outline=(255, 255, 255, 54), width=self.p(1))
            c.icon(ic, self.p(18), col, cx=x + sw / 2, cy=y + self.p(23))
            c.text((x + sw / 2, y + self.p(50)), value, font("bold", self.p(20)),
                   "#FFFFFF", anchor="mm")
            c.text((x + sw / 2, y + self.p(70)), label, font("medium", self.p(10)),
                   (255, 255, 255, 180), anchor="mm")

        # Editable profile cards, enough content to communicate the page
        # without running into the sign-out controls below the screenshot crop.
        y += self.p(106)
        for title, value, ic, accent in [
            ("Display Name", "Alex", "edit-2", "#5AC8FA"),
            ("Country", "USA  ·  United States", "edit-2", "#A7F3D0"),
            ("Username", "@alex", "user", "#FBBF24"),
        ]:
            box = (self.p(20), y, W - self.p(20), y + self.p(74))
            c.rect(box, radius=self.p(16), fill=(255, 255, 255, 35),
                   outline=(255, 255, 255, 54), width=self.p(1))
            c.text((box[0] + self.p(18), box[1] + self.p(23)), title,
                   font("semibold", self.p(13)), (255, 255, 255, 185))
            c.text((box[0] + self.p(18), box[1] + self.p(50)), value,
                   font("medium", self.p(15)), "#FFFFFF")
            c.icon(ic, self.p(16), accent, cx=box[2] - self.p(24), cy=box[1] + self.p(25))
            y += self.p(86)

        # Lower actions are visible but subordinate, matching the real screen.
        for label, ic, col in [("Sign Out", "log-out", "#FF8B8B"), ("Reset app data", "refresh-ccw", "#FF8B8B")]:
            box = (self.p(20), y, W - self.p(20), y + self.p(48))
            c.rect(box, radius=self.p(14), fill=(255, 255, 255, 18),
                   outline=(255, 107, 107, 105), width=self.p(1))
            c.icon(ic, self.p(17), col, cx=box[0] + self.p(27), cy=box[1] + self.p(24))
            c.text((box[0] + self.p(51), box[1] + self.p(24)), label,
                   font("semibold", self.p(13)), col, anchor="lm")
            y += self.p(60)
        return self.c

    # ===================================================== SCREEN 2 — DEX ==
    def dex(self):
        c = self.c
        W, H = self.p(self.W), self.p(self.H)
        c.rect((0, 0, W, H), fill="#F8FAFC")
        c.overlay(linear_gradient((int(W), int(self.p(360))), [(90, 200, 250, 46), (90, 200, 250, 0)]), 0, 0)
        self.status_bar(dark_text=True)

        x0 = self.p(16)
        y = self.p(self.TOP_INSET + 16)

        # Brand block
        c.text((x0, y), "Doggo Dex", font("serif-bold", self.p(28)), "#1E3A5F", tracking=self.p(-0.5))
        bw = Canvas.text_width("Doggo Dex", font("serif-bold", self.p(28)), self.p(-0.5))
        c.icon("maximize", self.p(18), "#2C5EAD", x=x0 + bw + self.p(8), y=y + self.p(12))
        c.text((x0, y + self.p(38)), "Collect every dog. Share every story.",
               font("regular", self.p(13)), "#64748B")

        sb = (W - self.p(16 + 34), y + self.p(2), W - self.p(16), y + self.p(36))
        c.rect(sb, radius=self.p(17), fill=(255, 255, 255, 210), outline=(0, 0, 0, 14), width=max(1, self.p(1)))
        c.icon("search", self.p(16), "#2C5EAD", cx=(sb[0] + sb[2]) / 2, cy=(sb[1] + sb[3]) / 2)

        # Progress
        y += self.p(70)
        trk = (x0, y, W - self.p(16) - self.p(66), y + self.p(8))
        c.rect(trk, radius=self.p(4), fill=(148, 178, 210, 80))
        c.gradient_rect((trk[0], trk[1], trk[0] + (trk[2] - trk[0]) * (COUNT / TOTAL), trk[3]),
                        ["#A3D5FF", "#5AC8FA"], start=(0, 0), end=(1, 0), radius=self.p(4))
        pill = (W - self.p(16) - self.p(58), y - self.p(6), W - self.p(16), y + self.p(14))
        c.rect(pill, radius=self.p(12), fill="#3B82F6")
        c.text(((pill[0] + pill[2]) / 2, (pill[1] + pill[3]) / 2), f"{COUNT} / {TOTAL}",
               font("bold", self.p(11)), "#FFFFFF", anchor="mm")

        # Rarity stats
        y += self.p(30)
        stats = [("Common", 18, 40, "common"), ("Uncommon", 11, 30, "uncommon"),
                 ("Rare", 6, 20, "rare"), ("Legendary", 2, 10, "legendary")]
        colw = (W - self.p(32)) / 4
        for i, (label, got, tot, key) in enumerate(stats):
            sx = x0 + colw * i
            c.circle(sx + self.p(4), y + self.p(12), self.p(4), fill=RARITY[key])
            c.text((sx + self.p(14), y + self.p(4)), label, font("medium", self.p(10.5)), "#64748B")
            c.text((sx + self.p(14), y + self.p(17)), f"{got}/{tot}", font("bold", self.p(12)), "#1E293B")

        y += self.p(40)
        c.rect((x0, y, W - self.p(16), y + max(1, self.p(1))), fill=(15, 23, 42, 20))

        # Filter bar
        y += self.p(14)
        px_ = x0
        for label, on in (("All", True), ("Collected", False), ("Uncollected", False)):
            tw = Canvas.text_width(label, font("semibold", self.p(12)))
            w = tw + self.p(24)
            c.rect((px_, y, px_ + w, y + self.p(30)), radius=self.p(15),
                   fill="#3B82F6" if on else (255, 255, 255, 150),
                   outline="#3B82F6" if on else (0, 0, 0, 16), width=max(1, self.p(1)))
            c.text((px_ + w / 2, y + self.p(15)), label, font("semibold", self.p(12)),
                   "#FFFFFF" if on else "#64748B", anchor="mm")
            px_ += w + self.p(6)

        # Card grid
        y += self.p(46)
        gap = self.p(12)
        cw = (W - self.p(32) - gap) / 2
        ch = self.p(196)
        for i, (name, rar, stem, collected, spotted) in enumerate(DEX):
            col, row = i % 2, i // 2
            cx0 = x0 + col * (cw + gap)
            cy0 = y + row * (ch + gap)
            if cy0 > H:
                break
            rc = RARITY[rar]
            c.shadow((cx0, cy0, cx0 + cw, cy0 + ch), radius=self.p(16), blur=self.p(6),
                     color=(15, 23, 42, 26), dy=self.p(2))
            c.rect((cx0, cy0, cx0 + cw, cy0 + ch), radius=self.p(16), fill="#FFFFFF",
                   outline=rgba(rc, 0.25) if collected else "#E2E8F0", width=max(1, self.p(1)))

            ip = self.p(8)
            ib = (cx0 + ip, cy0 + ip, cx0 + cw - ip, cy0 + ip + self.p(120))
            im = photo(stem)
            if collected:
                c.image(im, ib, radius=self.p(14), focus_y=0.4)
            else:
                g = cover(im.convert("RGBA"), ib[2] - ib[0], ib[3] - ib[1], 0.4)
                g = Image.blend(Image.new("RGBA", g.size, (255, 255, 255, 255)), g, 0.25)
                g = Image.alpha_composite(g, Image.new("RGBA", g.size, (180, 185, 195, 128)))
                g.putalpha(rounded_mask(g.size, self.p(14)))
                c.overlay(g, ib[0], ib[1])

            if collected:
                c.circle(ib[0] + self.p(19), ib[1] + self.p(19), self.p(11), fill=rc)
                c.icon("check", self.p(11), "#FFFFFF", cx=ib[0] + self.p(19), cy=ib[1] + self.p(19))
            hb = (ib[2] - self.p(34), ib[1] + self.p(8), ib[2] - self.p(8), ib[1] + self.p(34))
            c.circle((hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2, self.p(13), fill=(255, 255, 255, 217))
            c.icon("heart", self.p(15), "#EF4444" if collected else (150, 160, 175, 200),
                   cx=(hb[0] + hb[2]) / 2, cy=(hb[1] + hb[3]) / 2)

            tx = cx0 + self.p(12)
            ty = ib[3] + self.p(12)
            c.text((tx, ty), name if collected else "???", font("semibold", self.p(13)),
                   "#1E293B" if collected else "#94A3B8")
            c.circle(tx + self.p(3), ty + self.p(26), self.p(3), fill=rc)
            c.text((tx + self.p(11), ty + self.p(20)),
                   {"common": "Common", "uncommon": "Uncommon", "rare": "Rare", "legendary": "Legendary"}[rar],
                   font("medium", self.p(11)), rc)

            pt = (tx, cy0 + ch - self.p(16), cx0 + cw - self.p(34), cy0 + ch - self.p(12))
            c.rect(pt, radius=self.p(2), fill="#E2E8F0")
            if spotted:
                c.rect((pt[0], pt[1], pt[0] + (pt[2] - pt[0]) * min(spotted / 4, 1), pt[3]),
                       radius=self.p(2), fill=rc)
            c.text((cx0 + cw - self.p(12), pt[1] - self.p(4)), f"{spotted}/4",
                   font("semibold", self.p(9.5)), rc, anchor="ra")

        # Fade the grid out from the middle of the third row's photo, so the
        # scroll reads as continuing off-screen instead of leaving a row of
        # half-visible labels sitting under the tab bar.
        ft = y + 2 * (ch + gap) + self.p(8) + self.p(64)
        fade_h = int(max(H - ft, self.p(120)))
        c.overlay(linear_gradient((int(W), fade_h),
                                  [(248, 250, 252, 0), (248, 250, 252, 255), (248, 250, 252, 255)],
                                  [0, 0.42, 1.0]),
                  0, H - fade_h)
        self.tab_bar("collection")
        return self.c

    # ================================================= SCREEN 3 — JOURNAL ==
    def journal(self):
        c = self.c
        W, H = self.p(self.W), self.p(self.H)
        c.overlay(linear_gradient((int(W), int(H)), SKY, [0, 0.5, 1], (0.3, 0), (0.7, 1)))
        c.overlay(radial_glow((int(W * 1.3), int(W * 1.3)), (255, 255, 255, 60)), -W * 0.15, -W * 0.35)
        self.status_bar()

        x0 = self.p(20)
        y = self.p(self.TOP_INSET + 16)
        c.text((x0, y), "Field Journal", font("serif-bold", self.p(32)), "#FFFFFF")
        c.text((x0, y + self.p(44)), "Your Doggo Dex adventure log",
               font("regular", self.p(13.5)), (255, 255, 255, 184))
        sb_c = (W - self.p(20 + 19), y + self.p(22))
        c.circle(sb_c[0], sb_c[1], self.p(19), fill=(255, 255, 255, 38))
        c.icon("settings", self.p(20), (255, 255, 255, 217), cx=sb_c[0], cy=sb_c[1])

        # ---- XP card
        y += self.p(80)
        card = (x0, y, W - x0, y + self.p(150))
        c.rect(card, radius=self.p(20), fill=CARD_BG, outline=CARD_BORDER, width=max(1, self.p(1)))
        tx, ty = x0 + self.p(18), y + self.p(18)
        c.text((tx, ty), "EXPERT", font("semibold", self.p(12)), "#5AC8FA", tracking=self.p(1))
        c.text((tx, ty + self.p(18)), str(XP), font("serif-bold", self.p(32)), "#FFFFFF")
        wnum = Canvas.text_width(str(XP), font("serif-bold", self.p(32)))
        c.text((tx + wnum + self.p(6), ty + self.p(48)), "XP total", font("regular", self.p(14)),
               (255, 255, 255, 153), anchor="ls")

        sw, sh = self.p(78), self.p(72)
        sx0, sy0 = W - x0 - self.p(18) - sw, ty
        c.rect((sx0, sy0, sx0 + sw, sy0 + sh), radius=self.p(14), fill=(255, 255, 255, 20),
               outline=(251, 146, 60, 128), width=max(1, self.p(1)))
        c.icon("sun", self.p(18), "#FB923C", cx=sx0 + sw / 2, cy=sy0 + self.p(17))
        c.text((sx0 + sw / 2, sy0 + self.p(40)), str(STREAK), font("bold", self.p(22)), "#FB923C", anchor="mm")
        c.text((sx0 + sw / 2, sy0 + self.p(59)), "day streak", font("regular", self.p(10)),
               (255, 255, 255, 140), anchor="mm")

        trk_y = y + self.p(108)
        trk = (tx, trk_y, W - x0 - self.p(18), trk_y + self.p(7))
        c.rect(trk, radius=self.p(4), fill=(255, 255, 255, 51))
        c.gradient_rect((trk[0], trk[1], trk[0] + (trk[2] - trk[0]) * 0.35, trk[3]),
                        ["#5AC8FA", "#007AFF"], start=(0, 0), end=(1, 0), radius=self.p(4))
        c.text((tx, trk_y + self.p(16)), "260 XP to Master", font("regular", self.p(12)), (255, 255, 255, 153))

        # ---- Stats row
        y += self.p(162)
        gap = self.p(10)
        sw2 = (W - x0 * 2 - gap * 2) / 3
        for i, (ic, val, label) in enumerate([("hash", str(COUNT), "Breeds found"),
                                              ("award", "3", "Badges earned"),
                                              ("map-pin", "Yes!", "Legendary found")]):
            sx = x0 + i * (sw2 + gap)
            c.rect((sx, y, sx + sw2, y + self.p(96)), radius=self.p(14), fill=CARD_BG,
                   outline=CARD_BORDER, width=max(1, self.p(1)))
            c.icon(ic, self.p(22), (255, 255, 255, 217), cx=sx + sw2 / 2, cy=y + self.p(26))
            c.text((sx + sw2 / 2, y + self.p(56)), val, font("serif-bold", self.p(20)), "#FFFFFF", anchor="mm")
            c.text((sx + sw2 / 2, y + self.p(78)), label, font("regular", self.p(11)),
                   (255, 255, 255, 165), anchor="mm")

        # ---- Rarity breakdown
        y += self.p(108)
        rows = [("Legendary", 2, "legendary"), ("Rare", 6, "rare"),
                ("Uncommon", 11, "uncommon"), ("Common", 18, "common")]
        card_h = self.p(36) + len(rows) * self.p(30)
        c.rect((x0, y, W - x0, y + card_h), radius=self.p(20), fill=CARD_BG,
               outline=CARD_BORDER, width=max(1, self.p(1)))
        c.text((x0 + self.p(18), y + self.p(16)), "RARITY BREAKDOWN", font("semibold", self.p(11)),
               (255, 255, 255, 165), tracking=self.p(1.5))
        for i, (label, n, key) in enumerate(rows):
            ry = y + self.p(44) + i * self.p(30)
            c.circle(x0 + self.p(23), ry + self.p(8), self.p(5), fill=RARITY[key])
            c.text((x0 + self.p(38), ry), label, font("medium", self.p(14)), "#FFFFFF")
            c.text((W - x0 - self.p(18), ry), str(n), font("bold", self.p(16)), RARITY[key], anchor="ra")

        # ---- Badges
        y += card_h + self.p(20)
        c.text((x0, y), "BADGES", font("semibold", self.p(11)), (255, 255, 255, 165), tracking=self.p(1.5))
        c.text((x0, y + self.p(18)), "Earn a badge every 10 breeds", font("regular", self.p(13)),
               (255, 255, 255, 153))
        y += self.p(44)
        badges = [("b10", "Puppy Scout", "Collected 10 breeds", 10, True),
                  ("b20", "Hound Tracker", "Collected 20 breeds", 20, True),
                  ("b30", "Pack Leader", "Collected 30 breeds", 30, True),
                  ("b40", "Trail Whisperer", "Collected 40 breeds", 40, False)]
        for bid, name, desc, req, unlocked in badges:
            bh = self.p(78)
            if y > H - self.p(60):
                break
            c.rect((x0, y, W - x0, y + bh), radius=self.p(18), fill=CARD_BG,
                   outline=CARD_BORDER, width=max(1, self.p(1)))
            ic_s = self.p(52)
            ix, iy = x0 + self.p(14), y + (bh - ic_s) / 2
            g0, g1 = TIER_GRADIENTS[bid]
            c.gradient_rect((ix, iy, ix + ic_s, iy + ic_s), [g0, g1], start=(0, 0), end=(1, 1),
                            radius=self.p(16))
            if not unlocked:
                c.rect((ix, iy, ix + ic_s, iy + ic_s), radius=self.p(16), fill=(20, 40, 70, 150))
            c.icon(TIER_ICON[bid], self.p(24), "#FFFFFF" if unlocked else (255, 255, 255, 130),
                   cx=ix + ic_s / 2, cy=iy + ic_s / 2)

            tx2 = ix + ic_s + self.p(14)
            c.text((tx2, y + self.p(18)), name, font("semibold", self.p(15)),
                   "#FFFFFF" if unlocked else (255, 255, 255, 165))
            c.text((tx2, y + self.p(40)), desc, font("regular", self.p(12)), (255, 255, 255, 150))
            if unlocked:
                pw = self.p(76)
                px0 = W - x0 - self.p(14) - pw
                c.rect((px0, y + self.p(26), px0 + pw, y + self.p(52)), radius=self.p(13),
                       fill=(52, 211, 153, 46), outline=(52, 211, 153, 140), width=max(1, self.p(1)))
                c.icon("check", self.p(13), "#34D399", cx=px0 + self.p(20), cy=y + self.p(39))
                c.text((px0 + self.p(32), y + self.p(39)), "Earned", font("semibold", self.p(11.5)),
                       "#34D399", anchor="lm")
            else:
                ptw = self.p(90)
                px0 = W - x0 - self.p(14) - ptw
                c.text((px0 + ptw, y + self.p(24)), f"{COUNT}/{req}", font("bold", self.p(12)),
                       (255, 255, 255, 190), anchor="ra")
                pt = (px0, y + self.p(46), px0 + ptw, y + self.p(52))
                c.rect(pt, radius=self.p(3), fill=(255, 255, 255, 51))
                c.rect((pt[0], pt[1], pt[0] + ptw * (COUNT / req), pt[3]), radius=self.p(3), fill="#FBBF24")
            y += bh + self.p(10)

        fade_h = int(self.p(140))
        c.overlay(linear_gradient((int(W), fade_h), [(44, 94, 173, 0), (43, 91, 168, 235)]), 0, H - fade_h)
        self.tab_bar("medals")
        return self.c
