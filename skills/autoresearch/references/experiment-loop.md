# Experiment Loop Protocol

Full 10-step protocol for the autonomous experiment loop.

## The Loop

LOOP FOREVER (or until --total budget expires):

### 1. REVIEW (thinking only, no tool call needed)
Read results.json. Identify:
- What has been tried (all statuses, including crashes)
- What has NOT been tried (paradigm gaps)
- Which approaches came closest (even if discarded)
- Patterns: what seems to help? what seems to hurt?
- User ideas queue: any unexplored suggestions?

### 2. HYPOTHESIZE (thinking only, no tool call needed)
Form a specific hypothesis:
> "I believe <approach> will improve <metric> because <reason>.
> This has not been tried because <gap>."

Strategy:
- Prefer breadth early (explore different paradigms)
- Depth later (refine what works)
- When stuck: combine near-misses, try opposites, revisit user ideas,
  try radically different paradigms, look at bibliography for inspiration

### 3-4. NAME + CODE (tool call 1: Write)
Write `approaches/<NNN>_<hypothesis>/approach.py`:
- Implement `run(data)` cleanly
- Self-contained, no hardcoded paths
- Put your hypothesis and analysis in the **docstring**, not in message text
- If based on a paper/resource, create `references.md` in the same dir

### 5-9. RUN + RECORD + GIT + LOG + VISUALIZE (tool call 2: Bash)

**CRITICAL: Steps 5 through 9 MUST execute as a SINGLE Bash tool call.**
This is what prevents the loop from stopping. If you break these into
separate tool calls, you create exit points where your message can end
in text. One Bash call. One tool use. Non-negotiable.

The compound command evaluates, records, git commits/reverts, and prints
a one-line result. Adapt this template for your experiment:

```bash
cd "$SESSION_DIR" && python3 << 'EVALSCRIPT'
import sys, importlib.util, json, time, subprocess, os

APPROACH_DIR = "approaches/<NNN>_<name>"
APPROACH_FILE = f"{APPROACH_DIR}/approach.py"
PRIMARY_METRIC = "<metric_name>"

# --- EVALUATE ---
spec = importlib.util.spec_from_file_location("approach", APPROACH_FILE)
mod = importlib.util.module_from_spec(spec)
start = time.time()
try:
    spec.loader.exec_module(mod)
    sys.path.insert(0, ".")
    from fixed.evaluate import evaluate
    result = evaluate(mod.run)
    score = result[PRIMARY_METRIC]
    elapsed = round(time.time() - start, 1)
    crashed = False
except Exception as e:
    score = 0
    elapsed = round(time.time() - start, 1)
    crashed = True
    print(f"CRASH: {e}")

# --- KEEP/DISCARD ---
best_file = "best_score.txt"
best = float(open(best_file).read().strip()) if os.path.exists(best_file) else 0
kept = not crashed and score > best

# --- SCORES FILE ---
with open(f"{APPROACH_DIR}/scores.json", "w") as f:
    json.dump({"scores": {PRIMARY_METRIC: score}, "status": "keep" if kept else ("crash" if crashed else "discard"), "runtime_seconds": elapsed}, f)

# --- GIT ---
label = "keep" if kept else ("crash" if crashed else "discard")
subprocess.run(["git", "add", APPROACH_DIR], check=True, capture_output=True)
subprocess.run(["git", "commit", "-m", f"{label}: {APPROACH_DIR} ({PRIMARY_METRIC}={score:.3f})"], check=True, capture_output=True)
if not kept:
    subprocess.run(["git", "revert", "HEAD", "--no-edit"], check=True, capture_output=True)
else:
    open(best_file, "w").write(str(score))

# --- ONE LINE OUTPUT ---
print(f"{'++' if kept else '--'} {APPROACH_DIR}: {score:.3f} ({label}, {elapsed}s)")
EVALSCRIPT
```

**If the experiment has a custom evaluation flow** (e.g., the evaluator is
called differently), adapt the script but keep the structure: one Bash call
that evaluates + records + git commits and prints one line. The LLM MUST NOT
parse results, decide keep/discard, or run git as separate tool calls.

### 10. GOTO 1

Read the one-line output from step 5-9. Then IMMEDIATELY write the next
approach file (step 3-4). Do not write analysis. Do not summarize.

**The iteration is exactly 2 tool calls:**
1. **Write** the approach file (step 3-4)
2. **Bash** the compound eval+record+git command (steps 5-9)

Repeat forever. Write, Bash, Write, Bash, Write, Bash.

If your message has a text block after the last Bash output, you are about to
stop. Delete it. Emit the next Write tool call instead.

Put analysis in the approach.py docstring (step 3-4) or in report.md (updated
inside the compound Bash script). Never in message text.

## Approach Naming After Scoring

| Situation | Folder name |
|-----------|-------------|
| Single metric, keep | `003_relu_instead_of_gelu_0.892` |
| Multi-metric, keep | `012_ensemble_top3_avg0.834` |
| Crash | `005_deep_mlp_crash` |
| Baseline | `001_baseline_0.723` |

Rename the folder immediately after scoring, before the git step.
The compound script handles this.
