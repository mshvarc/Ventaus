from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "images" / "configurator"


def build_layer(count: int) -> None:
    source = Image.open(ASSETS / f"lamp-preview-rods-{count}.jpg").convert("RGB")
    rgb = np.asarray(source, dtype=np.float32)
    height, width, _ = rgb.shape

    # The rods and their internal bubbles are the brightest parts of the real
    # photograph. A luminance key removes the black room and the broad halo,
    # leaving a transparent layer that can change height without stretching
    # the photograph, base or shadow.
    value = rgb.max(axis=2)
    alpha = np.clip((value - 64.0) * 3.4, 0.0, 255.0)

    # Keep only the product's central zone and stop at the insertion line.
    yy, xx = np.mgrid[:height, :width]
    central = (xx >= width * 0.17) & (xx <= width * 0.83) & (yy <= height * 0.722)
    alpha *= central

    rgba = np.dstack((rgb, alpha)).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(
        ASSETS / f"lamp-rods-isolated-{count}.png",
        optimize=True,
    )


for rod_count in range(3, 8):
    build_layer(rod_count)
