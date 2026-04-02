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

**<One-sentence description of the overall search theme>**

- *<Sub-topic 1 name>* (N papers)
- *<Sub-topic 2 name>* (N papers)
- ...
```

### Paper Catalog Table

```markdown
## Paper Catalog (<N> papers)

### <Topic 1 Name>

|  | Year | Cit/yr | Title | Authors | Journal |
|---:|:--:|:--:|:---|:---|:---|
| 1 | 2025 |  | Title ([link](https://doi.org/...)) | First Author et al. | Journal |
| 2 | 2022 | 4.1 | Title ([link](https://doi.org/...)) | First Author et al. | Journal |

### <Topic 2 Name>

|  | Year | Cit/yr | Title | Authors | Journal |
|---:|:--:|:--:|:---|:---|:---|
| 3 | 2024 | 2.0 | ...
```

**Column rules:**
- `#`: Sequential number across all topics, right-aligned
- `Year`: Publication year
- `Cit/yr`: citationCount / (currentYear - year + 1). Empty if 0 or
  current year. Round to 1 decimal.
- `Title`: Full title with DOI link. Fallback: Semantic Scholar URL.
- `Authors`: "First Author et al." for 3+ authors. Full names for 1-2.
- `Journal`: Journal or conference short name. Empty if unknown.

**Ordering**: Within each topic, sort by relevance score (desc), then
citations/year (desc). Topic headers separate groups in the table.

### Paper Details

After the catalog, provide detailed entries:

```markdown
### Paper Details

1\. - 2025\
**Full Paper Title** ([link](https://doi.org/...))\
First Author, Second Author, ... and Last Author\
*Journal Name* - Month Day, Year - N citations

> Abstract text here.

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
- Full title as bold with DOI link
- ALL authors listed (not "et al.")
- Journal in italics, publication date, total citation count
- Abstract as block quote
- Horizontal rule separator between entries

---

## BibTeX File (`<Title_Slug>.bib`)

### Citation Key Format

`<Surname3><Year2><Disambiguator>`

Construction:
1. Take the first author's surname
2. Use the first 3 characters, capitalize the first letter
3. Append last 2 digits of the year
4. If key collides with another entry, append lowercase letter (a, b, c...)

Examples:
- Ronneberger 2015 -> `Ron15`
- Zhang 2022 (first) -> `Zha22`
- Zhang 2022 (second) -> `Zha22b`
- Ho 2019 -> `Ho19` (2-char surname, use all of it)
- Yu 2018 -> `Yu18`
- van der Walt 2014 -> `Van14` (use "Van" from "van der Walt")
- De Valen 2016 -> `DeV16`

### Entry Format

```bibtex
@article{Ron15,
  author = {Ronneberger, Olaf and Fischer, Philipp and Brox, Thomas},
  title = {{U-Net}: Convolutional Networks for Biomedical Image Segmentation},
  journal = {Medical Image Computing and Computer-Assisted Intervention},
  year = {2015},
  pages = {234--241},
  doi = {10.1007/978-3-319-24574-4_28}
}
```

**Entry type rules:**
- `@article` for journal papers
- `@inproceedings` for conference papers (use `booktitle` not `journal`)
- `@misc` for preprints (include `eprint` and `archivePrefix` for arXiv)

**Author format**: `Surname, Given` joined with ` and `. List ALL authors.
For 10+ authors, list first 5 then `and others`.

**Field rules:**
- `title`: Wrap acronyms and proper nouns in `{Braces}` to preserve case
- Include `doi` when available
- Include `volume`, `number`, `pages` when available
- Omit fields that are unknown (NEVER fabricate)
- For arXiv preprints: `eprint = {XXXX.XXXXX}`, `archivePrefix = {arXiv}`

---

## Metadata Verification

Before including any paper in the final output:

1. **Title**: Must match source exactly. No paraphrasing.
2. **Authors**: Cross-reference with Semantic Scholar or the paper.
   Never use journal name or "Various authors" as author field.
3. **Year**: Published version year, not preprint date.
4. **DOI**: Verify format is valid (starts with 10.).
5. **Citation count**: Use Semantic Scholar's count.
6. **Venue**: Use the actual journal/conference name, not "PMC" or
   "PubMed Central" (those are repositories, not venues).

If ANY field is uncertain, include what you have but never fabricate.
A paper with title + year + DOI is better than one with fabricated
volume/pages.
