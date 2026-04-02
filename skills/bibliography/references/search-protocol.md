# Deep Search Protocol

## Overview

Iterative search inspired by Undermind's successive refinement. Each wave
adapts based on what previous waves discovered. The main agent orchestrates
all waves and makes all inclusion decisions.

## Wave 0: Anchor Search

**Objective**: Find the papers closest to the user's exact work.

### 0a. User's Own Work
If the user provided names, institution, or project details:
```
Semantic Scholar: author search or keyword search with user's name
Exa: "<user's project name> <institution>" category: "research paper"
```

### 0b. Direct Problem Match
Search for the EXACT problem statement, not sub-topics:
```
Semantic Scholar: query = the core problem in one sentence
Exa: natural language description of the exact system
```

### 0c. Seed from Existing Bibliography
If the user provided a .bib file, look up each entry in Semantic Scholar
to get paper IDs for citation expansion.

**Target**: 5-15 anchor papers scoring 0.9-1.0.

---

## Wave 1: Broad Discovery

**Objective**: Cast a wide net across sub-topics.

### Agent Dispatch

Dispatch 3-5 parallel agents, each covering 2-3 sub-topic clusters.
Each agent executes:

#### 1a. Semantic Scholar Search
```
WebFetch: https://api.semanticscholar.org/graph/v1/paper/search
  ?query=<sub-topic keywords>&limit=100
  &fields=title,abstract,authors,year,venue,citationCount,externalIds,url,publicationDate,journal
```
Try 2-3 query formulations per sub-topic.

#### 1b. Exa Neural Search
```
web_search_exa:
  query: "<natural language sub-topic description>"
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

### Quality Gate (applied to ALL waves)

Reject immediately:
- Blog posts, tutorials, documentation pages
- Software READMEs or GitHub repositories (without associated paper)
- News articles, press releases
- Theses/dissertations (unless >50 citations)
- Papers with no title or no abstract available

Accept only:
- Peer-reviewed journal articles
- Conference proceedings (named conferences)
- Preprints on arXiv, bioRxiv, medRxiv, SSRN

### Relevance Scoring

For each candidate, the MAIN AGENT (not sub-agent) reads title + abstract
and classifies:

- **1.0**: The user's exact problem or their own published work
- **0.9**: Directly addresses the core problem with the same methods
- **0.8**: Closely related - same domain, overlapping methods
- **0.7**: Key methodology applied to similar problems
- **0.6**: Supporting methodology or adjacent domain
- **0.5**: Foundational method paper (seminal, not domain-specific)
- **Below 0.5**: Exclude

**The test**: "Would a domain expert include this in a focused bibliography
on this exact topic?" If uncertain, exclude.

**Target**: 40-80 unique papers after Wave 1.

---

## Wave 1.5: Author Hub Mining

**Objective**: Expand from author clusters discovered in Wave 1, before
citation traversal dilutes signal. This is the highest-precision discovery
method and must run early.

**Timing**: Execute immediately after Wave 1 completion, BEFORE gap analysis.

### 1.5a. Author Identification

Scan all papers scoring >= 0.8 from Wave 0 + Wave 1:

1. For each **first-author** appearing **2+ times**: flag as "hub author"
2. For each **co-author** appearing **3+ times**: flag as "key collaborator"
3. Cluster flagged authors by institution when possible

### 1.5b. Fetch Author Publication Lists

For each hub author and key collaborator:
```
Semantic Scholar: /author/{id}/papers?limit=500
  &fields=title,abstract,authors,year,venue,citationCount,externalIds,url
```

Return ALL papers by that author (not just recent). Resolve author ID from
the discovered papers' author metadata.

If Semantic Scholar is rate-limited, use Exa:
```
web_search_exa:
  query: "<author name> <institution> research papers"
  numResults: 30
  type: "auto"
```

### 1.5c. Score Author's Papers

For EACH paper returned:
1. Apply quality gate (peer-reviewed, not documentation/README)
2. Main agent scores relevance against search goal (0.0-1.0)
3. **Accept if >= 0.6** (papers by hub authors in the same domain have
   high base-rate relevance)

### 1.5d. Research Family Expansion

For hub-author papers scoring **0.85+**, also fetch their forward citations
(papers that cite them):
```
Semantic Scholar: /paper/{id}/citations?limit=200&fields=...
```
Score discovered papers at >= 0.7 threshold.

**Rationale**: If a researcher published 7 papers on bacterial motility
analysis and you found 2 to be highly relevant, the other 5 have >90%
probability of >= 0.6 relevance. Following their citation network catches
the broader research community working on the same problems.

**Target**: 5-25 additional unique papers from author hub mining.

---

## Gap Analysis (between waves)

After Wave 1 completes, the MAIN AGENT:

1. **Count papers per sub-topic.** Flag any sub-topic with <3 papers.
2. **Extract new terminology** from abstracts of top-10 papers that wasn't
   in the original search goal. These become additional queries.
3. **Identify alternative methods** mentioned in related work sections
   of top papers. Add as new sub-topics if missing.
4. **Check for missing foundational papers.** If the bibliography covers
   a method (e.g., MIL) but lacks the seminal paper, add it.

This gap analysis drives Wave 2 queries. Do NOT pre-plan Wave 2.

---

## Wave 2: Citation Graph + Enhanced Traversal

**Objective**: Expand from the best papers with multi-hop depth and fill
identified gaps.

### 2a. Citation Expansion from 0.9+ Papers

Expand citation graphs from papers scoring **0.9+** across Waves 0-1.5
(typically 8-15 seed papers).

For each seed:

#### 2a-i. Backward Citations (References)
```
Semantic Scholar: /paper/{id}/references?limit=500&fields=...
```
Score each reference: keep >= 0.7.

#### 2a-ii. Forward Citations (Cited-by)
```
Semantic Scholar: /paper/{id}/citations?limit=500&fields=...
```
Score each citation: keep >= 0.7.

#### 2a-iii. Multi-hop References (for 0.95+ papers only)

For papers scoring **0.95+**, fetch references of their highest-scoring
references. This catches foundational papers 2 hops back:

```
For each reference R of the 0.95+ seed that scores >= 0.85:
  Fetch /paper/{R.id}/references (limit 100)
  Score each at >= 0.75 threshold
```

**Example**: A 0.95 paper on bacterial tracking cites Darnton (2006) which
cites Berg & Brown (1972). Multi-hop finds Berg & Brown even though the
0.95 paper doesn't cite it directly.

### 2a-iv. Citation Expansion from 0.8-0.89 Papers

Papers scoring 0.8-0.89 also warrant expansion, but with stricter filtering:
```
For papers 0.8-0.89:
  Fetch /paper/{id}/citations (forward only - newer work is higher signal)
  Score each at >= 0.8 threshold (tighter than 2a)
```

**Rationale**: A paper applying your method to a close variant (0.8) often
leads to papers applying that variant back to your exact problem (0.9+).

### 2b. Gap-Filling Searches

For each sub-topic with <3 papers from Wave 1:
- Try broadened search terms
- Try alternative method names from gap analysis
- Try venue-specific searches in top journals identified

### 2c. New Terminology Searches

Using terms discovered during gap analysis, run additional Semantic Scholar
and Exa searches.

**Target**: 20-50 additional unique papers.

---

## Wave 2.5: Application Analog Search

**Objective**: Find papers solving the SAME technical problem in different
application domains that use different keywords.

**Timing**: After Wave 2 citation expansion.

### 2.5a. Problem Deconstruction

From the top 10 papers (0.9+ relevance), extract the TECHNICAL PROBLEM
independent of the application domain:

**Example transformation:**
- Input: "Pathogen detection from microscopy trajectories"
- Deconstruction:
  - Core problem: Track small moving objects in low-SNR video and classify
    them by motion patterns
  - Constraint: Real-time or near-real-time, low-cost hardware
  - Input: Raw video, low frame rate, label-free
  - Output: Binary classification (pathogen vs. inert/normal)

### 2.5b. Identify Cross-Domain Analogs

For each technical constraint, identify 3-5 other domains solving it:

| Core Problem | Analog Domains |
|---|---|
| Track small objects in liquid video | Urinalysis, water quality, milk inspection, pharma QC |
| Classify objects by motion pattern | Sperm motility assessment, plankton classification, nanoparticle characterization |
| Binary screening from video | Industrial defect detection, environmental monitoring |

### 2.5c. Execute Analog Searches

For each analog domain, run targeted searches:
```
Semantic Scholar: "<technical problem keywords> <analog domain>"
Exa: "<analog domain> + <core method keyword>"
```

Score at >= 0.7 if the technical approach is identical, even if the
application domain is completely different.

**Target**: 5-15 papers from cross-domain analogs.

---

## Wave 2.6: Venue Mining

**Objective**: Systematically search journals and conferences that published
the most relevant papers found so far.

### 2.6a. Venue Identification

From all papers scoring 0.9+, extract their venue (journal or conference).
Rank venues by frequency.

### 2.6b. Venue-Specific Searches

For each venue appearing **2+ times** in the 0.9+ set:
```
Semantic Scholar: query="<sub-topic keywords>" venue:"<Journal Name>"
Exa: query="<sub-topic keywords> site:<journal-url>"
Tavily: query="<keywords>" include_domains: ["<journal-domain>"]
```

Try 2-3 keyword formulations per venue.

### 2.6c. Score and Retain

Score papers found via venue search at >= 0.6 threshold (venue filtering
is itself a relevance signal).

**Target**: 5-10 papers from venue-specific searches.

---

## Wave 3: Foundational Chain + Recency

**Objective**: Trace seminal papers via backward chains and ensure recency.

### 3a. Foundational Paper Chain

For each major method represented in the bibliography (tracking, ML
classification, segmentation, diffusion analysis, etc.):

1. Take the **oldest high-quality paper** on that method in your collection
2. Scan its references for the **method origination paper** (the seminal
   work that introduced the technique, often cited in the introduction)
3. Fetch that paper, score at >= 0.5 (foundational papers may have lower
   direct relevance but are necessary for context)
4. **One more hop back**: scan the foundational paper's references for the
   field-defining work (e.g., Berg 1971 "How to track bacteria")

**Example**: Your bibliography has modern Kalman filter tracking papers.
Trace back to find SORT (Bewley 2016), then Berg & Brown 1972 (bacterial
3D tracking), then Berg 1971 (instrumentation).

### 3b. Recency Check
Dedicated search for papers from last 12 months:
```
Semantic Scholar: &year=<current-1>-<current>
Exa: "recent publications on <topic> 2025 2026"
```

### 3c. Researcher Recency Check

For researcher names mentioned in the user's original description, or
hub authors identified in Wave 1.5:
```
Semantic Scholar: author="<Name>" year>=<currentYear-2>
```

Check if they published anything very recent that Wave 1.5 might have
missed due to indexing lag.

**Target**: 5-15 additional unique papers.

---

## Convergence

Track **discovery rate** per wave: new relevant papers / total candidates
evaluated.

Typical discovery rates:
- Wave 0: anchor (5-15 papers)
- Wave 1: 20-40% (broad net, 40-80 papers)
- Wave 1.5: 15-25% (author hubs, 5-25 papers)
- Wave 2: 10-20% (citation graph, 20-50 papers)
- Wave 2.5: 5-15% (application analogs, 5-15 papers)
- Wave 2.6: 5-10% (venue mining, 5-10 papers)
- Wave 3: 3-8% (foundational chain + recency, 5-15 papers)

### Exhaustiveness Estimation

**Stop when ANY of these conditions is met:**

1. **Saturation**: Discovery rate drops below 3% for 2 consecutive waves
2. **Target reached**: 80+ unique papers at >= 0.6 relevance
3. **Diminishing returns**: Last wave yielded < 3 new papers
4. **Wave limit**: 4+ content waves completed (not counting Wave 0)

### Cross-check (optional, if time allows)

Run 1-2 alternate searches with different phrasing of the core problem.
Compare candidate sets: papers found by both paths have high confidence;
papers found by only one path should be manually verified.

### Report to User

After each wave, report:
```
Completed Wave [N]. Discovery rate: [X]%.
Papers found: [total] unique ([new] new this wave).
Recommendation: [CONTINUE / STOP - diminishing returns].
```

---

## Assembly

The MAIN AGENT performs assembly (never delegate to a sub-agent):

### Deduplication
1. Match by DOI (exact, case-insensitive)
2. Fuzzy title match (>85% similarity after lowercasing)
3. Keep entry with richest metadata when duplicates found
4. Remove papers already in user's existing bibliography

### Final Curation
Re-read every paper's title + abstract. Remove any that:
- Are off-topic (entered via citation chaining drift)
- Are not actual papers (quality gate)
- Score below 0.6 on re-evaluation

### Topic Assignment
Assign each paper to the best-fitting sub-topic. A paper may only belong
to one topic. Merge thin topics (<3 papers). Target: 8-12 final topics.

### Ranking
Within each topic, sort by:
1. Relevance score (primary)
2. Citations per year (secondary)
3. Recency (tertiary)

### Cutoff
Keep top 100 papers (or fewer if search didn't yield enough).
Ensure each topic has at least 2 papers.
