# CONTEXT — session log

What happened, newest first. Append a new entry at the top at the end of every session.

Facts that are permanently true belong in `CLAUDE.md`, not here. This file is history:
what we tried, what it cost, what we concluded. Keep entries to what will matter later.

Entry format:

```
## YYYY-MM-DD — short title
**Asked:** …
**Did:** …
**Learned:** …
**Open:** …
```

---

> Note: an entry for 2026-09-18 (the two-stage vest classifier) was lost — most likely
> overwritten when `CONTEXT.md` was committed alongside the modal fix. The durable facts
> survived in `CLAUDE.md`, which is the split working as intended. Watch for it if an
> editor rewrites this file wholesale.

## 2026-10-09 — tab favicon was a different logo from the one Google shows

**Asked:** Google now shows the blue diamond, but the browser tab shows something else.

**Did:** `app/app/favicon.ico` turned out to be an entirely different image — an old blue
shield outline, not the diamond in `nexxau-logo.png`. Next's App Router serves
`app/favicon.ico` at `/favicon.ico` and Chrome prefers that path, so the tab got the
shield while Google read the PNG. Rebuilt the `.ico` from the diamond as a real
multi-resolution icon (16/32/48/64/128/256, pre-rendered LANCZOS) and trimmed its ~9%
transparent padding to 6%.

**Learned:**

- Two icon files meant two logos. Check they're the same artwork, not just the same size.
- A 500px PNG renamed `.ico` looks mushy at 16px — the browser does the downscale. Real
  pre-rendered sizes are visibly crisper.
- **Deliberately did NOT change the `/nexxau-logo.png` URL in metadata.** Google had only
  just started serving the right favicon from it; changing the URL risks a re-crawl and
  weeks back on the default globe.

**Open:** Favicons cache hard — needs a hard refresh or incognito to verify after deploy.

---

## 2026-10-07 — vest classifier confirmed live; audit coverage widened

**Asked:** Vests detect great, but other classes usually score under 50% confidence.
Should we add audit logging for zones and rules?

**Did:**

- **Vest classifier confirmed working on real footage** — first live verification of the
  two-stage approach. It shipped and it works.
- Explained the confidence trap (below). No code change; this is a tuning exercise.
- Audited zone create/update/delete with a real diff (per-zone events, not a bulk
  "updated"). Deletions log as WARNING — they loosen safety coverage.
- `RULE_UPDATED` logged only `isActive` and `severity`, so lowering
  `confidenceThreshold` or repointing `objectClass`/`zoneId` left no trace. Now diffs 11
  behaviour-affecting fields with old/new. Deactivation and threshold *increases* log as
  WARNING, since those stop alerts silently.
- Added `scripts/stream-camera.sh` — the ffmpeg republish loop with a preflight port
  check, so a phone app that isn't running gives a readable message instead of ffmpeg
  spam. Stops the copy-paste mangling that cost real time.

**Learned:**

- **Vest confidence and detector confidence are different quantities.** Vest numbers come
  from a binary classifier over a crop (naturally 0.9+); everything else is YOLO
  detection confidence (routinely 0.4–0.6 when correct). Don't tune them with the same
  threshold.
- **`rule.confidenceThreshold ?? 0.5` silently drops sub-50% detections.** With
  `YOLO_CONFIDENCE=0.25`, a hardhat at 40% reaches the backend and then dies at the rule.
  The ingest log says so: `SEEN at 40% but rule requires >=50%`.
- **Confidence is not accuracy.** What matters is *separation* between true and false
  detections, not the absolute number. True at 0.45 / false at 0.15 is a healthy class
  needing a 0.3 threshold. True at 0.45 / false at 0.40 is a broken class no threshold
  fixes.
- Low confidence on Luiz's footage is the domain gap showing up: trained on construction
  stock photos, running against a phone indoors.

**Open:**

- Thresholds still to be set per class from real observation.
- A per-class confidence distribution readout (count / median / p10 / p90 from
  `DetectionLog`) would make that evidence-based instead of eyeballed. Offered, not built.

---

## 2026-10-05/06 — camera zones, built properly

**Asked:** Make zones real — drawable per camera and actually enforced.

**Did:** Full vertical slice.

- `app/lib/zones.ts` — normalised polygons, ray-casting point-in-polygon (handles
  non-convex L-shapes), `parseZones` that drops malformed input rather than throwing.
- `GET/PUT /api/cameras/[id]/zones` — stored in `Camera.metadata.zones`, **no migration**.
- Ingest evaluates them: **any** rule can be scoped via `detectionCriteria.zoneId`, which
  is strictly more useful than the old separate "zone violation" type.
- `ZoneEditor.tsx` — draw on the live HLS frame, in a new Zones tab.
- Zone picker in the alert builder, shown only when exactly one camera is selected.

**Learned:**

- **Coordinates are the whole game.** The drawing canvas, the original frame and the
  stored snapshot are three different pixel spaces. Points are stored 0–1 and
  denormalised against `frame_size` at evaluation.
- **Letterboxing is a silent killer.** A `<video>` with `object-contain` centres the
  picture and pads the rest, so element coordinates aren't frame coordinates. Tested
  separately (11 cases); clicks on padding are rejected, not clamped.
- **Anchor at the feet, not the box centre.** A tall worker standing *beside* a zone
  registers as inside it if you test the centre, because the torso overlaps in 2D.
- **Fails open** when `frame_size` or the zone is missing — fires unscoped and logs
  loudly. A missed alert is worse than a wrongly-scoped one.
- `formData.cameraId` didn't exist (the field is `cameraIds`), so the zone panel never
  rendered and the "select a camera" warning was permanent. `tsc` knew;
  `typescript.ignoreBuildErrors` in `next.config.ts` meant it shipped anyway.

**Open:** Zone rules need the detector to send `frame_size`. It has since the
snapshot-annotation work, but an older detector build would log `carried no frame_size`.

---

## 2026-10-05 — rules that could never fire, and compliance passes as violations

**Asked:** Why is "Safety Vest ✓" showing as a high-severity Active Violation?

**Did:**

- The compliant/violation distinction existed only in the display *name*
  (`'Safety Vest ✓ (Compliant)'`), so no code could act on it. Added
  `isCompliancePass()`, clamped those to LOW at ingest, filtered them out of Active
  Violations. Deny-list by design.
- Then found **20 of 34 classes in the alert builder could never fire** — the model emits
  14. A customer could save a CRITICAL "Person Without Fall Harness" rule, see it listed
  as active, and never get an alert. Added `MODEL_SUPPORTED_CLASS_IDS` and greyed the
  rest out as "Coming soon".
- Disabled Zone Violation (no geometry handling existed at all — it fired on every person
  in frame).

**Learned:**

- I got my own fix backwards first: an allow-list of violations silently downgraded
  `person_without_fall_harness`, `crane` and `scaffolding` to LOW. On a safety product
  that's the wrong direction to fail. The verification script caught it — **write the
  check, don't trust the edit.**
- Severity feeds `SafetyViolation` → safety score, so a worker wearing a vest was
  dragging their own score down.

---

## 2026-09-23 — homepage favicon missing in Google results

**Asked:** Inner pages show the favicon in Google; the root domain shows a globe.

**Did:** Root cause was neither of the suspected ones. `nexxau.com` 301s to
`www.nexxau.com` (Vercel domain setting), but `metadataBase` was non-www, so every page
canonicalised to a hostname that only serves a redirect. Google scopes one favicon per
*hostname*, read from that hostname's home page — so there was nothing to read. Switched
`metadataBase` and 31 hardcoded URLs to www, added an explicit `icons` block, and fixed
root `vercel.json` whose redirect pointed the *opposite* way (would have looped against
Vercel's own redirect if it ever became active).

**Learned:**

- Google's docs explicitly allow relative favicon URLs — absolute URLs were not the fix.
- Sitemap already said `www`, canonicals said non-www, server redirected to `www`. Two of
  three agreed; the canonical was the outlier.
- There are two `vercel.json` files; Vercel reads `app/vercel.json`, so the root one's
  redirect was inert.

**Open:** Needs "request indexing" in Search Console; Google says days to weeks.
Confirmed working by 10-09.

---

## 2026-09-22 — camera settings popup clipped at the top

**Asked:** On the Cameras tab, the camera settings popup sits too high; Details/AI Vision hide the "Camera Settings" header.

**Did:** Portaled `CameraSettingsPanel` to `document.body`. Overlay is now `overflow-y-auto` with a `min-h-full` centering wrapper; the panel itself is `max-h-[calc(100dvh-2rem)] min-h-0` so the title bar stays on-screen and the body scrolls.

**Learned:** `fixed inset-0` + `items-center` on a non-scrolling overlay splits overflow equally, so a tall Details/AI Vision panel pushes the header off the top. Health looked fine because it was short enough to fit.

**Open:** App-only change — needs a Next.js Railway deploy. Not live on production until then.

---

**Asked:** `NO-Safety Vest` is stuck at 0.214 after two failed detector runs. What now?

**Did:**

Looked at the actual images for the first time (`ai-detection/inspect_vest_data.py`, CPU,
no GPU quota). Killed my own crop hypothesis — d5 median box area is 6.0% of frame vs d1's
0.8%, both 640×640 scene photos. d5 annotates a median of 1.5 boxes per image while the
photos contain 2–5 people, so the missing-label contamination is real and confirmed.

Pivoted: `NO-Safety Vest` is not an object, it is the absence of one, and localising an
absence is the hardest thing to ask a detector. Built `kaggle_train_vest_cls.py` — crop
each Person box, classify vest/no-vest with a yolov8n-cls. Trains in ~15 min instead of
10 hours, so the iteration loop is finally short enough to learn from.

v1 reported **0.980 recall**. Then `check_val_leakage.py` found the val set was 54%
near-duplicate and 11.5% byte-identical with the training pool. The number was memory.

v2 fingerprints every d1-valid image (dhash, banded LSH for hamming ≤5) and drops any
training image that near-matches one, before cropping. Val stays exactly d1's valid split
so the comparison to the incumbent 0.214 holds. Harness plants 15 re-encoded d1-valid
images in d5's train split and verifies all 15 get dropped.

**Learned:**

- **The benchmark this whole project runs on is contaminated.** d1's own train and valid
  splits overlap. Every mAP number in `CLAUDE.md` is inflated — warning added there.
- `NO-Safety Vest` scored 0.214 *with half its val set seen in training*. Worse than
  documented, and clearly broken rather than merely weak.
- Two-stage is unproven, not disproven — v1's 0.980 tells us nothing. v2 gives the real
  number.
- Harness fixtures made of white noise cannot test a perceptual-hash path: JPEG destroys
  noise, so re-encoded "duplicates" hash 8–14 bits away and the de-leak check silently
  passed while catching nothing. Switched to low-frequency structured fixtures.

**Result (same day):** v2 landed at **0.926 recall / 0.934 precision at threshold 0.70**,
de-leaked. v1's leaked 0.980 was only 5.4 points high, so leakage inflated but did not
manufacture the result. Against the incumbent 0.14 that is 6.6x, and 0.14 is itself
flattered by the same contamination. `railway_service.py` integration written and tested
behind `VEST_CLS_MODEL` (off by default). Not yet deployed.

**Open:**

- Deploy: upload `best.pt` to a GitHub release, set `VEST_CLS_MODEL` +
  `VEST_CLS_DOWNLOAD_URL` on the detector service, check startup logs, live-camera test.
- Everything is measured on **ground-truth crops**. Real detector boxes are looser, so the
  live number will be lower. Person recall is the ceiling now.
- `CustomRule` rows for `no_vest`: confidence now means classifier probability, not
  detector confidence. Thresholds above 0.70 start cutting recall.
- Nothing has a trustworthy benchmark until a properly held-out val set exists. The
  de-leak approach in `kaggle_train_vest_cls.py` is the pattern to copy.
- Luiz could not open `check_val_leakage.py` from the file card; had to paste the source
  into chat. Worth pasting long scripts inline by default.

---

## 2026-09-17 — ppe_v6 training run; completed, not shipped

**Asked:** Get `kaggle_train_v6.py` to actually finish. It had broken four or five times
in a row — aborting mid-run, or appearing to hang while the Kaggle timer kept counting.

**Did:**

Fixed four things in `ai-detection/kaggle_train_v6.py`:

1. **Class-agnostic IoU gate** in the pseudo-labelling pass. A prediction was discarded if
   it overlapped *any* existing label by >0.45, so a `Person` prediction was killed by the
   vest box drawn on that same person. On vest-no-vest — the dataset the whole run existed
   to fix — that threw away the point of the exercise. Now only conflicts within a group
   (Hardhat/NO-Hardhat, Mask/NO-Mask, Goggles/NO-Goggles, Vest/NO-Vest) or the same class.
   Unit-tested; the whole-body-vest-vs-Person case is the one that matters.
2. **Output flooding.** Ultralytics emits one log *line* per progress-bar tick under
   Kaggle (no TTY to overwrite) — tens of thousands of lines, which killed a session
   mid-validation at 223s. Set `YOLO_VERBOSE=false` *and* `ultralytics.utils.VERBOSE` +
   logger level after import, because the env var alone does nothing if ultralytics is
   already in `sys.modules` from a previous cell run. Full run now: ~86 lines.
   Per-epoch progress replaced with a one-line `on_fit_epoch_end` callback.
3. **Baseline table printed literally nothing.** `base.box.ap50` only covers classes
   present in the val set, so a `len(ap50) == len(names)` check was silently false and the
   dict came out empty — no table, no error. Now keyed off `ap_class_index`. This is why
   there had never been a v5 baseline number.
4. Baseline wrapped in try/except so it can't take down a 4-hour run; `epoch 13/12`
   off-by-one clamped; `torch.cuda.mem_get_info` guarded.

Built `ai-detection/_harness_v6.py` — runs the real script end-to-end in ~60s on fake
fixtures. Found #3 and the off-by-one. See `MEMORY.md`.

Also added a class-map audit that prints each dataset's own class names against the
hand-written index map, flagging anything discarded that isn't an intentionally-dropped
class. The D2/D3/D4 maps were carried over from v5 with no record of how they were derived.

**Learned:**

- **v6 final: 0.7270 mAP@50 vs v5's 0.7252 on the clean d1 val set.** +0.002 is noise.
  Not shipped. v5 stays in production. Dropping 14 → 10 classes bought nothing.
- **The pseudo-labelling hypothesis was never tested.** Person gained only 303 labels
  despite the gate fix. v5 scores 0.884 on Person against d1 but barely fires on d5 at
  conf 0.45. Unexplained.
- **d2 (`ppes-kaxsi`) classes 8/9 are `no_shoes`/`shoes`**, not Person/Safety Vest as I
  guessed. Mapping them to `-1` is correct. Ruled out in 2 minutes on a CPU notebook.
- The Kaggle timer counts session uptime, not cell progress. I misread it as a DDP hang
  at 36,809s and had Luiz scrambling to rescue weights; the run had finished cleanly at
  14,847s. Check the last log timestamp against the per-epoch cadence instead.

**Open:**

- `NO-Safety Vest` still 0.214. Two runs have now failed to move it. This is the actual
  problem and neither more classes nor fewer classes nor pseudo-labelling has touched it.
- Why v5 doesn't fire on vest-no-vest images. Look at actual d5 images before designing
  a v7 around them.
- v6's Kaggle output zip was 6.27GB — something in `/kaggle/working` shouldn't be there.
  Worth finding before the next run.
- `_harness_v6.py` is in `ai-detection/` and is throwaway; keep or move, Luiz's call.
