from __future__ import annotations

import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "site" / "assets" / "video" / "learn"
OUT_PATH = OUT_DIR / "licensing-ethics-responsible-sharing.mp4"

WIDTH = 1280
HEIGHT = 720
FPS = 24

NAVY = (21, 33, 49)
INK = (32, 42, 58)
MUTED = (95, 110, 128)
PAPER = (250, 252, 253)
LINE = (219, 225, 232)
BLUE = (42, 113, 191)
TEAL = (23, 150, 139)
GREEN = (67, 143, 87)
GOLD = (218, 165, 32)
RED = (203, 86, 72)
LAVENDER = (128, 101, 178)


SCENES = [
    {
        "start": 0,
        "end": 7,
        "kicker": "OpenConstruction Academy",
        "title": "Licensing, Ethics & Responsible Sharing",
        "caption": "Open construction data creates value when sharing starts before upload.",
        "mode": "intro",
    },
    {
        "start": 7,
        "end": 17,
        "kicker": "Checkpoint 1",
        "title": "Clarify Ownership and License",
        "caption": "Confirm who owns the data and what the license allows others to do.",
        "mode": "license",
    },
    {
        "start": 17,
        "end": 29,
        "kicker": "Checkpoint 2",
        "title": "Review Privacy and Safety Risks",
        "caption": "Look for faces, license plates, site locations, sensitive infrastructure, and contract limits.",
        "mode": "privacy",
    },
    {
        "start": 29,
        "end": 42,
        "kicker": "Checkpoint 3",
        "title": "Document Context and Consent",
        "caption": "Record collection context, consent, limitations, labels, and known quality issues.",
        "mode": "document",
    },
    {
        "start": 42,
        "end": 54,
        "kicker": "Checkpoint 4",
        "title": "Publish With Reuse Conditions",
        "caption": "Add metadata, access terms, citation guidance, and a stable repository or DOI.",
        "mode": "publish",
    },
    {
        "start": 54,
        "end": 66,
        "kicker": "Ready to Share",
        "title": "Reusable, Trustworthy, AI-Ready",
        "caption": "Responsible sharing makes construction datasets easier to evaluate, cite, and reuse.",
        "mode": "final",
    },
]


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


FONT = {
    "kicker": load_font(25, True),
    "title": load_font(58, True),
    "h2": load_font(38, True),
    "body": load_font(28),
    "small": load_font(22),
    "tiny": load_font(18, True),
}


def rounded(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], r: int, fill, outline=None, width=1):
    draw.rounded_rectangle(tuple(round(v) for v in box), radius=r, fill=fill, outline=outline, width=width)


def text(draw: ImageDraw.ImageDraw, xy: tuple[float, float], value: str, font, fill=INK, anchor=None):
    draw.text((round(xy[0]), round(xy[1])), value, font=font, fill=fill, anchor=anchor)


def wrap(draw: ImageDraw.ImageDraw, value: str, font, max_width: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, font, fill, max_width: int, gap: int = 10):
    y = xy[1]
    for line in wrap(draw, value, font, max_width):
        text(draw, (xy[0], y), line, font, fill)
        y += font.size + gap


def draw_background(draw: ImageDraw.ImageDraw, t: float):
    for y in range(HEIGHT):
        p = y / HEIGHT
        color = mix((244, 248, 251), (232, 239, 242), p)
        draw.line((0, y, WIDTH, y), fill=color)
    grid_shift = int((t * 18) % 40)
    for x in range(-40 + grid_shift, WIDTH, 40):
        draw.line((x, 0, x + 280, HEIGHT), fill=(228, 234, 239), width=1)
    for y in range(30, HEIGHT, 84):
        draw.line((0, y, WIDTH, y), fill=(238, 242, 246), width=1)


def draw_header(draw: ImageDraw.ImageDraw, scene, progress: float):
    alpha_y = -18 + 18 * ease(progress)
    text(draw, (72, 54 + alpha_y), scene["kicker"].upper(), FONT["kicker"], fill=BLUE)
    title_lines = wrap(draw, scene["title"], FONT["title"], 650)
    y = 92 + alpha_y
    for line in title_lines:
        text(draw, (72, y), line, FONT["title"], fill=NAVY)
        y += 64
    draw_wrapped(draw, (74, y + 12), scene["caption"], FONT["body"], MUTED, 650, 8)


def draw_progress(draw: ImageDraw.ImageDraw, seconds: float):
    rounded(draw, (72, 660, 1208, 672), 6, (224, 231, 236))
    w = (seconds / SCENES[-1]["end"]) * 1136
    rounded(draw, (72, 660, 72 + w, 672), 6, TEAL)
    labels = ["License", "Privacy", "Context", "Publish"]
    for i, label in enumerate(labels):
        x = 343 + i * 202
        draw.ellipse((x - 13, 653, x + 13, 679), fill=PAPER, outline=TEAL, width=3)
        text(draw, (x, 694), label, FONT["tiny"], fill=MUTED, anchor="mm")


def draw_dataset(draw: ImageDraw.ImageDraw, x: float, y: float, scale: float = 1.0, label: str = "Dataset"):
    w, h = 200 * scale, 148 * scale
    rounded(draw, (x, y + 22 * scale, x + w, y + h), round(12 * scale), (255, 255, 255), LINE, 2)
    draw.polygon(
        [
            (x + 28 * scale, y + 22 * scale),
            (x + 84 * scale, y + 22 * scale),
            (x + 102 * scale, y + 46 * scale),
            (x + 28 * scale, y + 46 * scale),
        ],
        fill=(232, 240, 248),
        outline=LINE,
    )
    text(draw, (x + 24 * scale, y + 72 * scale), label, FONT["small"], fill=NAVY)
    for i, color in enumerate([BLUE, TEAL, GOLD]):
        rounded(draw, (x + 24 * scale, y + (104 + i * 20) * scale, x + (144 + i * 14) * scale, y + (114 + i * 20) * scale), 4, color)


def draw_checkpoint(draw: ImageDraw.ImageDraw, x: float, y: float, label: str, color, active: float):
    lift = 12 * ease(active)
    fill = mix((255, 255, 255), (244, 251, 249), active)
    rounded(draw, (x, y - lift, x + 184, y + 128 - lift), 14, fill, color if active > 0.15 else LINE, 3 if active > 0.15 else 2)
    draw.ellipse((x + 20, y + 20 - lift, x + 58, y + 58 - lift), fill=color)
    text(draw, (x + 39, y + 39 - lift), "✓" if active > 0.65 else "•", FONT["small"], fill=(255, 255, 255), anchor="mm")
    draw_wrapped(draw, (round(x + 20), round(y + 74 - lift)), label, FONT["small"], NAVY, 142, 4)


def draw_intro(draw: ImageDraw.ImageDraw, seconds: float, progress: float):
    x = 815 + math.sin(seconds * 1.7) * 8
    draw_dataset(draw, x, 220, 1.28, "Site data")
    for i, (label, color) in enumerate([("License", BLUE), ("Privacy", RED), ("Repository", TEAL), ("Reuse", GREEN)]):
        draw_checkpoint(draw, 696 + i * 132, 430, label, color, min(1, max(0, progress * 4 - i)))


def draw_license(draw: ImageDraw.ImageDraw, progress: float):
    draw_dataset(draw, 792, 132, 1.1, "Survey files")
    rounded(draw, (760, 392, 1108, 536), 16, (255, 255, 255), BLUE, 3)
    text(draw, (790, 426), "License card", FONT["h2"], fill=NAVY)
    for i, item in enumerate(["Owner", "Terms", "Attribution"]):
        y = 476 + i * 34
        draw.ellipse((790, y - 10, 810, y + 10), fill=BLUE if progress > 0.22 * i else LINE)
        text(draw, (826, y - 16), item, FONT["small"], fill=INK)
    stamp = ease(max(0, min(1, (progress - 0.55) / 0.35)))
    if stamp > 0:
        rounded(draw, (938 - 24 * (1 - stamp), 292, 1138 + 24 * (1 - stamp), 352), 12, mix((255, 255, 255), (232, 248, 240), stamp), GREEN, 3)
        text(draw, (1038, 321), "CLEAR TO USE", FONT["small"], fill=GREEN, anchor="mm")


def draw_privacy(draw: ImageDraw.ImageDraw, progress: float):
    rounded(draw, (744, 126, 1136, 474), 18, (255, 255, 255), LINE, 2)
    text(draw, (782, 164), "Site image review", FONT["h2"], fill=NAVY)
    # Stylized site frame.
    rounded(draw, (782, 220, 1098, 424), 10, (231, 238, 241), None)
    draw.rectangle((782, 344, 1098, 424), fill=(198, 208, 211))
    for i in range(5):
        x = 810 + i * 56
        draw.rectangle((x, 288 - i * 7, x + 40, 344), fill=(144, 160, 166))
    draw.polygon([(960, 344), (1080, 250), (1098, 266), (1008, 344)], fill=(177, 189, 194))
    risks = [
        (842, 280, "Face"),
        (1040, 354, "Plate"),
        (1008, 240, "Site"),
    ]
    for i, (x, y, label) in enumerate(risks):
        a = ease(max(0, min(1, progress * 3.2 - i * 0.62)))
        if a > 0:
            draw.ellipse((x - 34, y - 34, x + 34, y + 34), outline=mix((255, 255, 255), RED, a), width=5)
            text(draw, (x, y + 54), label, FONT["tiny"], fill=RED, anchor="mm")
    rounded(draw, (832, 506, 1054, 566), 12, mix((255, 255, 255), (255, 244, 242), ease(progress)), RED, 2)
    text(draw, (943, 536), "Review before release", FONT["small"], fill=RED, anchor="mm")


def draw_document(draw: ImageDraw.ImageDraw, progress: float):
    rounded(draw, (766, 118, 1118, 542), 18, (255, 255, 255), LINE, 2)
    text(draw, (806, 164), "Dataset card", FONT["h2"], fill=NAVY)
    rows = [
        ("Collection context", TEAL),
        ("Consent notes", LAVENDER),
        ("Known limits", GOLD),
        ("Label guidance", BLUE),
        ("Contact / citation", GREEN),
    ]
    for i, (label, color) in enumerate(rows):
        y = 226 + i * 58
        a = ease(max(0, min(1, progress * 2.4 - i * 0.24)))
        rounded(draw, (810, y, 1076, y + 34), 8, mix((244, 247, 249), (232, 247, 244), a), None)
        rounded(draw, (810, y, 810 + 48 + 190 * a, y + 34), 8, color)
        text(draw, (826, y + 7), label, FONT["tiny"], fill=(255, 255, 255) if a > 0.55 else NAVY)
    if progress > 0.78:
        draw.ellipse((1014, 458, 1094, 538), fill=GREEN)
        text(draw, (1054, 498), "✓", FONT["h2"], fill=(255, 255, 255), anchor="mm")


def draw_publish(draw: ImageDraw.ImageDraw, progress: float):
    draw_dataset(draw, 728, 166, 0.94, "Metadata")
    draw_dataset(draw, 966, 166, 0.94, "Files")
    rounded(draw, (782, 430, 1118, 528), 16, (255, 255, 255), TEAL, 3)
    text(draw, (950, 466), "Repository + DOI", FONT["h2"], fill=NAVY, anchor="mm")
    doi = "10.0000/openconstruction.demo"
    visible = doi[: max(0, min(len(doi), int(len(doi) * ease(progress))))]
    text(draw, (950, 508), visible, FONT["small"], fill=TEAL, anchor="mm")
    arrow_p = ease(progress)
    draw.line((840, 350, 1000 + 90 * arrow_p, 350), fill=BLUE, width=8)
    draw.polygon([(1090, 350), (1060, 332), (1060, 368)], fill=BLUE)


def draw_final(draw: ImageDraw.ImageDraw, progress: float):
    center = (948, 330)
    radius = 112 + 10 * math.sin(progress * math.pi)
    draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), fill=(232, 248, 240), outline=GREEN, width=4)
    text(draw, center, "FAIR", FONT["title"], fill=GREEN, anchor="mm")
    labels = [("Licensed", BLUE), ("Reviewed", RED), ("Documented", GOLD), ("Citable", TEAL)]
    for i, (label, color) in enumerate(labels):
        angle = progress * 1.6 + i * math.pi / 2
        x = center[0] + math.cos(angle) * 210
        y = center[1] + math.sin(angle) * 150
        rounded(draw, (x - 72, y - 24, x + 72, y + 24), 12, (255, 255, 255), color, 2)
        text(draw, (x, y), label, FONT["tiny"], fill=color, anchor="mm")


def draw_scene(draw: ImageDraw.ImageDraw, scene, seconds: float):
    duration = scene["end"] - scene["start"]
    progress = (seconds - scene["start"]) / duration
    draw_header(draw, scene, progress)
    mode = scene["mode"]
    if mode == "intro":
        draw_intro(draw, seconds, progress)
    elif mode == "license":
        draw_license(draw, progress)
    elif mode == "privacy":
        draw_privacy(draw, progress)
    elif mode == "document":
        draw_document(draw, progress)
    elif mode == "publish":
        draw_publish(draw, progress)
    elif mode == "final":
        draw_final(draw, progress)


def draw_brand(draw: ImageDraw.ImageDraw):
    rounded(draw, (72, 602, 382, 632), 15, (255, 255, 255), LINE, 1)
    draw.ellipse((88, 607, 112, 631), fill=BLUE)
    text(draw, (124, 606), "OpenConstruction Academy", FONT["tiny"], fill=NAVY)


def render_frame(seconds: float) -> np.ndarray:
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw_background(draw, seconds)
    scene = next(s for s in SCENES if s["start"] <= seconds < s["end"])
    draw_scene(draw, scene, seconds)
    draw_brand(draw)
    draw_progress(draw, seconds)
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(OUT_PATH), fourcc, FPS, (WIDTH, HEIGHT))
    if not writer.isOpened():
        raise RuntimeError(f"Could not open video writer for {OUT_PATH}")
    total_frames = SCENES[-1]["end"] * FPS
    for frame in range(total_frames):
        writer.write(render_frame(frame / FPS))
    writer.release()
    print(OUT_PATH)


if __name__ == "__main__":
    main()
