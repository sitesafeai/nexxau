"""
ppe_v6 — drop 4 unused classes, pseudo-label the merge, fine-tune from v5.

Run as ONE Kaggle cell. Settings → Accelerator: GPU T4 x2, Internet: On.
Runtime ~4h (≈25 min pseudo-labelling + 12 epochs).

TWO CHANGES, BOTH AIMED AT MEAN mAP@50
  1. Dropped Gloves, NO-Gloves, Ladder, Safety Cone — 14 classes → 10. Fewer classes means fewer
     cross-dataset conflicts and more gradient budget on what's left.
  2. Pseudo-labelling. Five source datasets each annotate a different subset of the
     classes. When vest-no-vest images (full of hardhats) carry no Hardhat labels, every
     one of those hardhats trains the model to SUPPRESS Hardhat. That is why v5 scored
     0.560 recall on Person with 18,732 training instances — worse than stock COCO
     YOLOv8m gets for free — and why adding d5 cost NO-Hardhat 6 points.
     Fix: run v5 over each dataset, fill in the classes that dataset doesn't annotate,
     keep only high-confidence boxes, never touch a human label.

MEASUREMENT — READ BEFORE COMPARING NUMBERS
  v6 validates on d1's split ONLY. d1 is the one source annotating every class
  consistently; the 5-way merged val set v5 was scored against had the same missing-label
  problem, so it counted correct detections as false positives. v5's headline 0.779 is
  therefore NOT comparable to anything below.
  This script re-scores v5 on the clean val set and prints a mean over the 10 surviving
  classes. Compare v6 against THAT number. Expect it to come out above 0.779 — some of
  v5's apparent weakness was bad validation labels, not a bad model.

  Val is never pseudo-labelled. Grading a model against its own predictions would
  manufacture improvement that doesn't exist.
"""

!pip install ultralytics roboflow -q

import os
# Must be set before torch initialises its CUDA allocator. Reduces fragmentation, which
# is what turned a recoverable allocation into an OOM on the 14.5GB T4.
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
# Ultralytics writes one log LINE per progress-bar tick under Kaggle (no TTY to
# overwrite). The val scan alone is ~80 lines, the train loop is thousands, and Kaggle
# kills a session that floods its output stream — which is how the v6.3 run died at
# 223s, mid-scan. Must be set before ultralytics is imported.
os.environ["YOLO_VERBOSE"] = "false"

import shutil, yaml, glob
import numpy as np
from pathlib import Path
from roboflow import Roboflow
from ultralytics import YOLO

# Belt and braces on the output-flood fix. YOLO_VERBOSE above only takes effect if it is
# set BEFORE ultralytics is first imported — re-running this cell in a live Kaggle
# session hits a cached sys.modules entry and the env var does nothing. These two lines
# are re-read every time a progress bar is constructed
# (disable = not VERBOSE or LOGGER.getEffectiveLevel() > 20), so they hold either way.
import logging, ultralytics.utils as _uu
_uu.VERBOSE = False
_uu.LOGGER.setLevel(logging.WARNING)

# ── Tunables ─────────────────────────────────────────────────────────────────
# Only predictions at/above this become pseudo-labels. High on purpose: a wrong label
# actively teaches error, so missing some beats adding bad ones. Drop to 0.50 for more
# coverage at lower quality if a class stays starved.
PSEUDO_CONF = 0.45
# A prediction overlapping an existing human label by more than this is discarded —
# stops one worker being labelled both Hardhat and NO-Hardhat. Checked ONLY against
# labels in the same conflict group (below). v6.2 compared against every class, so a
# Person prediction was killed by the vest box drawn on that same person — which threw
# away the entire point of pseudo-labelling d5.
PSEUDO_IOU_SKIP = 0.45
# Classes that cannot coexist on the same box. Anything not listed never conflicts.
CONFLICT_GROUPS = [
    {'Hardhat', 'NO-Hardhat'},
    {'Mask', 'NO-Mask'},
    {'Goggles', 'NO-Goggles'},
    {'Safety Vest', 'NO-Safety Vest'},
]

V5_RELEASE_URL = "https://github.com/sitesafeai/nexxau/releases/download/v5/best_ppe_v5.pt"

# ── 1. v5 weights ────────────────────────────────────────────────────────────
cands = [p for p in glob.glob("/kaggle/input/**/*.pt", recursive=True) if "v5" in p.lower()]
if cands:
    V5_WEIGHTS = cands[0]
    print(f"Using attached v5 weights: {V5_WEIGHTS}")
else:
    V5_WEIGHTS = "/kaggle/working/best_ppe_v5.pt"
    print(f"Downloading v5 from {V5_RELEASE_URL}")
    os.system(f'wget -q -O "{V5_WEIGHTS}" "{V5_RELEASE_URL}"')

size_mb = os.path.getsize(V5_WEIGHTS) / 1e6
assert size_mb > 40, f"v5 weights look wrong: {size_mb:.1f}MB (expected ~52MB)"
print(f"v5 weights OK: {size_mb:.1f}MB")

# ── 2. Class spaces ──────────────────────────────────────────────────────────
# OLD = what v5 emits (14). NEW = what v6 trains on (10). The OLD→NEW table is derived
# by NAME rather than hand-written indices, so it cannot silently drift.
OLD_CLASSES = [
    'Fall-Detected','Gloves','Goggles','Hardhat','Ladder',
    'Mask','NO-Gloves','NO-Goggles','NO-Hardhat','NO-Mask',
    'NO-Safety Vest','Person','Safety Cone','Safety Vest'
]
# Gloves and NO-Gloves go together deliberately. They are the same object in two states,
# so keeping only the violation half would strip the contrastive signal that makes it
# detectable — and every gloved hand would become an unlabelled negative, which is the
# exact contamination this run exists to remove.
DROPPED = {'Gloves', 'NO-Gloves', 'Ladder', 'Safety Cone'}
NEW_CLASSES = [c for c in OLD_CLASSES if c not in DROPPED]
OLD_TO_NEW = {i: (NEW_CLASSES.index(c) if c not in DROPPED else -1)
              for i, c in enumerate(OLD_CLASSES)}

print(f"\n{len(OLD_CLASSES)} → {len(NEW_CLASSES)} classes (dropped: {', '.join(sorted(DROPPED))})")
print("NEW_CLASSES:", NEW_CLASSES)
assert len(NEW_CLASSES) == 10

# new-class-index → set of new-class indices it conflicts with (plus itself).
CONFLICTS = {}
for i, name in enumerate(NEW_CLASSES):
    peers = {i}
    for g in CONFLICT_GROUPS:
        if name in g:
            peers |= {NEW_CLASSES.index(c) for c in g if c in NEW_CLASSES}
    CONFLICTS[i] = peers

# ── 3. Datasets ──────────────────────────────────────────────────────────────
rf = Roboflow(api_key="GVzubtAOa82zLvnx1DAg")
d1 = rf.workspace("roboflow-universe-projects").project("personal-protective-equipment-combined-model").version(8).download("yolov8")
d2 = rf.workspace("personal-protective-equipment").project("ppes-kaxsi").version(1).download("yolov8")
d3 = rf.workspace("roboflow-100").project("construction-safety-gsnvb").version(2).download("yolov8")
d4 = rf.workspace("constructionsatefy").project("bac_hien_construction_safety_2024").version(1).download("yolov8")
d5 = rf.workspace("arman-keresh-lbrre").project("vest-no-vest").version(1).download("yolov8")

# Source index → OLD master index (unchanged from v5, kept as the known-good reference).
D1_OLD = {i: i for i in range(14)}
D2_OLD = {0:1,1:2,2:3,3:5,4:6,5:7,6:8,7:9,8:-1,9:-1}
D3_OLD = {0:3,1:8,2:10,3:11,4:13}
D4_OLD = {0:3,1:8,2:11}

with open(f"{d5.location}/data.yaml") as f:
    d5_names = yaml.safe_load(f)["names"]

def vest_target(name):
    n = name.lower().replace("_", " ").replace("-", " ").strip()
    if n.startswith("no ") or n.startswith("non ") or "without" in n:
        return 10                      # NO-Safety Vest (OLD index)
    return 13 if "vest" in n else -1   # Safety Vest
D5_OLD = {i: vest_target(n) for i, n in enumerate(d5_names)}
assert 10 in D5_OLD.values() and 13 in D5_OLD.values(), f"d5 vest classes unresolved: {d5_names}"

# Compose source → OLD → NEW in one step.
def compose(old_map):
    return {src: OLD_TO_NEW.get(old, -1) if old >= 0 else -1 for src, old in old_map.items()}

DATASETS = [(d1, compose(D1_OLD)), (d2, compose(D2_OLD)),
            (d3, compose(D3_OLD)), (d4, compose(D4_OLD)), (d5, compose(D5_OLD))]

# ── 3b. Audit the hand-written index maps against each dataset's own names ───
# D2/D3/D4_OLD are hand-written indices carried over from v5 with no record of how they
# were derived. d2 sends classes 8 and 9 to -1; nothing documents what those are, and a
# 10-class PPE set very often ends in Person / Safety Vest — which v6 then wastes a
# pseudo-labelling pass re-deriving. This prints the actual names so a wrong index is
# visible instead of silently training on mislabelled data.
def audit(d, old_map, label):
    try:
        names = yaml.safe_load(open(f"{d.location}/data.yaml"))["names"]
    except Exception as e:
        print(f"  {label}: couldn't read data.yaml ({e})")
        return
    norm = lambda s: str(s).lower().replace("_", " ").replace("-", " ").strip()
    dropped_norm = {norm(c) for c in DROPPED}
    print(f"\n  {label}  ({len(names)} source classes)")
    for i, n in enumerate(names):
        old = old_map.get(i, -1)
        tgt = OLD_CLASSES[old] if old >= 0 else "— discarded —"
        flag = ""
        if old < 0 and not any(dn in norm(n) or norm(n) in dn for dn in dropped_norm):
            flag = "   <<< CHECK: discarded but not a v6-dropped class"
        print(f"    {i}: {str(n)[:26]:28} → {tgt}{flag}")

print("\n" + "=" * 72)
print("CLASS-MAP AUDIT — every '<<< CHECK' is a real label being thrown away")
print("=" * 72)
for _d, _m, _l in [(d1, D1_OLD, "d1 combined"), (d2, D2_OLD, "d2 PPEs-kaxsi"),
                   (d3, D3_OLD, "d3 construction-safety"), (d4, D4_OLD, "d4 BAC_HIEN"),
                   (d5, D5_OLD, "d5 vest-no-vest")]:
    audit(_d, _m, _l)

print("\nWhat each dataset annotates, in the new 10-class space:")
for d, cmap in DATASETS:
    owned = sorted({v for v in cmap.values() if v >= 0})
    missing = [NEW_CLASSES[i] for i in range(10) if i not in owned]
    print(f"  {Path(d.location).name[:44]:46} owns {len(owned):2}/10"
          f"  → will be pseudo-labelled for: {', '.join(missing) or '(nothing)'}")

# ── 4. Remap into a working tree ─────────────────────────────────────────────
# /kaggle/temp is NOT captured as notebook output. Putting the 63k-image merge under
# /kaggle/working is what made the v5 run's output an 11.98GB zip.
MERGED   = "/kaggle/temp/merged"       # train (10-class, pseudo-labelled)
VAL_NEW  = "/kaggle/temp/val_new"      # d1 valid, 10-class — v6's benchmark
VAL_OLD  = "/kaggle/temp/val_old"      # d1 valid, 14-class — only to re-score v5

def remap_split(src_dir, dst_dir, cmap):
    os.makedirs(f"{dst_dir}/images", exist_ok=True)
    os.makedirs(f"{dst_dir}/labels", exist_ok=True)
    for img in Path(f"{src_dir}/images").glob("*"):
        if img.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
            continue
        lbl = Path(f"{src_dir}/labels") / f"{img.stem}.txt"
        rows = []
        if lbl.exists():
            for line in open(lbl):
                p = line.split()
                if not p:
                    continue
                nc = cmap.get(int(p[0]), -1)
                if nc == -1:
                    continue
                rows.append(f"{nc} {' '.join(p[1:])}")
        # Keep images with zero rows — an empty frame is a valid negative, and
        # pseudo-labelling may add rows below.
        shutil.copy2(img, f"{dst_dir}/images/{img.name}")
        open(f"{dst_dir}/labels/{img.stem}.txt", 'w').write("\n".join(rows) + ("\n" if rows else ""))

print("\nRemapping…")
for d, cmap in DATASETS:
    remap_split(f"{d.location}/train", f"{MERGED}/train", cmap)
remap_split(f"{d1.location}/valid", f"{VAL_NEW}/valid", compose(D1_OLD))
remap_split(f"{d1.location}/valid", f"{VAL_OLD}/valid", D1_OLD)

n_train = len(list(Path(f"{MERGED}/train/images").glob("*")))
n_val   = len(list(Path(f"{VAL_NEW}/valid/images").glob("*")))
print(f"Train: {n_train:,}   Clean val (d1 only): {n_val:,}")
assert n_train > 60000, f"expected ~63k train images, got {n_train}"

yaml.dump({'train': f"{MERGED}/train/images", 'val': f"{VAL_NEW}/valid/images",
           'nc': 10, 'names': NEW_CLASSES}, open(f"{MERGED}/data.yaml", 'w'))
yaml.dump({'train': f"{VAL_OLD}/valid/images", 'val': f"{VAL_OLD}/valid/images",
           'nc': 14, 'names': OLD_CLASSES}, open(f"{VAL_OLD}/data.yaml", 'w'))

# ── 5. Baseline: v5 on the clean val set, averaged over surviving classes ────
print("\n" + "=" * 72)
print("BASELINE — v5 scored on the clean d1-only val set")
print("=" * 72)
# Held in a named variable so it can actually be freed below. Previously this was an
# anonymous YOLO(...).val(...) — the metrics object kept the validator (and its model)
# alive on the GPU, leaving 13GB occupied when pseudo-labelling started.
# This whole block is a REFERENCE NUMBER, not a dependency — v6 trains identically
# without it. Three runs have now died before reaching training, so it gets a blanket
# except: losing the baseline is annoying, losing the run is expensive. Re-derive it
# later with a 5-minute standalone notebook if this prints SKIPPED.
try:
    base_model = YOLO(V5_WEIGHTS)
    base = base_model.val(data=f"{VAL_OLD}/data.yaml", imgsz=640, device=0,
                          batch=8, plots=False, verbose=False)
    # box.ap50 only covers classes PRESENT in the val set, so it is shorter than
    # names whenever a class has no val instances. ap_class_index is the authoritative
    # pairing. The old len()-equality zip silently produced {} and printed nothing.
    ap50 = {base.names[int(c)]: float(v)
            for c, v in zip(base.box.ap_class_index, base.box.ap50)}
    missing_in_val = [n for n in base.names.values() if n not in ap50]
    if missing_in_val:
        print(f"  (no val instances, unscored: {', '.join(missing_in_val)})")
    for k in sorted(ap50):
        print(f"  {k:18} {ap50[k]:.4f}{'   (dropped in v6)' if k in DROPPED else ''}")
    keep = [v for k, v in ap50.items() if k not in DROPPED]
    if keep:
        # Say how many classes actually went into the mean. If it isn't 10, a class had
        # no val instances and this number is not comparable to v6's headline mAP.
        print(f"\n>>> v5 mean mAP@50 over {len(keep)} of the 10 surviving classes: "
              f"{np.mean(keep):.4f}")
        if len(keep) < 10:
            print(">>> WARNING: fewer than 10 classes scored — not directly comparable.")
        print(">>> This is the number v6 must beat. NOT the 0.779 from the v5 run log.")
except Exception as e:
    print(f"BASELINE SKIPPED — {type(e).__name__}: {e}")
    print("Not fatal. Training proceeds; compare v6 against a separately-run v5 val.")

# ── 6. Pseudo-label the training split ───────────────────────────────────────
def iou_xywhn(a, b):
    """IoU of two YOLO-normalised [cx,cy,w,h] boxes."""
    ax1, ay1, ax2, ay2 = a[0]-a[2]/2, a[1]-a[3]/2, a[0]+a[2]/2, a[1]+a[3]/2
    bx1, by1, bx2, by2 = b[0]-b[2]/2, b[1]-b[3]/2, b[0]+b[2]/2, b[1]+b[3]/2
    ix = max(0.0, min(ax2, bx2) - max(ax1, bx1))
    iy = max(0.0, min(ay2, by2) - max(ay1, by1))
    inter = ix * iy
    union = a[2]*a[3] + b[2]*b[3] - inter
    return inter / union if union > 0 else 0.0

# The v6.0 run died here with "Kernel died" 66s in — a host-RAM OOM. Handing
# predict() a single 60k-path list keeps the whole inference pipeline alive for the
# duration and nothing gets reclaimed until it finishes. Chunking bounds peak memory,
# and the RAM% in the progress line makes a repeat obvious instead of mysterious.
import gc, psutil, torch

# Free the baseline model AND its metrics before a second inference pass. The v6.1 run
# OOMed with 13.12GB still resident here, so this is verified rather than assumed.
for _name in ("base", "base_model"):
    if _name in globals():
        del globals()[_name]
gc.collect()
HAS_CUDA = torch.cuda.is_available()
if HAS_CUDA:
    torch.cuda.empty_cache()
def gpu_free():
    return f"{torch.cuda.mem_get_info(0)[0]/1e9:.1f}GB" if HAS_CUDA else "n/a"
print(f"\nGPU free after baseline cleanup: {gpu_free()}")

# Ultralytics batches a LIST source as ONE batch — a 256-path chunk became a 256-image
# forward pass and blew the 14.5GB T4 during warmup. 16 matches the batch size val()
# already ran successfully at on this same GPU, so it is known-safe.
CHUNK = 16

pseudo_model = YOLO(V5_WEIGHTS)      # predicts in OLD (14-class) space
added = {i: 0 for i in range(10)}

print(f"\nPseudo-labelling at conf>={PSEUDO_CONF} (chunk={CHUNK}) …")
for d, cmap in DATASETS:
    owned = {v for v in cmap.values() if v >= 0}
    missing = set(range(10)) - owned
    if not missing:
        print(f"  {Path(d.location).name[:44]:46} annotates everything — skipped")
        continue

    names = {p.stem for p in Path(f"{d.location}/train/images").glob("*")
             if p.suffix.lower() in ('.jpg', '.jpeg', '.png')}
    paths = [str(p) for p in Path(f"{MERGED}/train/images").glob("*") if p.stem in names]
    if not paths:
        continue

    label = Path(d.location).name[:44]
    print(f"  {label:46} {len(paths):,} images to scan")
    before = sum(added.values())

    for start in range(0, len(paths), CHUNK):
        for res in pseudo_model.predict(source=paths[start:start + CHUNK],
                                        conf=PSEUDO_CONF, imgsz=640,
                                        stream=True, verbose=False, device=0):
            lbl_path = f"{MERGED}/train/labels/{Path(res.path).stem}.txt"
            existing = []
            if os.path.exists(lbl_path):
                for line in open(lbl_path):
                    p = line.split()
                    if p:
                        existing.append((int(p[0]), [float(x) for x in p[1:5]]))

            new_rows = []
            for box in (res.boxes or []):
                new_cls = OLD_TO_NEW.get(int(box.cls[0]), -1)
                if new_cls == -1 or new_cls not in missing:
                    continue                   # dropped class, or a human already owns it
                cx, cy, bw, bh = box.xywhn[0].tolist()
                peers = CONFLICTS[new_cls]
                if any(ec in peers and iou_xywhn([cx, cy, bw, bh], e) > PSEUDO_IOU_SKIP
                       for ec, e in existing):
                    continue
                new_rows.append(f"{new_cls} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")
                added[new_cls] += 1

            if new_rows:
                with open(lbl_path, 'a') as f:
                    f.write("\n".join(new_rows) + "\n")
            del res

        chunk_i = start // CHUNK
        # Chunks are small now, so only sweep periodically — gc on every 16 images
        # would cost more than it saves.
        if chunk_i % 50 == 0:
            gc.collect()
            if HAS_CUDA:
                torch.cuda.empty_cache()
        if chunk_i % 250 == 0:
            print(f"    {min(start + CHUNK, len(paths)):>6,}/{len(paths):,}"
                  f"  +{sum(added.values()) - before:,} labels"
                  f"  RAM {psutil.virtual_memory().percent:.0f}%"
                  f"  GPUfree {gpu_free()}", flush=True)

    print(f"  {label:46} +{sum(added.values())-before:,} labels")

print("\n── pseudo-labels added per class ──")
for i, name in enumerate(NEW_CLASSES):
    print(f"  {name:18} +{added[i]:>8,}")
# Guard rails, because this usually runs unattended via Save & Run All.
# Hard-stop only on the clearly-broken case: if almost nothing was added, the whole
# premise of this run failed and 4 GPU-hours would be spent proving it.
total_added = sum(added.values())
print(f"  {'TOTAL':18} +{total_added:>8,}")
# v6.2 aborted here at 414 labels. That was the class-agnostic IoU gate discarding
# Person predictions that overlapped d5's vest boxes, not a bad model — but the abort
# was right to fire. Threshold lowered because the run is still worth having at half
# the expected yield; below 2k the pass did nothing and 4 GPU-hours would prove it.
assert total_added > 2000, (
    f"Pseudo-labelling added only {total_added:,} labels. Aborting before training. "
    f"Check, in order: (1) the per-dataset '+N labels' lines above — if one dataset "
    f"reports 0 images to scan, the stem matching broke; (2) the v5 baseline mAP table "
    f"above — if it's near zero the weights are wrong; (3) PSEUDO_CONF={PSEUDO_CONF}."
)

# Person pseudo-labels are the best single proxy for "did the contamination get fixed":
# d5's 6.5k images are full of unlabelled people, and those are what were training the
# model to suppress the class. (Person's own score on the CLEAN d1 val is already 0.884 —
# the 0.560 recall in the v5 run log was a measurement artefact of the contaminated
# merged val set, not a broken class.)
# Warn rather than abort: even a weak pseudo-label pass still leaves a useful 10-class
# model, so it isn't worth throwing the run away over.
person_idx = NEW_CLASSES.index('Person')
if added[person_idx] < 5000:
    print("\n" + "!" * 72)
    print(f"WARNING: Person gained only {added[person_idx]:,} pseudo-labels.")
    print("The main hypothesis of this run (label contamination suppressed Person)")
    print("is NOT being tested properly. Training continues, but expect Person to stay")
    print("weak. Re-run with PSEUDO_CONF=0.50 if so.")
    print("!" * 72)
else:
    print(f"\n✓ Person gained {added[person_idx]:,} pseudo-labels — hypothesis is being tested.")

# ── 7. Fine-tune ─────────────────────────────────────────────────────────────
# Ultralytics remaps detection-head rows by class NAME when nc changes, so the 10
# surviving classes keep their learned weights rather than restarting from noise.
model = YOLO(V5_WEIGHTS)

# YOLO_VERBOSE=false silences the per-tick progress bars, but it also silences the
# per-epoch summary, which is the one thing worth watching. Print it ourselves: 12
# lines for the whole run instead of ~40k.
def _epoch_line(trainer):
    m = trainer.metrics or {}
    # on_fit_epoch_end fires once more for the final eval pass, and trainer.epoch is
    # 0-indexed — without the min() the last line reads "epoch 13/12".
    ep = min(trainer.epoch + 1, trainer.epochs)
    print(f"  epoch {ep:>2}/{trainer.epochs}"
          f"  mAP50 {m.get('metrics/mAP50(B)', float('nan')):.4f}"
          f"  mAP50-95 {m.get('metrics/mAP50-95(B)', float('nan')):.4f}"
          f"  P {m.get('metrics/precision(B)', float('nan')):.3f}"
          f"  R {m.get('metrics/recall(B)', float('nan')):.3f}", flush=True)

model.add_callback("on_fit_epoch_end", _epoch_line)
print("\nTraining — one line per epoch:")
model.train(
    data=f"{MERGED}/data.yaml",
    epochs=12,
    batch=16,
    imgsz=640,
    device='0,1',
    lr0=0.001, lrf=0.01,        # fine-tune LR, same as v5
    warmup_epochs=1.0,
    patience=12,
    degrees=15, translate=0.15, scale=0.6, hsv_v=0.4, erasing=0.4,
    project="/kaggle/working", name="ppe_v6",
)
