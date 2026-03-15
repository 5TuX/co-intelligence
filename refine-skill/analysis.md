# Skill Analysis Reference

Loaded on demand during Step 2 (Health Check). Not loaded at startup.

## Health Metrics

### Size Thresholds

| Metric | OK | WARN | CRITICAL |
|--------|-----|------|----------|
| SKILL.md chars | <10,000 | 10,000-15,000 | >15,000 (silent truncation) |
| SKILL.md lines | <200 | 200-350 | >350 |
| Estimated tokens | <2,500 | 2,500-3,750 | >3,750 |

Token estimate: `chars / 4` (rough for English prose + code).

### Structural Checks

1. **YAML frontmatter valid**: starts `---`, has `name:` + `description:`, ends `---`.
2. **No brackets in YAML**: search description for `[`, `]`, `{`, `}`. Any = CRITICAL.
3. **Argument parsing present**: if skill takes args, does it document parsing early?
4. **Error handling**: does it handle missing/invalid arguments explicitly?
5. **Verification steps**: count lines with "verify", "confirm", "check", "test", "PASS/FAIL".
6. **Reference file usage**: count "see " or "read " pointing to other files.
7. **Step count**: count `##` action headers.
8. **Mode organization**: if multi-mode, are modes self-contained?
9. **argument-hint completeness**: if skill has `argument-hint` in frontmatter, verify all documented modes/args appear in the hint. This controls the UI hint text shown next to the slash command.

### Quality Dimensions

Score internally 1-5 (don't show to user, use to prioritize suggestions):

- **Conciseness**: low redundancy, no verbose explanations of obvious things
- **Specificity**: clear success criteria, exact formats, concrete alternatives
- **Structure**: logical flow, modes separated, argument parsing first
- **Robustness**: error paths, edge cases, missing file handling
- **Token efficiency**: reference files used, no repeated context
- **Cache friendliness**: stable content in first ~4K chars

### Common Improvement Patterns

| Pattern | When to suggest |
|---------|----------------|
| Extract to reference file | SKILL.md > 150 lines with large static sections |
| Add verification step | No "verify/confirm/check" found |
| Add error handling | No conditional paths for missing args/files |
| Consolidate duplicates | Same concept stated 2+ times |
| Add few-shot example | Abstract rule without concrete format |
| Move volatile content down | Frequently-edited section in first 1K tokens |
| Add disable-model-invocation | Skill shouldn't auto-trigger |
| Remove context: fork | Skill writes files that must persist |
