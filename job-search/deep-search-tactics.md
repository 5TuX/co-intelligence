# Deep Search Tactics

Loaded by the per-user deep search agent. All queries must be **adapted to each user's profile** — substitute skills, location preferences, and domain interests from their profile.yaml.

**Today's date** must be passed to all search agents for `after:` query construction.

## Agent Self-Refinement

Every search agent MUST spawn sub-agents to refine its strategy:
1. Run initial searches with obvious queries
2. Spawn **TWO refinement sub-agents**:

   **Sub-agent A (gap analysis):** Analyzes what initial results miss (gaps in geography, domain, seniority). Generates 3-5 alternative query reformulations. Returns only net-new results.

   **Sub-agent B (non-obvious strategies):** Uses tactics H1-H6 below. Constructs composite queries combining ALL operators. Looks for informal hiring posts, recently-funded startups, conference back-channels. Tests non-English queries for bilingual regions. Searches for companies the user would love but hasn't heard of.

3. Merge all result sets before returning

**Conditional refinement:** If initial results yield fewer than 5 offers, always spawn refinement sub-agents. If initial results are plentiful (15+), refinement is optional.

## Output Format

All agents must return results as a list of objects:
```json
{"role": "...", "company": "...", "url": "...", "location": "...", "domain": "...", "source": "...", "notes": "..."}
```

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

**Negative keywords** — read user's Direction.md for seniority, then exclude mismatches:
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
Also search: `site:recruitee.com`, `site:jobs.personio.de`, `site:apply.jazz.co`, `site:careers-page.com`
