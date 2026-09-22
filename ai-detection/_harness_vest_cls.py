"""Local smoke-test for kaggle_train_vest_cls.py. Throwaway, not for Kaggle.

Runs the real script end-to-end on fake fixtures, CPU, tiny. Prints which lines it
stubbed so coverage is auditable. See MEMORY.md — harness before any Kaggle run.
"""
import os, pathlib, random
os.environ["YOLO_CONFIG_DIR"] = "/tmp/Ultralytics"

H = pathlib.Path("/tmp/vc")
if not (H / "built").exists():
    import numpy as np
    from PIL import Image
    random.seed(0); np.random.seed(0)
    # vest crops get an orange bar painted in so the classifier has real signal to find —
    # otherwise it trains on noise and every metric is 0.5 by construction.
    SPECS = {
        "d1fix": (["Fall-Detected","Gloves","Goggles","Hardhat","Ladder","Mask","NO-Gloves",
                   "NO-Goggles","NO-Hardhat","NO-Mask","NO-Safety Vest","Person",
                   "Safety Cone","Safety Vest"], 10, 13, ["train", "valid"], 80),
        "d3fix": (["helmet","no-helmet","no-vest","person","vest"], 2, 4, ["train"], 40),
        "d5fix": (["no vest","vest"], 0, 1, ["train"], 40),
    }
    def make(a, cls, pos, k):
        cx, cy, bw, bh = 0.25 + 0.5 * k, 0.5, 0.20, 0.35
        if cls == pos:   # paint the "vest"
            x, y = int((cx - .06) * 640), int((cy - .08) * 640)
            a[y:y + 100, x:x + 80] = [255, 140, 0]
        return f"{cls} {cx} {cy} {bw} {bh}"

    for name, (ns, neg, pos, splits, n) in SPECS.items():
        for split in splits:
            (H / name / split / "images").mkdir(parents=True, exist_ok=True)
            (H / name / split / "labels").mkdir(parents=True, exist_ok=True)
            for i in range(n):
                stem = f"im{i}"
                # Low-frequency structure, not white noise. JPEG re-encoding annihilates
                # noise, so noise fixtures make the de-leak check impossible to fail —
                # real photos keep the coarse structure dhash actually keys on.
                seed = np.random.randint(0, 200, (8, 8, 3)).astype("uint8")
                a = np.asarray(Image.fromarray(seed).resize((640, 640), Image.BICUBIC)).copy()
                rows = [make(a, pos if (i + k) % 2 == 0 else neg, pos, k) for k in range(2)]
                Image.fromarray(a).save(H / name / split / "images" / f"{stem}.jpg")
                (H / name / split / "labels" / f"{stem}.txt").write_text("\n".join(rows) + "\n")
        (H / name / "data.yaml").write_text(f"names: {ns}\nnc: {len(ns)}\n")

    # Plant leakage: 15 of d1's VALID images, re-encoded and renamed, into d5's train
    # split — the real failure mode, where the same photo is reshared across projects.
    # The de-leak pass must drop all 15.
    src_i = H / "d1fix/valid/images"
    src_l = H / "d1fix/valid/labels"
    for j in range(15):
        im = Image.open(src_i / f"im{j}.jpg")
        im.save(H / "d5fix/train/images" / f"leak{j}.jpg", quality=68)
        # relabel into d5's class space so the crops would otherwise be usable
        rows = []
        for line in (src_l / f"im{j}.txt").read_text().split("\n"):
            p = line.split()
            if p:
                rows.append(f"{0 if int(p[0]) == 10 else 1} {' '.join(p[1:])}")
        (H / "d5fix/train/labels" / f"leak{j}.txt").write_text("\n".join(rows) + "\n")
    (H / "built").write_text("ok")
    print("fixtures built in /tmp/vc — planted 15 leaked d1-valid images in d5 train")

SRC = pathlib.Path("/sessions/tender-zealous-edison/mnt/nexxau/ai-detection/kaggle_train_vest_cls.py")
src = SRC.read_text()
subs = []

def sub(old, new, why):
    global src
    assert old in src, f"harness stale, missing: {old[:70]!r}"
    src = src.replace(old, new, 1)
    subs.append(why)

sub("!pip install ultralytics roboflow -q", "", "pip cell")
sub("from roboflow import Roboflow", "", "roboflow import")

a = src.index("rf = Roboflow(")
b = src.index("def vest_classes(d):")
src = src[:a] + '''
class _D:
    def __init__(s, p): s.location = "/tmp/vc/" + p
d1, d3, d5 = _D("d1fix"), _D("d3fix"), _D("d5fix")

''' + src[b:]
subs.append("roboflow downloads")

sub('DATA      = "/kaggle/temp/vestcls"', 'DATA      = "/tmp/vc/data"', "data dir")
sub("assert torch.cuda.is_available(), (", "assert True, (", "GPU assert (harness is CPU)")
sub('print(f"GPU OK: {torch.cuda.get_device_name(0)}")', 'print("GPU check bypassed")',
    "GPU name print")
sub("EPOCHS    = 20", "EPOCHS    = 3", "epochs")
# The sandbox proxy blocks github release assets, so ImageNet-pretrained weights can't be
# fetched here. Kaggle has internet and uses the real .pt. Structure is identical.
sub('YOLO("yolov8n-cls.pt")', 'YOLO("yolov8n-cls.yaml")', "pretrained weights -> yaml")
sub("IMGSZ     = 224", "IMGSZ     = 64", "imgsz")
sub("BATCH     = 64", "BATCH     = 16", "batch")
sub("assert tr_v > 500 and tr_n > 500", "assert tr_v > 10 and tr_n > 10", "train-size floor")
sub("assert va_v > 50 and va_n > 50", "assert va_v > 5 and va_n > 5", "val-size floor")
sub("device=0,\n            project=\"/kaggle/working\", name=\"vest_cls\", plots=False)",
    "device='cpu',\n            project=\"/tmp/vc/runs\", name=\"vest_cls\", plots=False)", "train device")
sub('best = Path("/kaggle/working/vest_cls/weights/best.pt")',
    'best = Path("/tmp/vc/runs/vest_cls/weights/best.pt")', "weights path")
sub("device=0, stream=True)", "device='cpu', stream=True)", "predict device")
sub('open("/kaggle/working/vest_cls_result.json", "w")',
    'open("/tmp/vc/vest_cls_result.json", "w")', "result json path")

print("SUBSTITUTED:", *[f"\n  - {s}" for s in subs], "\n" + "=" * 72)
exec(compile(src, "kaggle_train_vest_cls.py(harness)", "exec"), {"__name__": "__main__"})
print("=" * 72 + "\nHARNESS REACHED END OF SCRIPT")
