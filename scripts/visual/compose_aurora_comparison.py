from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance


SITE_DIR = Path(__file__).resolve().parents[2]
OUTPUT_DIR = SITE_DIR / "docs" / "visual-diff"
REFERENCE_PATH = OUTPUT_DIR / "reference-aurora-gallery.png"
ACTUAL_PATH = OUTPUT_DIR / "actual-reference-viewport.png"


def main() -> None:
    reference = Image.open(REFERENCE_PATH).convert("RGB")
    actual = Image.open(ACTUAL_PATH).convert("RGB")
    if reference.size != actual.size:
        raise ValueError(f"Viewport mismatch: reference={reference.size}, actual={actual.size}")

    gap = 16
    comparison = Image.new("RGB", (reference.width * 2 + gap, reference.height), "#0d0e0e")
    comparison.paste(reference, (0, 0))
    comparison.paste(actual, (reference.width + gap, 0))
    comparison.save(OUTPUT_DIR / "comparison-reference-actual.png", optimize=True)

    Image.blend(reference, actual, 0.5).save(OUTPUT_DIR / "overlay-reference-actual.png", optimize=True)
    diff = ImageChops.difference(reference, actual)
    ImageEnhance.Contrast(diff).enhance(2.5).save(OUTPUT_DIR / "diff-reference-actual.png", optimize=True)


if __name__ == "__main__":
    main()
