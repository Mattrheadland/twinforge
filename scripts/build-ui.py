#!/usr/bin/env python3
"""Cut Astra's magenta-backed UI/effects sheets into game-ready PNGs.

    python3 scripts/build-ui.py

fx-sheet-1-battle-effects.png (4x4) -> public/ui/fx-<name>.png (256 px max, transparent)
ui-sheet-3-transitions.png (2x2)    -> public/ui/tr-<name>.jpg
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

FX = ['impact', 'spark', 'dust', 'speed',
      'fire', 'splash', 'magic', 'slash',
      'swirl', 'dizzy', 'bubble', 'muzzle',
      'aura', 'heal', 'leaves', 'sleepy']
TR = ['stripes', 'burst', 'vs', 'swirl']
OUT = Path('public/ui')


def key_magenta(rgb):
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    # distance from #FF00FF; soft edge so the ink outline keeps its anti-aliasing
    mag = (r > 150) & (b > 150) & (g < 120) & (np.abs(r - b) < 90)
    a = np.where(mag, 0, 255).astype(np.uint8)
    a = nd.binary_opening(a > 0, iterations=1)
    a = (nd.binary_fill_holes(a) & a | a).astype(np.uint8) * 255
    # despill: pull leftover magenta tint out of edge pixels
    out = rgb.copy()
    edge = nd.binary_dilation(a == 0, iterations=2) & (a > 0)
    out[edge, 0] = np.minimum(out[edge, 0], out[edge, 1] + 60)
    out[edge, 2] = np.minimum(out[edge, 2], out[edge, 1] + 60)
    return np.dstack([out, a])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    fx = np.array(Image.open('assets/ui/fx-sheet-1-battle-effects.png').convert('RGB'))
    h, w = fx.shape[0] // 4, fx.shape[1] // 4
    for k, name in enumerate(FX):
        r, c = divmod(k, 4)
        cell = key_magenta(fx[r * h:(r + 1) * h, c * w:(c + 1) * w])
        im = Image.fromarray(cell, 'RGBA')
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        im.thumbnail((256, 256), Image.LANCZOS)
        im.save(OUT / f'fx-{name}.png', optimize=True)
    tr = np.array(Image.open('assets/ui/ui-sheet-3-transitions.png').convert('RGB'))
    rgba = key_magenta(tr)
    lab, _ = nd.label(rgba[..., 3] > 0)
    objs = sorted([sl for sl in nd.find_objects(lab) if sl and (sl[0].stop - sl[0].start) > 200],
                  key=lambda sl: (round(sl[0].start / 300), sl[1].start))
    for name, sl in zip(TR, objs):
        Image.fromarray(tr[sl]).resize((960, 540), Image.LANCZOS).save(OUT / f'tr-{name}.jpg', quality=84, optimize=True)
    print(f'{len(FX)} effects, {len(objs)} transitions -> {OUT}/')


if __name__ == '__main__':
    main()
