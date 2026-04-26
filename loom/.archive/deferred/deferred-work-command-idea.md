---
type: idea
id: deferred-work-command-idea
title: "`loom deferred` — List All Pending Work Across Threads"
status: deferred
created: 2026-04-18
version: 1
tags: [cli, app, productivity, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# `loom deferred` — List All Pending Work Across Threads

## Problem
Deferred steps within plans are easily forgotten because they are buried in individual plan documents. There is no global view of "what work remains" across all threads. This makes project management and prioritization difficult.

## Idea
Introduce a `loom deferred` command that scans all active plans and lists every incomplete step. This provides an instant, accurate snapshot of pending work, derived directly from the source documents.

**Proposed syntax:**
```bash
loom deferred [--json]
```

**Options:**
- `--json`: Output structured data for scripting or VS Code integration.

**Example output:**
```
🧵 Deferred Work

📋 core-engine-plan-001 (status: implementing)
   🔳 Step 3: Implement incremental update functions

📋 link-index-plan-001 (status: active)
   🔳 Step 3: Implement incremental update functions
   🔳 Step 4: Integrate index with VS Code extension
```

## Why Defer
- Core workflow commands (`weave`, `finalize`, `status`) are complete and stable.
- This is a productivity enhancement, not a core requirement.
- The VS Code extension will provide a visual tree view that can also surface this information.

## Open Questions
- Should `deferred` include blocked steps? (Yes, with a `🔒` icon.)
- Should it include steps from `done` plans? (No, those are completed.)

## Next Step
Re‑evaluate after the VS Code extension is stable. Create `deferred-work-command-plan-001.md` when ready.

**Status: Deferred for post‑MVP consideration.**

# CHAT

## AI:
Rafa, that's a significant evolution of the idea. Instead of a static markdown registry that requires manual upkeep, you're envisioning a **dynamic, queryable system** where the CLI and VS Code extension can ask, "What work is deferred?" and get an accurate, real‑time answer directly from the source: the plan documents themselves.

This is a much more robust and "Loom‑native" solution. It aligns perfectly with our philosophy of deriving state from the documents. Here's a design for that feature.

### 🧠 `loom deferred` Command and `app` Use‑Case

We can introduce a new command, `loom deferred`, that scans all plan documents in the active loom, parses their steps tables, and lists any step that is **not marked done** (`✅`) and belongs to a plan that is not `done` or `cancelled`. This gives an immediate, prioritized task list.

**Proposed Output:**
```
🧵 Deferred Work

📋 core-engine-plan-001 (status: implementing)
   🔳 Step 3: Implement incremental update functions
   🔳 Step 4: Integrate index with VS Code extension

📋 link-index-plan-001 (status: active)
   🔳 Step 3: Implement incremental update functions
   🔳 Step 4: Integrate index with VS Code extension
   🔳 Step 7: Add diagnostics for broken links in VS Code
```

### 🧵 Implementation Sketch

1. **`app/src/deferred.ts` use‑case:**
   - Loads all threads and their plans.
   - For each plan with status `draft`, `active`, or `implementing`:
     - Parses the steps table.
     - Collects steps where `done === false`.
   - Returns a structured list.

2. **`cli/src/commands/deferred.ts`:**
   - Thin wrapper that calls `app/deferred` and prints the results.

3. **VS Code Extension:**
   - Could add a "Deferred Work" view in the sidebar, using the same `app` use‑case.

### 📋 Should We Capture This as a Deferred Idea?

Yes, this is a perfect candidate for a deferred idea. It's a valuable productivity feature, but not a blocker for the core workflow. I'll draft `deferred-work-command-idea.md` for `_archive/deferred/`.

