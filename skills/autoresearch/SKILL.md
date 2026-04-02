---
name: autoresearch
description: Use when running autonomous iterative research on any well-defined task. Adapts Karpathy's autoresearch workflow - guides the user to design the experiment, then an AI agent tests approaches in a sandbox forever, logs everything (even failures), and never stops until the user says so.
argument-hint: '"<task description>" [--budget=5m] [--total=forever] [--tag=<name>] [--objectives=<m1,m2>] [--resume=<tag>] | --update'
---

# Autoresearch

Autonomous iterative research loop adapted from Karpathy's autoresearch
(https://github.com/karpathy/autoresearch). Guides you through designing
a rigorous experiment, then runs a NEVER-STOP loop testing approaches in a
sandbox, logging everything, and producing a living research report.

## Signature

```
autoresearch -- <mode>
  Task: "<task description or 'self-update' or 'resume <tag>'>"
  Tag:  <tag>
  Budget per approach: <duration>
  Total budget: <duration or "forever">

  Modes: "<task>" [flags] | --resume=<tag> | --update | (no args = list sessions)
```

## Argument Parsing

| Pattern | Mode |
|---------|------|
| `--update` | Self-update: check Karpathy repo for new commits |
| `--resume=<tag>` | Resume existing session |
| `"<task>"` or plain text | New session |
| (no args) | List existing sessions |

**Flags (new session):**
- `--budget=<duration>` - time per approach (default: `5m`, `none` for compute-free)
- `--total=<duration\|forever>` - total run time (default: `forever`)
- `--tag=<name>` - session name (default: `YYYY-MM-DD`)
- `--objectives=<m1,m2,...>` - metrics to track
- `--resume=<tag>` - continue from last state

---

## Self-Update Mode (`--update`)

1. Fetch latest commit from `karpathy/autoresearch` master via GitHub API
2. Compare against stored SHA in `$PLUGIN_DATA/autoresearch/karpathy_last_commit.txt`
3. If different: list new commits, summarize changes, ask user if they want details
4. Write latest SHA back

---

## List Sessions (no args)

Scan for `autoresearch/*/results.json` in CWD. For each: tag, task, approaches
tried, best score(s). Suggest `--resume=<tag>` or a new task.

---

## New Session: Guided Experiment Design

**Call `EnterPlanMode` immediately.** No files written until plan confirmed.

Follow the detailed protocol in `references/planning-protocol.md`. Summary of the 7 steps:

1. **Task Framing** - prediction/generation/optimization? Input/output contract?
2. **Data** - source, format, size, split strategy, leakage risks, hold-out test set
3. **Metrics** - success measures, direction, primary metric, anti-gaming guards
4. **Evaluation Contract** - draft harness pseudo-code, confirm with user (becomes IMMUTABLE)
5. **Scope and Constraints** - what agent CAN/CANNOT modify, complexity limits
6. **Baseline, Hypotheses, and User Ideas** - seed the queue, open-ended prompt:
   > "Any other thoughts, ideas, hunches, papers, or directions you'd like explored?"
7. **Produce Experiment Plan** - write `autoresearch/<tag>/experiment-plan.md`,
   include User Ideas Queue, confirm with user before proceeding

Wait for explicit confirmation. Then `ExitPlanMode` and proceed to initialization.

See also `references/common-pitfalls.md` for validation overfitting warnings
and other problems to address during planning.

---

## Session Initialization

After plan confirmation, create the session structure. The experiment directory
is its own **git repository**, managed by the skill throughout the session.

```
autoresearch/<tag>/          <-- git init here
  experiment-plan.md         (from planning phase)
  results.json               (experiment log, append-only)
  report.md                  (living synthesis)
  README.md                  (public-facing, with progress graph)
  progress.png               (auto-generated after each approach)
  bibliography.md            (references collected during experimentation)
  .gitignore                 (excludes data, large artifacts, logs)
  fixed/
    evaluate.py              (IMMUTABLE after creation)
    data_prep.py             (IMMUTABLE after creation)
  approaches/
    (created during loop)
```

### Git Repo Setup

```bash
cd autoresearch/<tag>
git init
# .gitignore: data/, *.csv, *.npy, *.pkl, *.h5, *.pt, *.bin, *.parquet,
#   *.env, credentials.*, __pycache__/, *.pyc, run.log, artifacts/
git add -A && git commit -m "init: experiment plan and evaluation harness"
```

### Initialize results.json

```json
{
  "task": "<task>",
  "tag": "<tag>",
  "objectives": ["metric1"],
  "higher_is_better": {"metric1": true},
  "primary_metric": "metric1",
  "budget_per_approach": "5m",
  "created": "<ISO>",
  "user_ideas": ["idea1", "idea2"],
  "approaches": []
}
```

The evaluation harness contract is in `references/evaluation-contract.md`.

---

## The Experiment Loop

Read `references/experiment-loop.md` for the full 10-step protocol. Summary:

```
LOOP FOREVER:
  1. REVIEW    - Read results.json, identify gaps, patterns, unexplored ideas
  2. HYPOTHESIZE - Form specific hypothesis with rationale
  3. NAME      - approaches/<NNN>_<hypothesis>/
  4. CODE      - Write approach.py with run(data) function
  5. RUN       - Execute via evaluation harness, respect --budget
  6. RECORD    - Parse scores, determine keep/discard/crash
  7. GIT       - Commit on keep, revert on discard (Karpathy's core mechanic)
  8. LOG       - Append to results.json, update bibliography if applicable
  9. VISUALIZE - Regenerate progress.png and update README.md
  10. GOTO 1
```

### Karpathy's Core Principles (MUST enforce)

1. **NEVER STOP.** Do not pause, ask to continue, or suggest stopping. The user
   may be asleep. You run until interrupted or --total expires.
2. **One change per iteration.** Atomic approaches. If it breaks, you know why.
3. **Simplicity criterion.** All else equal, simpler is better. Equal score + less
   code = KEEP. Small improvement + ugly complexity = probably NOT worth it.
   Improvement from deleting code = definitely KEEP.
4. **Git is memory.** Commit on keep, `git revert` on discard (preserves history).
   Read `git log` + results.json before each iteration.
5. **Mechanical verification only.** No subjective "looks good." Numbers decide.
6. **When stuck, think harder.** Re-read the log, combine near-misses, try radically
   different paradigms. Check user ideas queue. You are never out of ideas.

### User Ideas Tracking

During the loop, periodically check the user ideas queue in results.json:
- Mark ideas as "explored" when an approach tests them
- If the user sends new ideas mid-experiment, append to the queue
- Ideas inform but do not constrain - generate your own hypotheses too

### Bibliography Tracking

When an approach is based on a paper, blog post, or resource:
- Create `approaches/<NNN>_<name>/references.md` listing the sources
- Append to the session-level `bibliography.md` with approach cross-reference
- Final report includes bibliography tied to each approach

### Progress Visualization

After each approach, regenerate `progress.png` using matplotlib:
- X-axis: approach number
- Y-axis: metric score(s)
- If multi-objective: plot each objective + mean on same chart with legend
- Mark keep/discard/crash with distinct markers (green circle, red x, gray triangle)
- Embed in README.md: `![Progress](progress.png)`

---

## Report Format

See `references/report-template.md` for the full template. Key features:

- **Nested approach structure**: approaches that are tweaks of a prior approach
  are nested under the parent (e.g., "3a. attention_pooling_v2" under "3. attention_pooling")
- **Bibliography per approach**: each approach section links to its references
- **Synthesis section**: patterns observed, what helps/hurts, updated each iteration
- **Progress graph**: embedded progress.png

---

## Resume Mode (`--resume=<tag>`)

1. Read `autoresearch/<tag>/results.json` and `report.md`
2. Verify git repo is clean (`git status`)
3. Print: N approaches, best score(s), last 5 entries
4. Continue loop from next approach number

---

## Git Repository Management

The experiment repo must be **ready to publish** at all times:

- **No data files** committed (enforced by .gitignore)
- **No personal paths** in any committed file (use relative paths only)
- **No credentials or API keys** anywhere
- **No run logs** committed (only results.json summary)
- **README.md** always current with progress graph and experiment description
- Approach code is committed; large artifacts are gitignored

Before the user publishes: scan all committed files for personal info, absolute
paths, credentials. Flag anything found.

---

## Rules

- NEVER modify `fixed/evaluate.py` or `fixed/data_prep.py` after session starts
- NEVER stop due to diminishing returns, plateaus, or "running out of ideas"
- NEVER ask "should I keep going?" during the loop
- ALWAYS log every approach including crashes and failures
- ALWAYS commit on keep, revert on discard (git is memory)
- ALWAYS regenerate progress.png and README after each approach
- ALWAYS check user ideas queue periodically
- `results.json` is the source of truth; report.md is derived from it
- Experiment directory is a standalone git repo, separate from skill code
- No personal/private data may enter the experiment repo
- Guided design phase requires user confirmation before any files are written

---

## Sources

This skill was built by studying these repos. Commits listed are what was
reviewed; check for newer commits when running `--update`.

| Repo | Commit | What we took |
|------|--------|-------------|
| [karpathy/autoresearch](https://github.com/karpathy/autoresearch) | `228791f` (2026-03-26) | Core loop, program.md methodology, simplicity criterion, git-as-memory, progress visualization |
| [uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch) | `0a1b677` (2026-03-31, v1.9.0) | Generalized domain approach, Guard concept, 8 critical rules, crash recovery patterns |
| [aiming-lab/AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw) | `42dae52` (2026-04-01) | Human-in-the-loop co-pilot concept, stage-based pipeline |

Community sources:
- Cerebras blog: "How to stop your autoresearch loop from cheating" (scope drift, guardrails)
- Langfuse blog: "We Used Autoresearch on Our AI Skill" (Goodhart's Law, target function quality)
- Reddit r/ClaudeCode: "What I learned letting Claude Code run ML experiments overnight" (persistent memory, eval integrity, throughput protection)
- Reddit r/MachineLearning: autonomous ML research agent (file locking, expanding time windows)
