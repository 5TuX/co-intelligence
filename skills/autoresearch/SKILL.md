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

Scan for `$PLUGIN_DATA/autoresearch/*/results.json`. For each: tag, task, approaches
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
7. **Produce Experiment Plan** - write `$PLUGIN_DATA/autoresearch/<tag>/experiment-plan.md`,
   include User Ideas Queue, confirm with user before proceeding

Wait for explicit confirmation. Then `ExitPlanMode` and proceed to initialization.

See also `references/common-pitfalls.md` for validation overfitting warnings
and other problems to address during planning.

---

## Session Initialization

After plan confirmation, create the session structure. The experiment directory
is its own **git repository**, managed by the skill throughout the session.

Sessions live in the plugin data directory, NOT in the project CWD. This keeps
experiment state portable and separate from project code.

```
$PLUGIN_DATA/autoresearch/<tag>/          <-- git init here
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

`$PLUGIN_DATA` resolves to the value of the `CLAUDE_PLUGIN_DATA` environment variable
(set automatically by Claude Code when a plugin is active). Typical value:
`~/.claude/plugins/data/<plugin-id>/`.

### Git Repo Setup

```bash
cd "$PLUGIN_DATA/autoresearch/<tag>"
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

Read `references/experiment-loop.md` for the full protocol. Summary:

```
LOOP FOREVER (each iteration = exactly 2 tool calls):
  THINK: Review results.json, hypothesize next approach (no tool call)
  TOOL 1 (Write): Write approaches/<NNN>_<name>/approach.py
  TOOL 2 (Bash):  Compound command that evaluates + records + git commits
                  Prints one line: "++ 047: 0.891 (keep, 45s)"
  GOTO THINK (read the one line, write the next approach.py)
```

Steps 5-9 (run, record, git, log, visualize) are collapsed into ONE Bash
call. This eliminates exit points where the LLM can stop between tool calls.
Write, Bash, Write, Bash, Write, Bash - forever.

### Karpathy's Core Principles (MUST enforce)

1. **NEVER STOP.** Do not pause, ask to continue, or suggest stopping. The user
   may be asleep. You run until interrupted or --total expires. This is the
   MOST IMPORTANT rule. After each approach, immediately start the next one.
   Do not summarize progress and wait. Do not offer the user a choice. Do not
   write a status update as your final message. Step 10 is GOTO 1 - execute it.
2. **One change per iteration.** Atomic approaches. If it breaks, you know why.
3. **Simplicity criterion.** All else equal, simpler is better. Equal score + less
   code = KEEP. Small improvement + ugly complexity = probably NOT worth it.
   Improvement from deleting code = definitely KEEP.
4. **Git is memory.** Commit on keep, `git revert` on discard (preserves history).
   Read `git log` + results.json before each iteration.
5. **Mechanical verification only.** No subjective "looks good." Numbers decide.
6. **When stuck, think harder.** Re-read the log, combine near-misses, try radically
   different paradigms. Check user ideas queue. You are never out of ideas.

### Mandatory Message Structure (STRUCTURAL ENFORCEMENT)

Every message you produce during the loop MUST end with a tool call. Not text.
A tool call. This is not a suggestion. This is the output format.

**Correct message structure:**
```
[1-2 lines: result of previous approach]
[tool call: git commit/revert for previous approach]
[1 line: "LOOP ITERATION N - Approach NNN: <name>"]
[tool call: Write or Bash that begins the next approach]
```

**Forbidden message structure (causes stopping):**
```
[results of previous approach]
[git commit]
[multi-paragraph analysis of what was learned]    <-- THIS TRIGGERS WRAP-UP
[summary table of all approaches]                 <-- THIS SIGNALS COMPLETION
[sentence about "continuing to search"]           <-- THIS IS A LIE IF NO TOOL FOLLOWS
```

**Rules:**
- Maximum 2 lines of text between tool calls during the loop
- NEVER write a summary table, trajectory list, or architecture recap mid-loop
  (save those for the report.md file, not for message output)
- NEVER use plateau language ("confirmed optimal", "exhaustive search",
  "well-tuned", "firmly settled") - these trick you into thinking you're done
- The LAST content block in your message MUST be a tool_use, not text
- If you catch yourself writing a third paragraph of analysis, STOP WRITING
  TEXT and emit a tool call instead

### Anti-Stopping Red Flags

If you catch yourself thinking any of these, you are about to violate rule #1:

| Thought | What to do instead |
|---------|-------------------|
| "Want me to keep going?" | Emit a tool call |
| "Would you like to steer the direction?" | Emit a tool call |
| "Here's a summary, let me know..." | Emit a tool call |
| "Ready to resume when you say go" | Emit a tool call |
| "The session is running" (then stop) | Emit a tool call |
| "I've tried N approaches, should I..." | Emit a tool call |
| "Diminishing returns, maybe we should..." | Emit a tool call for a radically different paradigm |
| "The architecture is confirmed optimal" | Emit a tool call (you are wrong, keep searching) |
| "Plateau reached / exhaustive search" | Emit a tool call (plateaus break with new paradigms) |
| "I found a bug in the eval framework" | Fix it, then emit a tool call |

**The user will interrupt you when they want you to stop.** Until then, your
message must end with a tool call. Every single time. No exceptions.

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

1. Read `$PLUGIN_DATA/autoresearch/<tag>/results.json` and `report.md`
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
- NEVER stop the loop for ANY reason other than the user explicitly telling you to stop or --total budget expiring. Not for "checking in", not for "summarizing progress", not for "offering choices", not for "letting the user steer". The user is probably asleep. GOTO 1.
- NEVER ask "should I keep going?" or any variant ("want me to continue?", "ready to resume?", "shall I proceed?") during the loop
- NEVER end a message with text as the last content block. The last content block MUST be a tool_use. Text followed by nothing = you stopped. This is the structural rule that supersedes all others.
- ALWAYS log every approach including crashes and failures
- ALWAYS commit on keep, revert on discard (git is memory)
- ALWAYS regenerate progress.png and README after each approach
- ALWAYS check user ideas queue periodically
- ALWAYS immediately start the next iteration after recording results (GOTO 1)
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

## Self-Refinement

This skill participates in the co-intelligence feedback loop. After completing
a task, if friction was observed (user corrections, workarounds, missing modes,
suboptimal output), suggest: "Want me to `/skillsmith autoresearch` to refine this?"
and log the observation to `$PLUGIN_DATA/friction.md`. See
`references/self-refinement.md` for the full protocol.
