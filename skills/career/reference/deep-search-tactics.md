# Deep Search Tactics

Loaded by the per-user deep search agent. All queries must be **adapted to each user's profile** — substitute skills, location preferences, and domain interests from their profile.yaml.

**Today's date** must be passed to all search agents for `after:` query construction.

## Output Format

All agents must return results using the standard format from `reference/search-agents.md`:
```json
[{"role": "...", "company": "...", "url": "...", "location": "...", "domain": "...", "level": "...", "salary": "...", "mission": "...", "tools": "...", "source": "...", "notes": "..."}]
```
See `reference/search-agents.md` for field guidelines (`level`, `salary`, `mission`, `tools` formatting).

## Mandatory Execution Rules

The deep search agent MUST execute tactics from **every section** (A through J) each run. Skipping G-J is not acceptable.

**Minimum per run:**
- Sections A-F: at least 1 query each (adapt to user profile)
- Section G: at least 3 of G1-G6 (rotate which ones each run)
- Section H: at least 2 lesser-known ATS platforms
- Section I: at least 2 community/social queries
- Section J: at least 2 ecosystem/funding queries

**In Novelty-Zero Mode** (defined in reference/search-agents.md):
- Section G: ALL of G1-G6 must be executed
- Section H: ALL listed ATS platforms must be searched
- Section I: ALL of I1-I5 must be executed
- Section J: ALL of J1-J5 must be executed

---

## Tactics

### A) Google Forums (udm=8)
Search forums/discussions for hiring posts on Reddit, HN, Discord.
Pattern: `google.com/search?udm=8&q="<skill>"+"hiring"+"<location>"+OR+"remote"`
Also try: `"who is hiring" "<skill>" <current-year>`

### B) ATS X-ray
Search ATS platforms directly with composite queries:
```
site:<domain> ("<skill-1>" OR "<skill-2>") ("<location>" OR "remote") after:<30d-ago> -"<exclusions>"
```

**ATS domains:** boards.greenhouse.io, jobs.lever.co, jobs.ashbyhq.com, jobs.smartrecruiters.com, wd1.myworkdayjobs.com, careers.icims.com, apply.workable.com, recruitee.com, jobs.personio.de, apply.jazz.co

**Negative keywords** — read user's goals.md for seniority, then exclude mismatches:
- Always: `-"director" -"VP" -"head of" -"chief"`
- If experienced: `-"intern" -"stage" -"stagiaire"`
- From ethical_filter.exclude: `-"consulting" -"consultant"` etc.

### C) Company career page dorking
```
site:.<country-tld> inurl:"careers" OR inurl:"recrutement" "<skill>"
intitle:"we are hiring" "<skill>" "<location>"
```
Include French variants: `intitle:"recrutement" OR intitle:"offre d'emploi"`

### D) Hidden document search
```
filetype:pdf "job description" "<skill>" "<location>" OR "remote"
filetype:pdf intitle:"offre" OR intitle:"poste" "<skill>"
```

### E) Domain-specific searches
For each domain in user's `ethical_filter.prioritize`, combine domain keywords with user skills and locations:
```
"<domain-keyword>" "<skill>" "<location>" "hiring" OR "vacancy"
```
Also check: `site:euraxess.ec.europa.eu`, `site:jobs.ac.uk`

### F) Temporal filtering
Always append `after:YYYY-MM-DD` (30 days ago) to Google searches.

### G) Subtle & non-obvious strategies

**G1) Invisible jobs** — roles not formally posted:
```
"looking for" OR "looking to hire" "<skill>" "<location>" site:linkedin.com OR site:x.com
"join our team" "<skill>" "<location>" after:<30d-ago>
```

**G2) Salary signals** — funded, serious roles:
```
"<skill>" ("€" OR "salary") "<location>" "hiring" after:<30d-ago>
```

**G3) Funding signals** — recently funded startups hiring aggressively:
```
("series A" OR "series B" OR "raised") "<skill>" "<location>" "hiring" after:<30d-ago>
```

**G4) Conference back-channels:**
```
"<relevant-conference>" "hiring" "<location>" after:<30d-ago>
```

**G5) Competitor search** — when you find a good company: `related:<company-url>`

**G6) Non-English variants** — for bilingual regions:
```
"poste" OR "recrutement" "<skill-french>" "<city-french>"
"Stellenangebot" "<skill-german>" "<city-german>"
```

### H) Lesser-known ATS platforms
Also search: `site:recruitee.com`, `site:jobs.personio.de`, `site:apply.jazz.co`, `site:careers-page.com`, `site:jobs.smartrecruiters.com`, `site:wd1.myworkdayjobs.com`, `site:careers.icims.com`

### I) Community & social media dorking

**I1) Reddit hiring threads:**
```
site:reddit.com/r/MachineLearning "hiring" OR "[H]" "<skill>" after:<30d>
site:reddit.com/r/MLjobs "<skill>" "<location>" after:<30d>
site:reddit.com/r/cscareerquestionsEU "<skill>" France OR remote after:<30d>
```

**I2) HN Who is Hiring (deep search within thread):**
Use Algolia HN API to search within the current month's "Who is Hiring" comments:
```
hn.algolia.com/api/v1/search?tags=comment&query="<skill>" AND ("<location>" OR "remote" OR "Europe")&numericFilters=created_at_i>UNIX_TIMESTAMP_30D_AGO
```
Also check: hnhiring.com for filterable view.

**I3) LinkedIn posts (not job listings):**
```
site:linkedin.com/posts "<skill>" "hiring" OR "looking for" "<location>" after:<30d>
site:linkedin.com/pulse "hiring" "<skill>" after:<90d>
```

**I4) Twitter/X hiring posts:**
```
site:x.com "hiring" "<skill>" "<location>" after:<30d>
site:x.com "join our team" OR "we're hiring" "<skill>" after:<30d>
```

**I5) Discord/community leaks:**
```
site:discord.com "<skill>" "hiring" OR "job" OR "position" after:<30d>
"<skill>" "job" OR "hiring" site:datatalks.club OR site:mlops.community
```

### J) Ecosystem & funding intelligence

**J1) French tech ecosystem:**
```
site:stationf.co OR site:lafrenchtech.com "<skill>" "hiring" OR "recrutement"
site:sifted.eu "raised" "<domain>" France 2026
site:dealroom.co "<domain>" France "series"
```

**J2) VC portfolio mining** — check portfolio pages of VCs active in user's domain:
```
site:jobs.accel.com OR site:jobs.indexventures.com "<skill>"
```
For each company found, navigate to their careers page directly.

**J3) Conference hiring boards:**
```
"<relevant-conference-2026>" "hiring" OR "job" OR "career"
```
Current relevant conferences: PyTorch Conference Europe (Apr 2026), ICML 2026, NeurIPS 2026, MICCAI 2026, CVPR 2026. Check sponsor/exhibitor pages for hiring companies.

**J4) GitHub/open-source hiring signals:**
```
"<company-name>" site:github.com "hiring" OR "careers" OR "join us"
```
Companies actively hiring often mention it in their README or CONTRIBUTING files.

**J5) Google Scholar → hiring pipeline:**
Search for recent papers by companies in user's domain, then check if those teams are hiring:
```
site:scholar.google.com "<company>" "<domain>" 2025 OR 2026
```
Teams that publish are usually growing.

---

### K) Direct Job Board Browsing via Playwright (HIGHEST PRIORITY)

**This tactic is 15x more efficient than Google dorking.** Use it FIRST, before any web search queries.

Google dorking (`site:welcometothejungle.com ...`) returns ~5-10 results per query, often duplicates or aggregator pages. Browsing job boards directly with Playwright yields 30+ specific listings per page with built-in filters.

**K1) WTTJ Playwright browsing (primary tactic):**

WTTJ has 300+ "machine learning" CDI results in France alone. Browse multiple search queries:

```
# Navigate to WTTJ search with CDI + France filters
https://www.welcometothejungle.com/fr/jobs?query=<QUERY>&page=<N>&aroundQuery=France&refinementList%5Bcontract_type%5D%5B%5D=full_time&refinementList%5Boffice.country_code%5D%5B%5D=FR
```

Queries to run (each has 20-50+ pages of results):
1. `machine+learning` (343 results)
2. `data+scientist` (500+ results)
3. `ingénieur+IA` (200+ results)
4. `deep+learning` (100+ results)
5. `NLP+LLM` (50+ results)
6. `computer+vision` (50+ results)
7. `PyTorch` (30+ results)
8. `MLOps` (30+ results)

Extract all job listing links using JS:
```javascript
// Run via Playwright browser_evaluate
() => {
  const links = document.querySelectorAll('a[href*="/companies/"][href*="/jobs/"]');
  const results = [];
  const seen = new Set();
  for (const link of links) {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();
    if (href && href.includes('/jobs/') && text.length > 5 && !seen.has(href)) {
      seen.add(href);
      results.push({ text: text.substring(0, 120), href });
    }
  }
  return results;
}
```

Filter known companies in-browser by maintaining a skip set of company slugs:
```javascript
const skip = new Set(['company-slug-1', 'company-slug-2', ...]);
// Extract company slug: href.match(/\/companies\/([^/]+)\//)[1]
```

Also filter out seniority keywords in-browser:
```javascript
const lower = text.toLowerCase();
if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff') ||
    lower.includes('head') || lower.includes('manager') || lower.includes('director') ||
    lower.includes('principal') || lower.includes('consultant') || lower.includes('stage') ||
    lower.includes('intern') || lower.includes('alternance')) continue;
```

**K2) Efficiency data from empirical testing (run 17, 2026-04-01):**

| Method | Queries/pages | Valid offers found | Efficiency |
|--------|-------------|-------------------|------------|
| Google dorking (WebSearch) | 150+ queries | 51 offers | 0.34/query |
| Tavily search | 3 queries | 0 new | 0/query |
| Exa neural search | 1 query | 0 new | 0/query |
| **Playwright WTTJ browsing** | **7 page loads** | **20 offers** | **2.9/page** |

**Playwright is the primary search method. Use Google dorking only for non-WTTJ sources (Indeed, ATS platforms, government portals).**

**K3) Consulting firm skip list (France):**

These are ESN/SSII/consulting firms that appear frequently in WTTJ ML searches. ALWAYS skip:
```
margo, atos, nexton-consulting, step-consulting, theodo, sicara, cgi, saegus,
octo-technology, artefact, capgemini, capgemini-invent, bureaudestalents,
klint-consulting, kanbios, exalt, mews-partners, deloitte, ey, meritis, sii,
open, square-management, polynom, webnet, converteo, keyrus, hubvisory,
boston-consulting-group, the-adecco-group, okuden, sopra-steria, alten,
altran, devoteam, tata-consultancy-services, accenture, bearing-point
```

**K4) Indeed France URLs are unreliable:**

Indeed `fr.indeed.com/viewjob?jk=...` URLs return 403 on automated validation. Do NOT rely on Indeed as a primary source. Use only as supplementary and note links are unvalidated.

**K5) Best non-WTTJ sources (by yield):**

1. **INRIA** (jobs.inria.fr) - 5+ research engineer CDI roles, specific URLs
2. **Government portals** (choisirleservicepublic.gouv.fr) - Public sector AI roles
3. **Ashby** (jobs.ashbyhq.com) - Startups, specific UUID URLs
4. **Institut Pasteur** (research.pasteur.fr) - Healthcare research CDI
5. **Station F** (jobs.stationf.co) - French startup ecosystem
6. **Lever** (jobs.lever.co) - Mostly senior, low junior yield
7. **Greenhouse** (boards.greenhouse.io) - Mostly senior, low junior yield
