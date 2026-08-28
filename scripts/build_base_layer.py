from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public/assets/images/configurator"

# Measured outlines in the five real product photographs.  Every crop is then
# normalized into the same target footprint, so the physical housing never
# jumps while the top plate correctly follows the selected rod count.
BASE_POLYGONS = {
    3: [(286, 797), (382, 777), (482, 801), (480, 910), (382, 936), (287, 907)],
    4: [(286, 798), (382, 779), (482, 802), (480, 910), (382, 936), (287, 907)],
    5: [(257, 841), (384, 820), (511, 846), (508, 949), (384, 980), (259, 944)],
    6: [(250, 846), (384, 824), (526, 851), (522, 975), (384, 1010), (252, 969)],
    7: [(264, 830), (384, 807), (505, 834), (502, 949), (384, 982), (266, 944)],
}

TARGET_BOX = (257, 820, 511, 980)


def main() -> None:
    target_left, target_top, target_right, target_bottom = TARGET_BOX
    target_size = (target_right - target_left, target_bottom - target_top)

    for rod_count, polygon in BASE_POLYGONS.items():
        source = Image.open(ASSET_DIR / f"lamp-preview-rods-{rod_count}.jpg").convert("RGBA")
        mask = Image.new("L", source.size, 0)
        ImageDraw.Draw(mask).polygon(polygon, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(radius=1.1))
        source.putalpha(mask)

        xs = [point[0] for point in polygon]
        ys = [point[1] for point in polygon]
        crop_box = (min(xs), min(ys), max(xs), max(ys))
        crop = source.crop(crop_box).resize(target_size, Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", source.size, (0, 0, 0, 0))
        canvas.alpha_composite(crop, (target_left, target_top))
        canvas.save(ASSET_DIR / f"lamp-base-isolated-{rod_count}.png", optimize=True)

        if rod_count == 5:
            crop.save(ASSET_DIR / "lamp-base-anchor.png", optimize=True)


if __name__ == "__main__":
    main()
