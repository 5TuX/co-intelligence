# New-User Creation (`/career new-user`)

Interactive questionnaire. Ask each question, wait for the answer, then proceed.

**Question 1 — Basics:**
Name, handle (for directory name — lowercase, no spaces).

**Question 2 — Location:**
Current city/country? Preferred locations, ranked? Open to remote? Open to relocation? Any location-specific notes?

**Question 3 — Skills:**
Core technical skills (strong)? Currently learning? Known gaps? Experience level (junior/mid/senior)?

**Question 4 — Domain preferences:**
What sectors excite you? What do you want to avoid?
Show categories as prompts: healthcare, environment, marine, culture, accessibility, public sector, defense, finance, e-commerce, marketing, consulting, education, open source, scientific research, etc.

**Question 5 — Special interests:**
Specific companies, labs, institutions, niche domains to always check?

**Question 6 — Custom sources:**
Job boards or career pages you already check regularly? (Will be added to your personal sources.yaml)

**Question 7 — Career docs:**
Have an existing CV or career document? Paste it or provide a path to import. Otherwise, we'll create skeleton files.

**Question 8 — PhD interest:**
Are you interested in PhD positions? (If yes, academic sources and EURAXESS get higher weight in your searches.)

After collecting answers, auto-generate:
- `DATA_DIR/<handle>/` directory
- `DATA_DIR/<handle>/profile.yaml` (from answers, following the same schema as existing profiles — see `templates/user-template/profile.yaml`)
- `DATA_DIR/<handle>/sources.yaml` (seeded from question 6 answers, or empty with a comment)
- Skeleton career files in `DATA_DIR/<handle>/` (copy from `templates/user-template/` and customize):
  - `goals.md` — with sections for vision, goals, skills inventory (from Q3), roadmap
  - `cv.md` — skeleton with sections to fill, including a strengths section for human expertise
  - `archive.md` — empty template with standard sections
  - `journal.md` — initialized with creation date entry

Confirm to the operator: "Created user '<handle>' with profile and skeleton files. Run `/career <handle>` to start their first search."
