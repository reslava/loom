---
type: plan
id: pl_01KRTB3J2BY6EEGKH330HY9V5P
title: vsix body-builder fixes
status: done
created: 2026-05-17
updated: 2026-05-17
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 0.6.5
steps:
  - id: remove-from-ideabody
    order: 1
    status: done
    description: "Remove `# ${title}` from ideaBody.ts, designBody.ts, planBody.ts, ctxBody.ts — start each body with `\\n` instead so saveDoc produces a blank line after `---`"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: remove-done-plandoc
    order: 2
    status: done
    description: "Remove `# Done — ${planDoc.title}` preamble from appendDone.ts — pass empty preamble and prepend `\\n` to new-doc content"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: build-all-packages-with
    order: 3
    status: done
    description: Build all packages with `./scripts/build-all.sh` and verify new docs (idea, design, plan, ctx, done) have no title heading and have one blank line after frontmatter
    files_touched: []
    blocked_by: []
    satisfies: []
---
# vsix body-builder fixes

| | |
|---|---|
| **Created** | 2026-05-17 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Remove `# Title` headers from all doc body generators (frontmatter title is the only source of truth) and ensure exactly one blank line between the frontmatter `---` close and the first body line.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Remove `# ${title}` from ideaBody.ts, designBody.ts, planBody.ts, ctxBody.ts — start each body with `\n` instead so saveDoc produces a blank line after `---` | — | — | — |
| ✅ | 2 | Remove `# Done — ${planDoc.title}` preamble from appendDone.ts — pass empty preamble and prepend `\n` to new-doc content | — | — | — |
| ✅ | 3 | Build all packages with `./scripts/build-all.sh` and verify new docs (idea, design, plan, ctx, done) have no title heading and have one blank line after frontmatter | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
