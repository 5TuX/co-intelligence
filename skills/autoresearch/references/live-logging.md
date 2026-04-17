# Live Progress Logging Contract

**This is a contract, not a style guide.** `approach.py` MUST emit
progress output to `live.log`. Trials that don't are marked
`monitoring_violation` and cannot be kept by the loop ratchet — even
if their score would otherwise win. See
`references/evaluation-contract.md` §Monitoring contract for the
enforcement details.

The contract enables both the user and Claude to monitor trials in
real time via `tail -f` and Claude Code's shell indicator, and it's
a prerequisite for background-launch monitoring and soft-kill
recovery.

## Minimum line counts (enforced)

| Trial runtime | Minimum non-empty lines in `live.log` |
|---|---|
| Any duration | 2 lines: 1 start + 1 end |
| Longer than `monitoring_required_after_seconds` (default 10s, configurable in `loop-settings.json`) | 3+ lines: start + at least 1 mid-progress + end |

`eval_and_record.py` counts lines in `live.log` after the trial
completes. Below the minimum → `status: "monitoring_violation"`,
non-zero exit, agent rewrites the same `approach.py` with logging
added (the trial number stays the same; the fix is to the contract,
not to the idea).

The convention has five rules. All five are mandatory for every
approach.

---

## Rule 1: `_log()` helper in every `approach.py`

Every `approaches/<NNN>_<slug>/approach.py` file MUST define a `_log(msg)`
helper function that:

1. Appends a timestamped line to `approaches/<NNN>_<slug>/live.log`
2. Prints to stdout with `flush=True` for immediate display

### Canonical implementation

```python
import os, time

_LIVE_LOG = os.path.join(os.path.dirname(__file__), "live.log")

def _log(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}\n"
    print(line, end="", flush=True)
    with open(_LIVE_LOG, "a") as f:
        f.write(line)
```

Use exactly this form. Do not replace it with `logging.getLogger()` or
`print()` alone — both break the `tail -f` monitoring guarantee.

---

## Rule 2: Logging points in training loops (with progress + ETA)

Training loops in `approach.py` MUST call `_log()` at meaningful
intervals. **Every periodic log line must carry progress and ETA**
so both the user and the agent can watch the trial live (in
`tail -f` AND in Claude Code's background-shell indicator).

- **START:** `_log("Training started with <config summary>. Total epochs: <N>.")`
- **PERIODIC:** Every epoch / batch / fit step — include elapsed,
  percent, and ETA:
  ```python
  elapsed = time.time() - t0
  pct = (epoch + 1) / n_epochs
  eta = elapsed * (1 - pct) / pct if pct > 0 else float("inf")
  _log(f"Epoch {epoch+1}/{n_epochs} ({pct*100:.0f}%) loss={loss:.4f} "
       f"val={val_loss:.4f} elapsed={elapsed:.0f}s ETA={eta:.0f}s")
  ```
- **COMPLETION:**
  `_log(f"Training complete. Elapsed: {elapsed:.1f}s, final_loss={loss:.4f}")`

For iterative training (neural nets, gradient boosting, etc.), also
write progress to `training_progress.json` in the approach directory.
This is the structured counterpart to `live.log` and is what the agent
reads during background-trial monitoring:

```python
progress_file = os.path.join(os.path.dirname(__file__), "training_progress.json")
with open(progress_file, "w") as f:
    json.dump({
        "epoch": epoch,
        "loss": loss,
        "elapsed": elapsed,
        "best_val": best_val,
    }, f)
```

Both streams (`live.log` and `training_progress.json`) must be updated
on every meaningful training step.

---

## Rule 3: Logging points in prediction loops

Prediction loops (over the test set or hold-out set) MUST call `_log()`
periodically — typically every 50 samples or every second, whichever
makes the log readable at human pace:

- Include: count processed, elapsed time, rate (samples/sec), rough ETA
- Example:
  `_log(f"Predicted {i}/{total} ({rate:.1f} Hz). ETA: {eta:.0f}s")`

---

## Rule 4: Eval launch MUST stream to BOTH `live.log` AND stdout (via `tee`)

**Canonical launch command:**

```bash
timeout <N> stdbuf -oL -eL uv run python -u eval_and_record.py approaches/<NNN>_<slug> 2>&1 \
  | stdbuf -oL tee approaches/<NNN>_<slug>/live.log
```

Key constraints:

- `python -u` (unbuffered) — Python writes output without buffering
- `stdbuf -oL -eL` — forces line-buffered stdout/stderr on the Python
  process (so `tee` sees lines as they're produced, not in 4KB chunks)
- `2>&1` — merges stderr into stdout BEFORE `tee`, so stack traces
  land in the log AND in the shell indicator
- `| tee approaches/<NNN>_<slug>/live.log` — forwards every line to
  BOTH `live.log` AND stdout. The file path MUST match the approach
  directory exactly (downstream tooling depends on it).
- `stdbuf -oL tee` — line-buffers `tee`'s output to stdout so Claude
  Code's background-shell indicator shows progress immediately
- `timeout <N>` — bounds execution and enables soft-kill recovery
- Background launches: pass `run_in_background: true` on the Bash
  tool call

### NEVER pipe background commands through filters

**CRITICAL:** When using `run_in_background: true`, the ONLY pipe
allowed is `tee`. Do NOT append `| tail`, `| head`, `| grep`, or
any other filter after `tee`. Filters buffer their output until the
command completes, which means Claude Code's background-shell
indicator shows **empty output** for the entire run — the user sees
nothing when they click the "N shell" tab.

```bash
# WRONG — shell indicator shows empty output until command finishes
timeout 600 stdbuf -oL -eL uv run python -u eval_and_record.py approaches/005_foo 2>&1 \
  | stdbuf -oL tee approaches/005_foo/live.log | tail -40

# WRONG — same problem, different filter
... | tee approaches/005_foo/live.log | grep -v DEBUG

# CORRECT — tee is the terminal pipe, nothing after it
timeout 600 stdbuf -oL -eL uv run python -u eval_and_record.py approaches/005_foo 2>&1 \
  | stdbuf -oL tee approaches/005_foo/live.log
```

If you need to filter output after the fact, read `live.log` with
the Read tool or `tail` it separately — never inline with the
launch command.

### Effect: three simultaneous streams

When `eval_and_record.py` runs under this launch, every line it
emits (and anything it invokes — `approach.py`'s `_log()` calls,
uncaught stack traces, `eval_and_record.py`'s own markers) streams
to all three of these at the same time:

1. **`approaches/<NNN>_<slug>/live.log`** — persistent, grep-able,
   committed to git, readable by the agent on the next iteration for
   commentary.
2. **Claude Code's background-shell indicator** — the "N shell" tab
   at the bottom of the Claude Code interface. The user clicks it
   and watches progress live without needing a second terminal.
3. **A separate terminal with `tail -f approaches/<NNN>_<slug>/live.log`** —
   for users who prefer watching from outside Claude Code.

All three see the same content at the same time. Progress lines from
Rule 2 (with elapsed, percent, ETA) are what makes this actually
useful — a silent `.log` with no progress indicators defeats the
whole point.

### Why NOT just redirect to the file

The older convention was
`uv run python -u eval_and_record.py ... > live.log 2>&1`. This
**breaks** Claude Code's shell indicator: when stdout is redirected
to a file with `>`, Claude Code captures nothing, so the "N shell"
tab shows only silence while the trial runs. The user gets no live
feedback unless they open a second terminal. The `tee` form restores
shell-indicator visibility without sacrificing the log file.

### Portability notes

- `stdbuf` is part of GNU coreutils. Available on Linux by default,
  and on macOS via Homebrew (`brew install coreutils`, binary name
  `gstdbuf`).
- On systems without `stdbuf`, drop it:
  ```bash
  timeout <N> uv run python -u eval_and_record.py approaches/<NNN>_<slug> 2>&1 \
    | tee approaches/<NNN>_<slug>/live.log
  ```
  This works in most practical cases because `python -u` already
  line-buffers stdout. The `stdbuf` wrapping is only needed when
  `tee`'s downstream is a pipe that defeats its default
  line-buffering heuristic — rare during interactive use.

---

## Rule 5: User copy-paste `tail -f` command in background launch messages

When posting a background launch (`Bash` with `run_in_background: true`),
the message MUST include the exact `tail -f` command the user can
copy-paste in another terminal. Do not paraphrase the path or omit the
filename.

### Required format

```
**NNN: [background launch]**
Monitor progress:
  tail -f approaches/<NNN>_<slug>/live.log
<Bash tool call with run_in_background: true>
```

Two text lines plus the tool call. Never combine this with analysis,
summaries, or a commentary block — those happen on separate iterations.

---

## Message format during the loop (not background)

When the Bash call is foreground and completes inline, the post-eval
message follows this exact two-line format:

```
**NNN: KEEP/DISCARD** (score). [One sentence about what to try next.]
<Write tool call for next approach>
```

Two lines of text max. One tool call after. Nothing else. The next
iteration then writes `commentary.md` for the approach just finished
(Tool 1 of the 4-tool-call contract) before writing `rationale.md` and
`approach.py` for the next one.

---

## Why this matters

- **User observability:** `tail -f live.log` is the only way a human
  watches the loop run. If it's broken, the user is blind.
- **Agent self-observation:** the agent reads the previous trial's
  `live.log` when composing `commentary.md`. Missing logs mean empty
  commentary.
- **Background monitoring:** for trials >60s, the agent reads
  `training_progress.json` every 30-60s while waiting. If approach.py
  doesn't write it, the agent can't soft-kill a diverging trial.
- **Reproducibility:** `live.log` is committed to git alongside the
  approach. Months later, you can see exactly what the trial printed.

These rules are non-negotiable. Violations are caught by
`eval_and_record.py`'s post-trial line-count check (see top of this
file) and produce `monitoring_violation` status — the agent's only
valid next action is to rewrite the same `approach.py` with proper
logging. The trial number does NOT advance; the fix is to the
contract, not to the idea.
