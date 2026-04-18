| Step | Action | Estimated Time |
|------|--------|----------------|
| 1 | **Create a clean branch** `docs/final-vocabulary-alignment`. | 1 min |
| 2 | **Update global references** (`README.md`, `references/*.md`) to use final terminology and directory paths. | 30 min |
| 3 | **Update all design documents** in `features/*/` to correct frontmatter `id`s (kebab-case, `loom-*`), `parent_id`/`child_ids`, and body content (replace `wf` with `loom`, `feature` with `thread`, etc.). | 1-2 hours |
| 4 | **Update all plan documents** similarly. | 1 hour |
| 5 | **Update templates** in `.loom/templates/` to reflect final structure. | 30 min |
| 6 | **Rename directories** to match final structure (e.g., `features/` → `threads/` if you decide; but note: MVP keeps `features` for now? Let's decide.) | 10 min |
| 7 | **Verify all internal links** (e.g., `requires_load: [references/cli-commands-reference.md]`). | 30 min |
| 8 | **Commit with a clear message**: `docs: align all documentation with REslava Loom vocabulary and structure`. | 1 min |