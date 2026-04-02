---
name: bibliography
description: >
  Deep scientific bibliography search. Use when the user wants to build a
  comprehensive bibliography, find academic papers, do a literature review,
  survey a research area, or discover relevant scientific publications.
  Triggers on: "bibliography", "find papers", "literature search",
  "literature review", "related work", "build a bibliography",
  "academic search", "paper discovery".
argument-hint: '"<raw description of your research>" | status | resume'
---

# Bibliography - Deep Scientific Literature Search

Build comprehensive, Undermind-quality bibliographies from a natural-language
description of your research. Produces 50-100 highly relevant papers organized
by topic, with abstracts, citation metrics, and BibTeX.

Inspired by Undermind's iterative deep search: instead of keyword matching,
this skill refines your description into a structured search goal, then
executes multiple waves of discovery (direct search, citation graph traversal,
venue/author mining) across Semantic Scholar, Exa, and Tavily.

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

## Phase 1: Intake

Collect the user's raw research description. Accept it as-is (typos, informal
language, stream of consciousness). The user may also provide optional context:

- Path to their code repository
- Path to existing documents (proposals, presentations, reports)
- Path to their current bibliography (.bib file)
- Path to data samples

**Prompt if no description provided:**
> Describe your research in your own words. Be as detailed or informal as you
> like. Mention: what you're working on, methods you use, tools/libraries,
> what kind of papers would be useful. Typos are fine.

Save the raw input to `bibliography/<slug>/01_raw_description.txt`.

---

## Phase 2: Structured Search Goal

Transform the raw description into a precise, domain-specific search goal.
Read `references/refinement-protocol.md` for the detailed protocol.

**Summary:**
1. Extract key concepts, methods, and domain terminology
2. Expand with synonyms and related terms the user may not have mentioned
3. Define inclusion/exclusion criteria (label-free vs labeled, etc.)
4. Break into 6-12 specific sub-topics to search
5. Draft a structured search goal paragraph (like the example in `references/`)

**Present to user for approval.** Adjust if they want changes.

Save to `bibliography/<slug>/02_structured_search_goal.txt`.

---

## Phase 3: Deep Search

Read `references/search-protocol.md` for the full search protocol.

Execute 3 waves of search using parallel agents. Each wave builds on previous
results. Target: 50-100 unique, relevant papers.

### Wave 1 - Broad Discovery

Dispatch 3-5 parallel agents (one per sub-topic cluster). Each agent:
1. Searches Semantic Scholar API for papers matching the sub-topic
2. Uses Exa neural search for semantic discovery
3. Uses Tavily for broader web coverage (Google Scholar, arXiv, PubMed)
4. Returns top 15-25 papers per sub-topic with: title, authors, year, venue,
   abstract, citation count, DOI, Semantic Scholar paperId

### Wave 2 - Citation Graph Expansion

From Wave 1's top 20 most relevant papers:
1. **Backward chaining**: fetch references of each paper via Semantic Scholar
2. **Forward chaining**: fetch citations of each paper via Semantic Scholar
3. Score discovered papers against the structured search goal
4. Keep papers with relevance score >= 0.6

### Wave 3 - Targeted Deep Dive

Based on patterns emerging from Waves 1-2:
1. **Author mining**: search for other papers by prolific authors found
2. **Venue mining**: search recent proceedings of top venues identified
3. **Keyword expansion**: search using new terminology discovered in abstracts
4. **Recency check**: dedicated search for papers from last 12 months

### Assembly

After all waves complete:
1. Deduplicate by DOI and title similarity
2. Score final relevance (0-1) against structured search goal
3. Organize into topic breakdown (8-12 sub-topics)
4. Sort within each topic by relevance, then by citation impact
5. Generate outputs (see Phase 4)

---

## Phase 4: Output

Read `references/output-format.md` for exact formatting specs.

Generate two files in `bibliography/<slug>/output/`:

### `<Title_Slug>.md` - Main Bibliography

Structure:
1. **Title** (derived from search goal)
2. **Research Goal** (the structured search goal text)
3. **Stats** (papers found, date)
4. **Topic Breakdown** (hierarchical list of sub-topics)
5. **Paper Catalog** (table: #, Year, Cit/yr, Title+link, Authors, Journal)
6. **Paper Details** (for each paper: number, year, cit/yr, title+DOI link,
   authors, journal, abstract block quote)

### `<Title_Slug>.bib` - BibTeX File

One `@article{...}` or `@inproceedings{...}` entry per paper.
Citation keys: first 3 letters of first author surname + 2-digit year + optional
letter disambiguator (e.g., `Per25`, `Zha22c`).

---

## Semantic Scholar API Reference

Base: `https://api.semanticscholar.org/graph/v1`

Key endpoints (use via WebFetch with JSON parsing):

| Endpoint | Purpose |
|----------|---------|
| `paper/search?query=<q>&limit=100&fields=...` | Keyword search |
| `paper/{id}?fields=...` | Paper details |
| `paper/{id}/references?fields=...&limit=500` | Backward citations |
| `paper/{id}/citations?fields=...&limit=500` | Forward citations |
| `author/{id}/papers?fields=...` | Author's papers |

Standard fields parameter:
`title,abstract,authors,year,venue,citationCount,externalIds,url,publicationDate,journal`

Rate limit: 1 request/second without API key. Batch where possible.

---

## Search Tool Priority

1. **Semantic Scholar API** (backbone) - structured paper data, citation graph
2. **Exa MCP** (`web_search_exa`) - neural semantic search for papers
3. **Tavily MCP** (`tavily_search`, `tavily_research`) - broad web search
4. **WebSearch** - fallback for general queries

For citation verification: cross-check DOIs via `https://api.crossref.org/works/{doi}`

---

## Artifacts Directory

```
bibliography/<slug>/
  01_raw_description.txt
  02_structured_search_goal.txt
  03_search_log.md          (wave-by-wave progress log)
  output/
    <Title_Slug>.md
    <Title_Slug>.bib
```

`<slug>` = lowercase, hyphenated version of the main topic (e.g.,
`pathogen-detection-microscopy`).

---

## Error Handling

- If Semantic Scholar rate-limits: back off, use Exa/Tavily as primary
- If a sub-topic yields <5 papers: broaden terms, try synonyms
- If total papers <30 after all waves: report honestly, suggest the user
  refine the search goal or add sub-topics
- Always tell the user how many papers were found per wave
