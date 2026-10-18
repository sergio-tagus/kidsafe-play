#!/usr/bin/env python3
"""Generate all app icon / splash / favicon sizes from the master logo.

The master (`src/assets/brand/logo-mark-source.png`) has a white background.
We remove it with an edge flood-fill (numpy + scipy) so the enclosed white
body of the unicorn is preserved while the outer white becomes transparent.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src/assets/brand/logo-mark-source.png"
PUB_ICONS = ROOT / "public/icons"
PUB_SPLASH = ROOT / "public/splash"
PUB = ROOT / "public"
STORE = ROOT / "src/assets/store"
for p in (PUB_ICONS, PUB_SPLASH, STORE): p.mkdir(parents=True, exist_ok=True)

BG = (255, 247, 237)   # warm cream, matches app
ACCENT = (255, 107, 157)
PLUM = (60, 30, 80)

def load_master():
    """Master logo with the outer white background made transparent."""
    im = Image.open(SRC).convert("RGBA")
    arr = np.array(im)
    rgb = arr[..., :3].astype(int)
    # near-white pixels
    white = (rgb > 240).all(axis=-1)
    # connected components of white; drop the ones touching the border
    labels, n = ndimage.label(white)
    border_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border_labels.discard(0)
    bg_mask = np.isin(labels, list(border_labels))
    arr[..., 3] = np.where(bg_mask, 0, 255)
    im = Image.fromarray(arr)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    return im

def fit(mark, size, padding_ratio=0.10, bg=None):
    """Return a square RGBA image `size`x`size` with mark centered and padded."""
    canvas = Image.new("RGBA", (size, size), bg if bg else (0,0,0,0))
    inner = int(size * (1 - 2*padding_ratio))
    m = mark.copy()
    m.thumbnail((inner, inner), Image.LANCZOS)
    x = (size - m.width)//2
    y = (size - m.height)//2
    canvas.paste(m, (x, y), m)
    return canvas

def bg_solid(size, color):
    return Image.new("RGBA", (size, size), color + (255,))

def composite_on_bg(mark_square, bg_color):
    bg = bg_solid(mark_square.width, bg_color)
    bg.paste(mark_square, (0,0), mark_square)
    return bg.convert("RGB")

def font(size, bold=True):
    try:
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)
    except Exception:
        return ImageFont.load_default()

mark = load_master()
print(f"master (transparent): {mark.size}")

# ---- Favicon ----
for s in (16, 32, 48, 64):
    fit(mark, s, 0.05).save(PUB / f"favicon-{s}.png")
# multi-size .ico
sizes = [(16,16),(32,32),(48,48),(64,64)]
fit(mark, 64, 0.05).save(PUB / "favicon.ico", sizes=sizes)

# ---- Apple touch (iOS home screen web) - no transparency ----
apple = fit(mark, 180, 0.10)
composite_on_bg(apple, BG).save(PUB / "apple-touch-icon.png")

# ---- PWA icons ----
for s in (192, 512):
    icon = fit(mark, s, 0.10)
    composite_on_bg(icon, BG).save(PUB_ICONS / f"icon-{s}.png")
# Maskable: 40% safe zone (mark occupies ~60% of canvas), solid bg
for s in (192, 512):
    icon = fit(mark, s, 0.20)
    composite_on_bg(icon, BG).save(PUB_ICONS / f"maskable-{s}.png")

# ---- iOS AppIcon.appiconset (Capacitor) ----
IOS = ROOT / "ios-assets/AppIcon.appiconset"
IOS.mkdir(parents=True, exist_ok=True)
ios_sizes = [
    ("20", 20, [1,2,3]),
    ("29", 29, [1,2,3]),
    ("40", 40, [1,2,3]),
    ("60", 60, [2,3]),
    ("76", 76, [1,2]),
    ("83.5", 83.5, [2]),
    ("1024", 1024, [1]),
]
contents_images = []
for base_name, base, scales in ios_sizes:
    for s in scales:
        px = int(base * s)
        fn = f"AppIcon-{base_name}@{s}x.png"
        icon = fit(mark, px, 0.10)
        composite_on_bg(icon, BG).save(IOS / fn)
        contents_images.append({"size": f"{base_name}x{base_name}", "idiom":"universal","filename":fn,"scale":f"{s}x"})

(IOS / "Contents.json").write_text(json.dumps({"images": contents_images, "info":{"version":1,"author":"xcode"}}, indent=2))

# ---- Android launcher (mipmap-*) ----
AND = ROOT / "android-assets"
densities = {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}
for d, px in densities.items():
    dp = AND / f"mipmap-{d}"; dp.mkdir(parents=True, exist_ok=True)
    icon = fit(mark, px, 0.10)
    composite_on_bg(icon, BG).save(dp / "ic_launcher.png")
    # round: same square, will be masked by system
    composite_on_bg(icon, BG).save(dp / "ic_launcher_round.png")
    # foreground for adaptive (transparent, unicorn inside the central 66%,
    # i.e. 17% padding on the 108dp layer) — no white box, no background
    fg = fit(mark, px*2, 0.17)
    fg.save(dp / "ic_launcher_foreground.png")

# background XML (solid color)
mm_any = AND / "mipmap-anydpi-v26"; mm_any.mkdir(parents=True, exist_ok=True)
(mm_any / "ic_launcher.xml").write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
''')
(mm_any / "ic_launcher_round.xml").write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
''')
val = AND / "values"; val.mkdir(parents=True, exist_ok=True)
(val / "ic_launcher_background.xml").write_text(f'''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#{BG[0]:02X}{BG[1]:02X}{BG[2]:02X}</color>
</resources>
''')

# ---- TV banner design (mark left + big "SafeTube Kids" wordmark) ----
def tv_banner(w, h, path):
    """TV / feature banner. Text height is at least h/6 for legibility."""
    im = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(im)
    mark_side = int(h * 0.78)
    mk = mark.copy(); mk.thumbnail((mark_side, mark_side), Image.LANCZOS)
    mk_x = int(w * 0.06)
    im.paste(mk, (mk_x, (h - mk.height)//2), mk)
    text_x = mk_x + mk.width + int(w * 0.03)
    line_h = int(h / 4.2)  # two lines, each comfortably above h/6
    f_big = font(line_h)
    f_sub = font(int(h / 11), bold=False)
    draw.text((text_x, int(h * 0.12)), "SafeTube", font=f_big, fill=PLUM)
    draw.text((text_x, int(h * 0.12) + line_h + int(h*0.02)), "Kids", font=f_big, fill=ACCENT)
    im.save(path)
    return im

tv = AND / "drawable-xhdpi"; tv.mkdir(parents=True, exist_ok=True)
tv_banner(320, 180, tv / "banner.png")
# Store TV banner 1280x720, same design
tv_banner(1280, 720, STORE / "tv-banner-1280x720.png")

# ---- Splash screens (logo centered on cream, matching Capacitor's
#      default dimensions exactly) ----
def splash(w, h, mark_ratio=0.30):
    im = Image.new("RGB", (w, h), BG)
    side = int(min(w,h) * mark_ratio)
    mk = mark.copy(); mk.thumbnail((side, side), Image.LANCZOS)
    im.paste(mk, ((w-mk.width)//2, (h-mk.height)//2), mk)
    return im

SPLASH_SIZES = {
    "drawable":        [(480, 320)],
    "drawable-port":   {"mdpi": (320, 480), "hdpi": (480, 800), "xhdpi": (720, 1280), "xxhdpi": (960, 1600), "xxxhdpi": (1280, 1920)},
    "drawable-land":   {"mdpi": (480, 320), "hdpi": (800, 480), "xhdpi": (1280, 720), "xxhdpi": (1600, 960), "xxxhdpi": (1920, 1280)},
}
for folder, spec in SPLASH_SIZES.items():
    if isinstance(spec, list):
        dp = AND / folder; dp.mkdir(parents=True, exist_ok=True)
        for (w, h) in spec:
            splash(w, h).save(dp / "splash.png")
    else:
        for d, (w, h) in spec.items():
            dp = AND / f"{folder}-{d}"; dp.mkdir(parents=True, exist_ok=True)
            splash(w, h).save(dp / "splash.png")

# legacy per-density portrait splashes (kept in sync with previous files)
for d, px in densities.items():
    dp = AND / f"drawable-{d}"; dp.mkdir(parents=True, exist_ok=True)
    splash(px*4, px*4*16//9).save(dp / "splash.png")

# universal iOS splash
splash(2732, 2732).save(PUB_SPLASH / "splash-2732x2732.png")
splash(1242, 2688).save(PUB_SPLASH / "splash-iphone-portrait.png")
splash(2688, 1242).save(PUB_SPLASH / "splash-iphone-landscape.png")

# ---- Store: play feature graphic 1024x500 (same TV banner design) ----
tv_banner(1024, 500, STORE / "play-feature-graphic-1024x500.png")

# Play store icon 512x512
icon = fit(mark, 512, 0.08)
composite_on_bg(icon, BG).save(STORE / "play-icon-512.png")
# App Store icon 1024x1024, no alpha
icon = fit(mark, 1024, 0.08)
composite_on_bg(icon, BG).save(STORE / "appstore-icon-1024.png")

# og:image 1200x630
og = Image.new("RGB", (1200, 630), BG)
mk = mark.copy(); mk.thumbnail((360, 360), Image.LANCZOS)
og.paste(mk, (140, (630-mk.height)//2), mk)
draw = ImageDraw.Draw(og)
f_big = font(80); f_med = font(32, bold=False)
draw.text((560, 210), "SafeTube Kids", font=f_big, fill=PLUM)
draw.text((560, 320), "A safer video world", font=f_med, fill=(90,70,110))
draw.text((560, 360), "for children", font=f_med, fill=(90,70,110))
og.save(STORE / "og-image-1200x630.png")
og.save(PUB / "og-image.png")

# Instagram square 1080x1080
sq = Image.new("RGB", (1080, 1080), BG)
mk = mark.copy(); mk.thumbnail((560, 560), Image.LANCZOS)
sq.paste(mk, ((1080-mk.width)//2, 160), mk)
draw = ImageDraw.Draw(sq)
draw.text((280, 780), "SafeTube Kids", font=f_big, fill=PLUM)
draw.text((330, 890), "Safe videos for kids", font=f_med, fill=(90,70,110))
sq.save(STORE / "social-square-1080.png")

print("done")
