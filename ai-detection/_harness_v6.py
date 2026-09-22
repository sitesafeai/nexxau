"""Local smoke-test for kaggle_train_v6.py. Not for Kaggle — throwaway.

Execs the REAL script with only the parts that need GPU/network/scale swapped out,
then prints exactly which lines were substituted so coverage is auditable.
"""
import os, re, sys, pathlib, random
os.environ["YOLO_CONFIG_DIR"] = "/tmp/Ultralytics"

# ── fixtures: 5 fake roboflow datasets + a 14-class stand-in for best_ppe_v5.pt ──
H = pathlib.Path("/tmp/h")
if not (H / "fake_v5.pt").exists():
    import numpy as np
    from PIL import Image
    from ultralytics import YOLO
    random.seed(0); np.random.seed(0)
    SPECS = {"Personal-Protective-Equipment---Combined-Model-8": (14, 12),
             "PPEs-1": (10, 10), "construction-safety-2": (5, 10),
             "BAC_HIEN_CONSTRUCTION_SAFETY_2024-1": (3, 10), "vest-no-vest-1": (2, 10)}
    for name, (nc, n) in SPECS.items():
        for split in (["train", "valid"] if name.startswith("Personal") else ["train"]):
            (H / name / split / "images").mkdir(parents=True, exist_ok=True)
            (H / name / split / "labels").mkdir(parents=True, exist_ok=True)
            for k in range(n):
                stem = f"{name[:6]}_{split}_{k}"
                Image.fromarray(np.random.randint(0, 255, (64, 64, 3), dtype="uint8")) \
                     .save(H / name / split / "images" / f"{stem}.jpg")
                (H / name / split / "labels" / f"{stem}.txt").write_text(
                    f"{random.randrange(nc)} 0.5 0.5 0.3 0.3\n")
        (H / name / "data.yaml").write_text(
            "names: ['vest','no-vest']\nnc: 2\n" if name == "vest-no-vest-1"
            else f"names: {list(range(nc))}\nnc: {nc}\n")
    m = YOLO("yolov8n.yaml")
    m.model.names = dict(enumerate(
        ['Fall-Detected','Gloves','Goggles','Hardhat','Ladder','Mask','NO-Gloves',
         'NO-Goggles','NO-Hardhat','NO-Mask','NO-Safety Vest','Person','Safety Cone',
         'Safety Vest']))
    m.save(H / "fake_v5.pt")
    print("fixtures built in /tmp/h")

SRC = pathlib.Path("/sessions/tender-zealous-edison/mnt/nexxau/ai-detection/kaggle_train_v6.py")
src = SRC.read_text()
subs = []

def sub(old, new, why):
    global src
    assert old in src, f"harness is stale, missing: {old[:60]!r}"
    src = src.replace(old, new, 1)
    subs.append(why)

sub("!pip install ultralytics roboflow -q", "", "pip cell")

# ── weights: real v5 is a 52MB GitHub asset; use a 14-class yolov8n stand-in ──
a = src.index("# ── 1. v5 weights")
b = src.index("# ── 2. Class spaces")
src = src[:a] + 'V5_WEIGHTS = "/tmp/h/fake_v5.pt"\nprint("harness weights:", V5_WEIGHTS)\n\n' + src[b:]
subs.append("section 1 (weight download + size assert)")

# ── datasets: roboflow downloads 63k images; use local fixtures ──────────────
a = src.index("rf = Roboflow(")
b = src.index("# Source index → OLD master index")
src = src[:a] + '''
class _D:
    def __init__(s, p): s.location = "/tmp/h/" + p
d1 = _D("Personal-Protective-Equipment---Combined-Model-8")
d2 = _D("PPEs-1")
d3 = _D("construction-safety-2")
d4 = _D("BAC_HIEN_CONSTRUCTION_SAFETY_2024-1")
d5 = _D("vest-no-vest-1")

''' + src[b:]
subs.append("section 3 roboflow downloads")

sub("from roboflow import Roboflow", "", "roboflow import")
sub('assert n_train > 60000, f"expected ~63k train images, got {n_train}"',
    'assert n_train > 0', "63k-image size assert")
sub("assert total_added > 2000, (", "assert total_added >= 0, (", "pseudo-label yield floor")
sub("if added[person_idx] < 5000:", "if added[person_idx] < 0:", "Person yield warning floor")
sub("base_model.val(data=f\"{VAL_OLD}/data.yaml\", imgsz=640, device=0,",
    "base_model.val(data=f\"{VAL_OLD}/data.yaml\", imgsz=64, device='cpu',", "val device/imgsz")
sub("conf=PSEUDO_CONF, imgsz=640,", "conf=PSEUDO_CONF, imgsz=64,", "predict imgsz")
sub("stream=True, verbose=False, device=0)", "stream=True, verbose=False, device='cpu')", "predict device")
sub("    epochs=12,\n    batch=16,\n    imgsz=640,\n    device='0,1',",
    "    epochs=2,\n    batch=2,\n    imgsz=64,\n    device='cpu',", "train scale/device")
sub('project="/kaggle/working", name="ppe_v6",', 'project="/tmp/h/runs", name="ppe_v6",', "output dir")
src = src.replace("/kaggle/temp", "/tmp/h/work")

print("SUBSTITUTED:", *[f"\n  - {s}" for s in subs], "\n" + "=" * 72)
exec(compile(src, "kaggle_train_v6.py(harness)", "exec"), {"__name__": "__main__"})
print("=" * 72 + "\nHARNESS REACHED END OF SCRIPT")
