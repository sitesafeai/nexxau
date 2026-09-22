"""
Look at the vest data. Run as ONE Kaggle cell. Settings → Accelerator: NONE, Internet: On.
No GPU quota. ~10 minutes, most of it downloading d5.

Answers two questions five training runs have failed to answer by reasoning about logs:

  1. What does a NO-Safety Vest example actually look like? It scores 0.214 while Person
     scores 0.884 on the same images, so the model can find the person and can't judge
     the vest. Worth seeing what it's being asked to judge.
  2. Why does v5 barely fire on vest-no-vest? It gave up only 303 Person pseudo-labels
     across 6.5k images. If those images are tight crops rather than scene photos, that
     explains it, kills the pseudo-labelling idea for good, and the box-area stat below
     will show it without anyone having to squint at pictures.

Writes three PNGs to /kaggle/working — download them from the Output tab.
"""

!pip install roboflow -q

import random, statistics, yaml
from pathlib import Path
from PIL import Image
from roboflow import Roboflow

random.seed(0)
OUT = Path("/kaggle/working")
EXTS = (".jpg", ".jpeg", ".png")

rf = Roboflow(api_key="GVzubtAOa82zLvnx1DAg")
d1 = rf.workspace("roboflow-universe-projects").project(
    "personal-protective-equipment-combined-model").version(8).download("yolov8")
d5 = rf.workspace("arman-keresh-lbrre").project("vest-no-vest").version(1).download("yolov8")

norm = lambda s: str(s).lower().replace("_", " ").replace("-", " ").strip()
names = lambda d: yaml.safe_load(open(f"{d.location}/data.yaml"))["names"]
d1_names, d5_names = names(d1), names(d5)
print("d1 classes:", d1_names)
print("d5 classes:", d5_names)

def find(ns, pred):
    for i, n in enumerate(ns):
        if pred(norm(n)):
            return i
    return None

is_neg = lambda n: n.startswith("no ") or n.startswith("non ") or "without" in n
D1_NOVEST = find(d1_names, lambda n: is_neg(n) and "vest" in n)
D5_NOVEST = find(d5_names, lambda n: is_neg(n))
D5_VEST   = find(d5_names, lambda n: "vest" in n and not is_neg(n))
print(f"\nresolved → d1 NO-Safety Vest={D1_NOVEST}  d5 no-vest={D5_NOVEST}  d5 vest={D5_VEST}")
assert None not in (D1_NOVEST, D5_NOVEST, D5_VEST), "class names changed — check the lists above"


def img_for(d, split, stem):
    base = Path(d.location) / split / "images"
    for e in EXTS:
        p = base / (stem + e)
        if p.exists():
            return p
    return None


def label_files(d, split="train"):
    ls = sorted(Path(f"{d.location}/{split}/labels").glob("*.txt"))
    random.shuffle(ls)
    return ls


def crops(d, cls, n=20, pad=0.12, split="train"):
    """One crop per image, so the grid shows n different photos rather than n boxes
    from the same one."""
    out = []
    for lp in label_files(d, split):
        if len(out) >= n:
            break
        for line in open(lp):
            p = line.split()
            if not p or int(p[0]) != cls:
                continue
            ip = img_for(d, split, lp.stem)
            if ip is None:
                continue
            im = Image.open(ip).convert("RGB")
            W, H = im.size
            cx, cy, bw, bh = (float(x) for x in p[1:5])
            x1 = max(0, (cx - bw / 2 - pad * bw) * W)
            y1 = max(0, (cy - bh / 2 - pad * bh) * H)
            x2 = min(W, (cx + bw / 2 + pad * bw) * W)
            y2 = min(H, (cy + bh / 2 + pad * bh) * H)
            if x2 - x1 < 8 or y2 - y1 < 8:
                continue
            out.append(im.crop((int(x1), int(y1), int(x2), int(y2))))
            break
    return out


def full_images(d, n=20, split="train"):
    out = []
    for lp in label_files(d, split):
        if len(out) >= n:
            break
        ip = img_for(d, split, lp.stem)
        if ip:
            out.append(Image.open(ip).convert("RGB"))
    return out


def grid(images, path, cols=5, tile=200):
    if not images:
        print(f"  (nothing to draw for {path})")
        return
    rows = (len(images) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * tile, rows * tile), (24, 24, 24))
    for i, im in enumerate(images):
        t = im.copy()
        t.thumbnail((tile - 8, tile - 8))
        canvas.paste(t, ((i % cols) * tile + (tile - t.width) // 2,
                         (i // cols) * tile + (tile - t.height) // 2))
    canvas.save(path)
    print(f"  wrote {path}  ({len(images)} images)")


def stats(d, label, split="train", sample=300):
    """The numbers that settle the crop-vs-scene question without eyeballing."""
    ws, hs, areas, counts = [], [], [], []
    for lp in label_files(d, split)[:sample]:
        ip = img_for(d, split, lp.stem)
        if not ip:
            continue
        with Image.open(ip) as im:
            W, H = im.size
        ws.append(W); hs.append(H)
        rows = [l.split() for l in open(lp) if l.split()]
        counts.append(len(rows))
        for r in rows:
            areas.append(float(r[3]) * float(r[4]))
    med = statistics.median
    print(f"\n  {label}  (n={len(ws)})")
    print(f"    median image size     {med(ws):.0f} x {med(hs):.0f}")
    print(f"    median boxes / image  {med(counts):.1f}")
    print(f"    median box area       {med(areas) * 100:.1f}% of the frame")
    print(f"    boxes over 50% frame  {100 * sum(a > 0.5 for a in areas) / max(1, len(areas)):.0f}%")


print("\n" + "=" * 72)
print("SIZE / BOX STATS — if d5's median box fills most of the frame, d5 is crops")
print("=" * 72)
stats(d1, "d1 combined")
stats(d5, "d5 vest-no-vest")

print("\n" + "=" * 72)
print("GRIDS")
print("=" * 72)
grid(crops(d1, D1_NOVEST), OUT / "grid_1_d1_no_vest_crops.png")
grid(crops(d5, D5_NOVEST), OUT / "grid_2_d5_no_vest_crops.png")
grid(full_images(d5),      OUT / "grid_3_d5_full_images.png")

print("\nDownload the three PNGs from the Output tab.")

# Show them inline too, so they're visible without downloading.
try:
    from IPython.display import display
    for p in sorted(OUT.glob("grid_*.png")):
        print(p.name)
        display(Image.open(p))
except Exception as e:
    print(f"(inline display unavailable: {e})")
