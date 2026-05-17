---
type: plan
id: pl_01KRTB3J2BY6EEGKH330HY9V5P
title: vsix body-builder fixes
status: done
created: "2026-05-17T00:00:00.000Z"
updated: 2026-05-17
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
---
# Plan — vsix body-builder fixes

| | |
|---|---|
| **Created** | 2026-05-17 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

# Goal

Remove `# Title` headers from all doc body generators (frontmatter title is the only source of truth) and ensure exactly one blank line between the frontmatter `---` close and the first body line.
---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Remove `# ${title}` from ideaBody.ts, designBody.ts, planBody.ts, ctxBody.ts — start each body with `\n` instead so saveDoc produces a blank line after `---` | — | — |
| ✅ | 2 | Remove `# Done — ${planDoc.title}` preamble from appendDone.ts — pass empty preamble and prepend `\n` to new-doc content | — | — |
| ✅ | 3 | Build all packages with `./scripts/build-all.sh` and verify new docs (idea, design, plan, ctx, done) have no title heading and have one blank line after frontmatter | — | — |
---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
