---
type: design
id: load-when-design
title: "Reference Context Filtering by Operation Mode (load_when)"
status: active
created: 2026-04-23
version: 1
tags: [reference, ai, context, frontmatter, load_when]
parent_id: null
child_ids: []
requires_load: [reference-load-context-design]
---

# Reference Context Filtering by Operation Mode (`load_when`)

## Relationship to `reference-load-context-design`

`reference-load-context-design` introduced `load: always | by-request` — whether a reference is
automatically included or only loaded on explicit `requires_load`. This design adds a second axis:
**when** (by operation mode). Both fields compose:

- `load: always` + `load_when: [implementing]` → auto-included, but only during step execution
- `load: always` (no `load_when`) → auto-included in all modes (existing behavior, unchanged)
- `load: by-request` → `requires_load` still required; `load_when` has no effect

## Problem

A reference doc like `fs-extra-esm-reference` is only relevant when writing test code. Including it
during `loom weave-design` (design generation) wastes tokens and dilutes context. Conversely, an
architectural ADR should be present during design but is noise during step implementation.

The existing `load: always` flag is binary — it cannot express "always, but only in this mode."

## Proposed Design

### New Frontmatter Field

```yaml
load_when: [idea, design, plan, implementing]
```

| Value | Operation | Triggered by |
|---|---|---|
| `idea` | AI generates a new idea | `loom weave-idea` |
| `design` | AI generates or refines a design | `loom weave-design`, `loom refine-design` |
| `plan` | AI generates a plan | `loom weave-plan` |
| `implementing` | AI assists with step execution | `loom do-step` |

An empty or absent `load_when` means **all modes** (same as specifying all four values).

### Full Frontmatter Example

```yaml
---
type: reference
id: fs-extra-esm-reference
title: "fs-extra ESM Import Behaviour in ts-node Tests"
load: always
load_when: [implementing]
---
```

```yaml
---
type: reference
id: architecture-adr
title: "Core Architecture Decisions"
load: always
load_when: [design, plan]
---
```

### Enforcement

`load_when` is **enforced by Loom** at context assembly time, not by the AI. The AI receives only
the filtered set. Steps:

1. Loom determines the current operation mode from the invoked command.
2. During `getAIContext(doc, mode)`, collect reference candidates (`load: always` refs in scope).
3. Filter: include only those whose `load_when` contains `mode` (or those with no `load_when`).
4. Append `requires_load` docs (always included regardless of mode).

### VS Code Integration

- Reference docs appear in the tree view under a `References` section for each weave.
- The `load_when` values are shown as tags in the reference node tooltip.
- `requires_load` autocomplete in the frontmatter editor lists document IDs from the weave index.
  Filling it by ID (no `.md` suffix) is already the convention.

## Backward Compatibility

- Documents without `load_when` behave as before.
- `load: by-request` docs are unaffected — they only load via `requires_load`.
- No migration needed.

## Open Questions

1. Should `load_when` also apply to `load: by-request` docs (i.e., filter even explicitly loaded
   docs)? Recommendation: no — if a doc is in `requires_load`, the author explicitly wanted it.
2. Should the VS Code UX allow editing `load_when` via a QuickPick? Defer to post-MVP.

## Next Steps

- Create `load-when-plan-001.md` to implement: entity field, context assembly filtering, VS Code tree label.
