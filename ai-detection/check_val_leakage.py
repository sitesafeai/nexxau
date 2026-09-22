"""
Did the vest classifier see its own val set? Run as ONE Kaggle cell.
Settings → Accelerator: NONE, Internet: On. No GPU quota. ~5 minutes.

kaggle_train_vest_cls.py validates on d1's valid split and trains on d1 train + ALL of
d3 + ALL of d5. d1 is the "combined model" dataset — a merge of other public PPE sources.
If d3 or d5 reshare images with d1's valid split, the 0.980 recall is measuring memory,
not generalisation. v5's headline 0.779 was already ruined once by a bad val set; this
is the two-minute version of not doing that again.

Compares by content, not filename — roboflow rehashes filenames per project, so identical
photos land with different names.

  exact      md5 of the decoded pixels
  near       dhash (64-bit perceptual), hamming <= 5, catches re-encodes and resizes

Prints the share of d1-valid images that also appear in the training pool. Anything above
roughly 1% means the number is inflated and the val set has to be rebuilt from images no
training source touches.
"""

!pip install roboflow -q

import hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from roboflow import Roboflow

EXTS = (".jpg", ".jpeg", ".png")
NEAR_MAX = 5          # hamming distance counted as the same photo

rf = Roboflow(api_key="GVzubtAOa82zLvnx1DAg")
d1 = rf.workspace("roboflow-universe-projects").project(
    "personal-protective-equipment-combined-model").version(8).download("yolov8")
d3 = rf.workspace("roboflow-100").project("construction-safety-gsnvb").version(2).download("yolov8")
d5 = rf.workspace("arman-keresh-lbrre").project("vest-no-vest").version(1).download("yolov8")


def images(d, split):
    p = Path(d.location) / split / "images"
    return sorted(q for q in p.glob("*") if q.suffix.lower() in EXTS) if p.exists() else []


def fingerprint(paths, label):
    """(md5 list, dhash uint64 array) — both computed from decoded pixels."""
    md5s, hashes, kept = [], [], []
    for q in paths:
        try:
            im = Image.open(q).convert("L")
        except Exception:
            continue
        md5s.append(hashlib.md5(im.tobytes()).hexdigest())
        a = np.asarray(im.resize((9, 8), Image.BILINEAR), dtype=np.int16)
        bits = (a[:, 1:] > a[:, :-1]).flatten()
        hashes.append(np.packbits(bits).view(np.uint64)[0])
        kept.append(q)
    print(f"  {label:34} {len(kept):>7,} images")
    return md5s, np.array(hashes, dtype=np.uint64), kept


print("\nFingerprinting…")
val_md5, val_h, val_paths = fingerprint(images(d1, "valid"), "d1 valid  (the val set)")

train_md5, train_h = [], []
for d, tag in ((d1, "d1"), (d3, "d3"), (d5, "d5")):
    for split in ("train", "valid", "test"):
        if d is d1 and split == "valid":
            continue           # that IS the val set
        ims = images(d, split)
        if not ims:
            continue
        m, h, _ = fingerprint(ims, f"{tag} {split}  (trained on)")
        train_md5 += m
        train_h.append(h)
train_h = np.concatenate(train_h)
train_md5_set = set(train_md5)

print(f"\n  val pool {len(val_md5):,}   training pool {len(train_md5):,}")

# exact
exact = [i for i, m in enumerate(val_md5) if m in train_md5_set]

# near — XOR each val hash against the whole training pool, popcount, take the min
lut = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)
near = []
tv = train_h.view(np.uint8).reshape(-1, 8)
for i, h in enumerate(val_h):
    # np.uint64(h).view(...) fails on a 0-d array — keep it 1-d.
    d = np.bitwise_xor(tv, np.array([h], dtype=np.uint64).view(np.uint8))
    if lut[d].sum(axis=1).min() <= NEAR_MAX:
        near.append(i)

n = max(1, len(val_md5))
print("\n" + "=" * 72)
print("LEAKAGE — d1 valid images that also appear in the training pool")
print("=" * 72)
print(f"  exact pixel duplicates   {len(exact):>6,}  ({100*len(exact)/n:.2f}%)")
print(f"  near duplicates (<={NEAR_MAX})    {len(near):>6,}  ({100*len(near)/n:.2f}%)")

if near:
    print("\n  examples:")
    for i in near[:10]:
        print(f"    {val_paths[i].name}")

pct = 100 * len(near) / n
print()
if pct < 1:
    print(">>> CLEAN. The val set is independent; the 0.980 recall stands.")
elif pct < 5:
    print(f">>> MINOR ({pct:.1f}%). Real but small — knock a point or two off and move on.")
else:
    print(f">>> CONTAMINATED ({pct:.1f}%). The reported recall is inflated. Rebuild the val")
    print(">>> split from images no training source touches, then retrain before shipping.")
