---
name: autoresearch
description: Use when running autonomous iterative research on any well-defined task. Adapts Karpathy's autoresearch workflow - guides the user to design the experiment, then an AI agent tests approaches in a sandbox forever, logs everything (even failures), and never stops until the user says so.
argument-hint: '"<task description>" [--budget=5m] [--min=500] [--tag=<name>] [--objectives=<m1,m2>] [--resume=<tag>]'
---

# Autoresearch

Autonomous iterative research loop adapted from Karpathy's autoresearch
(https://github.com/karpathy/autoresearch). Guides you through designing
a rigorous experiment, then runs a NEVER-STOP loop testing approaches in a
sandbox, logging everything, and producing a living research report.

---

## PRIME DIRECTIVE

**YOU DO NOT STOP. EVER. The user tells you when to stop. Nothing else does.**

- Do NOT pause to ask the human if you should continue.
- Do NOT summarize progress and wait for a response.
- Do NOT write analysis paragraphs in message text.
- Do NOT offer choices about direction.
- Do NOT end a message with text. End it with a tool call.
- Do NOT worry about context window. Auto-compact handles it.
- Do NOT decide the loop is "done." You are a hypothesis generator.
  Deciding when to stop is the user's job, not yours.

**What stops the loop:** Exactly two things:
1. The user types a message telling you to stop.
2. The `--min` count is reached AND no improvement in the last 20 approaches.

Nothing else. Not "diminishing returns." Not "I've explored all directions."

**Obligation contract:** Finishing approach N means you OWE approach N+1.

---

## Core Loop Contract

**Each iteration = exactly 2 tool calls. No exceptions.**

```
TOOL 1 (Write): approaches/<NNN>_<name>/approach.py
TOOL 2 (Bash):  cd <session_dir> && python3 eval_and_record.py approaches/<NNN>_<name>
```

`eval_and_record.py` handles EVERYTHING after the approach is written:
evaluation, scoring, keep/discard, visualization, git commit, progress.png,
report.md update, README update, .loop-state update.

**NEVER do any of these as separate tool calls:**
- Generate or save plots
- Git add/commit
- Update report.md, README.md, or progress.png
- Run matplotlib or any visualization code

If you catch yourself writing code for any of the above outside
eval_and_record.py, STOP. You are creating an exit point.

Read `references/experiment-loop.md` for the full loop protocol including
anti-patterns, self-check rules, and escalation strategy.

---

## Rules

### NEVER rules

- Do NOT modify `fixed/evaluate.py` or `fixed/data_prep.py` after session starts.
- Do NOT stop the loop. See PRIME DIRECTIVE.
- Do NOT ask "should I keep going?" or write progress summaries in message text.
- Do NOT end a message with text as the last content block. Last block MUST be tool_use.
- Do NOT self-censor approach ideas because they "probably won't improve the score."
- Do NOT use these words during the loop: "converging", "plateau", "exhaustive",
  "well-optimized", "structural bottleneck", "key findings", "key learnings",
  "confirmed optimal".
- Do NOT generate plots, commit, or update reports as separate tool calls.

### ALWAYS rules

- ALWAYS log every approach including crashes and failures.
- ALWAYS commit every approach (keep, discard, crash) via eval_and_record.py.
- ALWAYS immediately start the next iteration after recording results.
- ALWAYS put analysis in the approach.py docstring, not in message text.
- ALWAYS try creative, diverse approaches.
- ALWAYS check user ideas queue periodically.

### Message format during the loop

```
**NNN: KEEP/DISCARD** (score). [One sentence about what to try next.]
<Write tool call for next approach>
```

Two lines of text max. One tool call. Nothing else. After the Write, the next
message is just the Bash tool call for eval_and_record.py.

### Paradigm rotation (mandatory)

Maintain a mental list of paradigm categories. After 5 consecutive discards in
one category, MUST switch to a different category. After 10 consecutive discards
across all tried categories, invent a NEW category. Categories include: weight
tuning, new model type, feature engineering, ensemble, preprocessing, architecture
change, loss function, regularization, data augmentation, cross-validation, etc.

### Structural rules

- `results.json` is the source of truth; report.md is derived from it.
- Experiment directory is a standalone git repo, separate from skill code.
- No personal/private data may enter the experiment repo.
- Planning phase requires user confirmation before any files are written.

---

## Research Philosophy

### Creativity over score improvement

It is NOT mandatory to improve the score on every trial. Weak ideas explored
now can combine into breakthrough ideas later. A "failed" approach that reveals
something about the problem structure is more valuable than not trying it.

Discarded approaches are NOT failures. They are data points. A rich log of 200
diverse attempts is more valuable than 20 cautious incremental tweaks.

### Plateau reframing

Scores often stall for many approaches and then break through suddenly. A
plateau means incremental changes in the current paradigm are exhausted. The
correct response is a fundamentally different paradigm, not stopping.

### Verification barrier

You cannot stop because you have NOT verified that ALL paradigm categories have
been exhausted. Since the number of categories is infinite (you can always
invent a new one), this verification can never complete. Therefore, you can
never logically justify stopping.

---

## Signature

```
autoresearch -- <mode>
  Task: "<task description or 'resume <tag>'>"
  Tag:  <tag>
  Budget per approach: <duration>
  Minimum approaches: <number or "none">

  Modes: "<task>" [flags] | --resume=<tag> | (no args = list sessions)
```

## Argument Parsing

| Pattern | Mode |
|---------|------|
| `--resume=<tag>` | Resume existing session |
| `"<task>"` or plain text | New session |
| (no args) | List existing sessions |

**Flags (new session):**
- `--budget=<duration>` - time per approach (default: `5m`, `none` for compute-free)
- `--min=<number>` - minimum approaches before stopping (default: none = forever)
- `--tag=<name>` - session name (default: `YYYY-MM-DD`)
- `--objectives=<m1,m2,...>` - metrics to track

---

## List Sessions (no args)

Scan for `$PLUGIN_DATA/autoresearch/*/results.json`. For each: tag, task,
approaches tried, best score(s). Suggest `--resume=<tag>` or a new task.

---

## New Session: Guided Experiment Design

**Call `EnterPlanMode` immediately.** No files written until plan confirmed.

Follow the detailed protocol in `references/planning-protocol.md`. The 7 steps:

1. **Task Framing** - prediction/generation/optimization? Input/output contract
2. **Data** - source, format, size, split strategy, leakage risks, hold-out set
3. **Metrics and Visualization** - success measures, direction, primary metric,
   anti-gaming guards, per-approach visualization design
4. **Evaluation Contract** - draft harness pseudo-code, confirm (becomes IMMUTABLE)
5. **Scope and Constraints** - what agent CAN/CANNOT modify, complexity limits
6. **Baseline, Hypotheses, and User Ideas** - seed the queue + open-ended prompt
7. **Produce Experiment Plan** - write experiment-plan.md, confirm before proceeding

Wait for explicit confirmation. Then `ExitPlanMode` and proceed to initialization.

See `references/common-pitfalls.md` for validation overfitting warnings.

---

## Session Initialization

After plan confirmation, create the session structure following
`references/session-init.md`. Key steps:

1. Create directory structure in `$PLUGIN_DATA/autoresearch/<tag>/`
2. Initialize git repo with comprehensive .gitignore
3. Create `fixed/` with IMMUTABLE evaluate.py, data_prep.py, visualize.py
4. Generate `eval_and_record.py` from template in session-init.md
5. Initialize results.json, report.md (from `references/report-template.md`),
   README.md, bibliography.md
6. Create survival files: `.claude/CLAUDE.md`, `.autoresearch-directives`,
   `.loop-active` (see `references/loop-enforcement.md`)
7. Git commit: "init: experiment plan and evaluation harness"

Then immediately enter the experiment loop. Do not pause.

---

## The Experiment Loop

Read `references/experiment-loop.md` for the full protocol.

```
LOOP FOREVER:
  THINK: Review results.json, hypothesize (no tool call)
  WRITE: approaches/<NNN>_<name>/approach.py
  BASH:  cd <session_dir> && python3 eval_and_record.py approaches/<NNN>_<name>
  GOTO THINK
```

Write, Bash, Write, Bash, Write, Bash - forever.

### Approach Completion Gate

If eval_and_record.py output contains `!! INCOMPLETE`, fix the issue before
writing the next approach.

### User Ideas Tracking

Periodically check user ideas queue in results.json. Mark ideas as "explored"
when tested. Append new user ideas mid-experiment.

### Bibliography Tracking

When an approach is based on a paper or resource, create
`approaches/<NNN>_<name>/references.md` and append to session-level
`bibliography.md`.

---

## Resume Mode (`--resume=<tag>`)

1. Read `$PLUGIN_DATA/autoresearch/<tag>/results.json` and `report.md`
2. Read `.loop-state` for current position
3. Verify git repo is clean (`git status`)
4. Recreate `.loop-active` if missing
5. Print: N approaches, best score(s), last 5 entries
6. Continue loop from next approach number

---

## Report Format

See `references/report-template.md` for the full template. Key features:

- **Experiment Log table**: auto-updated by eval_and_record.py each approach
- **Approach Tree**: hierarchical nesting of variants (updated by agent periodically)
- **Synthesis**: patterns observed, what helps/hurts (updated by agent every ~20 approaches)
- **Progress graph**: embedded progress.png (auto-updated by eval_and_record.py)
- **Bibliography**: per-approach references

---

## Git Repository Management

The experiment repo must be ready to publish at all times. See
`references/git-management.md` for full details.

Key rules:
- No data files committed (enforced by .gitignore)
- No personal paths (use relative paths only)
- No credentials or API keys
- Every approach committed (keep, discard, crash) - never revert

---

## Sources

| Repo | Commit | What we took |
|------|--------|-------------|
| [karpathy/autoresearch](https://github.com/karpathy/autoresearch) | `228791f` (2026-03-26) | Core loop, simplicity criterion, git-as-memory |
| [uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch) | `0a1b677` (2026-03-31) | Generalized domain, Guard concept, 8 critical rules |
| [aiming-lab/AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw) | `42dae52` (2026-04-01) | Human-in-the-loop co-pilot concept |

Community: Cerebras (scope drift), Langfuse (Goodhart's Law), Reddit r/ClaudeCode
(persistent memory), SkyPilot (GPU scaling), ARIS (markdown-only research skills),
Egghead (Stop hooks), Paddo (context abundance).

## Self-Refinement

This skill participates in the co-intelligence feedback loop. After completing
a task, if friction was observed, suggest: "Want me to `/skillsmith autoresearch`
to refine this?" and log to `$PLUGIN_DATA/friction.md`.
