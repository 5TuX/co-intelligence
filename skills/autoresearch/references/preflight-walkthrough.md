# Pre-flight walkthrough

Immediately before entering the experiment loop — both on initial
session start AND on every resume — the agent explains to the user
*what is about to happen* in the loop and gives them a chance to tweak
anything. This is the last gate before the session runs autonomously.

The walkthrough is a short narrative, **not** a dry checklist. The
format below is a template; adapt the phrasing to the specific session.

---

## Template

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
>   short `rationale.md` (idea, hypothesis, citations from
>   `bibliography.md` if the trial builds on specific papers, what
>   we'll learn). These are the reproducibility sidecars.
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

---

## Accepted tweaks

The user can say anything natural-language and the agent interprets and
applies it to `loop-settings.json`. Common examples:

| User says | Effect on `loop-settings.json` |
|---|---|
| *"budget to 15m"* | `budget_per_approach: "15m"` |
| *"plateau threshold to 15"* | `search_on_plateau_threshold: 15` |
| *"add graph-neural-net to paradigms"* | Appends to `paradigm_categories` |
| *"turn off per-trial search"* | `search_every_trial: false` |
| *"increase background threshold to 120s"* | `background_threshold_seconds: 120` |
| *"20 papers per plateau"* | `bibliography_target_per_plateau: 20` |
| *"allow ensembles"* | `allow_ensembles: true` |

After applying any change, the agent **re-prints the affected lines of
the walkthrough** and asks again. The loop does not start until the
user gives explicit approval with no pending tweaks.

---

## Experiment-definition changes on resume

If during the walkthrough (on resume) the user asks to change an
**experiment-definition** item — metric, hold-out split, evaluation
harness, data source, anything from the Clarifying Questions list —
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
the agent (at every pre-flight walkthrough, and when needed during the
loop) and by `eval_and_record.py` (to decide plateau triggers,
background execution, etc.). `results.json` remains the approaches /
scores / ideas-queue carrier and does NOT duplicate these settings.

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
  "physical_path": "$SESSION_DIR",
  "discovery_symlink": null
}
```

### Field reference

| Field | Type | Meaning |
|---|---|---|
| `budget_per_approach` | string | Per-approach wall-clock budget (e.g. `"5m"`, `"30s"`, `"none"`) |
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
| `physical_path` | string | Absolute path to the physical session directory (user-chosen location) |
| `discovery_symlink` | string\|null | Absolute path to the symlink at `$PLUGIN_DATA/autoresearch/<tag>/` if the physical path is elsewhere |

### Update protocol

The agent MUST update this file (not scattered top-level keys anywhere
else) when the user adjusts settings at the pre-flight walkthrough. It
reads this file on every resume and populates the walkthrough from it.
`eval_and_record.py` reads it on startup to pick up threshold changes
without restarting the loop.

### Legacy migration

Legacy sessions that stored these knobs as top-level keys in
`results.json` are migrated on first resume: the agent reads the old
keys, writes `loop-settings.json`, and strips them from `results.json`
on the next write. The migration is idempotent — running it twice is
safe.
