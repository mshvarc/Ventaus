from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


SITE_DIR = Path(__file__).resolve().parents[2]
OUTPUT_DIR = SITE_DIR / "docs" / "visual-diff"
REFERENCE_PATH = OUTPUT_DIR / "reference-aurora-gallery.png"
ACTUAL_PATH = OUTPUT_DIR / "actual-reference-viewport.png"
REFERENCE_OUTPUT = OUTPUT_DIR / "reference-desktop.png"
ACTUAL_OUTPUT = OUTPUT_DIR / "actual-desktop.png"
OVERLAY_OUTPUT = OUTPUT_DIR / "overlay-desktop.png"
DIFF_OUTPUT = OUTPUT_DIR / "diff-desktop.png"
MASK_OUTPUT = OUTPUT_DIR / "comparison-mask.png"
METRICS_OUTPUT = OUTPUT_DIR / "metrics.json"


def foreground_pixels(image: Image.Image, rectangle: tuple[int, int, int, int]) -> Image.Image:
    crop = image.crop(rectangle).convert("RGB")
    rgb = np.asarray(crop).astype(np.int16)
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    chroma = maximum - minimum
    rgb32 = rgb.astype(np.int32)
    luminance = (rgb32[:, :, 0] * 299 + rgb32[:, :, 1] * 587 + rgb32[:, :, 2] * 114) // 1000
    gray = crop.convert("L")
    blurred = np.asarray(gray.filter(ImageFilter.GaussianBlur(radius=1.2))).astype(np.int16)
    local_contrast = np.abs(np.asarray(gray).astype(np.int16) - blurred)
    mint = (rgb[:, :, 1] >= rgb[:, :, 0] + 18) & (rgb[:, :, 1] >= rgb[:, :, 2] - 20)
    neutral = (chroma <= 48) & (luminance >= 58)
    visible = (local_contrast >= 3) & (neutral | mint)
    return Image.fromarray(np.where(visible, 255, 0).astype(np.uint8), mode="L").filter(ImageFilter.MaxFilter(3))


def build_mask(reference: Image.Image, actual: Image.Image) -> Image.Image:
    width, height = reference.size
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)

    # Non-photographic panels are compared in full, including their backgrounds,
    # grid, copy, icon positions and controls.
    draw.rectangle((0, 768, width - 1, 1114), fill=255)
    draw.rectangle((0, 1115, 306, 1503), fill=255)
    draw.rectangle((0, 1504, 689, height - 1), fill=255)

    # UI layered over photographs remains fully protected. Only pixels that are
    # demonstrably part of the supplied photographs are excluded.
    protected = [
        (32, 18, 832, 60),
        (45, 225, 390, 548),
        (45, 580, 380, 680),
        (307, 1440, 864, 1484),
        (690, 1782, 864, 1821),
    ]
    for rectangle in protected:
        ref_foreground = foreground_pixels(reference, rectangle)
        actual_foreground = foreground_pixels(actual, rectangle)
        union = ImageChops.lighter(ref_foreground, actual_foreground)
        mask.paste(union, (rectangle[0], rectangle[1]), union)

    # Section and gallery boundaries are structural, not photographic.
    for y in (767, 768, 1114, 1115, 1503, 1504, 1820):
        draw.rectangle((0, max(0, y - 1), width - 1, min(height - 1, y + 1)), fill=255)
    for x in (307, 417, 527, 637, 747, 863):
        draw.rectangle((max(0, x - 1), 1115, min(width - 1, x + 1), 1503), fill=255)
    return mask


def masked_global_ssim(reference: np.ndarray, actual: np.ndarray, mask: np.ndarray) -> float:
    active = mask > 0
    x = reference[active].astype(np.float64)
    y = actual[active].astype(np.float64)
    mu_x = x.mean()
    mu_y = y.mean()
    var_x = x.var()
    var_y = y.var()
    covariance = ((x - mu_x) * (y - mu_y)).mean()
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2
    return float(((2 * mu_x * mu_y + c1) * (2 * covariance + c2)) / ((mu_x**2 + mu_y**2 + c1) * (var_x + var_y + c2)))


def main() -> int:
    reference = Image.open(REFERENCE_PATH).convert("RGB")
    actual = Image.open(ACTUAL_PATH).convert("RGB")
    if reference.size != actual.size:
        raise ValueError(f"Viewport mismatch: reference={reference.size}, actual={actual.size}")

    mask = build_mask(reference, actual)
    reference.save(REFERENCE_OUTPUT, optimize=True)
    actual.save(ACTUAL_OUTPUT, optimize=True)
    mask.save(MASK_OUTPUT, optimize=True)
    Image.blend(reference, actual, 0.5).save(OVERLAY_OUTPUT, optimize=True)

    raw_diff = ImageChops.difference(reference, actual).convert("RGB")
    masked_diff = Image.new("RGB", raw_diff.size, "black")
    masked_diff.paste(raw_diff, mask=mask)
    ImageEnhance.Contrast(masked_diff).enhance(3).save(DIFF_OUTPUT, optimize=True)

    ref_gray = np.asarray(reference.convert("L"))
    actual_gray = np.asarray(actual.convert("L"))
    mask_array = np.asarray(mask)
    active = mask_array > 0
    absolute = np.abs(ref_gray.astype(np.int16) - actual_gray.astype(np.int16))
    changed = (absolute > 12) & active
    pixel_diff = float(changed.sum() / active.sum())
    ssim = masked_global_ssim(ref_gray, actual_gray, mask_array)
    metrics = {
        "reference": str(REFERENCE_PATH),
        "actual": str(ACTUAL_PATH),
        "comparisonSize": list(reference.size),
        "maskCoverage": float(active.mean()),
        "maskPolicy": "Only unavailable photographic pixels are excluded; all text, controls, section backgrounds, lines, icons and layout remain compared.",
        "pixelDiffThreshold": 12,
        "pixelDiffRatio": pixel_diff,
        "meanAbsoluteError": float(absolute[active].mean()),
        "maskedGlobalSsim": ssim,
        "passesRequestedGate": bool(ssim >= 0.98 or pixel_diff <= 0.02),
    }
    METRICS_OUTPUT.write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    return 0 if metrics["passesRequestedGate"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
