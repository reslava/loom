---
type: design
id: reference-load-context-design
title: "Reference Document Context Loading Control"
status: active
created: 2026-04-21
version: 1
tags: [reference, ai, context, frontmatter]
parent_id: null
child_ids: []
requires_load: []
---

# Reference Document Context Loading Control

## Goal

Provide users with fine‑grained control over which reference documents are automatically included in the AI context. This prevents context bloat from large or infrequently needed references while ensuring critical guidance (like style guides or architectural decision records) is always available.

## Context

Loom currently supports two types of references:
- **Global references** (`references/` at the loom root)
- **Thread‑local references** (`references/` inside a thread folder)

By default, these references are **not** automatically loaded into the AI context. They must be explicitly listed in a document's `requires_load` field. This is safe but can be tedious for references that should *always* inform the AI when working on a thread.

This design introduces a `load` field in reference document frontmatter to specify the loading strategy.

## Proposed Design

### 1. Frontmatter Field

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `load` | `'always' \| 'by-request'` | `'by-request'` | Controls how the reference is loaded into AI context. |

**Example:**
```yaml
---
type: reference
id: style-guide
title: "CSS Style Guide"
load: always
---
```

### 2. Loading Behavior

| `load` Value | Behavior |
| :--- | :--- |
| `always` | The reference is **automatically included** in the AI context whenever working on any document within the same scope (thread or global). |
| `by-request` | The reference is included **only if** its ID appears in the active document's `requires_load` field. |

### 3. Scope Resolution

- **Global references** (`references/` at loom root): If `load: always`, they are included in the context for **all threads** in the loom.
- **Thread‑local references** (`threads/<thread>/references/`): If `load: always`, they are included only when working on documents within **that specific thread**.

### 4. Integration with AI Context Assembly

When the AI client builds the system prompt for a document:

1. **Active document context** (the document being edited) is always included.
2. **`requires_load` documents** are included if their IDs are listed.
3. **Global references with `load: always`** are included.
4. **Thread‑local references with `load: always`** (for the current thread) are included.

The inclusion order respects the existing priority queue (derived state first, then design/plan, then references).

### 5. Backward Compatibility

Existing reference documents without a `load` field default to `'by-request'`, which matches the current behavior (only loaded via `requires_load`). No migration is required.

## Implementation Notes

- **`getState` / AI context assembly:** The context builder must scan the global `references/` directory and the current thread's `references/` directory for documents with `load: always`.
- **Performance:** Scanning two directories and reading frontmatter is lightweight. For large workspaces, this can be cached in the `LinkIndex`.
- **Token budget:** References loaded via `always` count toward the token budget. The existing truncation strategy applies.

## Benefits

| Benefit | Description |
| :--- | :--- |
| **Prevents Context Bloat** | Large or infrequently needed references are loaded only on request. |
| **Ensures Critical Guidance** | Style guides, ADRs, and coding standards are always present. |
| **Simple Mental Model** | Two clear options: "always there" or "ask for it." |
| **Backward Compatible** | Existing references behave exactly as before. |

## Trade‑offs

| Concern | Mitigation |
| :--- | :--- |
| **Token budget consumption** | Users can mark only essential references as `always`. The token budget warning and truncation still apply. |
| **Discoverability of `always` references** | The VS Code tree view can show a special icon (e.g., 📌) for references with `load: always`. |

## Open Questions

- Should `load: always` references be loaded for **all** AI modes (Chat, Action) or only Chat Mode? (Recommendation: both, but Action Mode already excludes `requires_load` by default; `always` could be treated similarly or always included—let's decide during implementation.)
- Should there be a `load: never` option to explicitly exclude a reference even if listed in `requires_load`? (Defer until user feedback.)

## Decision

Adopt the `load` field with `'always'` and `'by-request'` values. Default to `'by-request'` for backward compatibility. Implement as described.

## Next Steps

- Create `reference-load-context-plan-001.md` for implementation.