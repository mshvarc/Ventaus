from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public/assets/images/configurator"
SOURCE = ASSET_DIR / "lamp-base-anchor.png"

# These positions are shared with `rodLayouts` in AuroraConfigurator.tsx.  The
# base is rendered at 150 x 94 CSS pixels; the exported raster is 254 x 160.
ROD_LAYOUTS = {
    3: [(-31, 1), (1, 0), (30, 2)],
    4: [(-38, 2), (-12, 0), (12, 3), (37, 1)],
    5: [(-43, 3), (-22, 1), (0, 0), (21, 4), (42, 2)],
    6: [(-45, 4), (-28, 2), (-10, 0), (9, 5), (27, 1), (44, 3)],
    7: [(-46, 5), (-31, 3), (-16, 0), (0, 4), (16, 1), (31, 6), (46, 2)],
}

CSS_BASE_SIZE = (150, 94)

# Measured from the normalized real base crop.  This is the physical top
# surface only; the side walls remain untouched and identical in every file.
TOP_SURFACE = [(2, 23), (127, 0), (252, 26), (247, 58), (127, 88), (5, 57)]
FULL_BASE = [(2, 23), (127, 0), (252, 26), (251, 129), (127, 160), (2, 124)]


def neutral_plate_texture(source: Image.Image) -> Image.Image:
    """Remove baked light/stubs while retaining the photographed matte grain."""

    # The retained stubs are narrow. A large median removes them without
    # inventing new shapes; the remaining luminance comes from the real base.
    filtered = source.convert("RGB").filter(ImageFilter.MedianFilter(size=31))
    luminance = ImageOps.grayscale(filtered)
    luminance = ImageEnhance.Contrast(luminance).enhance(0.72)
    luminance = ImageEnhance.Brightness(luminance).enhance(0.54)
    return ImageOps.colorize(luminance, black="#050708", white="#34393B").convert("RGBA")


def build_clean_base() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    texture = neutral_plate_texture(source)

    base_mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(base_mask).polygon(FULL_BASE, fill=255)
    base_mask = base_mask.filter(ImageFilter.GaussianBlur(radius=0.55))

    surface_mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(surface_mask).polygon(TOP_SURFACE, fill=255)
    surface_mask = surface_mask.filter(ImageFilter.GaussianBlur(radius=0.55))

    # Keep the original alpha/contour, but replace the illuminated top with a
    # neutral photographed texture. The side body is desaturated and darkened
    # once here, never hue-rotated in the browser.
    neutral_body = ImageOps.grayscale(source.convert("RGB"))
    neutral_body = ImageEnhance.Brightness(neutral_body).enhance(0.58)
    neutral_body = ImageOps.colorize(neutral_body, black="#020304", white="#34383A").convert("RGBA")
    neutral_body.putalpha(base_mask)

    clean = Image.new("RGBA", source.size, (0, 0, 0, 0))
    clean.alpha_composite(neutral_body)
    clean.alpha_composite(Image.composite(texture, Image.new("RGBA", source.size), surface_mask))
    return clean


def add_openings(base: Image.Image, rods: list[tuple[int, int]]) -> Image.Image:
    result = base.copy()
    ring_draw = ImageDraw.Draw(result)

    scale_x = result.width / CSS_BASE_SIZE[0]
    scale_y = result.height / CSS_BASE_SIZE[1]

    for x_offset, depth in rods:
        cx = round((CSS_BASE_SIZE[0] / 2 + x_offset) * scale_x)
        cy = round((12 + depth * 2) * scale_y)

        # A real hole is a shallow ellipse in this perspective.  Its centre is
        # transparent: the DOM rod is rendered *behind* the photographed base
        # and is therefore visible only through this opening.  The dark rim is
        # part of the base layer and naturally occludes the lower rod edges.
        # This keeps the plate matte and prevents coloured rectangular stubs.
        outer = (cx - 10, cy - 4, cx + 10, cy + 4)
        inner = (cx - 5, cy - 1, cx + 5, cy + 1)
        ring_draw.ellipse(outer, fill=ImageColor.getrgb("#111517") + (248,))
        ring_draw.ellipse(inner, fill=(0, 0, 0, 0))
        ring_draw.arc(outer, start=185, end=355, fill=ImageColor.getrgb("#3A4144") + (205,), width=2)

    return result


def main() -> None:
    clean = build_clean_base()
    clean.save(ASSET_DIR / "lamp-base-clean.png", optimize=True)

    for count, rods in ROD_LAYOUTS.items():
        add_openings(clean, rods).save(
            ASSET_DIR / f"lamp-base-clean-{count}.png",
            optimize=True,
        )


if __name__ == "__main__":
    main()
