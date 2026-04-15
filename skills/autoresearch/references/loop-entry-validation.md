# Loop Entry Validation

Before the pre-flight walkthrough runs — on every loop entry, new or
resumed — the agent verifies all canonical setup outputs exist and
are well-defined. This is the gate that catches partial state from
interrupted setups, manual edits, or missing dependencies, and
refuses to enter the loop until the session is coherent.

---

## Validation checklist

Run this on every loop entry, in order. Each item either passes,
auto-repairs, or blocks the loop with a user prompt.

1. **`$SESSION_DIR/experiment-plan.md`** — exists, non-empty, has
   sections for task, data, metric, harness, scope, constraints. If
   missing: re-run setup discussion or abort.

2. **`$SESSION_DIR/loop-settings.json`** — exists, valid JSON, has
   all required keys (see `references/preflight-walkthrough.md`
   §Settings persistence for the schema). Legacy sessions with knobs
   in `results.json` are auto-migrated on first resume — the agent
   reads the old top-level keys, writes them into `loop-settings.json`,
   and strips them from `results.json` on the next write.

3. **`$SESSION_DIR/fixed/evaluate.py`** — exists, matches the harness
   pseudo-code confirmed during clarifying question 6. If modified
   since creation: that's a severe violation of the immutability
   contract; warn the user before proceeding.

4. **`$SESSION_DIR/fixed/data_prep.py`** and
   **`$SESSION_DIR/fixed/visualize.py`** — exist and are importable.
   Run a dry import to catch syntax errors early.

5. **`$SESSION_DIR/eval_and_record.py`** — exists and is runnable
   (`python3 -c 'import ast; ast.parse(open("eval_and_record.py").read())'`).

6. **`$SESSION_DIR/results.json`** — exists and is valid JSON. May
   have zero approaches on a brand-new session. Required keys:
   `task`, `tag`, `objectives`, `primary_metric`, `higher_is_better`,
   `approaches`.

7. **`$SESSION_DIR/report.md`** — exists (may be an empty template
   on a brand-new session).

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

---

## If any validation fails

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
   tweak from `references/preflight-walkthrough.md`, fix the file,
   and re-run validation.

4. **Only proceed** to the pre-flight walkthrough once ALL validation
   checks pass. Do not loop on a partially-valid state — the loop
   will either fail loudly (best case) or drift silently (worst case)
   into an incoherent experiment.

---

## Why this gate exists

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
