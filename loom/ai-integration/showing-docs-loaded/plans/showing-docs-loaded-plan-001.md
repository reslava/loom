---
type: plan
id: pl_01KQYDFDD9FZPE58GYJHP69ZDT
title: Showing Docs Loaded — Visibility Rules Audit and Sync
status: done
created: "2026-05-05T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 2
design_version: 2
tags: [ai, visibility, claude-md, mvp]
parent_id: showing-docs-loaded-design
requires_load: [rf_01KQYDFDDDYZC0R4XNNX2RASC9]
---

# Showing Docs Loaded — Visibility Rules Audit and Sync

## Goal

Confirm the visibility-prefix rules from `showing-docs-loaded-design` are present, complete, and consistent across both `CLAUDE.md` surfaces (recursive + agnostic install template). Pure rules work — no code changes.


## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Audit the visibility-prefix table in both `CLAUDE.md` and `LOOM_CLAUDE_MD` template. Confirm all prefixes from the design's table (`📘`, `🌟`, `🧵`, `📡`, `🔧`, `📄`, `⚠️`) are documented with operation-specific rules (session start, chat-reply first/subsequent/after-refine, refine, do-step, requires_load). Add any missing entries. | `CLAUDE.md`, `packages/app/src/installWorkspace.ts` | — |
| 🔳 | 2 | Verify the two surfaces mirror: every rule shared by both files is identical in wording. Diff the visibility section between the recursive `CLAUDE.md` and the `LOOM_CLAUDE_MD` template; reconcile any drift. | `CLAUDE.md`, `packages/app/src/installWorkspace.ts` | 1 |
### Out of scope

- Adding markdown-link forms to visibility lines (`[doc-id](file://path)`) — post-MVP per `mvp-scope`.
- Building any IDE UI from these prefixes — out entirely.
