#!/usr/bin/env python3
"""Turn Astra's arena sheets into game-ready files.

    python3 scripts/build-arenas.py            # all arenas
    python3 scripts/build-arenas.py castle     # one

Reads  assets/arenas/<id>/arena-<id>-{backdrop,floor,props}.png
Writes public/arenas/<id>/backdrop.jpg   (1536 wide)
       public/arenas/<id>/floor.jpg      (512 square, tiles seamlessly)
       public/arenas/<id>/prop-<n>.png   (each prop cut out of the sheet, transparent, max 320 px)
An arena with no floor sheet gets one made from another arena's floor (FLOOR_FROM), tinted.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage as nd

# arena -> (borrowed floor arena, RGB multiply) for arenas whose floor sheet is missing
FLOOR_FROM = {'bog-shack': ('fishing-pier', (0.72, 0.62, 0.5))}


def cut_props(sheet: Image.Image):
    rgb = np.array(sheet.convert('RGB')).astype(int)
    bg = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3)]), axis=0)
    solid = nd.binary_closing(np.abs(rgb - bg).sum(-1) > 36, iterations=2)
    fg = nd.binary_fill_holes(solid)
    # reopen real gaps (inside a life ring, under a bench) but keep small specks
    holes, nh = nd.label(fg & ~solid)
    if nh:
        sizes = nd.sum(np.ones_like(holes), holes, range(1, nh + 1))
        fg &= ~np.isin(holes, [k + 1 for k, sz in enumerate(sizes) if sz > 600])
    lab, _ = nd.label(fg)
    objs = [(i + 1, sl) for i, sl in enumerate(nd.find_objects(lab)) if sl is not None and (lab[sl] == i + 1).sum() > 4000]
    # reading order: rows (by center y, banded), then left to right
    objs.sort(key=lambda o: (round(((o[1][0].start + o[1][0].stop) / 2) / 300), o[1][1].start))
    out = []
    for i, sl in objs:
        a = np.where(lab[sl] == i, 255, 0).astype(np.uint8)
        a = nd.binary_dilation(a > 0, iterations=1).astype(np.uint8) * 255  # keep the ink edge
        rgba = np.dstack([rgb[sl].astype(np.uint8), a])
        im = Image.fromarray(rgba, 'RGBA')
        im.thumbnail((320, 320), Image.LANCZOS)
        out.append(im)
    return out


def main(ids):
    for aid in ids:
        src = Path('assets/arenas') / aid
        dst = Path('public/arenas') / aid
        dst.mkdir(parents=True, exist_ok=True)
        back = Image.open(src / f'arena-{aid}-backdrop.png').convert('RGB')
        back.save(dst / 'backdrop.jpg', quality=86, optimize=True)
        floor_png = src / f'arena-{aid}-floor.png'
        if floor_png.exists():
            floor = Image.open(floor_png).convert('RGB')
        else:
            other, mul = FLOOR_FROM[aid]
            floor = Image.open(Path('assets/arenas') / other / f'arena-{other}-floor.png').convert('RGB')
            arr = np.array(floor).astype(float) * np.array(mul)
            floor = ImageEnhance.Contrast(Image.fromarray(arr.clip(0, 255).astype(np.uint8))).enhance(1.1)
        floor.resize((512, 512), Image.LANCZOS).save(dst / 'floor.jpg', quality=86, optimize=True)
        for old in dst.glob('prop-*.png'):
            old.unlink()
        props = cut_props(Image.open(src / f'arena-{aid}-props.png'))
        for n, im in enumerate(props, 1):
            im.save(dst / f'prop-{n}.png', optimize=True)
        print(f'{aid}: backdrop, floor, {len(props)} props')


if __name__ == '__main__':
    main(sys.argv[1:] or ['bog-shack', 'castle', 'fishing-pier', 'haunted-forest'])
