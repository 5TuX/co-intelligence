---
name: report
description: Write quality technical reports from codebases — Quarto ODT/PDF output, BibTeX citations, strict style matching
argument-hint: "[kickstart|outline|write <section>|extract-metrics|status|test]"
---

# Technical Report Assistant

End-to-end workflow for technical/scientific reports from codebases: Quarto-based ODT/PDF output,
Zotero-compatible citations, native cross-references, and strict writing style matching.

**Quarto** is built on top of Pandoc (same ecosystem, by Posit). It adds native cross-references,
hoverable citations, callout blocks, and multi-format output from one source. Your `.bib` files
and `reference.odt` work unchanged — Quarto passes them through to Pandoc under the hood.

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

1. Verify Quarto is installed (`quarto --version`). If missing, stop and tell the user: install from https://quarto.org/docs/download/
2. Init git, create directory structure:
   ```
   <project>/
   ├── <report>.qmd         ← main source (YAML front-matter)
   ├── _quarto.yml          ← project config (format, bibliography, csl, reference-doc)
   ├── status.md            ← section tracking
   ├── context/
   │   ├── style_sample.md, vocabulary.md, code_map.md, references.bib, nature.csl
   └── docs/
       ├── reference.odt, README.md, STYLING.md, CITATIONS.md
   ```
3. Extract default reference.odt (`pandoc --print-default-data-file reference.odt`) — Quarto uses Pandoc's reference doc for ODT/DOCX styling.
4. Download CSL style (Nature by default)
5. Create `_quarto.yml`:
   ```yaml
   project:
     type: default
   format:
     odt:
       reference-doc: docs/reference.odt
       toc: true
   bibliography: context/references.bib
   csl: context/nature.csl
   ```
6. If existing report provided: convert to `.qmd`, extract vocabulary
7. Create status.md with sections, decisions, writing queue, placeholders
8. Explore codebase → create code_map.md (section-to-file mapping with parameters)
9. Create references.bib with tool citations inferred from codebase
10. Tell user: fill style_sample.md, edit reference.odt for margins/fonts, run `/report outline`

**Build command:** `quarto render <report>.qmd` (or `quarto render` for the whole project).

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

**Cross-references (Quarto native):**
- Figures: `![Caption](path){#fig-label}` → reference with `@fig-label`
- Tables: add `{#tbl-label}` after caption → reference with `@tbl-label`
- Equations: `$$...$$ {#eq-label}` → reference with `@eq-label`
- Sections: `## Heading {#sec-label}` → reference with `@sec-label`
- All cross-references are automatically numbered and hyperlinked.

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

**After writing:** Update status.md, rebuild with `quarto render`, ask user before committing.

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

- **Infrastructure**: context files present, style sample filled, `quarto render` succeeds, git clean
- **Hard rules**: em dashes, double-hyphens, smart quotes
- **Banned vocabulary**: words, sentence openers, content patterns
- **Style**: person consistency, sentence-case headings, bold overuse
- **Citations**: `[@citekey]` syntax, unresolved citekeys, bare URLs
- **Cross-references**: unresolved `@fig-`, `@tbl-`, `@eq-`, `@sec-` references
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

## Quarto tips

- Install: https://quarto.org/docs/download/ (standalone, includes Pandoc)
- `.qmd` is source of truth; `.odt`/`.pdf` are artifacts
- `_quarto.yml` centralizes config (formats, bibliography, CSL, reference-doc)
- Multi-format: add `pdf:` or `html:` sections to `_quarto.yml` for simultaneous output
- Callout blocks: `:::{.callout-note}` / `:::{.callout-warning}` for structured asides
- Quarto uses Pandoc under the hood — all Pandoc filters and features still work
- `_brand.yml`: define colors, logos, fonts once — applied consistently across all outputs (1.8+)
- `pdf-standard: pdf/a` in `_quarto.yml` for archival-quality PDF output (1.9+)
- Typst is now a first-class output format — faster compilation than LaTeX with growing parity (1.7+)
- Default LaTeX engine changed to lualatex in 1.8 — better Unicode and font support

## Zotero tip

Better BibTeX → "Automatic export" → "Keep updated" on references.bib export.
Any reference added to Zotero is immediately available via `[@citekey]`.
