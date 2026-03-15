---
name: report
description: Write quality technical reports from codebases — pandoc ODT/PDF output, BibTeX citations, strict style matching
argument-hint: "[kickstart|outline|write <section>|extract-metrics|status|test]"
---

# Technical Report Assistant

End-to-end workflow for technical/scientific reports from codebases: pandoc-based ODT output,
Zotero-compatible citations, and strict writing style matching.

## Usage

```
/report kickstart          — scaffold a new report project
/report outline            — propose a section outline from the codebase
/report write <section>    — write or rewrite a section in the user's style
/report extract-metrics    — pull experiment results into context/
/report status             — show section progress and next actions
/report test               — quality checks (PASS/FAIL for each rule)
/report                    — auto-detect what to do next
```

---

## Context files (read before any action)

| File | Purpose |
|------|---------|
| `status.md` | Section progress, decisions, writing queue, placeholders, future work |
| `context/code_map.md` | Section-to-source-file mapping with key parameters |
| `context/style_sample.md` | Annotated writing samples (primary style reference) |
| `context/vocabulary.md` | Established terminology and forbidden synonyms |
| `context/references.bib` | BibTeX library |

These are your memory. Never re-explore what's already documented. `code_map.md` tells you
which source files are relevant per section. `status.md` has the writing queue and blocking
actions. Check both before writing or exploring.

---

## Mode: `kickstart`

Scaffold a new report project:

1. Verify pandoc is installed (`pandoc --version`). If missing, stop and tell the user to install it.
2. Init git, create directory structure:
   ```
   <project>/
   ├── <report>.md         ← main source (YAML front-matter: title, bibliography, csl)
   ├── build.sh            ← pandoc build (--citeproc, --reference-doc, --toc, --standalone)
   ├── status.md           ← section tracking (can live at report root for visibility)
   ├── context/
   │   ├── style_sample.md, vocabulary.md, code_map.md, references.bib, nature.csl
   └── docs/
       ├── reference.odt, README.md, STYLING.md, CITATIONS.md
   ```
3. Extract pandoc reference.odt (`pandoc --print-default-data-file reference.odt`)
4. Download CSL style (Nature by default)
5. Create build.sh (accept `--zotero` flag, respect `PANDOC` env var)
6. If existing report provided: convert to markdown, extract vocabulary
7. Create status.md with sections, decisions, writing queue, placeholders
8. Explore codebase → create code_map.md (section-to-file mapping with parameters)
9. Create references.bib with tool citations inferred from codebase
10. Tell user: fill style_sample.md, edit reference.odt for margins/fonts, run `/report outline`

---

## Mode: `outline`

1. Explore codebase with parallel agents (architecture, results, existing docs)
2. Propose hierarchical outline with content richness estimate per section
3. After approval, populate status.md writing queue

---

## Mode: `write <section>`

**Before writing:**
- Read style_sample.md → extract patterns (person, sentence length, section openers, bullet style, citation placement)
- Read code_map.md entry for this section
- Check status.md for blocking notes
- Check references.bib for needed citations

**Writing rules:**
- Match the user's style exactly (person, paragraph length, structural elements)
- `[[placeholder]]` for unknown values — never invent numbers
- `[@citekey]` after cited item, before punctuation
- Prose over lists unless genuine parallel enumeration

**Anti-AI style rules (apply to every sentence):**

> **RULE #0**: Never write em dashes (U+2014) or double hyphens. Use comma, parentheses, or colon instead.

*Banned words:* pivotal, crucial, vital, delve, showcase, highlight, underscore, enhance,
foster, tapestry, landscape (abstract), testament, vibrant, enduring, intricate, garner,
leverage, valuable insights, interplay, robust (vague), novel (filler), cutting-edge (no cite),
seamlessly, bolster, harness, illuminate, facilitate

*Banned openers:* Additionally, Furthermore, Moreover, Consequently, It is worth noting,
In conclusion, Overall, Importantly, Notably

*Structure tells:* No title-case headings. No bold overuse in prose. No uniform bullet lists.
Vary sentence length and openers.

*Self-check:* Search for — and --. Scan banned words. Check consecutive sentence openers.
Verify all numbers from code_map.md or marked [[placeholder]].

**After writing:** Update status.md, rebuild ODT, ask user before committing.

---

## Mode: `extract-metrics`

1. Check for project extraction script (e.g. `report/mlflow/extract_metrics.py`). Run it if present.
2. If no script: walk MLflow runs or CSV files, extract metrics into `context/metrics_*.md`
3. After extraction: update status.md, list fillable placeholders

---

## Mode: `status`

Read status.md. Show: section counts, writing queue, blocking actions, open placeholders.
Suggest the single most valuable next action.

---

## Mode: `test`

Quality checks with PASS/FAIL output:

- **Infrastructure**: context files present, style sample filled, build succeeds, git clean
- **Hard rules**: em dashes, double-hyphens, smart quotes
- **Banned vocabulary**: words, sentence openers, content patterns
- **Style**: person consistency, sentence-case headings, bold overuse
- **Citations**: syntax, unresolved citekeys, bare URLs
- **Vocabulary**: species names, version names, model names, feature names, hardware, metrics
- **Placeholders**: count and list all `[[...]]`
- **Progress**: section completion from status.md

Print summary: `Result: N PASS / M FAIL`. Do NOT auto-fix.

---

## Mode: auto (no argument)

- No context/ → run kickstart
- style_sample.md empty → remind user, ask what to write
- status.md exists → suggest first unblocked item from writing queue
- All done → suggest `/report test`

---

## Pandoc tips

- Pin pandoc version in build.sh comments
- YAML front-matter for title, author, bibliography, csl
- .md is source of truth; .odt is artifact
- For cross-references: consider Quarto migration (native @fig-label, @tbl-label)

## Zotero tip

Better BibTeX → "Automatic export" → "Keep updated" on references.bib export.
Any reference added to Zotero is immediately available via `[@citekey]`.
