"""
ppe_v5 — fine-tune ppe_v4 with a targeted vest dataset.

Run as ONE Kaggle cell. Settings → Accelerator: GPU T4 x2, Internet: On.
Everything is in one cell deliberately: Kaggle session resets wipe variables, and a
single cell means a restart re-runs the whole pipeline instead of dying on a NameError.

Why fine-tune instead of retrain from yolov8m.pt:
  v4 already reached 0.789 mAP@50 over 30 epochs / 10.6h. The weakness is one class
  (NO-Safety Vest: precision 0.701, recall 0.140), which is a data-starvation problem,
  not an undertrained-backbone problem. Starting from v4's weights at 1/10th the
  learning rate keeps everything it already knows and spends the compute on the gap.
  ~4h instead of ~11h.

Known trade-off:
  vest-no-vest labels ONLY vest/no-vest. Its images contain unlabeled hardhats, people
  and gloves, which act as negative examples for those classes. Expect Hardhat (0.898)
  and Person (0.651) to lose a point or two. That is the price of the vest recall fix.
"""

!pip install ultralytics roboflow -q

import os, shutil, yaml
from pathlib import Path
from roboflow import Roboflow
from ultralytics import YOLO

# ── 1. Get the v4 weights ────────────────────────────────────────────────────
# Two ways in. Preferred: attach ppe_v4's best.pt as a Kaggle Dataset (Add Input →
# your uploaded dataset) so the run doesn't depend on a network fetch. Fallback:
# pull from the GitHub release. Update V4_RELEASE_URL if your tag/filename differs.
V4_RELEASE_URL = "https://github.com/sitesafeai/nexxau/releases/download/v4/best_ppe_v4.pt"

v4_candidates = list(Path("/kaggle/input").glob("**/best*.pt"))
if v4_candidates:
    V4_WEIGHTS = str(v4_candidates[0])
    print(f"Using attached v4 weights: {V4_WEIGHTS}")
else:
    V4_WEIGHTS = "/kaggle/working/best_ppe_v4.pt"
    print(f"No attached weights found, downloading from {V4_RELEASE_URL}")
    os.system(f'wget -q -O "{V4_WEIGHTS}" "{V4_RELEASE_URL}"')

# A truncated/404 download shows up as a tiny file. Catch it here rather than 20
# minutes into training with an opaque torch.load error.
size_mb = os.path.getsize(V4_WEIGHTS) / 1e6
assert size_mb > 40, f"v4 weights look wrong: {size_mb:.1f}MB (expected ~52MB)"
print(f"v4 weights OK: {size_mb:.1f}MB")

# ── 2. Download datasets ─────────────────────────────────────────────────────
rf = Roboflow(api_key="GVzubtAOa82zLvnx1DAg")

d1 = rf.workspace("roboflow-universe-projects").project("personal-protective-equipment-combined-model").version(8).download("yolov8")
d2 = rf.workspace("personal-protective-equipment").project("ppes-kaxsi").version(1).download("yolov8")
d3 = rf.workspace("roboflow-100").project("construction-safety-gsnvb").version(2).download("yolov8")
d4 = rf.workspace("constructionsatefy").project("bac_hien_construction_safety_2024").version(1).download("yolov8")
d5 = rf.workspace("arman-keresh-lbrre").project("vest-no-vest").version(1).download("yolov8")   # NEW

# ── 3. Class mapping ─────────────────────────────────────────────────────────
# Index positions are load-bearing. A mismatch here trains silently on wrong labels
# and you won't find out until the model ships. 10 = NO-Safety Vest, 13 = Safety Vest.
MASTER_CLASSES = [
    'Fall-Detected','Gloves','Goggles','Hardhat','Ladder',
    'Mask','NO-Gloves','NO-Goggles','NO-Hardhat','NO-Mask',
    'NO-Safety Vest','Person','Safety Cone','Safety Vest'
]
D2_MAP = {0:1,1:2,2:3,3:5,4:6,5:7,6:8,7:9,8:-1,9:-1}
D3_MAP = {0:3,1:8,2:10,3:11,4:13}
D4_MAP = {0:3,1:8,2:11}

# d5's class ORDER is not documented on the Roboflow page, and guessing it is exactly
# how you end up training "vest" as "no vest". So: read its own data.yaml and build the
# map by NAME, then print it for eyeball confirmation before anything trains.
with open(f"{d5.location}/data.yaml") as f:
    d5_names = yaml.safe_load(f)["names"]

def vest_target(name: str) -> int:
    n = name.lower().replace("_", " ").replace("-", " ").strip()
    # Order matters: check the negative form first, since "no vest" contains "vest".
    if n.startswith("no ") or n.startswith("non ") or "without" in n:
        return 10   # NO-Safety Vest
    if "vest" in n:
        return 13   # Safety Vest
    return -1       # anything unexpected gets dropped, not guessed at

D5_MAP = {i: vest_target(n) for i, n in enumerate(d5_names)}

print("\n── d5 (vest-no-vest) class mapping ──")
for i, n in enumerate(d5_names):
    tgt = D5_MAP[i]
    print(f"  {i}: {n!r:24} → {MASTER_CLASSES[tgt] if tgt >= 0 else 'DROPPED'}")

# If neither vest class resolved, the dataset's schema changed — stop rather than
# train on a set where every vest label was silently discarded.
assert 13 in D5_MAP.values() or 10 in D5_MAP.values(), \
    f"No vest classes resolved from d5 names={d5_names} — check the mapping above"

# ── 4. Merge ─────────────────────────────────────────────────────────────────
def remap_labels(src, dst, cmap):
    os.makedirs(dst, exist_ok=True)
    for f in Path(src).glob("*.txt"):
        out = []
        for line in open(f):
            p = line.strip().split()
            if not p: continue
            nc = cmap.get(int(p[0]), -1)
            if nc == -1: continue
            out.append(f"{nc} {' '.join(p[1:])}")
        if out:
            open(os.path.join(dst, f.name), 'w').write("\n".join(out)+"\n")

def copy_imgs(src, dst):
    os.makedirs(dst, exist_ok=True)
    for f in Path(src).glob("*"):
        if f.suffix.lower() in ('.jpg','.jpeg','.png'):
            shutil.copy2(f, dst)

MERGED = "/kaggle/working/merged"

# d1 is already in master class order — straight copy, no remap.
for split in ['train','valid']:
    copy_imgs(f"{d1.location}/{split}/images", f"{MERGED}/{split}/images")
    os.makedirs(f"{MERGED}/{split}/labels", exist_ok=True)
    for f in Path(f"{d1.location}/{split}/labels").glob("*.txt"):
        shutil.copy2(f, f"{MERGED}/{split}/labels")

for d, cmap in [(d2,D2_MAP),(d3,D3_MAP),(d4,D4_MAP),(d5,D5_MAP)]:
    for split in ['train','valid']:
        copy_imgs(f"{d.location}/{split}/images", f"{MERGED}/{split}/images")
        remap_labels(f"{d.location}/{split}/labels", f"{MERGED}/{split}/labels", cmap)

yaml.dump({'train':f"{MERGED}/train/images",'val':f"{MERGED}/valid/images",
           'nc':14,'names':MASTER_CLASSES}, open(f"{MERGED}/data.yaml",'w'))

n_train = len(list(Path(f"{MERGED}/train/images").glob("*")))
n_val   = len(list(Path(f"{MERGED}/valid/images").glob("*")))
print(f"\nTrain: {n_train}  Val: {n_val}")
# v4 trained on 56,877 / 12,838. Roughly +6.5k train confirms d5 actually landed.
assert n_train > 60000, f"Expected ~63k train images, got {n_train} — d5 may not have merged"

# Per-class instance counts. This is the number that explains the result: if
# NO-Safety Vest is still tiny relative to Hardhat, the imbalance wasn't fixed.
counts = {i: 0 for i in range(14)}
for f in Path(f"{MERGED}/train/labels").glob("*.txt"):
    for line in open(f):
        p = line.split()
        if p: counts[int(p[0])] += 1
print("\n── train instances per class ──")
for i, name in enumerate(MASTER_CLASSES):
    print(f"  {name:18} {counts[i]:>7,}")

# ── 5. Fine-tune ─────────────────────────────────────────────────────────────
model = YOLO(V4_WEIGHTS)   # NOT yolov8m.pt — that would throw away v4 entirely
model.train(
    data=f"{MERGED}/data.yaml",
    epochs=10,              # fine-tune, not a fresh run; ~23 min/epoch ≈ 4h
    batch=16,
    imgsz=640,
    device='0,1',
    # 10x lower than v4's 0.01. At full LR the first epochs would blow away the
    # features v4 spent 10 hours learning before the vest data has any effect.
    lr0=0.001,
    lrf=0.01,
    warmup_epochs=1.0,
    patience=10,
    # Same augmentation as v4 so the comparison is apples-to-apples.
    degrees=15, translate=0.15, scale=0.6, hsv_v=0.4, erasing=0.4,
    project="/kaggle/working", name="ppe_v5",
)
