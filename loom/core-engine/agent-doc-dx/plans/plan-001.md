---
type: plan
id: pl_01KT3FN2XQCSPJ58C1ZZ76PP12
title: "resolution-dx: link-index path exposure + suggest-on-miss"
status: done
created: 2026-06-02
updated: 2026-06-02
version: 1
design_version: 4
tags: []
parent_id: de_01KT3FG3M865N54WBT3Z95T20Y
requires_load: []
target_version: 0.1.0
actual_release: 0.8.0
steps:
  - id: fix-loom-link-index-serialization-in
    order: 1
    status: done
    description: "Fix loom://link-index serialization: in packages/mcp/src/resources/linkIndex.ts convert the LinkIndex Maps (byId, documents, bySlug, backlinks, children, parent, stepBlockers) to plain JSON-serializable objects/arrays before stringifying, so the resource emits the real id→path data instead of empty {}. Decide and document the serialized shape (id-keyed objects)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-resolvedocidorthrow-helper-in-packages-fs
    order: 2
    status: done
    description: "Add resolveDocIdOrThrow helper (in packages/fs near findDocumentById): on miss, fuzzy-match the key against the cached link-index byId/bySlug keys and throw 'not found: X — did you mean Y?'. Candidate set comes from the link index, not a fresh FS walk."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: route-the-id-taking-tools-loom
    order: 3
    status: done
    description: Route the id-taking tools (loom_find_doc, loom_update_doc, loom_promote, loom_start_plan via resolveWeaveIdForPlan) through resolveDocIdOrThrow so every id-taking tool inherits suggest-on-miss; remove the bare 'not found' throws.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: resolve-the-plan-id-canonical-form
    order: 4
    status: done
    description: Resolve the plan-id canonical-form open question (semantic {thread}-plan-NNN vs ULID pl_) so suggestions point at the right id form.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: tests-link-index-resource-returns-a
    order: 5
    status: done
    description: "Tests: link-index resource returns a populated id→path map; a wrong-but-close id returns a 'did you mean' suggestion across find_doc/update_doc/start_plan."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# resolution-dx: link-index path exposure + suggest-on-miss

## Goal

Make doc ids resolvable and recoverable from agent sessions: fix loom://link-index serialization so id→path data reaches the wire, and add a centralized suggest-on-miss resolver so a wrong-but-close id names the correct one.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Fix loom://link-index serialization: in packages/mcp/src/resources/linkIndex.ts convert the LinkIndex Maps (byId, documents, bySlug, backlinks, children, parent, stepBlockers) to plain JSON-serializable objects/arrays before stringifying, so the resource emits the real id→path data instead of empty {}. Decide and document the serialized shape (id-keyed objects). | — | — | — |
| ✅ | 2 | Add resolveDocIdOrThrow helper (in packages/fs near findDocumentById): on miss, fuzzy-match the key against the cached link-index byId/bySlug keys and throw 'not found: X — did you mean Y?'. Candidate set comes from the link index, not a fresh FS walk. | — | — | — |
| ✅ | 3 | Route the id-taking tools (loom_find_doc, loom_update_doc, loom_promote, loom_start_plan via resolveWeaveIdForPlan) through resolveDocIdOrThrow so every id-taking tool inherits suggest-on-miss; remove the bare 'not found' throws. | — | — | — |
| ✅ | 4 | Resolve the plan-id canonical-form open question (semantic {thread}-plan-NNN vs ULID pl_) so suggestions point at the right id form. | — | — | — |
| ✅ | 5 | Tests: link-index resource returns a populated id→path map; a wrong-but-close id returns a 'did you mean' suggestion across find_doc/update_doc/start_plan. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
