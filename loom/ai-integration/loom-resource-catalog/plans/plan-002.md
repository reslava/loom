---
type: plan
id: pl_01KX0ANQDV1163GM85XY1PZ8Z5
title: loom-resource-catalog Plan
status: done
created: 2026-07-08
updated: 2026-07-08
version: 1
design_version: 1
tags: []
parent_id: de_01KX05QVG0ZQ343932H8E1C2S1
requires_load: []
target_version: 0.1.0
steps:
  - id: audited-the-whole-mcp-surface-for
    order: 1
    status: done
    description: "Audited the whole MCP surface for under-declared entries: tools and prompts cannot hide (catalog + ListTools/ListPrompts both derive from the single TOOLS/PROMPTS arrays, and CallTool/GetPrompt have no out-of-array handlers); docs/plan/requires-load are honest single-form {id} handlers. Found exactly one defect: loom://context served three URI forms but RESOURCE_TEMPLATES declared only loom://context/{docUlid}, hiding the two slug-path forms from both the catalog and every MCP client's ListResourceTemplates."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: fixed-the-root-cause-in-packages
    order: 2
    status: done
    description: "Fixed the root cause in packages/mcp/src/server.ts: declared all three context forms as first-class RESOURCE_TEMPLATES entries — loom://context/{docUlid}, loom://context/thread/{weaveSlug}/{threadSlug}, loom://context/{weaveSlug}/{threadSlug}/{docSlug} — each with a form-identifying first sentence so the catalog's first-sentence render is meaningful per form. Declaration-only: the handler already dispatched all three by prefix, so no handler change."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: added-live-assertions-in-packages-mcp
    order: 3
    status: done
    description: "Added live assertions in packages/mcp/tests/integration.test.ts: loom://catalog now lists all three context forms and the prompts section; loom://catalog?kind=resources returns resources only; ListResourceTemplates advertises all three context forms (the defect regression guard). Verified build-all clean, full test-all green (integration 23 passed), and live `loom catalog resources` shows all three context templates."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# loom-resource-catalog Plan

## Goal

Quick-ship record of 3 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Audited the whole MCP surface for under-declared entries: tools and prompts cannot hide (catalog + ListTools/ListPrompts both derive from the single TOOLS/PROMPTS arrays, and CallTool/GetPrompt have no out-of-array handlers); docs/plan/requires-load are honest single-form {id} handlers. Found exactly one defect: loom://context served three URI forms but RESOURCE_TEMPLATES declared only loom://context/{docUlid}, hiding the two slug-path forms from both the catalog and every MCP client's ListResourceTemplates. | — | — | — |
| ✅ | 2 | Fixed the root cause in packages/mcp/src/server.ts: declared all three context forms as first-class RESOURCE_TEMPLATES entries — loom://context/{docUlid}, loom://context/thread/{weaveSlug}/{threadSlug}, loom://context/{weaveSlug}/{threadSlug}/{docSlug} — each with a form-identifying first sentence so the catalog's first-sentence render is meaningful per form. Declaration-only: the handler already dispatched all three by prefix, so no handler change. | — | — | — |
| ✅ | 3 | Added live assertions in packages/mcp/tests/integration.test.ts: loom://catalog now lists all three context forms and the prompts section; loom://catalog?kind=resources returns resources only; ListResourceTemplates advertises all three context forms (the defect regression guard). Verified build-all clean, full test-all green (integration 23 passed), and live `loom catalog resources` shows all three context templates. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
