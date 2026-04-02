# Output Format Specification

## Markdown Bibliography (`<Title_Slug>.md`)

### Header

```markdown
# <Title derived from search goal>

---

**Research Goal:** <Full structured search goal text>

*Found <N> papers - <Month Day, Year>*
```

### Topic Breakdown

```markdown
## Topic Breakdown

**<Main topic title>: <One-sentence description of the overall search theme>**

- *<Sub-topic 1 name>*
- *<Sub-topic 2 name>*
- ...
```

### Paper Catalog Table

```markdown
## Paper Catalog (<N> papers)

|  | Year | Cit/yr | Title | Authors | Journal |
|---:|:--:|:--:|:---|:---|:---|
| 1 | 2025 |  | Title text ([link](https://doi.org/...)) | First Author et al. | Journal Name |
| 2 | 2022 | 4.1 | Title text ([link](https://doi.org/...)) | First Author et al. | Journal Name |
```

**Column rules:**
- `#`: Sequential number, right-aligned
- `Year`: Publication year
- `Cit/yr`: Citations per year (citationCount / years since publication).
  Leave empty if paper is from current year or has 0 citations.
  Round to 1 decimal place.
- `Title`: Full title with DOI link. If no DOI, use Semantic Scholar URL.
- `Authors`: "First Author et al." for 3+ authors. Full names for 1-2 authors.
- `Journal`: Journal or conference short name. Leave empty if unknown.

**Ordering**: Papers are numbered sequentially. Within each topic group,
order by relevance score (descending), then by citations/year (descending).

### Paper Details

After the catalog table, provide detailed entries for each paper:

```markdown
### Paper Details

1\. - 2025\
**Full Paper Title** ([link](https://doi.org/...))\
First Author, Second Author, ... and Last Author\
*Journal Name* - Month Day, Year - N citations

> Abstract text here. Full abstract from Semantic Scholar or the paper.

------------------------------------------------------------------------

2\. - 2022 - 4.1 cit/yr\
**Full Paper Title** ([link](https://doi.org/...))\
First Author, Second Author, ... and Last Author\
*Journal Name* - Month Day, Year - N citations

> Abstract text.

------------------------------------------------------------------------
```

**Detail entry rules:**
- Number matches the catalog table
- Year and cit/yr on the first line
- Full title as bold text with DOI link
- All authors listed (not "et al.")
- Journal in italics, publication date, total citation count
- Abstract as a block quote
- Horizontal rule separator between entries

---

## BibTeX File (`<Title_Slug>.bib`)

### Citation Key Format

`<FirstAuthorSurname3><Year2><Disambiguator>`

- First 3 characters of the first author's surname (capitalized first letter)
- Last 2 digits of the year
- Optional lowercase letter (a, b, c...) if keys collide

Examples: `Per25`, `Zha22c`, `Yu18`, `Bra24b`

### Entry Format

```bibtex
@article{Per25,
  author = {Perronno, Paul and Claudinon, J. and Senin, Carmen and ...},
  title = {Full Title With Proper Capitalization},
  journal = {Journal Name},
  volume = {15},
  pages = {1234-1245},
  year = {2025},
  month = {may},
  doi = {10.1038/...}
}
```

**Entry type rules:**
- `@article` for journal papers
- `@inproceedings` for conference papers (use `booktitle` instead of `journal`)
- `@misc` for preprints (include `eprint` and `archivePrefix` for arXiv)

**Field rules:**
- `author`: Full names in "Surname, Given" format, joined with " and "
- `title`: Wrap acronyms and proper nouns in `{Braces}` to preserve case
- Include `doi` when available
- Include `volume`, `pages` when available
- Omit fields that are unknown (don't fabricate data)

---

## Metadata Verification

Before including any paper in the final output:

1. **Title accuracy**: Must match the source exactly
2. **Author names**: Cross-reference with Semantic Scholar or the paper itself
3. **Year**: Use the published version year, not the preprint date
4. **DOI**: Verify the DOI resolves (spot-check a sample)
5. **Citation count**: Use Semantic Scholar's count (may differ from Google Scholar)

If any field is uncertain, include it but add a note. Never fabricate metadata.
