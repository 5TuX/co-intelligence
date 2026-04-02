# Deep Search Protocol

## Overview

Three-wave search strategy inspired by Undermind's iterative deep search.
Each wave builds on previous results. The goal is 50-100 unique, highly
relevant papers.

## Wave 1: Broad Discovery

**Objective**: Cast a wide net across multiple sources per sub-topic.

### Agent Dispatch

Dispatch 3-5 parallel agents. Assign each agent a cluster of 2-3 related
sub-topics from the structured search goal.

Each agent executes this sequence:

#### 1a. Semantic Scholar Search
```
WebFetch: https://api.semanticscholar.org/graph/v1/paper/search
  ?query=<sub-topic keywords>
  &limit=100
  &fields=title,abstract,authors,year,venue,citationCount,externalIds,url,publicationDate,journal
```

Extract top results. If >100 results, also try with refined keywords.

#### 1b. Exa Neural Search
```
web_search_exa:
  query: "<natural language description of sub-topic>"
  num_results: 20
  type: "auto"
  category: "research paper"
```

#### 1c. Tavily Search
```
tavily_search:
  query: "<sub-topic> site:scholar.google.com OR site:arxiv.org OR site:pubmed.ncbi.nlm.nih.gov"
  search_depth: "advanced"
  max_results: 20
```

#### 1d. Deduplication and Scoring

For each discovered paper:
- Check if DOI or title already in the collection
- Score relevance (0-1) against the structured search goal:
  - 0.9-1.0: Directly addresses the core problem
  - 0.7-0.8: Addresses a key sub-topic
  - 0.5-0.6: Related methodology or adjacent domain
  - <0.5: Tangential, skip

Each agent returns a JSON array:
```json
[{
  "title": "...",
  "authors": "First Author et al.",
  "year": 2024,
  "venue": "Journal Name",
  "abstract": "...",
  "citationCount": 42,
  "doi": "10.1234/...",
  "semanticScholarId": "...",
  "relevanceScore": 0.85,
  "subtopic": "which sub-topic this addresses"
}]
```

**Target**: 60-120 unique papers after Wave 1.

---

## Wave 2: Citation Graph Expansion

**Objective**: Discover papers that direct search misses by traversing the
citation network.

### Selection

From Wave 1 results, select the **top 20 most relevant papers** (highest
relevance score, preferring those with higher citation counts as they'll have
richer citation graphs).

### Backward Chaining (References)

For each selected paper, fetch its references:
```
WebFetch: https://api.semanticscholar.org/graph/v1/paper/{paperId}/references
  ?fields=title,abstract,authors,year,venue,citationCount,externalIds,url
  &limit=500
```

Score each reference against the structured search goal. Keep those >= 0.6.

### Forward Chaining (Citations)

For each selected paper, fetch papers that cite it:
```
WebFetch: https://api.semanticscholar.org/graph/v1/paper/{paperId}/citations
  ?fields=title,abstract,authors,year,venue,citationCount,externalIds,url
  &limit=500
```

Score and filter similarly.

### Dispatch Pattern

Dispatch 2-3 parallel agents:
- Agent A: backward chaining for papers 1-10
- Agent B: forward chaining for papers 1-10
- Agent C: backward + forward for papers 11-20

**Rate limiting**: Semantic Scholar allows ~1 req/sec without API key.
Insert 1-second delays between requests. Batch where possible using the
batch endpoint: `POST /paper/batch` with `{"ids": [...]}`.

**Target**: 20-50 additional unique papers after dedup.

---

## Wave 3: Targeted Deep Dive

**Objective**: Fill gaps and ensure recency using patterns discovered in
Waves 1-2.

### 3a. Author Mining

Identify authors who appear 3+ times in the collection. Fetch their recent
papers:
```
WebFetch: https://api.semanticscholar.org/graph/v1/author/{authorId}/papers
  ?fields=title,abstract,year,venue,citationCount,externalIds
  &limit=100
```

Score and filter against the search goal.

### 3b. Venue Mining

Identify top venues (journals/conferences) appearing frequently. Search
for recent papers in those venues on the topic:
```
Semantic Scholar search with venue filter
Exa search: "<topic> site:<venue-url>"
```

### 3c. Keyword Expansion

Extract new terms from abstracts of the top papers that weren't in the
original search goal. Run additional Semantic Scholar searches with these
expanded keywords.

### 3d. Recency Check

Dedicated search for papers from the last 12 months:
```
Semantic Scholar: &year=2025-2026
Exa: recent publications on <topic>
arXiv search for recent preprints
```

**Target**: 10-30 additional unique papers.

---

## Adaptive Convergence (Undermind-inspired)

After each wave, compute the **discovery rate**: new unique relevant papers
found divided by total papers evaluated. Track across waves:

- Wave 1 discovery rate: typically 30-50% (broad net, many hits)
- Wave 2 discovery rate: typically 10-25% (citation graph, diminishing returns)
- Wave 3 discovery rate: typically 5-15% (targeted fills)

**Convergence rule**: If after Wave 3 the discovery rate is still >15%,
dispatch an additional targeted wave focusing on the sub-topics with the
highest discovery rate. Repeat until rate drops below 10% or 4 total waves
completed.

**Relevance scoring** (LLM-based, inspired by Undermind's 98% accuracy):
For each candidate paper, read its title + abstract and classify against
the structured search goal as:
- **Highly relevant** (0.8-1.0): directly addresses the core problem
- **Closely related** (0.5-0.7): addresses a key sub-topic or method
- **Ignorable** (<0.5): tangential, different domain, wrong methodology

This classification replaces simple keyword matching and is what gives
deep search its edge over Google Scholar keyword results.

---

## Assembly

### Deduplication

1. Group by DOI (exact match)
2. For papers without DOI: fuzzy title match (Levenshtein distance < 0.15)
3. When duplicates found, keep the entry with the richest metadata

### Final Scoring

Re-score all papers against the full structured search goal. Rank by:
1. Relevance score (primary)
2. Citations per year (secondary, for impact)
3. Recency (tertiary, prefer newer papers at equal relevance)

### Topic Assignment

Assign each paper to one of the sub-topics from the structured search goal.
A paper may belong to multiple sub-topics; assign to the best fit.

Regroup sub-topics into 8-12 final topic categories. Merge thin categories
(<3 papers). Create a hierarchical topic breakdown.

### Cutoff

Keep the top 100 papers (or fewer if the search didn't yield that many).
Ensure each topic category has at least 2 papers.

---

## Search Log

Throughout all waves, maintain `03_search_log.md`:

```markdown
# Search Log

## Wave 1 - Broad Discovery
- Started: <timestamp>
- Agents dispatched: <count>
- Sub-topics searched: <list>
- Papers found: <count>
- After dedup: <count>

## Wave 2 - Citation Graph
- Seed papers: <count>
- Backward chaining: <papers found>
- Forward chaining: <papers found>
- New unique papers: <count>

## Wave 3 - Deep Dive
- Authors mined: <list>
- Venues mined: <list>
- Expanded keywords: <list>
- New unique papers: <count>

## Final
- Total unique papers: <count>
- Topic categories: <count>
- Date: <date>
```
