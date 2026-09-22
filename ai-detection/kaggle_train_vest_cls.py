"""
vest_cls_v2 — crop the person, classify the crop. Now with a val set that is actually held out.

Run as ONE Kaggle cell. Settings → Accelerator: GPU T4 (x1 is fine), Internet: On.
Runtime ~30 min. Training itself is ~15 min.

WHY THIS EXISTS
  On d1's val split, v5 scores Person 0.884 and NO-Safety Vest 0.214 (recall 0.14 in v4).
  The model finds people fine; it cannot judge whether the person wears a vest. Two
  detector runs (v5: +6.5k vest images, v6: drop 4 classes + pseudo-label) failed to move
  it, for ~20 GPU-hours. NO-Safety Vest is not an object — it is the ABSENCE of one, and
  localising an absence is the hardest version of the problem. So: keep the detector for
  Person, hand each person crop to a binary classifier.

WHAT v1 GOT WRONG — READ THIS BEFORE TRUSTING ANY NUMBER BELOW
  v1 reported 0.980 recall. It was inflated. check_val_leakage.py found that 54% of d1's
  valid split appears in the training pool as a near-duplicate, and 11.5% is byte-for-byte
  identical. d1's own train and valid splits overlap; d3 and d5 reshare images with it too.
  v1 was scoring the classifier on photos it had trained on.

  This version fingerprints every d1-valid image and EXCLUDES any training image that is a
  near-duplicate of one, before cropping. Val stays exactly d1's valid split, so the result
  remains comparable to the detector's 0.214 — deliberately, because that 0.214 was itself
  measured under leakage and is therefore flattering to the thing we are trying to beat.

  Same caveat applies to every number in CLAUDE.md: v4's 0.786, v5's 0.779, the 0.7252
  "clean" baseline and v6's 0.7270 were all measured on a contaminated val set.

SHIPPING
  A SECOND model, ~3MB. railway_service.py loads it beside the detector, crops each Person
  box, classifies. Python service only — no class-name sync, no app deploy, no CustomRule
  migration. Costs latency proportional to people in view. Measured on ground-truth crops,
  so verify on a live camera before trusting it: real detector boxes are looser.
"""

!pip install ultralytics roboflow -q

import os
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
# One log LINE per progress-bar tick under Kaggle floods the output stream and kills the
# session. See kaggle_train_v6.py — this cost a run.
os.environ["YOLO_VERBOSE"] = "false"

import shutil, yaml, random, statistics, json, hashlib
from pathlib import Path
from collections import Counter, defaultdict
import numpy as np
from PIL import Image
from roboflow import Roboflow
from ultralytics import YOLO

# The env var above only works if set before ultralytics is first imported. These are
# re-read every time a progress bar is built, so they hold on a cell re-run too.
import logging, ultralytics.utils as _uu
_uu.VERBOSE = False
_uu.LOGGER.setLevel(logging.WARNING)

random.seed(0)

# Check this BEFORE the 10-minute download and crop pass. The v2 run burned exactly that
# much time before failing here because the notebook was still set to Accelerator: None
# from the leakage check.
import torch
assert torch.cuda.is_available(), (
    "No GPU visible. Kaggle → Settings → Accelerator → GPU T4, then re-run. "
    f"(torch.cuda.is_available()=False, device_count={torch.cuda.device_count()})")
print(f"GPU OK: {torch.cuda.get_device_name(0)}")

# ── Tunables ─────────────────────────────────────────────────────────────────
PAD       = 0.10   # context around the box. Shoulders help; too much drags in neighbours.
MIN_PX    = 32     # drop slivers. The data inspection found boxes a few px wide.
IMGSZ     = 224    # yolov8n-cls is ImageNet-pretrained at 224.
EPOCHS    = 20
BATCH     = 64
NEAR_MAX  = 5      # dhash hamming distance treated as "the same photo"
DATA      = "/kaggle/temp/vestcls"   # NOT /kaggle/working — that made v6's output 6.27GB

EXTS = (".jpg", ".jpeg", ".png")
norm   = lambda s: str(s).lower().replace("_", " ").replace("-", " ").strip()
is_neg = lambda s: s.startswith("no ") or s.startswith("non ") or "without" in s

# ── 1. Datasets ──────────────────────────────────────────────────────────────
rf = Roboflow(api_key="GVzubtAOa82zLvnx1DAg")
d1 = rf.workspace("roboflow-universe-projects").project(
    "personal-protective-equipment-combined-model").version(8).download("yolov8")
d3 = rf.workspace("roboflow-100").project("construction-safety-gsnvb").version(2).download("yolov8")
d5 = rf.workspace("arman-keresh-lbrre").project("vest-no-vest").version(1).download("yolov8")

def vest_classes(d):
    """Resolve (no-vest, vest) indices by NAME. Hand-written indices are what made the
    v6 class maps unauditable; never guess an index here."""
    ns = yaml.safe_load(open(f"{d.location}/data.yaml"))["names"]
    neg = pos = None
    for i, n in enumerate(ns):
        s = norm(n)
        if "vest" not in s:
            continue
        if is_neg(s) and neg is None:
            neg = i
        elif not is_neg(s) and pos is None:
            pos = i
    return ns, neg, pos

SOURCES = {}
for tag, d in (("d1", d1), ("d3", d3), ("d5", d5)):
    ns, neg, pos = vest_classes(d)
    print(f"{tag}: {ns}\n    no-vest={neg}  vest={pos}")
    assert neg is not None and pos is not None, f"{tag}: could not resolve vest classes from {ns}"
    SOURCES[tag] = (d, neg, pos)

# ── 2. Fingerprint the val split, so training can be held away from it ───────
# dhash: 9x8 grayscale, compare horizontally adjacent pixels -> 64 bits. Survives
# re-encoding and resizing, which is how roboflow reshares the same photo between
# projects under a different filename.
def dhash(path):
    try:
        im = Image.open(path).convert("L")
    except Exception:
        return None
    a = np.asarray(im.resize((9, 8), Image.BILINEAR), dtype=np.int16)
    return int(np.packbits((a[:, 1:] > a[:, :-1]).flatten()).view(np.uint64)[0])

# Banded LSH. With 6 bands and at most 5 differing bits, the pigeonhole principle
# guarantees at least one band matches exactly — so bucket lookup is exact for
# hamming <= 5, and avoids 43,599 x 8,814 brute-force comparisons.
BANDS = [(0, 11), (11, 11), (22, 11), (33, 11), (44, 10), (54, 10)]
def band_keys(h):
    return [(i, (h >> s) & ((1 << w) - 1)) for i, (s, w) in enumerate(BANDS)]

popcount = lambda x: bin(x).count("1")

def images_in(d, split):
    p = Path(d.location) / split / "images"
    return sorted(q for q in p.glob("*") if q.suffix.lower() in EXTS) if p.exists() else []

print("\nFingerprinting the val split (d1 valid)…")
val_index = defaultdict(list)
val_hashes = []
for q in images_in(d1, "valid"):
    h = dhash(q)
    if h is None:
        continue
    val_hashes.append(h)
    for k in band_keys(h):
        val_index[k].append(h)
print(f"  {len(val_hashes):,} val images fingerprinted")
assert val_hashes, "no val images — check d1's valid split"

def leaks_into_val(path):
    h = dhash(path)
    if h is None:
        return False
    for k in band_keys(h):
        for vh in val_index.get(k, ()):
            if popcount(h ^ vh) <= NEAR_MAX:
                return True
    return False

# ── 3. Crop into a classification tree ───────────────────────────────────────
counts = Counter()
excluded = Counter()
sizes = []

def extract(d, tag, neg, pos, split, dest):
    """One output crop per labelled box. dest is 'train' or 'val'.
    Training images that near-match a val image are skipped entirely."""
    lbldir = Path(d.location) / split / "labels"
    if not lbldir.exists():
        return
    for lp in sorted(lbldir.glob("*.txt")):
        rows = [l.split() for l in open(lp) if l.split()]
        want = [r for r in rows if int(r[0]) in (neg, pos)]
        if not want:
            continue
        ip = None
        base = Path(d.location) / split / "images"
        for e in EXTS:
            if (base / (lp.stem + e)).exists():
                ip = base / (lp.stem + e)
                break
        if ip is None:
            continue
        if dest == "train" and leaks_into_val(ip):
            excluded[f"{tag}_{split}"] += 1
            continue
        try:
            im = Image.open(ip).convert("RGB")
        except Exception:
            continue
        W, H = im.size
        for k, r in enumerate(want):
            cls = "no_vest" if int(r[0]) == neg else "vest"
            cx, cy, bw, bh = (float(x) for x in r[1:5])
            x1 = max(0, int((cx - bw / 2 - PAD * bw) * W))
            y1 = max(0, int((cy - bh / 2 - PAD * bh) * H))
            x2 = min(W, int((cx + bw / 2 + PAD * bw) * W))
            y2 = min(H, int((cy + bh / 2 + PAD * bh) * H))
            if x2 - x1 < MIN_PX or y2 - y1 < MIN_PX:
                counts[f"skipped_small_{cls}"] += 1
                continue
            out = Path(DATA) / dest / cls
            out.mkdir(parents=True, exist_ok=True)
            im.crop((x1, y1, x2, y2)).save(out / f"{tag}_{split}_{lp.stem}_{k}.jpg", quality=92)
            counts[f"{dest}_{cls}"] += 1
            sizes.append(min(x2 - x1, y2 - y1))

shutil.rmtree(DATA, ignore_errors=True)
print("\nExtracting crops (this also drops leaked training images)…")

extract(d1, "d1", SOURCES["d1"][1], SOURCES["d1"][2], "valid", "val")
extract(d1, "d1", SOURCES["d1"][1], SOURCES["d1"][2], "train", "train")
for tag in ("d3", "d5"):
    d, neg, pos = SOURCES[tag]
    for split in ("train", "valid", "test"):
        if (Path(d.location) / split / "images").exists():
            extract(d, tag, neg, pos, split, "train")

print("\n── training images dropped for leaking into val ──")
if excluded:
    for k in sorted(excluded):
        print(f"  {k:24} {excluded[k]:>7,}")
    print(f"  {'TOTAL':24} {sum(excluded.values()):>7,}")
    print("\n  Where these land tells you whose fault the contamination is:")
    print("  heavy d1_train  → d1's own splits overlap, so every detector number is suspect")
    print("  heavy d3/d5     → those projects reshare d1's photos")
else:
    print("  none — which would be surprising given the leakage report; verify NEAR_MAX")

print("\n── crop counts ──")
for k in sorted(counts):
    print(f"  {k:24} {counts[k]:>7,}")
if sizes:
    print(f"  median crop short side   {statistics.median(sizes):.0f}px")

tr_v, tr_n = counts["train_vest"], counts["train_no_vest"]
va_v, va_n = counts["val_vest"], counts["val_no_vest"]
assert tr_v > 500 and tr_n > 500, (
    f"Not enough training crops after de-leaking (vest={tr_v}, no_vest={tr_n}). If the "
    f"exclusion ate almost everything, the two datasets are near-identical and this val "
    f"set cannot be used at all — rebuild it from a source d1 does not contain.")
assert va_v > 50 and va_n > 50, (
    f"Val set too small (vest={va_v}, no_vest={va_n}) to trust any number this produces.")
ratio = max(tr_v, tr_n) / max(1, min(tr_v, tr_n))
print(f"\n  class balance {ratio:.1f}:1"
      + ("  — skewed; read per-class recall below, not accuracy" if ratio > 2 else ""))

# ── 4. Train ─────────────────────────────────────────────────────────────────
# Single GPU on purpose. ~15 min; DDP adds a failure mode for no benefit.
model = YOLO("yolov8n-cls.pt")

def _epoch_line(trainer):
    m = trainer.metrics or {}
    ep = min(trainer.epoch + 1, trainer.epochs)
    print(f"  epoch {ep:>2}/{trainer.epochs}  top1 {m.get('metrics/accuracy_top1', float('nan')):.4f}",
          flush=True)

model.add_callback("on_fit_epoch_end", _epoch_line)
print(f"\nTraining {EPOCHS} epochs at {IMGSZ}px — one line per epoch:")
model.train(data=DATA, epochs=EPOCHS, imgsz=IMGSZ, batch=BATCH, device=0,
            project="/kaggle/working", name="vest_cls", plots=False)

# ── 5. Evaluate ──────────────────────────────────────────────────────────────
# top1 hides everything on a skewed binary problem. The product needs: of people genuinely
# without a vest, how many do we catch (recall); of alerts raised, how many are real
# (precision).
best = Path("/kaggle/working/vest_cls/weights/best.pt")
clf = YOLO(str(best))
NAMES = clf.names
NEG_I = [i for i, n in NAMES.items() if n == "no_vest"][0]
print(f"\nclass index map: {NAMES}   (no_vest = {NEG_I})")

val_files, val_truth = [], []
for cls in ("no_vest", "vest"):
    for p in (Path(DATA) / "val" / cls).glob("*.jpg"):
        val_files.append(str(p))
        val_truth.append(1 if cls == "no_vest" else 0)

probs = []
CH = 64
for i in range(0, len(val_files), CH):
    for r in clf.predict(source=val_files[i:i + CH], imgsz=IMGSZ, verbose=False,
                         device=0, stream=True):
        probs.append(float(r.probs.data[NEG_I]))

def prf(thresh):
    tp = sum(1 for p, t in zip(probs, val_truth) if p >= thresh and t == 1)
    fp = sum(1 for p, t in zip(probs, val_truth) if p >= thresh and t == 0)
    fn = sum(1 for p, t in zip(probs, val_truth) if p < thresh and t == 1)
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return prec, rec, f1

print("\n" + "=" * 72)
print(f"NO-VEST quality on {va_n:,} held-out no-vest crops / {va_v:,} vest crops")
print("=" * 72)
print(f"  {'threshold':>10}  {'precision':>10}  {'recall':>8}  {'F1':>7}")
best_f1 = (0, 0)
for t in [0.25, 0.35, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9]:
    p, r, f = prf(t)
    if f > best_f1[0]:
        best_f1 = (f, t)
    print(f"  {t:>10.2f}  {p:>10.3f}  {r:>8.3f}  {f:>7.3f}")

p, r, f = prf(best_f1[1])
print(f"\n>>> best F1 {f:.3f} at threshold {best_f1[1]:.2f}  (precision {p:.3f}, recall {r:.3f})")
print(">>> v1 claimed 0.980 recall with a leaked val set. THIS is the number that counts.")
print(">>> Ships today: NO-Safety Vest recall 0.14 — itself measured under leakage, so it")
print(">>> flatters the incumbent. Beat it by a wide margin or the approach is not proven.")

json.dump({"threshold": best_f1[1], "precision": p, "recall": r, "f1": f,
           "val_no_vest": va_n, "val_vest": va_v, "train_no_vest": tr_n, "train_vest": tr_v,
           "excluded_for_leakage": sum(excluded.values())},
          open("/kaggle/working/vest_cls_result.json", "w"), indent=2)
print(f"\nWeights: {best}")
