# Design QA — ANNITI SMART configurator

## Source of truth

- Published visual reference captured before local work: `docs/visual-check/current/reference-live-configurator.png`.
- User-supplied photographs of the real device define the physical model: one fixed dark body, a dark continuous top cover, transparent rods entering individual holes, and soft reflected light of the selected hue.
- The published hostname was used only as a read-only reference. This QA pass was local and did not deploy anything.

## Implemented model

- The preview scene is one fixed-size container.
- The outer body is a fixed 150 × 94 px layer anchored 42 px from the scene bottom.
- Rods are DOM-rendered elements anchored from the same insertion line; height changes only their length.
- Rod count 3–7 changes the number of rendered rods and the count-specific dark top-cover asset together.
- Rods render below the top-cover asset, so their lower ends are occluded by the cover and visually enter the holes.
- Hue, brightness, saturation, and scenario controls update one shared configuration state.
- The ambient halo stays behind the product and preserves the same shape for all colours and rod counts.

## Visual evidence

### Colour × count matrix

Viewport: 1440 × 1050, height 140 cm, brightness 76%, saturation 78%, dynamic RGB.

- Green: `docs/visual-check/matrix-current/green-3-preview.png` through `green-7-preview.png`.
- Purple: `docs/visual-check/matrix-current/purple-3-preview.png` through `purple-7-preview.png`.
- Geometry and source data: `docs/visual-check/matrix-current/matrix-meta.json`.

Visible result for every one of the ten states:

- the rendered rod count matches the selected count;
- the top cover remains dark and continuous;
- every rod reaches a corresponding hole;
- there are no coloured rectangles, false sockets, floating lower ends, or coloured plate fills;
- the rod hue stays continuous to the insertion point;
- the body, card, and halo do not jump between counts.

### Height × count extremes

States checked: 80 cm × 3, 80 cm × 7, 160 cm × 3, and 160 cm × 7 at both 1440 × 1050 and 1024 × 768.

- Screenshots: `docs/visual-check/extremes-current/*-preview.png`.
- Geometry: `docs/visual-check/extremes-current/extremes-meta.json`.

At each viewport, preview dimensions, image dimensions, base x-position, base bottom offset, and base size are identical across all four states. Only rod length and rod count change.

## Comparison judgment

The current local render preserves the published configurator's dark, restrained visual language while correcting the confirmed physical defects. Compared with the reference capture, the local preview now has a single dark body, count-correct insertion holes, uninterrupted rod colour, and a broad halo behind the lamp rather than a coloured block attached to the cover.

## Verification

- lint: passed;
- typecheck: passed;
- unit: 40/40 passed;
- production build: passed;
- focused fixed-anchor E2E: 8/8 passed;
- full E2E: 136 passed, 8 intentionally skipped, 0 failed;
- current visual matrix: 10/10 states inspected;
- height/count extremes: 8/8 states inspected.

The E2E fixed-anchor check waits for fonts and settled layout, compares the body to the scene's bottom anchor instead of viewport scroll coordinates, verifies all five distinct rod heights, verifies all five rod counts, and verifies the matching top-cover asset.

## Iteration history

1. Rejected the stretched-raster model because it deformed the body.
2. Rejected the split overlay with baked coloured stubs because it produced bright rectangles and false insertion points.
3. Rebuilt the product as fixed body/top-cover assets plus independent DOM rods.
4. Moved rods below the cover for physically plausible occlusion.
5. Captured and inspected the complete green/purple × 3–7 matrix.
6. Captured and inspected the 80/160 cm × 3/7 extreme states at desktop and tablet sizes.
7. Corrected the geometry test to measure the actual scene anchor after fonts and layout settle.

final result: local configurator QA passed; not published
