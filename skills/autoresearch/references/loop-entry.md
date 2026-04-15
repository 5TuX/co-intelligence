# Loop Entry

Everything that happens between "user asks to start (or resume) the
loop" and "the first trial of the loop actually runs." Fires on every
loop entry — brand-new session AND every resume.

Three stages, in order:

1. **Validation gate** — 12 checks verifying all setup artifacts exist
   and are coherent. Blocks entry until every check passes or is
   explicitly waived.
2. **Pre-flight walkthrough** — narrative explanation of what will
   happen in the loop, sourced from `loop-settings.json`. Gives the
   user one last chance to tweak anything.
3. **Enter the loop** — only after the user approves the walkthrough
   with no pending tweaks.

The loop does NOT start until all three stages clear.

---

## Stage 1 — Validation gate

Run on every loop entry. Each check passes, auto-repairs, or blocks
with a user prompt.

1. **`$SESSION_DIR/experiment-plan.md`** — exists, non-empty, has
   sections for task, data, metric, harness, scope, constraints. If
   missing: re-run setup discussion or abort.

2. **`$SESSION_DIR/loop-settings.json`** — exists, valid JSON, has
   all required keys (see §Settings persistence below). Legacy
   sessions with knobs in `results.json` are auto-migrated on first
   resume — the agent reads the old top-level keys, writes them into
   `loop-settings.json`, and strips them from `results.json` on the
   next write.

3. **`$SESSION_DIR/fixed/evaluate.py`** — exists, matches the harness
   pseudo-code confirmed during clarifying question 6. If modified
   since creation: that's a severe violation of the immutability
   contract; warn the user before proceeding.

4. **`$SESSION_DIR/fixed/data_prep.py`**, **`fixed/visualize.py`**,
   and **`fixed/paths.py`** — exist and are importable. Run a dry
   import to catch syntax errors early. `fixed/paths.py` is the
   whitelisted helper `approach.py` uses to resolve
   `artifacts_dir_for(__file__)`; if missing on a legacy session,
   create it from the template in
   `references/evaluation-contract.md` §`fixed/paths.py` contract.

5. **`$SESSION_DIR/eval_and_record.py`** and
   **`$SESSION_DIR/update_report.py`** — exist and are runnable
   (`python3 -c 'import ast; ast.parse(open("eval_and_record.py").read())'`).
   On legacy sessions where `update_report.py` is absent, create it
   from the template in `references/session-init.md` §Step 10b.

6. **`$SESSION_DIR/results.json`** — exists and is valid JSON. May
   have zero approaches on a brand-new session. Required keys:
   `task`, `tag`, `objectives`, `primary_metric`, `higher_is_better`,
   `approaches`.

7. **`$SESSION_DIR/report.md`** — exists AND contains
   `<!-- auto:begin -->` / `<!-- auto:end -->` markers defining
   Zone A. On legacy sessions without markers, offer one-time
   marker injection per `references/report-updates.md` §Marker
   injection on legacy resumes. Do not silently proceed with
   missing markers — `update_report.py` refuses to write without
   them.

7b. **`$SESSION_DIR/.gitignore`** — exists and contains `artifacts/`.
    If missing the rule, append it and commit. `approaches/` is
    tracked; `artifacts/` must not be.

7c. **`$SESSION_DIR/approaches/` and `$SESSION_DIR/artifacts/`** —
    both directories exist. Missing `artifacts/` is auto-created
    with a `.gitkeep` (no prompt needed). Missing `approaches/` on
    a session with `approaches` entries in `results.json` is a hard
    abort — the reproducibility package is gone.

7d. **Approach folder schema** — scan every subdirectory of
    `approaches/`. For each, confirm the 6 mandatory files are
    present (`rationale.md`, `approach.py`, `commentary.md`,
    `scores.json`, `metrics.json`, `live.log`). Absence of optional
    files (`visualization.png`, `training_progress.json`) is not a
    failure. Presence of forbidden file types (`.pkl`, `.pt`, etc.)
    or files over `approach_file_size_limit_mb` triggers a one-time
    migration prompt:

    > "N approach folders contain heavy files that belong in
    > `artifacts/`. Move them now? (y/n)"

    On yes, move the files and update the relevant commits.

8. **Survival files** — `.claude/CLAUDE.md`, `.autoresearch-directives`.
   Auto-recreate any missing from the templates in
   `references/loop-enforcement.md`. These are non-optional.

9. **`$SESSION_DIR/.loop-active`** — either present with the correct
   session ID or to be freshly written. Use the transcript-lookup
   technique in `references/session-init.md` §Step 8 to derive the
   current session ID, then write it to the file. Never leave
   `.loop-active` empty — the Stop hook requires a non-empty session
   ID to match.

10. **Bibliography (if Phase 0 was opted in)** — `bibliography.md`
    exists and has at least 10 entries (count `## ` headings or
    `@article` / `@inproceedings` BibTeX entries, whichever the file
    uses). If it has fewer: ask the user whether to run (or re-run)
    `co-intelligence:bibliography` now, or adjust
    `loop-settings.json` to set `research_phase_required: false` with
    a justification.

11. **Stop hook** — `~/.claude/settings.json` contains the
    autoresearch Stop hook entry. Grep for
    `autoresearch/*/\.loop-active` in the settings.json Stop array.
    If missing, warn loudly:

    > "WARNING: The autoresearch Stop hook is not configured in
    > `~/.claude/settings.json`. Without it, there is no technical
    > barrier preventing the loop from stopping — only prose rules,
    > which degrade in long sessions. Install it via
    > `references/loop-enforcement.md`."

    Offer to install via the `update-config` skill. Proceed anyway
    if the user accepts the degraded enforcement.

12. **Git repo** — `git status` is clean or has only `.loop-active`
    dirty (the session ID write in step 9 is expected to be
    uncommitted on a fresh entry). If dirty for other reasons
    (stale edits from an interrupted prior session), ask the user
    whether to commit, stash, or abort.

13. **`.narrative-dirty` sentinel** — if present on resume, the
    previous stop was dirty: Zone A advanced but Zone B of
    `report.md` was not refreshed. The agent's first action after
    the validation gate clears is to rewrite Zone B (see
    `references/experiment-loop.md` §Narrative update), then delete
    `.narrative-dirty`. The loop does not begin its first new trial
    until this is done.

### If any validation fails

Do NOT proceed to the pre-flight walkthrough or the loop. Instead:

1. **List every failing check concretely** — which file is missing,
   which key is absent, which import fails. Don't dump the raw
   error; translate it into a one-line explanation per gap.

2. **For each gap, offer the user options:**
   - *Fill it in now via targeted questions* — preferred for small
     gaps like a missing `loop-settings.json` key or a missing
     `report.md`.
   - *Re-run the full setup discussion* — for large gaps like a
     missing `experiment-plan.md` or a broken `fixed/evaluate.py`.
   - *Abort and investigate manually* — the escape hatch when
     something's off that the agent shouldn't touch.

3. **For small gaps**, ask the relevant clarifying question from
   `references/clarifying-questions.md` or the relevant walkthrough
   tweak from §Accepted tweaks below, fix the file, and re-run
   validation.

4. **Only proceed** to the pre-flight walkthrough once ALL validation
   checks pass. Do not loop on a partially-valid state — the loop
   will either fail loudly (best case) or drift silently (worst case)
   into an incoherent experiment.

### Why this gate exists

The user can safely interrupt a setup discussion, come back later,
and have the agent pick up exactly where it stopped. Without this
gate, a partial session would either:

- **Fail loudly mid-loop** — `eval_and_record.py` would crash on the
  first approach because `fixed/evaluate.py` is missing or
  `loop-settings.json` lacks a required key. Annoying but safe.
- **Fail silently** — the loop would run but with wrong thresholds,
  wrong paradigms, or an incorrect session ID in `.loop-active`
  (so the Stop hook misfires). This is how sessions drift.

The validation gate makes partial state a recoverable condition
instead of a mid-loop crash. Twelve checks up front, each with a
clear remediation path, is cheaper than a hundred bad approaches.

---

## Stage 2 — Pre-flight walkthrough

After validation passes, the agent explains to the user *what is
about to happen* in the loop and gives them a chance to tweak
anything. This is the last gate before autonomous execution.

The walkthrough is a short narrative, **not** a dry checklist. The
format below is a template; adapt the phrasing to the specific session.

### Template

> "Here's what will happen when I enter the loop:
>
> - I'll work on **`<session tag>`**: `<one-line task summary>`.
> - Each approach will get up to **`<budget>`** of compute time. Trials
>   estimated to run longer than **`<bg_threshold>`** will launch in
>   background and I'll monitor their `training_progress.json` while
>   waiting.
> - I'll rotate through these paradigm categories:
>   **`<category1, category2, ...>`**. After 5 consecutive discards in
>   one category I'll switch; after 10 across the board I'll invent a
>   new one.
> - Between trials I'll always review the previous approach's
>   `visualization.png`, `training_progress.json`, and loss curves
>   before writing the next one, and I'll save checkpoints every epoch
>   so later trials can warm-start from earlier weights.
> - After every trial I'll write a short `commentary.md` (what the
>   result was, whether it matched the rationale's hypothesis, what
>   the visualization shows, lessons). Before every trial I'll write a
>   short `rationale.md` (idea, hypothesis, parent lineage, citations
>   from `bibliography.md` if the trial builds on specific papers,
>   what we'll learn). These are the reproducibility sidecars.
> - Every trial, a script (`update_report.py`) refreshes the
>   deterministic parts of `report.md` — tables, best scores,
>   approach tree. Every **`<narrative_update_every_n>`** trials I'll
>   rewrite the narrative parts myself (Synthesis / What works /
>   What doesn't work / Next Steps). I'll also rewrite them one last
>   time when you tell me to stop.
> - After **`<plateau_threshold>`** consecutive discards I'll pause the
>   loop, delegate to `co-intelligence:bibliography` in micro-mode
>   (1 wave, ~`<bibliography_target_per_plateau>` papers), append
>   whatever I find to `bibliography.md`, and use those papers to
>   generate **`<plateau_ideas_count>`** new approach ideas.
> - `search_every_trial` is currently **`<on|off>`**. [If on: I'll do
>   a quick literature dip before every single approach.]
> - The user ideas queue has **`<N>` pending** ideas I'll test first.
> - Fail-fast is on: crashes score at the worst possible value, no
>   synthetic fallbacks, no fabricated visualizations.
> - I will not stop until you tell me to. Say *'stop'*, *'pause'*,
>   *'that's enough'* — any of those — and I'll delete `.loop-active`
>   and end cleanly.
>
> **Tweak anything, or proceed?**"

### Accepted tweaks

The user can say anything natural-language and the agent interprets
and applies it to `loop-settings.json`. Common examples:

| User says | Effect on `loop-settings.json` |
|---|---|
| *"budget to 15m"* | `budget_per_approach: "15m"` |
| *"plateau threshold to 15"* | `search_on_plateau_threshold: 15` |
| *"add graph-neural-net to paradigms"* | Appends to `paradigm_categories` |
| *"turn off per-trial search"* | `search_every_trial: false` |
| *"increase background threshold to 120s"* | `background_threshold_seconds: 120` |
| *"20 papers per plateau"* | `bibliography_target_per_plateau: 20` |
| *"allow ensembles"* | `allow_ensembles: true` |
| *"narrative every 5 trials"* | `narrative_update_every_n: 5` |
| *"monitoring required after 30s"* | `monitoring_required_after_seconds: 30` |
| *"bump file size limit to 5MB"* | `approach_file_size_limit_mb: 5` |

After applying any change, the agent **re-prints the affected lines of
the walkthrough** and asks again. The loop does not start until the
user gives explicit approval with no pending tweaks.

### Experiment-definition changes on resume

If during the walkthrough (on resume) the user asks to change an
**experiment-definition** item — metric, hold-out split, evaluation
harness, data source, anything from the clarifying-questions list —
the agent MUST warn:

> "Changing `<item>` invalidates comparisons with every prior approach
> in this session. Options:
>
> 1. Start a new session with the new definition (old session is
>    preserved read-only).
> 2. Proceed and accept the invalidation — I'll add a note to
>    `report.md` marking the boundary between old and new approaches.
>
> Which?"

Do not silently mutate the experiment contract. Experiment definition
is the axis that comparability across trials depends on.

---

## Settings persistence (`loop-settings.json`)

All loop-tuning settings live in a dedicated file next to `results.json`:

```
$SESSION_DIR/loop-settings.json
```

This is the single source of truth for how the loop behaves — read by
the agent (at every loop entry, and when needed during the loop) and
by `eval_and_record.py` (to decide plateau triggers, background
execution, etc.). `results.json` remains the approaches / scores /
ideas-queue carrier and does NOT duplicate these settings.

### Canonical schema

```json
{
  "budget_per_approach": "5m",
  "background_threshold_seconds": 60,
  "search_on_plateau_threshold": 10,
  "search_on_plateau_ideas_count": 10,
  "search_every_trial": false,
  "paradigm_categories": [
    "weight tuning",
    "new model type",
    "feature engineering",
    "preprocessing",
    "architecture change",
    "loss function",
    "regularization",
    "data augmentation",
    "cross-validation"
  ],
  "allow_ensembles": false,
  "bibliography_on_plateau": true,
  "bibliography_target_per_plateau": 10,
  "research_phase_required": true,
  "research_phase_skip_reason": null,
  "narrative_update_every_n": 10,
  "monitoring_required_after_seconds": 10,
  "approach_file_size_limit_mb": 1,
  "physical_path": "$SESSION_DIR",
  "discovery_symlink": null
}
```

### Field reference

| Field | Type | Meaning |
|---|---|---|
| `budget_per_approach` | string | Per-approach wall-clock budget (e.g. `"5m"`, `"30s"`, `"none"`). **Advisory, not hard-enforced.** The agent reads this at runtime-estimation time (§Step 3 of `references/experiment-loop.md`) and uses it to choose foreground vs. background launch and to decide when to soft-kill a stalled trial. There is no timer or signal-based timeout inside `eval_and_record.py` — enforcement is the agent's job via the soft-kill protocol. |
| `background_threshold_seconds` | int | Trials estimated to run longer than this launch with `run_in_background: true` |
| `search_on_plateau_threshold` | int | Consecutive discards that trigger `!! SEARCH_NEEDED` |
| `search_on_plateau_ideas_count` | int | Number of new approach ideas to generate per plateau trigger |
| `search_every_trial` | bool | If true, `eval_and_record.py` emits `!! SEARCH_SUGGESTED` after every trial |
| `paradigm_categories` | list[str] | The agent rotates through these; after 5 discards in one, switch; after 10 across, invent a new one |
| `allow_ensembles` | bool | If false, single-method-per-trial rule applies; ensembles forbidden |
| `bibliography_on_plateau` | bool | If true, plateau search delegates to `co-intelligence:bibliography` instead of generic web search |
| `bibliography_target_per_plateau` | int | Papers to target per plateau bibliography wave |
| `research_phase_required` | bool | If true, `eval_and_record.py` refuses to run the first approach until `bibliography.md` has ≥10 entries |
| `research_phase_skip_reason` | string\|null | Justification if research was opted out during clarifying questions |
| `narrative_update_every_n` | int | Agent rewrites Zone B of `report.md` every N kept+discarded trials. Default 10. See `references/report-updates.md`. |
| `monitoring_required_after_seconds` | int | Trials running longer than this must emit ≥3 `live.log` lines (start + mid + end). Below, only start+end (2 lines) required. See `references/evaluation-contract.md` §Monitoring contract. |
| `approach_file_size_limit_mb` | float | Max size of any file in `approaches/<NNN>_<slug>/`. Oversized files are auto-moved to `artifacts/<NNN>_<slug>/` by `eval_and_record.py`. Default 1 MB. |
| `physical_path` | string | Absolute path to the physical session directory (user-chosen location) |
| `discovery_symlink` | string\|null | Absolute path to the symlink at `$PLUGIN_DATA/autoresearch/<tag>/` if the physical path is elsewhere |

### Update protocol

The agent MUST update this file (not scattered top-level keys anywhere
else) when the user adjusts settings at the pre-flight walkthrough. It
reads this file on every resume and populates the walkthrough from it.
`eval_and_record.py` reads it on startup to pick up threshold changes
without restarting the loop.

### Legacy migration

Legacy sessions predate several schema changes and receive a one-time
migration on first resume. All migrations are idempotent — running
them twice is safe — and the agent asks before any destructive move.

**1. Loop settings migration.** Legacy sessions that stored loop
knobs as top-level keys in `results.json` are migrated by reading the
old keys, writing `loop-settings.json`, and stripping them from
`results.json` on the next write.

**2. Two-tree split migration.** Legacy sessions predating the
`approaches/` + `artifacts/` split have heavy files living inside
approach folders (weights, pickles, caches). On resume:

1. Scan `approaches/*/` for forbidden extensions and files over the
   size limit.
2. If any found, prompt:
   > "N approach folders contain heavy files that belong in
   > `artifacts/`. Move them now and update git? (y/n)"
3. On yes: create `artifacts/<approach>/` per folder, move files
   across, commit the move as `chore: split heavy files to artifacts/`.
4. On no: warn that `eval_and_record.py` will move files on the
   next trial anyway, one folder at a time.

Historical approach folders that use the old tag-prefixed naming
(`v4_081_smooth_nophase/`) are **left alone** — don't rename
historical directories mid-session, that's a diff-wrecking footgun.
New approaches from this resume forward use the new
`<NNN>_<slug>/` form. The report script handles both naming
conventions gracefully during the legacy window.

**3. `fixed/paths.py` injection.** If `fixed/paths.py` is absent,
create it verbatim from the template in
`references/evaluation-contract.md` §`fixed/paths.py` contract. This
doesn't violate the immutability contract because the file is a
generic helper identical across sessions.

**4. Zone marker injection for `report.md`.** If `report.md` lacks
`<!-- auto:begin -->` / `<!-- auto:end -->` markers, offer a
one-time repair per `references/report-updates.md` §Marker injection
on legacy resumes:

> "report.md has no zone markers — Zone A can't be auto-updated.
> Inject markers around a freshly generated Zone A, preserving any
> existing narrative as Zone B? (y/n)"

**5. Parent field backfill.** Legacy rationale.md files have no
`parent:` front-matter. Default: leave them parentless and start
tracking from the next new trial forward. The Approach Tree renders
a horizontal rule at the schema boundary:

```
── schema boundary: parent tracking begins at approach NNN ──
```

Opt-in heuristic backfill is offered as:

> "N legacy trials have no parent lineage. Want me to infer parents
> heuristically (previous kept approach) so the tree looks right
> retroactively? I'll mark them `parent_inferred: true` so you can
> see which ones are guesses. (y/n)"

Newly created sessions never hit this path — `parent:` is required
in every rationale.md from approach 001.

**6. `update_report.py` injection.** If `update_report.py` is absent
from the session root, create it verbatim from
`references/session-init.md` §Step 10b. Like `fixed/paths.py`, this
is a generic template, identical across sessions.
