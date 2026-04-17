# Report Updates

How `report.md` stays accurate over hundreds of trials without the
agent doing free-form Edit calls that lose anchors and produce
duplicate rows.

The report is split into two ownership zones. A script owns the
deterministic parts and runs every trial. The agent owns the
narrative parts and runs them every N trials and on stop.

---

## Zone ownership

`report.md` contains two kinds of content separated by sentinel
markers:

```markdown
<!-- auto:begin -->
... script-owned content (Zone A) ...
<!-- auto:end -->

## Synthesis
... agent-owned narrative (Zone B) ...
```

**Zone A — script-owned, regenerated every trial:**

- Header counters (approaches tried, last updated, current best)
- Best-score table (per metric, with link to the winning approach)
- Experiment Log table (one row per approach, with delta vs best and
  delta vs parent)
- Approach Tree (lineage from `parent:` field in each `rationale.md`)
- User Ideas Status (counted from `addresses_user_idea:` field)

**Zone B — agent-owned, narrative reasoning:**

- `## Synthesis` — overall pattern recognition
- `## What works` — concrete observations
- `## What doesn't work` — concrete observations
- `## Next Steps` — short forward-looking list

The script NEVER touches Zone B. The agent NEVER hand-edits Zone A.
If the agent sees something wrong in Zone A, the fix is in
`update_report.py`, not in `report.md`.

---

## `update_report.py` — script contract

Lives at session root, **immutable** alongside `eval_and_record.py`.
Generated at session init from a template (see
`references/session-init.md` §Step 6).

**Inputs (single source of truth hierarchy):**

1. `results.json` — canonical NNN sequence, metric keys, `objectives`
   (higher/lower-is-better), session `tag`
2. Per approach: `approaches/<NNN>_<slug>/scores.json` — metric values
   and status
3. Per approach: `approaches/<NNN>_<slug>/commentary.md` front-matter —
   narrative status (keep / discard / crash), notes, `addresses_user_idea`
4. Per approach: `approaches/<NNN>_<slug>/rationale.md` front-matter —
   `parent:` lineage, `source:` (when `parent: null`)

**Reads NOTHING from `approach.py` or `artifacts/`.** The script never
parses Python; it never opens model checkpoints.

**Output:** rewrites the content between `<!-- auto:begin -->` and
`<!-- auto:end -->` in `$SESSION_DIR/report.md`. Leaves Zone B
untouched. Writes nothing else.

**Safety pattern (mandatory):**

```python
import shutil, sys
backup = "report.md.bak"
shutil.copy("report.md", backup)
try:
    rewrite_zone_a("report.md", data)
except Exception as e:
    shutil.copy(backup, "report.md")
    print(f"REPORT WARN: rollback after {e}", file=sys.stderr)
    sys.exit(0)  # non-fatal
```

Failure is non-fatal. The trial keeps its scores; the report just
doesn't update this round. Same policy as visualization failure.

**Called by:** `eval_and_record.py` at the very end, after scores are
written and visualization has been attempted. The call is wrapped in a
try/except so that even a script syntax error cannot kill the trial
record.

---

## Zone A schema (what the script writes)

### Header block

```markdown
<!-- auto:begin -->
**Tag:** <tag> | **Started:** <YYYY-MM-DD> | **Approaches tried:** <N> | **Last updated:** <ISO8601>

**Current best:** [<NNN>_<slug>](approaches/<NNN>_<slug>/) — <primary_metric>: <value>
```

### Best-score table

```markdown
| Metric | Direction | Best Score | Best Approach |
|---|---|---|---|
| <metric_1> (PRIMARY) | <lower\|higher> | <value> | [<NNN>_<slug>](approaches/<NNN>_<slug>/) |
| <metric_2> | <lower\|higher> | <value> | [<NNN>_<slug>](approaches/<NNN>_<slug>/) |
```

Columns are dynamic — the script reads `results.json["objectives"]`
and emits one row per metric. No hardcoding.

### Experiment Log table

```markdown
| # | Name | Status | <metric_1> | <metric_2> | ... | Δ_best | Δ_parent | Notes |
|---|------|--------|-----------|-----------|-----|--------|----------|-------|
| 001 | [001_ridge_tuned](approaches/001_ridge_tuned/) | keep | 1.0688 | ... | — | — | seed |
| 002 | [002_persistence](approaches/002_persistence/) | discard | 1.1374 | ... | +0.0686 | +0.0686 | |
| 003 | [003_ema_05](approaches/003_ema_05/) | discard | 1.0647 | ... | -0.0042 | -0.0042 | |
```

- `Δ_best` = score minus the global best **before this trial**
- `Δ_parent` = score minus the parent approach's score (— if `parent: null`)
- `Notes` = first-line summary from `commentary.md` front-matter `summary:` field
- Crashed trials show `crash` in Status and `inf` in metric columns
- A `⚠` glyph prepends Status when `visualization.png` is absent for
  a non-crash trial — surfaces "trial succeeded but plot failed"

**Uniqueness invariant:** the script keys rows by `(NNN, slug)`. If
two approach folders both claim the same NNN with different slugs,
the script fails loudly with both names and exits non-zero. Same for
collision on slug across different NNNs (a clear sign of state
corruption).

### Approach Tree

Rendered from `parent:` lineage walked across all `rationale.md`
files. Format:

```markdown
## Approach Tree

- [001_ridge_tuned](approaches/001_ridge_tuned/) (keep, 1.0688)
  - [002_persistence](approaches/002_persistence/) (discard)
  - [004_ema_03](approaches/004_ema_03/) (keep, 1.0037)
    - [005_ema_02](approaches/005_ema_02/) (keep, 0.9900)
    - [007_ema_025](approaches/007_ema_025/) (discard)
- [010_median_last4](approaches/010_median_last4/) (keep, 0.9582)  ← source: user_queue
  - [011_median_last6](approaches/011_median_last6/) (keep, 0.9277)
```

Roots are trials with `parent: null` — labeled with their `source:`
tag (`user_queue`, `plateau_search`, `bibliography:cite_key`,
`smoke_test`).

If `parent` references a NNN that doesn't exist in `results.json`,
the script flags it as an orphan and lists it under `## Orphan Branches`.

### User Ideas Status

```markdown
| Idea | Status | Approach(es) |
|------|--------|--------------|
| Ridge on raw features | tested | [001_ridge_tuned](...), [010_median_last4](...) |
| Seasonal naive s=2 | pending | — |
```

`Status` is `tested` if at least one approach has
`addresses_user_idea: <slug>` in its rationale front-matter, else
`pending`. Approach links list every approach that addressed the idea.

---

## Zone B — agent narrative

Triggered by:

1. **NARRATIVE_DUE flag** — `eval_and_record.py` emits
   `!! NARRATIVE_DUE` to stdout when
   `len(approaches) % loop_settings["narrative_update_every_n"] == 0`.
   Default cadence is 10. Same emission pattern as the existing
   `!! SEARCH_NEEDED` plateau flag.
2. **Stop request** — when the user says stop/pause/end, the agent
   MUST run a Zone B update before deleting `.loop-active`.
3. **First trial** — Zone B is seeded at approach 001 with honest
   single-point content (no empty start).

### What the agent writes in Zone B

```markdown
## Synthesis

(2-5 sentences: what's the dominant pattern after N trials? Which
lineages are alive, which are dead? What's the gap to the global best
look like?)

## What works

- (concrete observation tied to specific approaches by full name)
- ...

## What doesn't work

- (concrete observation tied to specific approaches by full name)
- ...

## Next Steps

1. (forward-looking, 2-5 items, references queued ideas or open
   threads from current best lineage)
```

**Trial naming rule for Zone B prose:** first mention in each section
uses full `<NNN>_<slug>` form, ideally as a clickable link. Short
`NNN` form allowed in subsequent references within the same paragraph.
Never use bare `NNN` without a nearby full-name anchor.

### `.narrative-dirty` sentinel

`update_report.py` writes `.narrative-dirty` to session root whenever
Zone A changes. The agent's narrative-update tool call deletes
`.narrative-dirty` after rewriting Zone B.

The sentinel is checked by:

- The agent's stop handler before deleting `.loop-active` (prose rule
  in SKILL.md stopping section)
- The loop-entry validation gate on resume — a stale `.narrative-dirty`
  means the previous stop was dirty; the agent runs Zone B as the
  first action of the resume

There is NO Stop hook enforcement of this — keep it simple. The
sentinel is a self-check, not a wall.

---

## Marker injection on legacy resumes

Legacy sessions predating this schema have `report.md` files without
zone markers. On resume, the validation gate detects missing
`<!-- auto:begin -->` / `<!-- auto:end -->` and offers a one-time
repair:

> "report.md has no zone markers — Zone A content can't be
> auto-updated. Options:
>
> 1. Inject markers around a freshly generated Zone A; preserve any
>    existing narrative as Zone B (recommended).
> 2. Leave report.md alone and disable scripted updates for this
>    session.
>
> Which?"

If option 1 is chosen, the migration:

1. Backs up `report.md` to `report.md.pre-migration`
2. Wipes the broken Experiment Log table at its anchor
3. Inserts fresh `<!-- auto:begin -->` / `<!-- auto:end -->` markers
4. Generates Zone A fresh from `results.json` and approach folders
5. Preserves any existing prose under `## Synthesis`, `## What works`,
   `## What doesn't work`, `## Next Steps` as Zone B

Newly created sessions never hit this code path — markers are
written by `session-init.md` Step 7.

---

## Why this design

**Free-form markdown editing fails at scale.** The drift seen in
real sessions (anchors lost, rows appended at EOF, duplicate rows
on retries, empty Best Score table) is a structural failure of
LLM-driven Edit calls, not a discipline failure. Over 100+ trials
plus compactions plus restarts, the Edit anchor for inserting a row
into the middle of a table cannot be reliably found, and the agent
falls back to appending at EOF.

**Scriptifying the deterministic parts removes that failure mode
entirely.** The script doesn't lose anchors — it owns the section.
It can't duplicate rows — it rewrites the whole table from
`results.json` every time. It can't get the delta wrong — it
computes deltas from canonical scores. It can't get NNN wrong — it
keys on `results.json`, not directory scans.

**The narrative parts are still LLM work** because they require
actual judgment: what's the pattern, what's worth trying next, what
to stop banging on. Those can't be scriptified, but they only need
to happen every 10 trials — not every trial.

**One source of truth, two writers.** Zone A is owned by the script
keyed off `results.json` + sidecars. Zone B is owned by the agent
reading the same. Neither writer overwrites the other's zone.
