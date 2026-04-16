---
description: Autonomous iterative research loop - guides experiment design, then an AI agent tests approaches in a sandbox forever, logs everything, and never stops until you say so.
argument-hint: "describe a task, list sessions, or resume — all natural language"
---

<autoresearch-activated>

**You are ALREADY inside the autoresearch skill. Do NOT call the Skill tool for `co-intelligence:autoresearch` again. Calling it would create an infinite loop.**

## Arguments

$ARGUMENTS

## What to do

1. Use the Glob tool to find the SKILL.md file: pattern `**/autoresearch/SKILL.md` in the `~/.claude/plugins` directory.
2. Read the SKILL.md file with the Read tool.
3. Read ALL files in the `references/` directory next to SKILL.md (experiment-loop.md, evaluation-contract.md, common-pitfalls.md, planning-protocol.md, report-template.md, git-management.md).
4. Follow the SKILL.md instructions exactly, using the arguments above.

**Anti-loop guard:** If you see this message a second time in the same conversation, STOP calling the Skill tool. You already have the instructions. Proceed with the loop.

</autoresearch-activated>
