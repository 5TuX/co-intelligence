---
name: autoresearch
description: Use when investigating a question via iterative code experiments: write, run, analyze, refine hypothesis, repeat. Karpathy-style empirical autoresearch.
---

# Autoresearch

Run iterative research loops until the topic is well-covered.

## Loop

1. **Plan** — break the topic into specific sub-questions. State what "done" looks like.
2. **Gather** — search broadly, collect primary sources, extract claims with citations.
3. **Synthesize** — draft findings organized by sub-question. Note confidence level per claim.
4. **Critique** — identify gaps, weak sources, contradictions, untested assumptions.
5. **Refine** — generate follow-up questions from the critique. Return to step 2 unless done.

Stop when follow-up questions stop producing new information or the user's goal is met.

## Output

Deliver a report with:
- Executive summary (3–5 sentences)
- Findings per sub-question, each claim linked to its source
- Open questions / known gaps
- Bibliography

## Rules

- Every non-trivial claim gets a citation. No citation → mark as inference.
- Prefer primary sources over summaries.
- Surface contradictions rather than smoothing them over.
- Show the user the plan before the first gather pass; let them redirect.
