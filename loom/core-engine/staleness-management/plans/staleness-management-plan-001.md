---
type: plan
id: pl_01KQYDFDDCHD6SEJ0QCBAYJ93Y
title: Staleness Management — MVP Surfacing
status: done
created: "2026-05-05T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 2
design_version: 2
tags: [staleness, vscode, mcp, mvp]
parent_id: de_01KQYDFDDC911HGHRQGZV1ZSCA
requires_load: [rf_01KQYDFDDDYZC0R4XNNX2RASC9]
---

# Staleness Management — Implementation Plan (MVP scope)

## Goal

Surface the existing passive staleness-detection infrastructure (`loom_get_stale_docs`, `loom_get_stale_plans`, `version` fields) into the user-visible UI: tree icon, summary count, diagnostics. Do NOT add cascade automation, refine-propagation, or block-on-stale — those are post-MVP per `mvp-scope`.


# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Add `staleDocs` count to the `loom://summary` MCP resource response. Use the existing `loom_get_stale_docs` query. Include both stale-docs and stale-plans counts as separate fields. | `packages/mcp/src/resources/summary.ts`, `packages/mcp/tests/integration.test.ts` | — |
| 🔳 | 2 | Add stale-doc entries to `loom://diagnostics` — one entry per stale doc with id, parent id, parent version, doc's known parent_version, and human-readable reason. | `packages/mcp/src/resources/diagnostics.ts`, `packages/mcp/tests/integration.test.ts` | 1 |
---

## Phase 2 — VS Code tree-view stale icon

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
|      | 3 | Add a `⚠` icon decoration to docs that appear stale in the tree view. Source the stale list from `loom://diagnostics` (read once per refresh). Apply the icon to ideas, designs, and plans whose parent is ahead. Tooltip shows the staleness reason. | `packages/vscode/src/tree/treeProvider.ts`, `packages/vscode/media/icons/stale.svg` (new) | 2 |

---

## Phase 3 — Verify cascade rules

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
|      | 4 | Verify the cascade rules in code (the `isStale` / `getStaleDocs` logic) match the corrected design: chats do NOT stale ideas; only `idea → design → plan` and `design → ctx, plan → done`. If any reducer or query treats chat updates as a stale trigger, remove that branch and add a unit test asserting chat updates do not flag the idea stale. | `packages/core/src/reducers/...`, `packages/app/src/getStaleDocs.ts` (paths approximate; verify in audit), test file under `tests/` | 3 |

**Notes:**
- Run `cd packages/vscode && npm run package` after each phase to confirm the bundle compiles.
- If step 4 finds the code already matches the design, mark done with a "verified, no change needed" note.

## Out of scope (deferred to plan-002+)

- Cascade automation (auto-flagging children when a parent is updated through MCP).
- Refine-propagation suggestion ("you refined this idea — want to refine its design too?").
- Block-on-stale (refusing to implement a stale plan). Decided: warn never block.
- Markdown-link form in stale tooltips. Plain text suffices for MVP.
