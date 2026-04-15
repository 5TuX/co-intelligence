# autoresearch

> Autonomous iterative research loop. You design the experiment; Claude tests
> approaches in a sandbox forever, logs everything (including failures), and
> never stops until you say so.

Adapted from [Karpathy's autoresearch](https://github.com/karpathy/autoresearch).

---

## What this is

`autoresearch` turns Claude into a tireless experimentalist for any
well-defined task that has a clear input/output contract and a measurable
metric. You spend 10-30 minutes with it up front defining the problem,
the evaluation, and the constraints; then the agent writes one approach,
evaluates it, commits the result, and immediately writes the next one.
Over hours or days it produces dozens to hundreds of diverse attempts,
a living report, and a fully reproducible git history of every trial.

The core bet: **a rich log of 200 diverse attempts beats 20 cautious
incremental tweaks**. Weak ideas explored now often recombine into
breakthroughs later.

---

## Mental model

```
┌────────────────────────────────────────────────────────────┐
│  You                                                       │
│  └─► design the experiment (once, in Plan Mode)            │
│       └─► confirm                                          │
│            └─► agent initializes session repo              │
│                 └─► THE LOOP ───────────────────────────┐  │
│                      THINK  (review prior artifacts)    │  │
│                      WRITE  approaches/NNN_name/        │  │
│                             approach.py                 │  │
│                      BASH   eval_and_record.py ─────────┘  │
│                      (forever, until you say stop)         │
└────────────────────────────────────────────────────────────┘
```

Each iteration is exactly two tool calls: **Write** the next approach,
**Bash** `eval_and_record.py`. The evaluator handles scoring, keep/discard,
visualization, git commit, report update, and progress tracking — so the
agent can stay focused on generating ideas.

---

## Quickstart

```
/autoresearch "predict next-day closing price from OHLCV history" --budget=10m
```

That starts a guided planning dialog. The agent asks questions about your
data, metric, hold-out strategy, and constraints, drafts an experiment plan,
asks you to confirm, initializes a git repo in
`~/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/<tag>/`,
and enters the loop.

**Invocation patterns:**

| Pattern | Mode |
|---|---|
| `/autoresearch "<task description>"` | New session (guided planning) |
| `/autoresearch --resume=<tag>` | Resume an existing session |
| `/autoresearch` (no args) | List existing sessions |

**Flags (new session only):**

| Flag | Default | Purpose |
|---|---|---|
| `--budget=<duration>` | `5m` | Per-approach time cap. `none` for compute-free tasks. |
| `--tag=<name>` | `YYYY-MM-DD` | Session name (becomes the session directory name) |
| `--objectives=<m1,m2,...>` | — | Metrics to track (primary is first) |
| `--no-research` | off | Skip the enforced Phase 0 research phase (requires justification) |
| `--no-holdout` | off | Skip the enforced hold-out test set (requires justification) |

---

## What happens when you invoke it

### 1. Planning phase (Plan Mode, no files written)

Eight steps, walked through conversationally:

0. **Phase 0 — Research (enforced by default).** Before any approach runs,
   the agent seeds the session with prior art: asks you for papers/repos
   you already know, does independent web + GitHub + library-doc research,
   and writes `references/INDEX.md` with at least 3 entries. Opt out with
   `--no-research` + justification. *Why:* evidence from the v2
   post-mortem shows agents otherwise spend hundreds of trials reinventing
   known-bad ideas.
1. **Task framing.** Prediction? Generation? Optimization? What's the
   input/output contract?
2. **Data.** Source, format, size, split strategy, leakage risks, hold-out
   test set (enforced — opt out with `--no-holdout`).
3. **Metrics and visualization.** Primary metric, direction, anti-gaming
   guards, per-approach visualization design.
4. **Evaluation contract.** Draft `fixed/evaluate.py` as pseudo-code,
   confirm. Once confirmed it becomes **IMMUTABLE** — the agent cannot
   edit it during the loop.
5. **Scope and constraints.** What the agent is allowed to modify, complexity
   limits, forbidden imports, etc.
6. **Search callbacks.** When to trigger mid-loop web research.
   Defaults: after 10 discards in a row, search for 10 new ideas.
7. **Baseline, hypotheses, user ideas.** Seed the queue with your starting
   ideas — the agent will test them first and mark them explored.
8. **Produce experiment plan.** Written to `experiment-plan.md`, confirmed
   before the repo is initialized.

### 2. Session initialization

Once the plan is confirmed, the agent creates a standalone git repo with:

- `experiment-plan.md` — the task definition (never edited after init)
- `fixed/evaluate.py`, `fixed/data_prep.py`, `fixed/visualize.py` — the
  immutable evaluation harness
- `eval_and_record.py` — the evaluator runner (handles scoring, git commits,
  report updates)
- `results.json` — the source of truth for all approaches
- `report.md` — auto-generated from `results.json` after every approach
- `references/INDEX.md` — prior art from Phase 0
- Survival files (`.claude/CLAUDE.md`, `.autoresearch-directives`,
  `.loop-active`) that let the loop recover from autocompact

### 3. The loop

```
THINK  ─►  review results.json, read previous approach's
           visualization.png (Claude is multimodal), hypothesize
WRITE  ─►  approaches/<NNN>_<name>/approach.py with analysis in docstring
BASH   ─►  eval_and_record.py runs the approach, scores it, decides
           KEEP/DISCARD, commits to git, updates report.md and progress.png
REPEAT (forever, until you stop it)
```

---

## Features

### Scientific rigor (hard-wired)

- **Immutable evaluation harness.** `fixed/evaluate.py` and `fixed/data_prep.py`
  cannot be edited after session start. This kills the "Goodhart drift"
  failure mode where agents optimize the evaluator instead of the task.
- **Hold-out test set** (enforced by default). The agent sees only the
  training split; the hold-out is reserved for final verification.
- **Fail-fast contract.** No bare `except: pass` in `fixed/`. No synthetic
  fallbacks (median/mean/zero) when a model crashes. No fabricated
  visualization data for failed timesteps. Crashes score at the worst
  possible value for the metric direction and are rendered honestly.
  Rationale: a single silent except invalidates every subsequent
  keep/discard decision — we learned this the hard way when v2 drifted
  for 800 approaches.
- **Phase 0 research enforcement.** The loop cannot start until
  `references/INDEX.md` has been populated with prior art (or you
  explicitly opt out).

### Creative strategy

- **Paradigm rotation.** After 5 consecutive discards in one paradigm
  category (e.g. "weight tuning"), the agent must switch categories.
  After 10 discards across all tried categories, it must **invent a new
  category**. Prevents incremental stalling.
- **Single method per trial.** One architecture or technique per approach.
  Push each method to its optimum (Optuna tuning, more iterations, feature
  engineering) before moving on. Ensembles only with `allow_ensembles: true`
  set in `results.json`.
- **Optuna integration.** When an approach has tunable hyperparameters,
  Claude picks the method (creative) and Optuna picks the params
  (mechanical). Small studies, 10-30 trials, within the per-approach
  budget.
- **User ideas queue.** You seed the queue during planning and can append
  ideas mid-experiment. The agent checks the queue periodically and marks
  ideas as "explored" when tested.
- **Search callbacks.** When stuck for N consecutive discards, the agent
  pauses to do web research for new ideas before continuing. Configurable
  per session.

### Live observability

Every approach follows a strict logging convention so you can watch training
happen in real time:

```bash
tail -f ~/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/<tag>/approaches/v4_NNN_name/live.log
```

Each approach:

- Writes a `_log()` helper that appends timestamped lines to `live.log`
- Calls `_log()` at training start, every epoch/batch/fit step, and on
  completion
- Writes `training_progress.json` (epoch, loss, elapsed) for iterative
  methods
- Prediction loops log progress every ~50 samples with rate and ETA

When the agent launches a long trial in background, it posts the exact
`tail -f` command you can copy-paste into another terminal.

### Artifact reuse

Approaches save model checkpoints per-epoch (not just at end), and when
Claude reuses an architecture it reloads prior checkpoints instead of
training from scratch. A per-approach `.gitignore` is auto-generated to
exclude large artifacts from git while keeping them on disk for reuse.

### Runtime management

- **Background execution** for trials estimated >60s — Claude uses
  thinking mode to estimate runtime (including fixed costs like data
  loading), chooses foreground vs background, and monitors
  `training_progress.json` while waiting.
- **Soft-kill** if projected time far exceeds budget or training diverges.
  `eval_and_record.py` enforces a `timeout` wrapper on every trial.
- **No wasted restarts.** Discarded approaches still commit to git and
  contribute to the paradigm-rotation counter — they're data points, not
  failures.

### Resume across sessions

```
/autoresearch --resume=<tag>
```

Resumes from the last recorded position. The agent reads `results.json`,
`.loop-state`, the last 5 approach summaries, recreates missing survival
files (`.loop-active`, `.autoresearch-directives`), verifies the Stop hook
is installed, and continues. Session state survives Claude Code restarts,
autocompact, and machine reboots.

---

## While it's running

### Monitoring

| What | Where |
|---|---|
| Live training output of the current approach | `approaches/<NNN>_<name>/live.log` (`tail -f`) |
| Structured epoch/loss progress | `approaches/<NNN>_<name>/training_progress.json` |
| Full history of all trials | `results.json` |
| Human-readable report | `report.md` (auto-updated after every approach) |
| Score trajectory plot | `progress.png` (updated after every approach) |
| Per-approach visualization | `approaches/<NNN>_<name>/visualization.png` |

### Adding ideas mid-experiment

Edit `results.json` — append your new idea to the user ideas queue. The
agent will pick it up on the next iteration's `THINK` step.

### "Stop hook error" in the UI

Expected and cosmetic. Claude Code displays *"Stop hook error"* whenever a
Stop hook returns exit code 2, which is exactly how the autoresearch loop
forces continuation. GitHub #34600 — the error label is misleading; the
hook is working correctly. The stderr message reaches the agent and
prevents it from stopping.

---

## Stopping the loop

**Natural language (primary path).** Say it — *"stop"*, *"pause"*, *"that's
enough"*, *"I'm done for now"*. The agent recognizes the stop signal, runs
`rm "$SESSION_DIR/.loop-active"` in the same turn, acknowledges briefly,
and ends cleanly. The next turn-end finds no `.loop-active` and passes
through.

**Escape hatch.** Run the file removal yourself in any terminal:

```bash
rm ~/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/<tag>/.loop-active
```

Useful if the agent is mid-trial and you want to intervene without waiting
for the next turn boundary.

**Either way**, the session directory, results, approaches, checkpoints,
and report are all preserved. Restart with `/autoresearch --resume=<tag>`.

### How stopping actually works (one-paragraph mental model)

A system-level Stop hook in `~/.claude/settings.json` blocks every
turn-end attempt while a `.loop-active` file exists in the session's data
directory **and** its contents match the current Claude Code session ID
(parsed from the hook's stdin JSON). The hook does not read message text.
The agent has been trained to translate natural-language stop intent into
a file deletion, so the conversational UX works while enforcement stays
purely file-based. See `references/loop-enforcement.md` for the full
mechanism.

---

## Outputs — reading the results

Every session is a standalone git repo at:

```
~/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/<tag>/
```

Key files:

- **`report.md`** — human-readable narrative: task, best approach so far,
  per-paradigm summary, recent trials. Always up to date.
- **`results.json`** — machine-readable source of truth. Every approach,
  every score, every paradigm tag, every discard reason. This is what
  `report.md` is derived from.
- **`progress.png`** — score trajectory across all trials.
- **`approaches/<NNN>_<name>/`** — one directory per trial:
  - `approach.py` — the code (with analysis in the docstring)
  - `visualization.png` — per-approach plot
  - `scores.json`, `metrics.json` — numerical results
  - `training_progress.json` — epoch-level training history
  - `live.log` — full stdout/stderr of the trial
  - `references.md` — cited papers/repos (if any)
- **`bibliography.md`** — session-level aggregation of all citations.
- **`experiment-plan.md`** — the original plan (never edited after init).
- **`git log`** — every approach is a commit. You can always diff two
  approaches or check out a specific trial.

---

## When to use (and when not to)

**Good fits:**

- Tabular prediction / regression / classification with a clear metric
- Small-to-medium time-series forecasting
- Feature engineering contests (Kaggle-style bounded problems)
- Hyperparameter exploration on a frozen architecture
- Small generation tasks with automated evaluators (BLEU, pass@k)
- Algorithm-discovery problems with deterministic scoring
- "Can we beat baseline X on dataset Y by anything?" questions

**Bad fits:**

- Long-horizon agentic tasks (evaluations take too long per trial)
- Nondeterministic / human-in-the-loop evaluations
- Tasks whose metric can't be computed automatically
- Problems where one trial costs more than you can afford to throw away
  200 times
- Research that requires real-world interaction (robotics, users, APIs
  with rate limits)

Rule of thumb: if you can draft `fixed/evaluate.py` as a pure function in
under 20 lines of pseudocode, autoresearch is probably a fit.

---

## Troubleshooting

### "The loop stopped on its own"

It shouldn't — the Stop hook enforces continuation. If it happened,
diagnose in order:

1. **Hook not installed.** Check `~/.claude/settings.json` contains a Stop
   hook that scans `~/.claude/plugins/data/*/autoresearch/*/.loop-active`.
   If missing, reinstall via `references/loop-enforcement.md`.
2. **`.loop-active` missing.** Check that
   `$SESSION_DIR/.loop-active` exists and has a non-empty first line. If
   empty, re-derive the session ID (see `references/session-init.md`).
3. **Session ID mismatch.** The file's session ID must match the current
   Claude Code session. On resume, the agent recreates `.loop-active`
   with the current session ID automatically — if it didn't, manually
   write the UUID of your current session's transcript filename.
4. **`jq` missing.** The hook requires `jq` to parse stdin JSON. Install
   with `apt install jq` or `brew install jq`.

### "The hook fires in an unrelated session"

Shouldn't happen — the hook is session-isolated via non-empty session-ID
match. If it does, check for empty `.loop-active` files:

```bash
find ~/.claude/plugins/data/*/autoresearch -name .loop-active -empty
```

Delete any empty ones.

### "Training crashes silently on approach N"

Crashes are supposed to be loud and recorded. If they're silent, you
almost certainly have a bare `except` somewhere in `fixed/evaluate.py`
or `fixed/visualize.py`. The skill explicitly forbids these — see
`references/loop-enforcement.md` "Forbidden patterns". Fix the except
and resume; the agent will re-run the approach.

### "The agent keeps trying the same paradigm"

Paradigm rotation should kick in after 5 consecutive discards. Check
`results.json` for the `paradigm` tag on recent approaches. If the agent
isn't rotating, remind it in a turn: *"You've had 7 discards in the
weight-tuning paradigm. Rotate."* The rule is in SKILL.md; the agent
should comply without needing the reminder.

### "I'm out of disk space"

Model checkpoints and visualizations add up. Per-approach `.gitignore`
excludes them from git, but they still live on disk. Clean up old
approaches manually:

```bash
rm -rf $SESSION_DIR/approaches/v4_0*_  # keep recent, delete old
```

Results in `results.json` are preserved.

---

## Further reading

- **`SKILL.md`** — the agent-facing contract (rules, modes, loop
  mechanics). Read this if you want to understand how Claude behaves
  inside the loop.
- **`references/planning-protocol.md`** — full detail on the 8-step
  planning phase
- **`references/experiment-loop.md`** — the loop protocol, anti-patterns,
  escalation strategy
- **`references/evaluation-contract.md`** — what "immutable evaluator"
  means and how to draft one
- **`references/session-init.md`** — directory structure, `fixed/`
  templates, survival files
- **`references/loop-enforcement.md`** — the Stop hook mechanism, the
  autocompact survival strategy, the natural-language stopping feature
- **`references/git-management.md`** — repo hygiene rules (no data files,
  no secrets, never revert)
- **`references/common-pitfalls.md`** — validation overfitting, silent
  drift, and other failure modes to avoid
- **`references/report-template.md`** — the shape of the auto-generated
  report

## Credits

Adapted from [Andrej Karpathy's autoresearch](https://github.com/karpathy/autoresearch).
The never-stop loop contract and fail-fast evaluation philosophy are
direct ports. The Plan Mode planning phase, the Stop hook enforcement
mechanism, the natural-language stopping UX, the paradigm rotation rule,
and the live-logging convention were added for the co-intelligence plugin.
