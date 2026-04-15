# Session Initialization

After the pre-flight walkthrough is approved, create the session
structure. The experiment directory is its own git repository,
managed by the skill.

By default sessions live at:

```
$PLUGIN_DATA/autoresearch/<tag>/
```

where `$PLUGIN_DATA` is
`~/.claude/plugins/data/co-intelligence-co-intelligence`. If the user
chose a non-default location during clarifying question 11, the
physical directory lives there and a **discovery symlink** is created
at the default path pointing to it (so the Stop hook keeps working).

See `references/clarifying-questions.md` topic 11 for details.

---

## Directory structure

```
$SESSION_DIR/                                    <-- git init here
├── experiment-plan.md          ⬛ from planning phase, immutable
├── loop-settings.json          ✏ from pre-flight walkthrough, mutable
├── eval_and_record.py          ⬛ generated from template below
├── update_report.py            ⬛ regenerates Zone A of report.md every trial
├── final_eval.py               ⬛ generated if test_set_reserved: true
├── results.json                ✏ approaches list, user_ideas_queue
├── report.md                   ✏ living report (Zone A scripted, Zone B agent narrative)
├── README.md                   ✏ public-facing session overview
├── progress.png                ✏ score trajectory (regenerated per approach)
├── best_score.txt              ✏ current best primary score, plain text
├── bibliography.md             ➕ from Phase 0 or grows on plateau
├── bibliography.bib            ➕ BibTeX companion to bibliography.md
├── references/
│   ├── INDEX.md                ➕ key-insight summaries of cited papers
│   └── README.md               ⬛ format guide
├── .loop-active                ✏ current session ID (deleted on stop)
├── .loop-state                 ✏ last approach #, best score, total
├── .narrative-dirty            ✏ sentinel: Zone A changed, Zone B stale
├── .autoresearch-directives    ⬛ core rules for context recovery
├── .gitignore                  ⬛ session-wide git exclusions (one rule: artifacts/)
├── .claude/
│   └── CLAUDE.md               ⬛ survives autocompact
├── fixed/
│   ├── evaluate.py             ⬛ IMMUTABLE evaluation harness
│   ├── data_prep.py            ⬛ IMMUTABLE data loader
│   ├── visualize.py            ⬛ IMMUTABLE per-approach visualizer
│   └── paths.py                ⬛ IMMUTABLE artifacts_dir_for() helper
├── approaches/                                  ← REPRODUCIBILITY (in git)
│   ├── 000_smoke_test/         ⬛ smoke test (if opted in)
│   │   ├── rationale.md         ← Tool 2 of the 4-tool-call iteration
│   │   ├── approach.py          ← Tool 3
│   │   ├── commentary.md        ← Tool 1 of the NEXT iteration
│   │   ├── scores.json          (mandatory)
│   │   ├── metrics.json         (mandatory)
│   │   ├── live.log             (mandatory)
│   │   ├── visualization.png    (optional — absent = crash signal)
│   │   └── training_progress.json  (optional — absent = non-iterative or early crash)
│   └── 001_<slug>/             ⬛ first real loop approach (same schema)
│       └── ...
└── artifacts/                                   ← HEAVY (gitignored)
    ├── 000_smoke_test/         ← paired by name with approaches/000_smoke_test/
    │   └── (checkpoints, caches, large model files — empty if trial has none)
    └── 001_<slug>/
        ├── ckpt_epoch_000.pkl
        ├── ckpt_epoch_001.pkl
        └── preprocessed_cache.npz
```

Legend:
- ⬛ immutable once created
- ✏ mutable — edited by agent, `eval_and_record.py`, or user
- ➕ appendable — grows over time (new entries added, never rewritten)

**Two top-level trees per session:**

- `approaches/<NNN>_<slug>/` — the reproducibility package (sidecars,
  code, scores, plots, logs). Committed to git. Fixed schema (6
  mandatory + 2 optional files). See
  `references/evaluation-contract.md` §Approach folder schema.
- `artifacts/<NNN>_<slug>/` — heavy, session-local, gitignored.
  Resolved from `approach.py` via `fixed.paths.artifacts_dir_for(__file__)`.
  Wipe with `rm -rf artifacts/` after the session is done.

The session tag is NOT part of approach folder names — it lives once
in `results.json["tag"]` and in the session directory name.

---

## Scores vs. metrics vs. sidecars

- **Scores** (`scores.json`) — the objectives that drive keep/discard.
  Written by `eval_and_record.py`. Example: `{"weighted_accuracy": 0.491}`.
- **Metrics** (`metrics.json`) — additional measurements NOT used for
  keep/discard: per-slice accuracy, runtime breakdown, memory usage,
  model complexity. Written by `eval_and_record.py`.
- **`rationale.md`** — pre-trial hypothesis written by the agent
  BEFORE eval (5-15 lines, required fields: Idea, Hypothesis, Builds
  on, What we'll learn). See `references/sidecars.md`.
- **`commentary.md`** — post-trial postmortem written by the agent on
  the NEXT iteration (5-15 lines, required fields: Result, Vs.
  hypothesis, Visualization, Vs. bibliography, Lessons). See
  `references/sidecars.md`.
- **`training_progress.json`** — structured per-epoch training log
  written by the approach itself. Used for background-trial
  monitoring.
- **`live.log`** — full stdout+stderr stream of the trial. See
  `references/live-logging.md`.

Only scores drive the keep/discard ratchet.

---

## Step 1 — Choose the physical path and create it

From `loop-settings.json` field `physical_path`:

```bash
SESSION_DIR="$PHYSICAL_PATH"
mkdir -p "$SESSION_DIR"
cd "$SESSION_DIR"
```

If the physical path is non-default, also create the discovery symlink:

```bash
DEFAULT_PATH="$HOME/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/$TAG"
if [ "$PHYSICAL_PATH" != "$DEFAULT_PATH" ]; then
  mkdir -p "$(dirname "$DEFAULT_PATH")"
  ln -sfn "$PHYSICAL_PATH" "$DEFAULT_PATH"
  # Record both in loop-settings.json
fi
```

The symlink is what keeps the Stop hook's glob
`$PLUGIN_DATA/autoresearch/*/.loop-active` working when sessions live
elsewhere. Verify the symlink resolves and `.loop-active` created in
the physical dir is reachable through it.

---

## Step 2 — Initialize `loop-settings.json`

Written from the pre-flight walkthrough approved values. Full schema
and field reference: `references/loop-entry.md` §Settings persistence.

---

## Step 3 — Initialize `results.json`

`results.json` carries task metadata, objectives, approaches list, and
the user ideas queue. It does NOT hold loop-tuning settings — those
live in `loop-settings.json`.

```json
{
  "task": "<task>",
  "tag": "<tag>",
  "objectives": ["primary_metric_name"],
  "higher_is_better": {"primary_metric_name": true},
  "primary_metric": "primary_metric_name",
  "additional_metrics": ["runtime_seconds"],
  "min_improvement": 0.0,
  "test_set_reserved": true,
  "test_set_skip_reason": null,
  "created": "<ISO timestamp>",
  "user_ideas_queue": [
    {
      "id": "u001",
      "text": "baseline seed idea",
      "status": "pending",
      "source": "user",
      "created_at": "<ISO>"
    }
  ],
  "approaches": []
}
```

---

## Step 4 — References scaffold (Phase 0)

Create `references/` and write the format guide and an empty index.
`eval_and_record.py` refuses to run the first approach if
`research_phase_required: true` in `loop-settings.json` AND
`bibliography.md` has fewer than 10 entries.

```bash
mkdir -p references
cat > references/README.md << 'EOF'
# References

Prior art for this autoresearch session. Each entry in `INDEX.md` is a
specific, cited source that informs an approach or hypothesis.

## Entry format

```markdown
## R<NNN> — <short title>

- **Source:** <URL or citation>
- **BibTeX key:** <e.g. `[Sur25]` if in bibliography.bib>
- **Type:** paper | blog | repo | docs | book | personal_note
- **Key insight:** <one to three sentences, what the source actually says>
- **Applicable to:** <initial hypothesis ID or approach category>
- **Read on:** <YYYY-MM-DD>
```

## What counts

- Papers, blog posts, benchmarks, repos, library docs, textbook chapters.
- Must include a concrete key insight the agent actually extracted, not just a title.
- Entries added during plateau searches cite the BibTeX key that was appended to `bibliography.bib`.

## What does NOT count

- "I already know X" without a source.
- A title-only stub with no key insight.
- A prior unrelated autoresearch session.
EOF

cat > references/INDEX.md << 'EOF'
# Research Index

<!-- Append entries below during Phase 0 and on every plateau search. See README.md for format. -->
EOF
```

Phase 0 population is driven by delegating to
`co-intelligence:bibliography` — see `references/planning-protocol.md`
topic 8.

---

## Step 5 — Materialize the evaluation harness

Create the four immutable `fixed/*.py` files plus the two immutable
session-root scripts. All six are written once at session init and
never edited afterward.

**Full contract specifications** for every file (`approach.py` +
`fixed/evaluate.py` + `fixed/data_prep.py` + `fixed/visualize.py` +
`fixed/paths.py` + `eval_and_record.py` + `update_report.py`),
sandbox rules with the `fixed.paths` whitelist, two-tree split
(`approaches/` vs `artifacts/`), approach folder schema, monitoring
contract, scores vs. metrics, budget enforcement, and the rationale
for immutability: **`references/evaluation-contract.md`**.

The script-owned report-update flow (Zone A vs Zone B, NARRATIVE_DUE
trigger, `.narrative-dirty` sentinel, marker injection on legacy
resume): **`references/report-updates.md`**.

Key points for session init specifically:

- Scaffold the three `fixed/` evaluation files from Topic 6
  pseudo-code (`evaluate.py`, `data_prep.py`, `visualize.py`).
- Generate `fixed/paths.py` from the canonical template in
  `references/evaluation-contract.md` §`fixed/paths.py` contract.
  This file is generic and identical across sessions — copy verbatim.
- Choose the `visualize()` signature variant (with or without
  `run_fn=...`) based on the Topic 5 answer.
- Generate `eval_and_record.py` (Step 10) — it includes the
  approach-folder-schema enforcement, the auto-move of forbidden
  files to `artifacts/`, the monitoring-contract line-count check,
  the call to `update_report.py` at the end, and the
  `!! NARRATIVE_DUE` emission every N trials.
- Generate `update_report.py` per the `references/report-updates.md`
  contract — reads `results.json` + per-approach `scores.json` +
  rationale/commentary front-matter, rewrites Zone A of `report.md`
  between `<!-- auto:begin -->` and `<!-- auto:end -->` markers,
  writes `.narrative-dirty` whenever Zone A changes, restores from
  `report.md.bak` on exception.
- Commit all six as part of the init commit. Do not leave any as
  TODO stubs — the smoke test runs immediately after and will fail
  loudly if any harness file is incomplete.

---

## Step 6 — Git repo setup

```bash
cd "$SESSION_DIR"
git init

cat > .gitignore << 'EOF'
# Heavy session-local artifacts (checkpoints, weights, caches)
# resolved from approach.py via fixed.paths.artifacts_dir_for(__file__).
# This is the ONE rule that handles all heavy files — the approach
# folder schema (eval_and_record.py) auto-moves forbidden file types
# out of approaches/ into artifacts/, so we never need per-approach
# .gitignore files.
artifacts/

# Raw input data (user should never commit raw data)
data/

# Backup files written by update_report.py for rollback safety
report.md.bak

# Python
__pycache__/
*.pyc
*.pyo
.venv/
*.egg-info/
uv.lock

# Secrets
.env
*.key
credentials.*

# Loop state (ephemeral, not published)
.loop-active
.loop-state
.narrative-dirty

# OS
.DS_Store
Thumbs.db
EOF
```

Per-approach `.gitignore` files are auto-generated by
`eval_and_record.py` on first run to exclude model checkpoints and
weights while keeping them on disk for reuse.

---

## Step 7 — README template

Create `README.md` at session root. The progress chart is embedded
and auto-updated by `eval_and_record.py` after each approach.

```markdown
# <task>

**Tag:** <tag> | **Approaches tried:** 0 | **Best score:** 0.0000

## Progress

![Progress](progress.png)

## Quick start

```bash
# Run a single approach manually (normally the agent does this via
# eval_and_record.py during the loop)
python3 eval_and_record.py approaches/NNN_name
```

## Results

See [report.md](report.md) for the full experiment log and approach tree.

## Stopping the loop

Tell the agent *"stop"* or *"pause"* — it deletes `.loop-active` and
the Stop hook releases. Restart by saying
*"resume `<tag>`"* or any equivalent natural-language phrasing.
```

The README header is informational; it is NOT auto-updated in the
new design (Zone A lives in `report.md`, not `README.md`). The
`Approaches tried` counter is populated on demand by the agent if
they want a short status card.

### report.md template — with zone markers

Create `report.md` at session root with the zone markers in place
from day one. `update_report.py` will own everything between the
markers; the agent owns everything after `<!-- auto:end -->`.

```bash
cat > report.md << 'EOF'
# Autoresearch — <task title>

<!-- auto:begin -->
**Tag:** <tag> | **Started:** <YYYY-MM-DD> | **Approaches tried:** 0 | **Last updated:** <now>

**Current best:** (none yet)

## Best scores by metric

| Metric | Direction | Best Score | Best Approach |
|---|---|---|---|

## Experiment Log

| # | Name | Status | <metrics...> | Δ_best | Δ_parent | Notes |
|---|------|--------|--------------|--------|----------|-------|

## Approach Tree

(populated as the loop runs)

## User Ideas Status

| Idea | Status | Approach(es) |
|------|--------|--------------|
<!-- auto:end -->

## Synthesis

(will be populated starting at approach 001 and refreshed every N trials per loop-settings.narrative_update_every_n)

## What works

(will be populated starting at approach 001)

## What doesn't work

(will be populated starting at approach 001)

## Next Steps

(will be populated starting at approach 001)
EOF
```

The script refreshes Zone A every trial. The agent seeds Zone B at
approach 001 and refreshes it on the `!! NARRATIVE_DUE` cadence and
on stop. See `references/report-updates.md` for the Zone B cadence
contract.

---

## Step 8 — Survival files

Create ALL of these during session init. See
`references/loop-enforcement.md` for the content templates. These are
NOT optional.

1. `.claude/CLAUDE.md` — survives autocompact (most reliable
   persistence mechanism)
2. `.autoresearch-directives` — checkpoint for context recovery
3. `.loop-active` — signals the loop should keep running; its content
   is the current Claude Code session ID

### Deriving the session ID

**Important:** `CLAUDE_SESSION_ID` is **not** available as a shell
environment variable in Bash tool calls, and Claude Code does **not**
perform string substitution on `${CLAUDE_SESSION_ID}` in Write/Bash
content. The session ID must be obtained by reading the current
session's transcript filename.

```bash
# Derive session ID from the most recently active transcript.
# Claude Code names session transcripts <session_id>.jsonl in
# ~/.claude/projects/<project-dir>/. The most-recently-modified one
# belongs to the current running session.
LATEST=$(ls -t ~/.claude/projects/*/*.jsonl 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "ERROR: could not find any Claude Code transcript" >&2
  exit 1
fi
SESSION_ID=$(basename "$LATEST" .jsonl)
echo "$SESSION_ID" > "$SESSION_DIR/.loop-active"
```

The resulting file contains a UUID like
`a1b2c3d4-e5f6-7890-abcd-ef1234567890` — the same value Claude Code
puts in the `session_id` field of its Stop-hook stdin JSON, which the
hook parses via `jq` to match.

**Concurrent-session caveat:** if multiple Claude Code sessions are
running simultaneously on the same machine during session init, the
"most recently active transcript" heuristic could pick the wrong one.
In practice autoresearch setup is intensive enough that concurrent
sessions are unlikely, but the loop can be re-armed at any time by
manually writing the correct UUID to `.loop-active` once the owning
session is identified.

### Survival file verification (MANDATORY)

Before entering the loop, verify ALL survival files exist. This is
part of the §Execution: Loop entry validation gate in SKILL.md. Run
this check and do NOT proceed until it passes:

```bash
MISSING=""
[ ! -f .claude/CLAUDE.md ]      && MISSING="$MISSING .claude/CLAUDE.md"
[ ! -f .autoresearch-directives ] && MISSING="$MISSING .autoresearch-directives"
[ ! -f .loop-active ]           && MISSING="$MISSING .loop-active"
[ ! -f loop-settings.json ]     && MISSING="$MISSING loop-settings.json"
[ ! -f experiment-plan.md ]     && MISSING="$MISSING experiment-plan.md"
[ ! -f results.json ]           && MISSING="$MISSING results.json"
[ ! -f eval_and_record.py ]     && MISSING="$MISSING eval_and_record.py"
[ ! -f fixed/evaluate.py ]      && MISSING="$MISSING fixed/evaluate.py"
[ ! -f fixed/data_prep.py ]     && MISSING="$MISSING fixed/data_prep.py"
[ ! -f fixed/visualize.py ]     && MISSING="$MISSING fixed/visualize.py"
if [ -n "$MISSING" ]; then
  echo "FATAL: Missing session files:$MISSING"
  exit 1
fi
echo "All session files verified."
```

---

## Step 9 — `final_eval.py` (hold-out test set only)

Scaffold this at session init when `test_set_reserved: true` in
`results.json`. It is the ONLY place in the session where
`include_test_months=True` (or equivalent) is allowed. The loop never
calls it; the user runs it at the end to produce the "loop-best vs.
test" comparison in the final report.

```python
#!/usr/bin/env python3
"""Hold-out test-set evaluator. Run ONCE at end of loop for the final report.

Usage:
  python3 final_eval.py                              # eval current best
  python3 final_eval.py approaches/NNN_name          # eval a specific approach
  python3 final_eval.py --top-k=5                    # eval top-5 by validation
"""
import sys, os, json, importlib.util, argparse

SESSION_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SESSION_DIR)
sys.path.insert(0, SESSION_DIR)

with open("results.json") as f:
    results = json.load(f)

if not results.get("test_set_reserved", False):
    print("ERROR: test_set_reserved=false in results.json. No hold-out test set was reserved.")
    print(f"Skip reason: {results.get('test_set_skip_reason', '(none)')}")
    sys.exit(1)

# This is the ONLY place the test months/samples are exposed.
from fixed.data_prep import get_data  # noqa
from fixed.evaluate import evaluate   # noqa

parser = argparse.ArgumentParser()
parser.add_argument("approach_dir", nargs="?", default=None)
parser.add_argument("--top-k", type=int, default=None)
args = parser.parse_args()

# Select approaches to test
if args.top_k:
    kept = [a for a in results["approaches"] if a["status"] == "keep" and a.get("scores")]
    primary = results["primary_metric"]
    higher = results["higher_is_better"].get(primary, True)
    kept.sort(key=lambda a: a["scores"].get(primary, 0), reverse=higher)
    targets = [os.path.join("approaches", a["name"]) for a in kept[:args.top_k]]
elif args.approach_dir:
    targets = [args.approach_dir]
else:
    try:
        best_score = float(open("best_score.txt").read().strip())
    except FileNotFoundError:
        print("No best_score.txt found. Specify an approach or run the loop first.")
        sys.exit(1)
    kept = [a for a in results["approaches"] if a["status"] == "keep" and a.get("scores")]
    primary = results["primary_metric"]
    kept.sort(key=lambda a: abs(a["scores"].get(primary, 0) - best_score))
    if not kept:
        print("No kept approaches found.")
        sys.exit(1)
    targets = [os.path.join("approaches", kept[0]["name"])]

# Score each target on the hold-out test set
# IMPORTANT: this is the ONLY call site that uses include_test_months=True
test_results = []
for t in targets:
    approach_file = os.path.join(t, "approach.py")
    spec = importlib.util.spec_from_file_location("approach", approach_file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # Adapt this call to your task. The key property is that the agent
    # never saw this data during the loop.
    result = evaluate(mod.run, include_test_months=True)
    test_results.append({"approach": os.path.basename(t), "test_scores": result})

# Write the comparison
out_path = "final_eval_results.json"
with open(out_path, "w") as f:
    json.dump({
        "primary_metric": results["primary_metric"],
        "results": test_results,
    }, f, indent=2)
print(f"Wrote {out_path}")
print("Compare these to validation scores in results.json.")
print("A large gap indicates validation overfitting.")
```

**Customization at session init:** adapt the
`evaluate(..., include_test_months=True)` call to whatever the actual
`fixed/evaluate.py` + `fixed/data_prep.py` contract uses. If the
loop-time `evaluate()` does not accept the flag, add a separate
`evaluate_test()` function in `fixed/evaluate.py` that is only
referenced by this file.

---

## Step 10 — `eval_and_record.py`

Generate this script at the session root during initialization. It
handles EVERYTHING scoring-and-bookkeeping-related after `approach.py`
is written:

- Evaluates the approach against `fixed/evaluate.py`
- Enforces the approach folder schema (auto-moves forbidden files
  to `artifacts/`, see `references/evaluation-contract.md`)
- Enforces the monitoring contract (line-count check on `live.log`,
  marks silent trials `monitoring_violation`)
- Writes `scores.json` and `metrics.json`
- Calls `fixed/visualize.py` to generate `visualization.png`
  (failure is non-fatal; no stub generated)
- Decides keep/discard using `min_improvement` from `results.json`
- Git-commits the approach (approach folder only — `artifacts/`
  is gitignored at the session root)
- Regenerates `progress.png`
- Calls `update_report.py` to refresh Zone A of `report.md`
- Updates `.loop-state`
- Prints one-line result and trigger markers (SEARCH_NEEDED,
  NARRATIVE_DUE, INCOMPLETE, MISSING_RATIONALE, RESEARCH_INCOMPLETE,
  MONITORING VIOLATION)

The agent's per-iteration contract is:
Write commentary.md → Write rationale.md → Write approach.py → Bash
`eval_and_record.py`.

**Copy this template verbatim.** It reads config from
`loop-settings.json` AND `results.json` so it works for any experiment
without modification.

```python
#!/usr/bin/env python3
"""Compound eval script. Runs eval, records, plots, commits, updates reports.
Generated during session init. Do NOT modify during the loop.

Usage: python3 eval_and_record.py approaches/NNN_name
"""
import sys, importlib.util, json, time, subprocess, os, traceback
import glob as _glob

SESSION_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SESSION_DIR)

# --- Parse args ---
APPROACH_DIR = sys.argv[1]
APPROACH_FILE = os.path.join(APPROACH_DIR, "approach.py")
RATIONALE_FILE = os.path.join(APPROACH_DIR, "rationale.md")

# --- Load config (two files) ---
with open("results.json") as f:
    results = json.load(f)

try:
    with open("loop-settings.json") as f:
        settings = json.load(f)
except FileNotFoundError:
    # Legacy migration: knobs used to live at top level of results.json
    legacy_keys = [
        "budget_per_approach", "background_threshold_seconds",
        "search_on_plateau_threshold", "search_on_plateau_ideas_count",
        "search_every_trial", "paradigm_categories", "allow_ensembles",
        "bibliography_on_plateau", "bibliography_target_per_plateau",
        "research_phase_required", "research_phase_skip_reason",
    ]
    settings = {k: results.get(k) for k in legacy_keys if k in results}
    with open("loop-settings.json", "w") as f:
        json.dump(settings, f, indent=2)
    # Strip from results.json on next write (done below)

PRIMARY_METRIC = results["primary_metric"]
OBJECTIVES = results["objectives"]
HIGHER = results["higher_is_better"]

# --- MISSING_RATIONALE gate ---
# The agent MUST write rationale.md before calling eval_and_record.py.
# See references/sidecars.md for required fields.
if not os.path.exists(RATIONALE_FILE):
    print(f"!! MISSING_RATIONALE: {RATIONALE_FILE} does not exist.")
    print("   Write rationale.md with fields: Idea, Hypothesis, Builds on, What we'll learn.")
    print("   See references/sidecars.md for the full spec.")
    sys.exit(2)

# --- RESEARCH PHASE GATE (Phase 0 enforcement) ---
# Blocks the first REAL approach (after smoke test) until bibliography.md
# has enough entries. Disabled when the user opted out during clarifying
# questions (research_phase_required = false in loop-settings.json).
_real_approaches = [a for a in results.get("approaches", []) if not a["name"].startswith("000_")]
if settings.get("research_phase_required", False) and len(_real_approaches) == 0:
    _biblio_path = os.path.join(SESSION_DIR, "bibliography.md")
    _min_entries = 10
    _count = 0
    if os.path.exists(_biblio_path):
        with open(_biblio_path) as _f:
            # Count @article / @inproceedings / @misc style entries or
            # markdown-level entries (## <title>)
            _count = sum(1 for line in _f if line.lstrip().startswith("## "))
    if _count < _min_entries:
        print(f"!! RESEARCH_INCOMPLETE: {_count}/{_min_entries} entries in bibliography.md")
        print("   Delegate to co-intelligence:bibliography in short-form mode (15-25 papers, 1-2 waves)")
        print("   before running real approaches, OR set research_phase_required: false in")
        print("   loop-settings.json with a justification in research_phase_skip_reason.")
        sys.exit(2)

# --- TEST-SET LEAKAGE GUARD ---
# If a hold-out was reserved, eval_and_record refuses to run when the loader
# accidentally exposes the test window. The fixed data_prep contract MUST
# respect the include_test_months=False (or equivalent) flag.
if results.get("test_set_reserved", False) and results.get("test_set_skip_reason"):
    print("!! CONFIG_CORRUPTED: test_set_reserved=true but test_set_skip_reason is set.")
    print("   Fix results.json before continuing.")
    sys.exit(2)

# --- EVALUATE ---
spec = importlib.util.spec_from_file_location("approach", APPROACH_FILE)
mod = importlib.util.module_from_spec(spec)
start = time.time()
try:
    sys.path.insert(0, SESSION_DIR)
    spec.loader.exec_module(mod)
    from fixed.evaluate import evaluate
    result = evaluate(mod.run)
    elapsed = round(time.time() - start, 1)
    crashed = False
except Exception as e:
    result = {}
    elapsed = round(time.time() - start, 1)
    crashed = True
    traceback.print_exc()
    print(f"CRASH: {e}")

# --- APPROACH FOLDER SCHEMA ENFORCEMENT ---
# Auto-move any forbidden file type or oversized file out of the
# approach folder into the paired artifacts/ folder. The approach
# folder stays clean without per-approach .gitignore files.
_approach_name = os.path.basename(APPROACH_DIR)
_artifacts_dir = os.path.join(SESSION_DIR, "artifacts", _approach_name)
os.makedirs(_artifacts_dir, exist_ok=True)

_forbidden_exts = {".pkl", ".pickle", ".pt", ".pth", ".bin", ".safetensors",
                   ".joblib", ".h5", ".hdf5", ".onnx", ".ckpt", ".npz",
                   ".sqlite", ".db"}
_size_limit_mb = float(settings.get("approach_file_size_limit_mb", 1.0))
_size_limit_bytes = int(_size_limit_mb * 1024 * 1024)

for _entry in os.listdir(APPROACH_DIR):
    _src = os.path.join(APPROACH_DIR, _entry)
    if os.path.isdir(_src):
        # Subdirectories are not allowed — move wholesale
        import shutil as _sh
        _dst = os.path.join(_artifacts_dir, _entry)
        _sh.move(_src, _dst)
        print(f"MOVED TO ARTIFACTS: {_entry}/ (subdirectory)")
        continue
    _ext = os.path.splitext(_entry)[1].lower()
    _size = os.path.getsize(_src)
    if _ext in _forbidden_exts or _size > _size_limit_bytes:
        import shutil as _sh
        _dst = os.path.join(_artifacts_dir, _entry)
        _sh.move(_src, _dst)
        reason = "forbidden ext" if _ext in _forbidden_exts else f"size {_size/1024/1024:.1f}MB"
        print(f"MOVED TO ARTIFACTS: {_entry} ({reason})")

# --- MONITORING CONTRACT ENFORCEMENT ---
# approach.py must emit progress output. Silent trials are marked
# monitoring_violation and cannot be kept. See evaluation-contract.md
# §Monitoring contract.
_live_log_path = os.path.join(APPROACH_DIR, "live.log")
_live_lines = 0
if os.path.exists(_live_log_path):
    with open(_live_log_path) as _f:
        _live_lines = sum(1 for _ln in _f if _ln.strip())
_monitoring_threshold = float(settings.get("monitoring_required_after_seconds", 10))
_required_lines = 3 if elapsed > _monitoring_threshold else 2
monitoring_violation = (not crashed) and _live_lines < _required_lines
if monitoring_violation:
    print(f"MONITORING VIOLATION: approach.py produced {_live_lines} lines in live.log "
          f"(required: ≥{_required_lines}). Background trials cannot be observed "
          f"without progress output. Fix approach.py to call _log() at start / during / "
          f"end before continuing. See references/live-logging.md.")

# --- SCORES (objectives - used for keep/discard) ---
scores = {obj: result.get(obj, 0) for obj in OBJECTIVES} if not crashed else None
primary_score = scores[PRIMARY_METRIC] if scores else 0

# --- METRICS (additional - not used for keep/discard) ---
metrics = {k: v for k, v in result.items() if k not in OBJECTIVES} if not crashed else None

# --- KEEP/DISCARD (with min_improvement gate) ---
best_file = "best_score.txt"
best = float(open(best_file).read().strip()) if os.path.exists(best_file) else (
    0 if HIGHER.get(PRIMARY_METRIC, True) else float('inf'))
MIN_IMPROVEMENT = float(results.get("min_improvement", 0.0))
if crashed:
    kept = False
elif monitoring_violation:
    # A silent winner is still a broken winner — cannot be kept
    kept = False
elif HIGHER.get(PRIMARY_METRIC, True):
    kept = (primary_score - best) >= MIN_IMPROVEMENT and primary_score > best
else:
    kept = (best - primary_score) >= MIN_IMPROVEMENT and primary_score < best
if crashed:
    status = "crash"
elif monitoring_violation:
    status = "monitoring_violation"
elif kept:
    status = "keep"
else:
    status = "discard"

# --- WRITE SCORES + METRICS ---
with open(os.path.join(APPROACH_DIR, "scores.json"), "w") as f:
    json.dump({"scores": scores, "status": status, "runtime_seconds": elapsed}, f, indent=2)
if metrics is not None:
    with open(os.path.join(APPROACH_DIR, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

# --- VISUALIZE ---
viz_ok = False
try:
    from fixed.visualize import visualize
    visualize(result, APPROACH_DIR, run_fn=getattr(mod, 'run', None))
    plot_files = _glob.glob(os.path.join(APPROACH_DIR, "*.png")) + \
                 _glob.glob(os.path.join(APPROACH_DIR, "plots", "*.png"))
    if plot_files:
        viz_ok = True
except Exception as ve:
    print(f"VIZ WARN: {ve}")

# --- GIT COMMIT APPROACH ---
subprocess.run(["git", "add", APPROACH_DIR], capture_output=True)
subprocess.run(["git", "commit", "-m",
    f"{status}: {APPROACH_DIR} ({PRIMARY_METRIC}={primary_score:.4f}, {elapsed}s)"],
    capture_output=True)

# --- UPDATE BEST ---
if kept:
    with open(best_file, "w") as f:
        f.write(str(primary_score))

# --- UPDATE RESULTS.JSON (strip legacy loop-setting keys on first write) ---
approach_name = os.path.basename(APPROACH_DIR)
try:
    approach_id = int(approach_name.split("_")[0])
except ValueError:
    approach_id = len(results["approaches"]) + 1
entry = {
    "id": approach_id,
    "name": approach_name,
    "status": status,
    "scores": scores,
    "runtime_seconds": elapsed,
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}
results["approaches"].append(entry)
# Strip any legacy loop-settings keys that leaked into results.json
for k in ("budget_per_approach", "background_threshold_seconds",
          "search_on_plateau_threshold", "search_on_plateau_ideas_count",
          "search_every_trial", "paradigm_categories", "allow_ensembles",
          "bibliography_on_plateau", "bibliography_target_per_plateau",
          "research_phase_required", "research_phase_skip_reason",
          "future_ideas", "min_approaches"):
    results.pop(k, None)
with open("results.json", "w") as f:
    json.dump(results, f, indent=2)

# --- PROGRESS PLOT ---
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    approaches = results['approaches']
    fig, ax = plt.subplots(figsize=(10, 6))
    for obj in OBJECTIVES:
        ids, vals, colors = [], [], []
        for a in approaches:
            if a.get('scores') is None:
                continue
            ids.append(a['id'])
            vals.append(a['scores'].get(obj, 0))
            colors.append('green' if a['status'] == 'keep'
                          else ('gray' if a['status'] == 'crash' else 'red'))
        ax.plot(ids, vals, '-', alpha=0.3, label=obj)
        for x, y, c in zip(ids, vals, colors):
            ax.scatter(x, y, c=c, s=40, zorder=5)
    ax.set_xlabel('Approach #')
    ax.set_ylabel('Score')
    ax.set_title(f"Autoresearch: {results['task']}")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig('progress.png', dpi=150)
    plt.close()
except Exception:
    pass

# --- UPDATE REPORT.MD (delegate to update_report.py) ---
# update_report.py owns Zone A (counters, best-score table,
# experiment log, approach tree) and leaves Zone B (narrative) alone.
# Failure is non-fatal — prints REPORT WARN and moves on. See
# references/report-updates.md.
try:
    subprocess.run(["python3", "update_report.py"], check=False, timeout=30)
except Exception as _re:
    print(f"REPORT WARN: {_re}")

# --- UPDATE .loop-state ---
total = len(results['approaches'])
best_now = float(open(best_file).read().strip()) if os.path.exists(best_file) else primary_score
with open(".loop-state", "w") as f:
    f.write(f"Last approach: {approach_id} | Best: {best_now:.4f} | Total: {total}\n")

# --- GIT COMMIT PROGRESS ---
subprocess.run(["git", "add", "progress.png", "README.md", "results.json",
                "loop-settings.json", "report.md", "best_score.txt", ".loop-state"],
               capture_output=True)
subprocess.run(["git", "commit", "-m",
    f"progress: {total} approaches, best {PRIMARY_METRIC}={best_now:.4f}"],
    capture_output=True)

# --- COMPLETION GATE ---
missing = []
if not os.path.exists(os.path.join(APPROACH_DIR, "scores.json")):
    missing.append("scores.json")
if not viz_ok:
    missing.append("plots")

if missing:
    print(f"!! INCOMPLETE {APPROACH_DIR}: missing {', '.join(missing)}")
else:
    symbol = '++' if kept else ('!!' if crashed else '--')
    print(f"{symbol} {approach_name}: {primary_score:.4f} ({status}, {elapsed}s)")

# --- SEARCH CALLBACKS ---
consecutive_discards = 0
for a in reversed(results['approaches']):
    if a['status'] in ('discard', 'crash'):
        consecutive_discards += 1
    else:
        break
if consecutive_discards >= 5:
    print(f"NEXT: {consecutive_discards} consecutive discards. Switch paradigm category.")

plateau_threshold = int(settings.get('search_on_plateau_threshold', 10))
if consecutive_discards >= plateau_threshold:
    ideas_count = int(settings.get('search_on_plateau_ideas_count', 10))
    biblio_target = int(settings.get('bibliography_target_per_plateau', 10))
    print(f"!! SEARCH_NEEDED ({consecutive_discards} consecutive discards, "
          f"threshold: {plateau_threshold}, delegate to co-intelligence:bibliography "
          f"in micro-mode (target: {biblio_target} papers, 1 wave), then find "
          f"{ideas_count} new approach ideas grounded in the discovered papers)")

if settings.get('search_every_trial', False):
    print("!! SEARCH_SUGGESTED")

# --- NARRATIVE_DUE emission ---
# Every N trials the agent must rewrite Zone B of report.md (Synthesis,
# What works, What doesn't work, Next Steps). See report-updates.md.
_narr_n = int(settings.get('narrative_update_every_n', 10))
_total_approaches = len([a for a in results['approaches']
                         if not a['name'].startswith('000_')])
if _narr_n > 0 and _total_approaches > 0 and _total_approaches % _narr_n == 0:
    print(f"!! NARRATIVE_DUE ({_total_approaches} approaches since last update). "
          f"Rewrite Zone B of report.md (Synthesis, What works, What doesn't work, "
          f"Next Steps). Use full <NNN>_<slug> trial names with clickable links. "
          f"After updating, delete .narrative-dirty. See references/report-updates.md.")

# --- RUNTIME STATS ---
runtimes = [a['runtime_seconds'] for a in results['approaches']
            if a.get('runtime_seconds') and a['status'] != 'crash']
if runtimes:
    sorted_rt = sorted(runtimes)
    median_rt = sorted_rt[len(sorted_rt) // 2]
    print(f"RUNTIME: this={elapsed}s, median={median_rt:.0f}s, "
          f"range={sorted_rt[0]:.0f}-{sorted_rt[-1]:.0f}s")

# --- PERSISTENT DIRECTIVES (survives context compaction) ---
# These print EVERY trial so the agent always sees them, even after
# context compression removes the original SKILL.md instructions.
print(f"NEXT: Write commentary.md for {approach_name} (front-matter status+summary; prose Result, Vs. hypothesis, Visualization, Vs. bibliography, Lessons).")
_viz_path = os.path.join(APPROACH_DIR, 'visualization.png')
if os.path.exists(_viz_path):
    print(f"NEXT: Read {_viz_path} before writing the next rationale.")
else:
    print(f"NEXT: {_viz_path} is ABSENT — trial crashed before plotting, describe what broke in commentary.md.")
print(f"NEXT: Write rationale.md for the next approach (front-matter parent+source; prose Idea, Hypothesis, Builds on, What we'll learn). Cite bibliography.md entries by BibTeX key.")
print("NEXT: Check prior approaches for reusable checkpoints via fixed.paths.artifacts_dir_for. Load if architecture matches.")
print("NEXT: Save heavy files (checkpoints, weights, caches) to artifacts_dir_for(__file__). NEVER to the approach folder — the harness will auto-move them.")
print("NEXT: Call _log() at start and end of approach.py; add progress lines in the middle for any trial >10s. Silent trials are marked monitoring_violation.")
print("NEXT: Estimate runtime. For >background_threshold_seconds use run_in_background + monitor training_progress.json.")
```

**Customization during init:** The template above is generic. The
only experiment-specific adaptations are:

1. If `visualize()` should NOT receive `run_fn` (for faster summary-only
   plots), change:
   ```python
   visualize(result, APPROACH_DIR, run_fn=getattr(mod, 'run', None))
   ```
   to:
   ```python
   visualize(result, APPROACH_DIR, run_fn=None)
   ```
2. If `fixed/data_prep.py` uses a different name for the test-exposure
   flag than `include_test_months`, update the TEST-SET LEAKAGE GUARD
   comment.

Everything else is driven by `results.json` + `loop-settings.json`
config.

---

## Step 10b — `update_report.py`

Generate alongside `eval_and_record.py`. Owns Zone A of `report.md`
(counters, best-score table, experiment log, approach tree, user
ideas status) and leaves Zone B (Synthesis, What works, What doesn't
work, Next Steps) untouched. Called from `eval_and_record.py` at the
end of every trial. Failure is non-fatal (prints `REPORT WARN` and
exits 0).

**Full Zone A/B contract, markers, column schema, and marker
injection on legacy resume:** `references/report-updates.md`.

```python
#!/usr/bin/env python3
"""Regenerate Zone A of report.md from results.json + sidecars.
IMMUTABLE. Called by eval_and_record.py after every trial.

Reads:
- results.json (canonical NNN sequence, metric keys, tag)
- approaches/*/scores.json (metric values, status)
- approaches/*/commentary.md front-matter (summary, status)
- approaches/*/rationale.md front-matter (parent, source, addresses_user_idea)

Writes:
- report.md Zone A between <!-- auto:begin --> and <!-- auto:end -->
- .narrative-dirty sentinel (when Zone A changes and narrative is stale)
"""
import json, os, re, sys, shutil, time
from datetime import datetime

SESSION_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SESSION_DIR)

REPORT = "report.md"
BACKUP = "report.md.bak"
BEGIN = "<!-- auto:begin -->"
END = "<!-- auto:end -->"


def load_fm(path):
    """Extract YAML-ish front-matter from a markdown file. Returns dict."""
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        text = f.read()
    m = re.match(r'^---\n(.*?)\n---\n', text, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        k, _, v = line.partition(":")
        v = v.strip()
        if v.lower() in ("null", "~", ""):
            v = None
        elif v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        fm[k.strip()] = v
    return fm


def approach_link(name):
    return f"[{name}](approaches/{name}/)"


def render_zone_a(results, settings, approaches_data):
    tag = results.get("tag", "")
    started = results.get("started", "")
    total = len(approaches_data)
    objectives = results.get("objectives", [results.get("primary_metric", "score")])
    primary = results.get("primary_metric", objectives[0] if objectives else "score")
    higher = results.get("higher_is_better", {})

    # Current best
    scored = [a for a in approaches_data
              if a["scores"] and a["status"] not in ("crash", "monitoring_violation")]
    def score_of(a): return a["scores"].get(primary, float("inf"))
    if scored:
        if higher.get(primary, True):
            best_row = max(scored, key=score_of)
        else:
            best_row = min(scored, key=score_of)
    else:
        best_row = None

    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    lines = [BEGIN]
    lines.append(f"**Tag:** {tag} | **Started:** {started} | "
                 f"**Approaches tried:** {total} | **Last updated:** {now}")
    lines.append("")
    if best_row:
        lines.append(f"**Current best:** {approach_link(best_row['name'])} — "
                     f"{primary}: {score_of(best_row):.4f}")
    else:
        lines.append("**Current best:** (none yet)")
    lines.append("")

    # Best-score table
    lines.append("## Best scores by metric")
    lines.append("")
    lines.append("| Metric | Direction | Best Score | Best Approach |")
    lines.append("|---|---|---|---|")
    for obj in objectives:
        direction = "higher" if higher.get(obj, True) else "lower"
        best_for_obj = None
        if scored:
            def s_obj(a): return a["scores"].get(obj, float("inf"))
            best_for_obj = (max if higher.get(obj, True) else min)(scored, key=s_obj)
        if best_for_obj:
            mark = " (PRIMARY)" if obj == primary else ""
            lines.append(f"| {obj}{mark} | {direction} | "
                         f"{best_for_obj['scores'].get(obj, float('nan')):.4f} | "
                         f"{approach_link(best_for_obj['name'])} |")
        else:
            lines.append(f"| {obj} | {direction} | — | — |")
    lines.append("")

    # Experiment Log
    lines.append("## Experiment Log")
    lines.append("")
    header = "| # | Name | Status |"
    sep = "|---|------|--------|"
    for obj in objectives:
        header += f" {obj} |"
        sep += "---|"
    header += " Δ_best | Δ_parent | Notes |"
    sep += "--------|----------|-------|"
    lines.append(header)
    lines.append(sep)

    running_best = None
    name_to_score = {a["name"]: score_of(a) for a in approaches_data if a["scores"]}
    for a in approaches_data:
        nnn = a["name"].split("_")[0]
        status_glyph = ""
        if (a["status"] not in ("crash",)
                and not os.path.exists(os.path.join("approaches", a["name"], "visualization.png"))):
            status_glyph = "⚠ "
        status_str = status_glyph + a["status"]
        row = f"| {nnn} | {approach_link(a['name'])} | {status_str} |"
        if a["status"] == "crash":
            for _ in objectives:
                row += " inf |"
            row += " crash | — | "
        else:
            for obj in objectives:
                v = a["scores"].get(obj, float("nan")) if a["scores"] else float("nan")
                row += f" {v:.4f} |"
            # delta vs global best before this trial
            this_score = score_of(a)
            if running_best is None:
                d_best = "—"
            else:
                diff = this_score - running_best
                d_best = f"{diff:+.4f}"
            # delta vs parent
            parent = a.get("parent")
            if not parent or parent not in name_to_score:
                d_parent = "—"
            else:
                pdiff = this_score - name_to_score[parent]
                d_parent = f"{pdiff:+.4f}"
            row += f" {d_best} | {d_parent} | "
            # Update running best
            if running_best is None:
                running_best = this_score
            elif higher.get(primary, True):
                running_best = max(running_best, this_score)
            else:
                running_best = min(running_best, this_score)
        row += f"{a.get('summary','')} |"
        lines.append(row)
    lines.append("")

    # Approach Tree
    lines.append("## Approach Tree")
    lines.append("")
    children_of = {}
    roots = []
    by_name = {a["name"]: a for a in approaches_data}
    for a in approaches_data:
        parent = a.get("parent")
        if parent and parent in by_name:
            children_of.setdefault(parent, []).append(a["name"])
        else:
            roots.append(a["name"])

    def render_node(name, depth):
        a = by_name[name]
        score_str = ""
        if a["scores"] and a["status"] not in ("crash", "monitoring_violation"):
            s = a["scores"].get(primary)
            if s is not None:
                score_str = f", {s:.4f}"
        src = f"  ← source: {a.get('source')}" if (a.get("source") and depth == 0) else ""
        lines.append(f"{'  ' * depth}- {approach_link(name)} ({a['status']}{score_str}){src}")
        for child in children_of.get(name, []):
            render_node(child, depth + 1)

    for root in roots:
        render_node(root, 0)
    if not roots:
        lines.append("(no approaches yet)")
    lines.append("")

    # User ideas status
    user_ideas = results.get("user_ideas_queue", [])
    if user_ideas:
        lines.append("## User Ideas Status")
        lines.append("")
        lines.append("| Idea | Status | Approach(es) |")
        lines.append("|------|--------|--------------|")
        for idea in user_ideas:
            slug = idea.get("slug", idea.get("text", ""))
            text = idea.get("text", slug)
            hits = [a["name"] for a in approaches_data if a.get("addresses_user_idea") == slug]
            status = "tested" if hits else "pending"
            hits_col = ", ".join(approach_link(n) for n in hits) if hits else "—"
            lines.append(f"| {text} | {status} | {hits_col} |")
        lines.append("")

    lines.append(END)
    return "\n".join(lines)


def main():
    if not os.path.exists("results.json"):
        print("REPORT WARN: results.json missing, skipping")
        return 0
    with open("results.json") as f:
        results = json.load(f)
    settings = {}
    if os.path.exists("loop-settings.json"):
        with open("loop-settings.json") as f:
            settings = json.load(f)

    # Gather per-approach data: scores + front-matter
    approaches_data = []
    seen_names = set()
    for entry in results.get("approaches", []):
        name = entry["name"]
        if name in seen_names:
            print(f"REPORT WARN: duplicate name {name} in results.json")
            continue
        seen_names.add(name)
        adir = os.path.join("approaches", name)
        scores = None
        scores_path = os.path.join(adir, "scores.json")
        if os.path.exists(scores_path):
            with open(scores_path) as f:
                scores_doc = json.load(f)
                scores = scores_doc.get("scores")
        rat_fm = load_fm(os.path.join(adir, "rationale.md"))
        com_fm = load_fm(os.path.join(adir, "commentary.md"))
        approaches_data.append({
            "name": name,
            "status": com_fm.get("status") or entry.get("status") or "unknown",
            "scores": scores,
            "summary": com_fm.get("summary", ""),
            "parent": rat_fm.get("parent"),
            "source": rat_fm.get("source"),
            "addresses_user_idea": rat_fm.get("addresses_user_idea"),
        })

    # Sanity check: NNN/slug collisions
    by_nnn = {}
    for a in approaches_data:
        nnn = a["name"].split("_")[0]
        if nnn in by_nnn and by_nnn[nnn] != a["name"]:
            print(f"REPORT WARN: NNN collision — {nnn} used by both "
                  f"{by_nnn[nnn]} and {a['name']}. Refusing to update Zone A.")
            return 0
        by_nnn[nnn] = a["name"]

    # Backup current report
    if not os.path.exists(REPORT):
        print("REPORT WARN: report.md missing, skipping")
        return 0
    shutil.copy(REPORT, BACKUP)

    try:
        with open(REPORT) as f:
            current = f.read()
        new_zone_a = render_zone_a(results, settings, approaches_data)
        if BEGIN in current and END in current:
            new_report = re.sub(
                re.escape(BEGIN) + r".*?" + re.escape(END),
                new_zone_a,
                current,
                count=1,
                flags=re.DOTALL,
            )
        else:
            print("REPORT WARN: markers missing — run marker injection on resume. "
                  "See references/report-updates.md §Marker injection.")
            return 0

        if new_report != current:
            with open(REPORT, "w") as f:
                f.write(new_report)
            # Zone A changed — mark narrative as stale
            with open(".narrative-dirty", "w") as f:
                f.write(time.strftime("%Y-%m-%dT%H:%M:%SZ\n", time.gmtime()))
    except Exception as e:
        shutil.copy(BACKUP, REPORT)
        print(f"REPORT WARN: rollback after {e}", file=sys.stderr)
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Copy verbatim. The template is fully generic — it reads metric names
and directions from `results.json["objectives"]` and
`results.json["higher_is_better"]`, so no per-session customization is
needed.

---

## Step 11 — Smoke-test approach (approach 000)

If the user accepted the smoke-test proposal at the end of the setup
discussion, write one naive baseline approach numbered `000` whose
sole purpose is to exercise the full pipeline end-to-end.

### Template for `approaches/000_smoke_test/approach.py`

```python
"""Naive baseline — smoke test.

This approach is intentionally trivial. Its purpose is to exercise
the full pipeline (data loading, training, prediction, scoring,
visualization, logging, git commit, report rendering) BEFORE the real
loop starts. Expected to score at the worst possible value for the
metric direction if the metric rewards skill.

See SKILL.md §Execution: Smoke-test approach.
"""
import os, time, json

_LIVE_LOG = os.path.join(os.path.dirname(__file__), "live.log")

def _log(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}\n"
    print(line, end="", flush=True)
    with open(_LIVE_LOG, "a") as f:
        f.write(line)

def run(data):
    _log("Smoke test started")
    # Replace this with the dumbest predictor that still uses the real
    # evaluation contract. Examples per task type:
    #   - regression: constant mean / median / last value
    #   - classification: majority class
    #   - generation: random token sampling
    #   - optimization: no-op (return starting point)
    import numpy as np

    # Example for regression:
    try:
        y_mean = float(data.train.y.mean())
        n_val = len(data.val.y)
        preds = np.full(n_val, y_mean)
    except AttributeError:
        # Task-specific fallback — replace with the correct contract
        preds = None

    _log("Smoke test complete")
    return preds
```

### Template for `approaches/000_smoke_test/rationale.md`

```markdown
---
approach: 000_smoke_test
parent: null
source: smoke_test
---

# Rationale — 000_smoke_test

- **Idea:** Predict the training-set mean for every validation sample.
- **Hypothesis:** Score will be at (or near) the worst possible value
  for the metric direction. This trial's purpose is to prove the
  pipeline works, not to achieve a useful score.
- **Builds on:** none — exploratory (smoke test).
- **What we'll learn:** Whether the data loader, evaluation harness,
  visualization, logging, git commit, and report rendering all work
  end-to-end. A clean run here means we can trust the plumbing for
  the real loop. A broken artifact here means we fix it BEFORE
  spending hours on real approaches.
```

### Sequence

1. Write `approaches/000_smoke_test/rationale.md` (template above)
2. Write `approaches/000_smoke_test/approach.py` (template above,
   adapted to the task's data contract)
3. Run `eval_and_record.py approaches/000_smoke_test`
4. Inspect the artifacts:
   - `visualization.png` — describe what you see (multimodal read)
   - `scores.json` — confirm score is at worst value for direction
   - `training_progress.json` and `live.log` — confirm they exist
   - `git log --oneline` — confirm one init commit + one 000 commit
   - `report.md` — confirm the 000 entry rendered correctly
5. Write `approaches/000_smoke_test/commentary.md` (this is the
   postmortem the user reviews during the smoke-test confirmation
   gate)
6. Show everything to the user:
   > *"Pipeline verified end-to-end. Ready to start the real loop?"*
7. On explicit approval, enter the loop and write `001_<name>`.

If any artifact is missing or malformed, STOP. Diagnose with the
user. Do NOT enter the loop on a broken pipeline.
