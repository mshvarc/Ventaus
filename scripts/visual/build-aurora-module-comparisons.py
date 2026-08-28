from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[2]
VISUAL_DIR = ROOT / "docs" / "visual-diff"
REFERENCE_DIR = ROOT / "references" / "modules"

DESKTOP_CAPTURE = VISUAL_DIR / "aurora-modules-desktop-1440.png"
CONTROLS_VERTICAL_CROP = (1636, 2738)
TECHNICAL_VERTICAL_CROP = (2737, 4102)


def normalize_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def labeled_stack(reference: Image.Image, actual: Image.Image, output: Path) -> None:
    content_width = 1200
    reference = normalize_width(reference.convert("RGB"), content_width)
    actual = normalize_width(actual.convert("RGB"), content_width)
    label_height = 44
    gap = 24
    canvas = Image.new(
        "RGB",
        (content_width, label_height * 2 + reference.height + actual.height + gap),
        "#101312",
    )
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=18)
    draw.text((16, 13), "SOURCE REFERENCE", fill="#8FD8B9", font=font)
    source_top = label_height
    canvas.paste(reference, (0, source_top))
    actual_label_top = source_top + reference.height + gap
    draw.text((16, actual_label_top + 13), "AURORA IMPLEMENTATION", fill="#8FD8B9", font=font)
    canvas.paste(actual, (0, actual_label_top + label_height))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)


def main() -> None:
    desktop = Image.open(DESKTOP_CAPTURE)
    controls = desktop.crop((0, CONTROLS_VERTICAL_CROP[0], desktop.width, CONTROLS_VERTICAL_CROP[1]))
    technical = desktop.crop((0, TECHNICAL_VERTICAL_CROP[0], desktop.width, TECHNICAL_VERTICAL_CROP[1]))
    controls.save(VISUAL_DIR / "aurora-controls-actual-1440.png", optimize=True)
    technical.save(VISUAL_DIR / "aurora-technical-actual-1440.png", optimize=True)

    labeled_stack(
        Image.open(REFERENCE_DIR / "reference-controls-configurator.png"),
        controls,
        VISUAL_DIR / "comparison-controls-reference-actual.png",
    )
    labeled_stack(
        Image.open(REFERENCE_DIR / "reference-technical-module.png"),
        technical,
        VISUAL_DIR / "comparison-technical-reference-actual.png",
    )

    # The user supplied this image to identify the insertion point, so preserve
    # an evidence canvas with the complete revised page below it.
    labeled_stack(
        Image.open(REFERENCE_DIR / "reference-insertion-location.png"),
        desktop,
        VISUAL_DIR / "comparison-location-before-after.png",
    )


if __name__ == "__main__":
    main()
