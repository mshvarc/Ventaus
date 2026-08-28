from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


SITE = Path(__file__).resolve().parents[2]
PROJECT = SITE.parent if (SITE.parent / "references").is_dir() else SITE
OUTPUT = PROJECT / "docs" / "visual-diff" / "approved-blocks"
REFERENCES = PROJECT / "references"

CONFIGURATOR_SOURCE = REFERENCES / "approved-configurator-compact.png"
CONFIGURATOR_ACTUAL = OUTPUT / "configurator-desktop-864.png"
RECOMMENDATIONS_SOURCE = REFERENCES / "approved-recommendations-showcase.png"
RECOMMENDATIONS_ACTUAL = OUTPUT / "recommendations-desktop-1440.png"
TECHNICAL_SOURCE = REFERENCES / "approved-technical-portfolio.png"
TECHNICAL_ACTUAL = OUTPUT / "technical-desktop-1440.png"

BACKGROUND = "#0a1012"
LABEL_BACKGROUND = "#132124"
LABEL_COLOR = "#a5ede0"
GUTTER = 16
LABEL_HEIGHT = 46


def font() -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 20)
    except OSError:
        return ImageFont.load_default()


def open_rgb(path: Path) -> Image.Image:
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")


def crop_fraction(image: Image.Image, top: float, bottom: float) -> Image.Image:
    y0 = round(image.height * top)
    y1 = round(image.height * bottom)
    return image.crop((0, y0, image.width, y1))


def fit_to_height(image: Image.Image, height: int) -> Image.Image:
    width = round(image.width * height / image.height)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def compose_pair(
    source: Image.Image,
    actual: Image.Image,
    output_path: Path,
    *,
    target_height: int | None = None,
) -> None:
    height = target_height or source.height
    source_panel = fit_to_height(source, height)
    actual_panel = fit_to_height(actual, height)

    canvas_width = source_panel.width + actual_panel.width + GUTTER * 3
    canvas_height = height + LABEL_HEIGHT + GUTTER * 2
    canvas = Image.new("RGB", (canvas_width, canvas_height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    source_x = GUTTER
    actual_x = source_x + source_panel.width + GUTTER
    image_y = LABEL_HEIGHT + GUTTER

    draw.rectangle(
        (source_x, GUTTER, source_x + source_panel.width, LABEL_HEIGHT + GUTTER),
        fill=LABEL_BACKGROUND,
    )
    draw.rectangle(
        (actual_x, GUTTER, actual_x + actual_panel.width, LABEL_HEIGHT + GUTTER),
        fill=LABEL_BACKGROUND,
    )
    draw.text((source_x + 14, GUTTER + 10), "APPROVED SOURCE", fill=LABEL_COLOR, font=font())
    draw.text((actual_x + 14, GUTTER + 10), "IMPLEMENTATION", fill=LABEL_COLOR, font=font())

    canvas.paste(source_panel, (source_x, image_y))
    canvas.paste(actual_panel, (actual_x, image_y))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, format="PNG", optimize=True)


def main() -> None:
    config_source = open_rgb(CONFIGURATOR_SOURCE)
    config_actual = open_rgb(CONFIGURATOR_ACTUAL)
    recommendations_source = open_rgb(RECOMMENDATIONS_SOURCE)
    recommendations_actual = open_rgb(RECOMMENDATIONS_ACTUAL)
    technical_source = open_rgb(TECHNICAL_SOURCE)
    technical_actual = open_rgb(TECHNICAL_ACTUAL)

    compose_pair(
        config_source,
        config_actual,
        OUTPUT / "comparison-configurator-full.png",
    )
    compose_pair(
        recommendations_source,
        recommendations_actual,
        OUTPUT / "comparison-recommendations-full.png",
    )
    compose_pair(
        crop_fraction(recommendations_source, 0.0, 0.55),
        crop_fraction(recommendations_actual, 0.0, 0.55),
        OUTPUT / "comparison-recommendations-focus-top.png",
        target_height=650,
    )
    compose_pair(
        crop_fraction(recommendations_source, 0.48, 1.0),
        crop_fraction(recommendations_actual, 0.48, 1.0),
        OUTPUT / "comparison-recommendations-focus-gallery.png",
        target_height=620,
    )
    compose_pair(
        technical_source,
        technical_actual,
        OUTPUT / "comparison-technical-full.png",
    )
    compose_pair(
        crop_fraction(technical_source, 0.0, 0.42),
        crop_fraction(technical_actual, 0.0, 0.42),
        OUTPUT / "comparison-technical-focus-top.png",
        target_height=700,
    )
    compose_pair(
        crop_fraction(technical_source, 0.40, 1.0),
        crop_fraction(technical_actual, 0.40, 1.0),
        OUTPUT / "comparison-technical-focus-body.png",
        target_height=900,
    )


if __name__ == "__main__":
    main()
