# Setup: Clarifying Questions

The eleven topics that the planning discussion MUST cover before the
loop can start. These are **experiment definition** — set once and
become part of the immutable experiment plan.

Ask one question at a time. Prefer multiple choice. Never batch.

---

## Delegation: use `superpowers:brainstorming` when available

Before running the Q&A built-in, check whether
`superpowers:brainstorming` is installed:

- `~/.claude/plugins/cache/claude-plugins-official/superpowers/*/skills/brainstorming/SKILL.md`
- `~/.claude/skills/brainstorming/SKILL.md`

If found, **delegate the Q&A phase to it** with these guardrails:

- Tell brainstorming that the spec location is
  `$SESSION_DIR/experiment-plan.md` (NOT the default
  `docs/superpowers/specs/...`). `$SESSION_DIR` was chosen during the
  session-storage-location question below, and its parent directory
  must be created first (`mkdir -p` only, no `git init` yet).
- Give it the eleven-topic checklist below as the list of topics to
  cover.
- Tell it that the implementation step after brainstorming is NOT
  `superpowers:writing-plans` — it is handing control back to
  `autoresearch` to run the pre-flight walkthrough, session init,
  smoke test, and loop entry.
- Tell it the spec will be committed by `autoresearch`'s session init,
  not by brainstorming itself.

If `superpowers:brainstorming` is NOT available, run the built-in
fallback: the eleven questions below, asked one at a time, multiple
choice preferred. Same structure, leaner presentation.

---

## The eleven questions

### 1. Task framing

- Prediction? Generation? Optimization?
- What is the input/output contract? Reformulate as:
  *"Each approach receives X and returns Y."*
- Any hard constraints (interpretability, latency, memory)?

### 2. Data

- Source, format, size
- Train/val/test split strategy
- Leakage risks (temporal leakage? label leakage? group leakage?)
- How is the data loaded and preprocessed — does `fixed/data_prep.py`
  need to handle streaming, windowing, normalization?

### 3. Hold-out test set

Do you want one? Strongly recommended. This becomes part of the
experiment structure and is not revised later.

- If yes: what size? (For time series: how many trailing months/days.
  For non-temporal: what fraction or absolute count.)
- If no: ask for a one-line justification and record it as
  `test_set_skip_reason` in `loop-settings.json`. Valid reasons: toy
  demo, unit-test metric, theoretical optimization on a closed-form
  objective. Not valid: "I don't have enough data" (use
  cross-validation instead) or "it's slower".

### 4. Metrics

- Primary metric — what the loop optimizes
- Direction — higher is better or lower is better
- Secondary metrics to also track
- Anti-gaming guards — how do you prevent trivial predictors from
  winning? (e.g. always predicting the majority class, always
  predicting the mean)

### 5. Visualization

- What should every approach's `visualization.png` show?
- This is critical — the agent reads this plot between trials and
  bases its next hypothesis on what it sees. A vague or uninformative
  plot hobbles the loop's ability to learn from failures.
- Good examples: predicted vs. actual scatter with error bars,
  per-segment error histogram, confusion matrix, attention heatmap,
  residual time series.

**Report cadence (companion sub-question):** `report.md` is split
into a script-owned Zone A (counters, best-score table, experiment
log, approach tree — refreshed every trial by `update_report.py`)
and an agent-owned Zone B (Synthesis, What works, What doesn't
work, Next Steps — rewritten every N trials and on stop).

> "How often should I rewrite the report's narrative sections
> (Synthesis, What works, What doesn't work, Next Steps)? Default
> is every 10 trials. I'll also rewrite them one last time when
> you tell me to stop, so the final report is always current."

Record the answer as `narrative_update_every_n` in
`loop-settings.json`. The pre-flight walkthrough surfaces this knob
again as a tweakable setting before every loop start/resume, so the
user can adjust without editing the file. See
`references/report-updates.md`.

### 6. Evaluation harness

Draft `fixed/evaluate.py` as pseudo-code and confirm with the user.

Example:
```python
def evaluate(run_fn, data_prep) -> dict:
    train, val, test = data_prep.split()
    model_output = run_fn(train)
    preds = model_output.predict(val)
    primary = custom_metric(val.y, preds)
    return {"primary": primary, "secondary": {...}}
```

**Once the user confirms, `fixed/evaluate.py` becomes IMMUTABLE.** The
agent cannot edit it during the loop. This is the anti-drift defense.

### 7. Scope and constraints

- What can the agent modify? (approach.py, rationale.md, commentary.md
  — that's it)
- What is off-limits? (`fixed/*`, `eval_and_record.py`,
  `experiment-plan.md`, `loop-settings.json` outside the walkthrough)
- Complexity limits — max lines of code per approach? forbidden
  imports? forbidden external API calls?
- Dependencies — which Python packages are already available?
  `uv add` any that are needed.

Do NOT ask about runtime budget here — that is a loop-tuning setting
asked in the pre-flight walkthrough.

### 8. Bibliography research (Phase 0)

- Do you want a Phase 0 bibliography pass before trials start?
  **Strongly recommended.** Opt-out requires a one-line justification.
- When enabled: the agent delegates to `co-intelligence:bibliography`
  in short-form mode (target 15-25 papers, 1-2 waves), copies the
  output to `$SESSION_DIR/bibliography.md` and `bibliography.bib`, and
  writes `references/INDEX.md` with one-paragraph key-insight summaries.
- The loop will refuse to run the first approach if
  `research_phase_required: true` and `bibliography.md` has fewer than
  10 entries.

### 9. Baseline and user ideas

- Seed the ideas queue with approaches you already want tested
- Open-ended prompt: *"Anything else you want me to try — weird ideas
  welcome, they're data points even if they fail."*
- Record each idea in `results.json` under `user_ideas_queue` with
  fields `id`, `text`, `status: "pending"`, `source: "user"`.

### 10. Session tag

What should we call this session?

- Default: `YYYY-MM-DD-<slug-of-task>`
- Becomes the session directory name
- Becomes the default `report.md` title

### 11. Session storage location

Where should this session's data live?

- Default: `$PLUGIN_DATA/autoresearch/<tag>/` — i.e.
  `~/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/<tag>/`
- Users can pick any directory they have write access to — a larger
  disk, a project subdirectory, a dedicated research folder, a
  non-home SSD.

**If the user picks a non-default location**, session init MUST
create a discovery symlink at `$PLUGIN_DATA/autoresearch/<tag>/`
pointing to the physical directory. The Stop hook globs
`$PLUGIN_DATA/autoresearch/*/.loop-active` and cannot be reconfigured
per session, so the symlink is what keeps instance isolation working.
Record both paths in `loop-settings.json` under `physical_path` and
`discovery_symlink`.

---

## Transition to the pre-flight walkthrough

Once all eleven clarifying questions have landed, transition naturally
to the pre-flight walkthrough:

> "OK, the experiment is defined — that's the part that stays fixed
> for the whole session. Now let me walk you through what'll actually
> happen when I enter the loop. You'll be able to tweak any of the
> loop-tuning knobs (time budget, plateau behavior, paradigm
> rotation) before I start."

Then run the walkthrough (see `references/loop-entry.md` Stage 2).
Do NOT write `experiment-plan.md` until after the walkthrough
concludes — the walkthrough can surface tweaks that retro-affect the
plan (e.g. the user bumps the time budget, which affects what's
computationally feasible, which might retro-change the data split
strategy).

Write `experiment-plan.md` and `loop-settings.json` only once **both**
the experiment design (clarifying questions) and the loop settings
(pre-flight walkthrough) are confirmed.

---

## Output location reminder

Everything from the clarifying-questions phase eventually lands in:

- `$SESSION_DIR/experiment-plan.md` — the immutable plan derived from
  Q1-Q11
- `$SESSION_DIR/loop-settings.json` — `research_phase_required` and
  `research_phase_skip_reason` from Q8, `physical_path` and
  `discovery_symlink` from Q11
- `$SESSION_DIR/results.json` — `user_ideas_queue` from Q9
- `$SESSION_DIR/bibliography.md` + `bibliography.bib` — from Q8 if opted in
- `$SESSION_DIR/fixed/evaluate.py` etc. — generated from Q6 pseudo-code

See `references/session-init.md` for the full directory scaffold.
