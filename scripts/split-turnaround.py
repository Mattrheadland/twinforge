#!/usr/bin/env python3
"""Split a turnaround sheet into one transparent PNG per view, for image-to-3D tools.

    python3 scripts/split-turnaround.py battle-rex

Reads  assets/characters/<id>/<id>-turnaround.png  (four views on a light-gray floor)
Writes assets/characters/<id>/views/<id>-{front,side,back,three-quarter}.png
       plus <id>-side-mirrored.png for tools that want a left AND a right view.
Each output is 1024x1024, the figure centered with a margin, background removed.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

NAMES = ['front', 'side', 'back', 'three-quarter']


def main(cid):
    src = Path(f'assets/characters/{cid}/{cid}-turnaround.png')
    out = src.parent / 'views'
    out.mkdir(exist_ok=True)
    rgb = np.array(Image.open(src).convert('RGB')).astype(int)
    # background: light, nearly gray pixels
    bg = ((rgb.max(-1) - rgb.min(-1)) < 14) & (rgb.min(-1) > 200)
    solid = nd.binary_opening(~bg, iterations=1)
    fg = nd.binary_fill_holes(solid)
    # keep small enclosed specks (glints, pale paint) but open up real gaps (between legs)
    holes, nh = nd.label(fg & ~solid)
    if nh:
        sizes = nd.sum(np.ones_like(holes), holes, range(1, nh + 1))
        fg &= ~np.isin(holes, [i + 1 for i, s in enumerate(sizes) if s > 400])
    lab, _ = nd.label(fg)
    objs = [(i + 1, sl) for i, sl in enumerate(nd.find_objects(lab)) if (lab[sl] == i + 1).sum() > 3000]
    objs.sort(key=lambda o: o[1][1].start)  # left to right
    if len(objs) != 4:
        sys.exit(f'expected 4 figures, found {len(objs)}; crop this sheet by hand')
    # one scale for all views so they stay the same size relative to each other
    span = max(max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) for _, sl in objs)
    k = 1024 * 0.86 / span
    for name, (i, sl) in zip(NAMES, objs):
        rgba = np.zeros((*rgb.shape[:2], 4), np.uint8)
        rgba[..., :3] = rgb
        rgba[..., 3] = np.where(lab == i, 255, 0)
        crop = Image.fromarray(rgba[sl])
        crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
        canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
        # feet on a common floor line, centered horizontally
        canvas.paste(crop, ((1024 - crop.width) // 2, 1024 - 72 - crop.height), crop)
        canvas.save(out / f'{cid}-{name}.png')
        if name == 'side':
            canvas.transpose(Image.FLIP_LEFT_RIGHT).save(out / f'{cid}-side-mirrored.png')
    print(f'wrote {out}/')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'battle-rex')
