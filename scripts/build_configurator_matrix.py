from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "visual-check" / "matrix"
OUTPUT = SOURCE / "configurator-matrix.png"
COLORS = (("green", "GREEN"), ("purple", "PURPLE"))
COUNTS = (3, 4, 5, 6, 7)
CROP = (850, 150, 1120, 690)
CELL_SIZE = (216, 432)


def main() -> None:
    sheet = Image.new("RGB", (CELL_SIZE[0] * len(COUNTS), CELL_SIZE[1] * len(COLORS)), "#050707")
    draw = ImageDraw.Draw(sheet)

    for row, (slug, label) in enumerate(COLORS):
        for column, count in enumerate(COUNTS):
            source = Image.open(SOURCE / f"{slug}-{count}.png").convert("RGB")
            panel = source.crop(CROP).resize((CELL_SIZE[0], CELL_SIZE[1]))
            x = column * CELL_SIZE[0]
            y = row * CELL_SIZE[1]
            sheet.paste(panel, (x, y))
            draw.rectangle((x, y, x + CELL_SIZE[0] - 1, y + CELL_SIZE[1] - 1), outline="#384042")
            draw.text((x + 10, y + 10), f"{label} · {count}", fill="#D7D9D9")

    sheet.save(OUTPUT, optimize=True)


if __name__ == "__main__":
    main()
