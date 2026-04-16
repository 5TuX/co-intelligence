---
name: bibliography
description: >
  Deep scientific bibliography search. Use when the user wants to build a
  comprehensive bibliography, find academic papers, do a literature review,
  survey a research area, or discover relevant scientific publications.
  Triggers on: "bibliography", "find papers", "literature search",
  "literature review", "related work", "build a bibliography",
  "academic search", "paper discovery".
---

# Bibliography - Deep Scientific Literature Search

Build comprehensive bibliographies from a natural-language description of
your research. Produces 50-100 highly relevant papers organized by topic,
with abstracts, citation metrics, and BibTeX.

Inspired by Undermind's iterative deep search: refines queries based on
what each wave discovers, scores every candidate with LLM reasoning,
and converges when discovery rate drops.

## Signature

```
bibliography -- <mode>
  Input: "<raw research description>" | status | resume

  Modes:
    "<description>"  New search from raw description
    status           Show progress of current search
    resume           Continue an interrupted search
```

## Argument Parsing

| Pattern | Mode |
|---------|------|
| `status` | Show search session status |
| `resume` | Resume interrupted session |
| `"<text>"` or plain text | New bibliography search |
| (no args) | List existing sessions or prompt for description |

---

## Data Directory

All bibliography data lives in the plugin data directory, NOT the user's
working directory. At the start of every invocation:

1. Resolve `$PLUGIN_DATA` from `CLAUDE_PLUGIN_DATA` env var.
   Fallback: `~/.claude/plugins/data/co-intelligence-co-intelligence`
2. Create `$PLUGIN_DATA/bibliography/` if it doesn't exist
3. Each search session gets a subdirectory: `$PLUGIN_DATA/bibliography/<slug>/`

`<slug>` = lowercase, hyphenated topic (e.g., `pathogen-detection-microscopy`).

### Session Directory Structure

```
$PLUGIN_DATA/bibliography/<slug>/
  description.txt        Raw user input
  search_goal.txt        Structured search goal (approved by user)
  <Title_Slug>.md        Final bibliography
  <Title_Slug>.bib       BibTeX file
```

Only these 4 files. No intermediate reports, no JSON dumps, no assembly
logs. Agents may use temp files during search but must clean up.

---

## Phase 1: Intake

Collect the user's raw research description. Accept as-is (typos, informal
language). The user may also provide:

- Path to their code repository
- Path to existing documents (proposals, presentations, reports)
- Path to their current bibliography (.bib file)

If a .bib file is provided, read it to identify papers the user already has.
These will be excluded from the final output.

**Prompt if no description provided:**
> Describe your research in your own words. Mention: what you're working on,
> methods you use, tools/libraries, what kind of papers would be useful.

Save to `$PLUGIN_DATA/bibliography/<slug>/description.txt`.

---

## Phase 2: Structured Search Goal

Transform the raw description into a precise search goal.
Read `references/refinement-protocol.md` for the full protocol.

**Key steps:**
1. Extract core problem, domain, methods, data, constraints, end goal
2. Expand terminology: synonyms, related methods, **alternative approaches**,
   **competing methods** the user may not know about
3. Identify **foundational methods** used in the pipeline (e.g., if user
   uses Kalman filters, the search should find seminal tracking papers even
   if they're not about the user's specific domain)
4. Define inclusion/exclusion criteria
5. Break into 6-12 sub-topics
6. Draft structured search goal paragraph

**Present to user for approval.** Save to `search_goal.txt`.

---

## Phase 2.5: Anchor Search

Before broad discovery, find the papers closest to the user's exact work.
This prevents missing the most relevant papers and seeds later waves.

1. **User's own publications**: Search Semantic Scholar for the user's name,
   institution, or project name. Search for any paper titles mentioned in
   provided documents. These anchor the bibliography.
2. **Direct matches**: Search for the exact problem statement (not sub-topics).
   Use the most specific query possible.
3. **Known key papers**: If the user provided a .bib file, use those papers
   as seeds for citation expansion.

Target: 5-15 anchor papers. These get automatic relevance score 1.0.

---

## Phase 3: Deep Search

Read `references/search-protocol.md` for the full protocol.

**Critical rules (learned from production testing):**

1. **The main agent orchestrates and curates.** Sub-agents search and return
   raw results **WITHOUT pre-filtering**. The main agent reads every
   title+abstract and decides inclusion. Never delegate curation to
   sub-agents. Sub-agents must return ALL candidate papers discovered,
   with title, abstract, DOI, year, authors, venue. Include papers the
   sub-agent is uncertain about - the main agent will filter.

2. **Iterative gap analysis.** After each wave, compare found papers against
   the structured search goal. Identify sub-topics with <5 papers. Discover
   new terminology from abstracts of top papers. Feed these into the next
   wave's queries.

3. **Quality gate.** Every paper must be a peer-reviewed journal article,
   conference proceeding, or preprint on a recognized server (arXiv, bioRxiv,
   medRxiv, SSRN). Reject: blog posts, tutorials, documentation, software
   READMEs, news articles, theses (unless highly cited).

4. **Relevance gate.** For each candidate, ask: "Would a domain expert
   include this in a focused 100-paper bibliography on this exact topic?"
   If uncertain, exclude. Precision > recall for the final set.

5. **Author mining and citation chaining.** Author hub mining happens in
   Wave 1.5 (immediately after Wave 1), BEFORE citation expansion.
   Citation expansion from 0.9+ papers happens in Wave 2 with multi-hop
   depth for 0.95+ papers. Lower-confidence expansion (0.8-0.89) uses
   forward-only citations with stricter thresholds. Score each discovered
   paper immediately against the search goal before adding.

Execute 3+ waves (up to 7 with new sub-waves). Target: 50-100 unique,
relevant papers after filtering. Track discovery rate per wave and report
exhaustiveness estimation to the user. See search-protocol.md for the
full wave structure: 0, 1, 1.5, 2, 2.5, 2.6, 3.

---

## Phase 4: Output

Read `references/output-format.md` for formatting specs.

Generate two files in `$PLUGIN_DATA/bibliography/<slug>/`:

### `<Title_Slug>.md` - Main Bibliography

1. Title, Research Goal, Stats
2. Topic Breakdown (8-12 sub-topics with paper counts)
3. Paper Catalog table (numbered, sorted by topic then relevance)
4. Paper Details (abstract, full authors, DOI link, citations)

### `<Title_Slug>.bib` - BibTeX File

One entry per paper. Citation keys: `Sur25`, `Zha22c` (first 3 chars of
first author surname + 2-digit year + optional disambiguator).

---

## Semantic Scholar API Reference

Base: `https://api.semanticscholar.org/graph/v1`

| Endpoint | Purpose |
|----------|---------|
| `paper/search?query=<q>&limit=100&fields=...` | Keyword search |
| `paper/{id}?fields=...` | Paper details |
| `paper/{id}/references?fields=...&limit=500` | Backward citations |
| `paper/{id}/citations?fields=...&limit=500` | Forward citations |
| `author/{id}/papers?fields=...` | Author's papers |

Fields: `title,abstract,authors,year,venue,citationCount,externalIds,url,publicationDate,journal`

Rate limit: 1 req/sec without API key.

---

## Search Tool Priority

1. **Semantic Scholar API** (backbone) - structured data, citation graph
2. **Exa MCP** (`web_search_exa`) - neural semantic search
3. **Tavily MCP** (`tavily_search`, `tavily_research`) - broad web
4. **WebSearch** - fallback

---

## Error Handling

**Semantic Scholar rate-limited (429 status):**
1. Back off: wait 5-10 seconds, retry once
2. If still rate-limited, switch to Exa with `includeDomains` filter:
   ```
   web_search_exa:
     query: "<your search>"
     numResults: 30
     includeDomains: ["scholar.google.com", "semanticscholar.org",
                      "pubmed.ncbi.nlm.nih.gov"]
   ```
3. Add 100-150ms delays between consecutive Semantic Scholar requests
4. Distribute requests across waves (don't batch 20 requests at once)

**Sub-topic yields <5 papers:** Try application analog search (Wave 2.5)
and venue mining (Wave 2.6) before broadening within-topic terms.

**Total <30 after all waves:** Report honestly, acknowledge coverage gaps,
suggest user refine goal or approve a narrower bibliography.

**Always report paper counts per wave to the user.**

## Self-Refinement

This skill participates in the co-intelligence feedback loop. After completing
a task, if friction was observed, suggest: "Want me to `/skillsmith bibliography`
to refine this?" and log to `$PLUGIN_DATA/friction.md`.
