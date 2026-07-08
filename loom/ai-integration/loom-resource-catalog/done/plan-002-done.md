---
type: done
id: pl_01KX0ANQDV1163GM85XY1PZ8Z5-done
title: Done — loom-resource-catalog Plan
status: done
created: 2026-07-08
version: 1
tags: []
parent_id: pl_01KX0ANQDV1163GM85XY1PZ8Z5
requires_load: []
---
# Done — loom-resource-catalog Plan

Quick-shipped — recorded already-completed work:

1. Audited the whole MCP surface for under-declared entries: tools and prompts cannot hide (catalog + ListTools/ListPrompts both derive from the single TOOLS/PROMPTS arrays, and CallTool/GetPrompt have no out-of-array handlers); docs/plan/requires-load are honest single-form {id} handlers. Found exactly one defect: loom://context served three URI forms but RESOURCE_TEMPLATES declared only loom://context/{docUlid}, hiding the two slug-path forms from both the catalog and every MCP client's ListResourceTemplates.
2. Fixed the root cause in packages/mcp/src/server.ts: declared all three context forms as first-class RESOURCE_TEMPLATES entries — loom://context/{docUlid}, loom://context/thread/{weaveSlug}/{threadSlug}, loom://context/{weaveSlug}/{threadSlug}/{docSlug} — each with a form-identifying first sentence so the catalog's first-sentence render is meaningful per form. Declaration-only: the handler already dispatched all three by prefix, so no handler change.
3. Added live assertions in packages/mcp/tests/integration.test.ts: loom://catalog now lists all three context forms and the prompts section; loom://catalog?kind=resources returns resources only; ListResourceTemplates advertises all three context forms (the defect regression guard). Verified build-all clean, full test-all green (integration 23 passed), and live `loom catalog resources` shows all three context templates.
