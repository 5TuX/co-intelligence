# Self-Refinement Protocol

Core design principle of the co-intelligence plugin: every skill participates
in a positive human-machine feedback loop.

## When to Suggest Refinement

After completing a task with any co-intelligence skill, check for friction:

| Signal | Example |
|--------|---------|
| User corrects the skill's behavior | "No, don't do X" / "I meant Y" |
| A mode doesn't quite work | Unexpected edge case, wrong default |
| User works around a limitation | Manual steps the skill should handle |
| Search strategy underperforms | Missing results, wrong sources |
| User explicitly asks | "This skill should do X" / "Can you improve this?" |
| Output format doesn't match expectations | Wrong structure, missing fields |

## Two Actions

### 1. Suggest (lightweight, immediate)

When friction is detected, suggest at the end of the response:

> "This looks like it could improve the `<skill>` skill. Want me to
> `/skillsmith <skill>` to refine it?"

Do NOT auto-run skillsmith. The user decides.

### 2. Log (persistent, systematic)

Append the observation to `$PLUGIN_DATA/friction.md`:

```markdown
- **<date>** | `<skill>` | <one-line observation> | <severity: low/medium/high>
```

Create the file if it doesn't exist. Append only, never truncate.

Skillsmith reads this file during refine cycles (Step 1) to discover
accumulated friction across all skills.

## Severity Guide

- **high**: Skill produced wrong output, user had to redo work
- **medium**: Skill worked but user corrected behavior or worked around a gap
- **low**: Minor friction, suboptimal default, cosmetic issue

## What NOT to Log

- Normal usage with no friction
- User preferences already captured in CLAUDE.md or memory
- One-time edge cases unlikely to recur
