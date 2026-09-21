"""Pixel-level sanity checks on the render screenshots.

Verifies without human eyes:
- statue close-up: gold silhouette present, V-taper (shoulders > waist),
  dark hair band on the head, face-like variance in the head region
- trophy close-ups: bright silver pixels (specular metal) in the frame
"""
import sys
from PIL import Image
import numpy as np


def gold_mask(rgb):
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    return (r > 120) & (g > 70) & (b < 130) & (r > g) & (g >= b * 0.7) & (r - b > 40)


def silver_mask(rgb):
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    return (mx > 150) & (mx - mn < 45)


def analyze_statue(path):
    img = np.array(Image.open(path).convert("RGB"))
    H, W = img.shape[:2]
    m = gold_mask(img)
    ys, xs = np.where(m)
    report = {}
    if len(xs) < 2000:
        return {"error": f"gold pixels too few: {len(xs)}"}
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    report["bbox"] = (int(x0), int(y0), int(x1), int(y1))

    # horizontal width profile of the silhouette
    widths = {}
    for frac in (0.05, 0.25, 0.45, 0.65):  # head, shoulders/chest, waist, legs
        yy = int(y0 + (y1 - y0) * frac)
        row = m[yy]
        xs_row = np.where(row)[0]
        widths[frac] = int(xs_row.max() - xs_row.min()) if len(xs_row) else 0
    report["widths(head,chest,waist,legs)"] = (widths[0.05], widths[0.25], widths[0.45], widths[0.65])

    # head region: dark hair band + face variance
    hy0 = y0
    hy1 = int(y0 + (y1 - y0) * 0.22)
    hx0 = int(x0 + (x1 - x0) * 0.2)
    hx1 = int(x0 + (x1 - x0) * 0.8)
    head = img[hy0:hy1, hx0:hx1]
    lum = head.mean(axis=2)
    report["head_dark_fraction"] = float((lum < 90).mean())
    face = img[int(y0 + (y1 - y0) * 0.08):int(y0 + (y1 - y0) * 0.20),
               int(x0 + (x1 - x0) * 0.35):int(x0 + (x1 - x0) * 0.65)]
    if face.size:
        report["face_std"] = float(face.std(axis=(0, 1)).mean())
    return report


def analyze_silver(path):
    img = np.array(Image.open(path).convert("RGB"))
    m = silver_mask(img)
    bright = m & (img.mean(axis=2) > 185)
    return {"silver_px": int(m.sum()), "specular_px": int(bright.sum()),
            "frame": img.shape[1], "x" : img.shape[0]}


def main():
    for path, fn in [
        ("tools/shots/11-statue-face.png", analyze_statue),
        ("tools/shots/12-ucl-closeup.png", analyze_silver),
        ("tools/shots/13-domestic-closeup.png", analyze_silver),
    ]:
        try:
            print(path, "->", fn(path))
        except Exception as e:
            print(path, "ERROR:", e)


if __name__ == "__main__":
    main()
