---
name: myplay
description: >
  Use when the user says /myplay <insight>.
  Records a moment of demonstrated human expertise, critical insight,
  or irreplaceable contribution to the collaboration.
argument-hint: "<what you did well>"
---

# My Play

Record a moment where you demonstrated expert knowledge, caught a mistake,
had a key insight, or brought something irreplaceable to the collaboration.

1. Take the content from $ARGUMENTS.
2. Open `~/.claude/skills/job-search/users/dimit/Human-Expertise.md`.
3. Classify the entry into one of these categories (add a new one if none fit):
   - **Domain Knowledge** — deep expertise in a field
   - **Critical Review** — caught a bug, logical flaw, or hallucination from Claude
   - **Process Design** — improved a workflow, experiment structure, or system architecture
   - **Creative Insight** — novel idea, reframe, or approach Claude wouldn't have proposed
   - **Taste & Judgment** — aesthetic, UX, or strategic call that required human intuition
4. Append the entry under the right category with today's date:
   ```
   - **YYYY-MM-DD** — <one-sentence description>
   ```
5. If this reveals a *persistent strength* (not a one-off), update the **Strengths Summary** table at the top.
6. Confirm in one line what was logged and under which category.
