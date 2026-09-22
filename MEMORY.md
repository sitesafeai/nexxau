# MEMORY — standing rules for working on Nexxau

How we work, every session. `CLAUDE.md` has the facts about the codebase; this file has
the process. `CONTEXT.md` has what actually happened, session by session.

Update this file when a rule changes or a new one earns its place. Keep it short — a rule
nobody reads is worse than no rule.

---

## At the start of every session

1. Read `CLAUDE.md`, then this file, then the top few entries of `CONTEXT.md`.
2. Don't ask Luiz to re-explain something that's written down. If the answer is in these
   three files, use it.

## At the end of every session

Append an entry to `CONTEXT.md` (newest first) covering: what was asked, what changed,
what was learned, what's still open. Keep it to the facts that will matter next time —
not a transcript.

If something learned is permanent (a number, a mapping, a gotcha), it goes in `CLAUDE.md`
too. `CONTEXT.md` is history; `CLAUDE.md` is truth.

---

## Talking to Luiz

- Concise. Show the exact command or diff instead of explaining the concept.
- Flag the trade-off when there is one. Never present a change as free.
- He is non-technical about the details and ships fast. Lead with what to do, put the
  reasoning after it.
- When a change spans the Python service and the app, **say so explicitly** — separate
  Railway deploys, easy to ship half a feature.
- Don't send him on side-quests mid-run. If something can wait until the current job
  finishes, say so plainly.

## Being wrong

Own it in one line and move on. No spiralling.

Two real examples from the v6 work, both of which cost Luiz time:

- Diagnosed a DDP hang from a timer reading, told him to scramble and rescue weights. The
  run had finished normally.
- Guessed d2's classes 8/9 were `Person` and `Safety Vest` from "the shape of the
  dataset". They were `no_shoes` and `shoes`.

**Say which claims are verified and which are inferred.** A guess labelled as a guess is
useful. A guess delivered as a finding costs a GPU session.

---

## Before any Kaggle training run

Training runs cost 4–10 hours. Five of them broke in a row before this rule existed.

1. **Run the harness first.** `ai-detection/_harness_v6.py` executes the real training
   script end-to-end in ~60s against tiny fixtures — roboflow swapped for 52 fake images,
   the 52MB weights for a random 14-class stand-in, GPU for CPU. It has already caught a
   silently-empty baseline table and an off-by-one in the epoch counter. Adapt it for
   whichever `kaggle_train_v*.py` is current; it prints exactly which lines it stubbed.
2. **Restart the Kaggle kernel before pasting a new version of the cell.** Some fixes
   (the `YOLO_VERBOSE` output-flood one) only take effect before ultralytics is imported.
3. **Guard the expensive stages.** Anything that isn't load-bearing — a baseline metric,
   a diagnostic — goes in a try/except so it can't take down a 4-hour run.
4. **Fail fast and loud, not slow and silent.** Assert on broken preconditions before
   training starts, and make the message say what to check and in what order.

## While a Kaggle run is going

- **The Kaggle timer counts session uptime, not cell progress.** It keeps ticking after a
  cell throws or finishes. Never diagnose a hang from the timer alone — check the last log
  timestamp against the observed per-epoch cadence.
- Progress bars are muted on purpose (they flooded the log and killed a session). Long
  silences are expected — the 63k-image label-cache scan prints nothing for minutes.
  Tell Luiz roughly when the next line should appear so silence isn't alarming.
- Give him a specific "worry after this timestamp" number rather than vague reassurance.

## Reading training results

- Compare against the **clean d1-only val set**, never a headline number from an old run
  log. See the training-run history in `CLAUDE.md` for why.
- A delta under ~0.01 mAP is noise. Say so rather than dressing it up as an improvement.
- Ask what shipping costs before recommending it — class-name sync, two deploys, existing
  `CustomRule` rows. A model that scores the same as production is not worth that.
