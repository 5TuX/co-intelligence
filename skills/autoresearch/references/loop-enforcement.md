# Loop Enforcement

Mechanisms that enforce the never-stop behavior at the system level,
beyond prompt instructions. Create ALL survival files during session init.

## 1. Stop Hook (MOST RELIABLE - recommended setup)

A Claude Code Stop hook that blocks the agent from stopping while
`.loop-active` exists AND belongs to the current session. When the hook
returns exit code 2, Claude is forced to continue. The stderr message
is injected as context.

### Instance Isolation

`.loop-active` contains the `${CLAUDE_SESSION_ID}` of the session that
started the loop. The Stop hook compares this against the current session
ID. Only the instance that owns the loop is blocked - other Claude Code
instances pass through freely.

**Setup** (add to the `Stop` array in `.claude/settings.json`):

```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "for f in ~/.claude/plugins/data/*/autoresearch/*/.loop-active; do if [ -f \"$f\" ]; then SID=$(head -1 \"$f\" | tr -d '\\r\\n'); if [ \"$SID\" = \"${CLAUDE_SESSION_ID}\" ]; then DIR=$(dirname \"$f\"); echo \"AUTORESEARCH LOOP ACTIVE in $DIR. Read $DIR/.autoresearch-directives. NEVER stop. Write the next approach NOW.\" >&2; exit 2; fi; fi; done"
    }
  ]
}
```

**Important notes:**

- **Must be in settings.json, NOT in a plugin hooks.json.** Plugin-installed
  Stop hooks with exit code 2 fail silently (GitHub #10412). settings.json
  hooks work correctly.
- **Instance-isolated via session ID.** The hook reads the session ID from
  `.loop-active` and compares with `${CLAUDE_SESSION_ID}` (auto-substituted
  by Claude Code). Only the owning instance is blocked. Other instances
  (doing setup, code review, etc.) are not affected.
- **Does NOT check `stop_hook_active`.** This is intentional. We want to
  block EVERY stop attempt as long as `.loop-active` exists for this session.
- **Exit code 2 displays as "Stop hook error"** in the Claude Code UI
  (GitHub #34600). This is cosmetic - the hook is working correctly.
  The stderr message still reaches the agent as continuation instructions.
- **Project-level sessions:** If the session lives in a project directory
  (not plugin data), add a project-specific Stop hook in `.claude/settings.json`
  that checks the project path, using the same session ID comparison pattern.

### Stop Hook Installation Check

The skill MUST verify the Stop hook is installed during both new session
init and resume. If not installed, the skill should:

1. Print a clear warning that the loop has NO technical enforcement
2. Offer to install via the `update-config` skill
3. Proceed anyway (the loop still works, just without the safety net)

The hook is the ONLY defense that survives context compression AND
operates at the system level. Without it, all enforcement is prompt-based
and will eventually degrade in long sessions.

## 2. .claude/CLAUDE.md (SURVIVES AUTOCOMPACT)

Create `.claude/CLAUDE.md` inside the experiment directory at session init.
CLAUDE.md files are ALWAYS loaded into the system context, surviving any
context compression. This is the most reliable persistence mechanism.


```bash
mkdir -p "$SESSION_DIR/.claude"
cat > "$SESSION_DIR/.claude/CLAUDE.md" << 'EOF'
# Autoresearch Loop Active

You are running an autonomous research loop. Core rules:
1. NEVER STOP. The user tells you when to stop.
2. Each message: Write approach.py, then Bash eval_and_record.py. Repeat.
3. ALL visualization, git, and reporting is handled by eval_and_record.py.
4. NEVER generate plots, git commit, or update reports as separate tool calls.
5. Put analysis in approach.py docstrings, NOT in message text.
6. End every message with a tool_use, never with text.
7. Read experiment-plan.md for the task definition.
8. Read results.json for all prior approaches.
9. If stuck: try a radically different paradigm.
10. Message format: "**NNN: KEEP/DISCARD** (score). [Next idea.]\n<tool call>"
11. BEFORE each trial: Read previous trial's visualization.png and artifacts.
    You are multimodal. Visual analysis of error patterns drives better hypotheses.
12. If eval says `!! SEARCH_NEEDED`: search web for new ideas before next trial.
13. If eval says `!! SEARCH_SUGGESTED`: search for one new idea.
14. If eval says `!! TIMEOUT`: delete the approach folder, adjust, try again.
15. For long trials (>60s): run eval in background, monitor training_progress.json.
16. Save and reuse artifacts (weights, loss curves) across trials. Add .gitignore.
17. Use Optuna for hyperparameter tuning when approach has tunable knobs.
18. ONE method per trial. No ensembles. Push each method to its optimum before
    trying a different one. Depth-first per method, breadth across methods.
EOF
```

## 3. .autoresearch-directives (context recovery checkpoint)

Written at session start. If the agent loses context after autocompact,
reading this file restores the directives and current position.

```bash
cat > "$SESSION_DIR/.autoresearch-directives" << 'EOF'
# Autoresearch core directives - read this if you lost context
1. NEVER STOP. The user tells you when to stop.
2. Each message: Write approach.py, then Bash eval_and_record.py. Repeat.
3. ALL visualization, git, and reporting is handled by eval_and_record.py.
4. NEVER generate plots, git commit, or update reports as separate tool calls.
5. Put analysis in approach.py docstrings, NOT in message text.
6. End every message with a tool_use, never with text.
7. Read experiment-plan.md for the task definition.
8. Read results.json for all prior approaches.
9. If stuck: try a radically different paradigm.
10. BEFORE each trial: Read previous visualization.png and artifacts. You are multimodal.
11. If eval says !! SEARCH_NEEDED: web search for new ideas before next approach.
12. If eval says !! TIMEOUT: delete folder, adjust, try again.
13. For long trials: run eval in background, monitor training_progress.json.
14. Save and reuse artifacts (weights, loss curves) across trials.
EOF
```

## 4. .loop-state (position checkpoint)

Updated automatically by `eval_and_record.py` after each approach.
Contains: last approach number, best score, total count.

If the agent loses context, it reads `.loop-state` + `results.json` to
know exactly where it left off.

## Autocompact Survival Strategy

Context compression (autocompact) can strip skill instructions from the
conversation window. Known limitations (mid-2026):
- Context buffer is ~33K tokens (16.5% of 200K window)
- `UserPromptSubmit` hook does NOT fire after compaction (GitHub #26597)

The defense layers, in order of reliability:
1. **Stop hook (exit code 2)** - physically prevents stopping
2. **.claude/CLAUDE.md** - always reloaded into system context
3. **.autoresearch-directives** - agent can read for recovery
4. **.loop-state** - position checkpoint

If the agent notices context was compressed (doesn't remember recent
approaches), it should read these files before continuing:
1. `.autoresearch-directives` - core rules
2. `.loop-state` - where it left off
3. `results.json` - full approach history
4. `experiment-plan.md` - task definition

## Removing the Loop

The user can stop the loop by:
1. Typing a message telling the agent to stop
2. Running `/autoresearch stop` (removes `.loop-active` for active session)
3. Running `rm .loop-active` in the experiment directory (manual)
4. The `--min` approach count being reached with no recent improvement
