---
type: plan
id: pl_01KQYDFDD9FZPE58GYJHP69ZDT
title: Showing Docs Loaded — Visibility Rules Audit and Sync
status: done
created: "2026-05-05T00:00:00.000Z"
updated: 2026-05-08
version: 2
design_version: 2
tags: [ai, visibility, claude-md, mvp]
parent_id: showing-docs-loaded-design
requires_load: [rf_01KQYDFDDDYZC0R4XNNX2RASC9]
---

# Showing Docs Loaded — Implementation Plan

## Goal

Confirm the visibility-prefix rules from `showing-docs-loaded-design` are present, complete, and consistent across both `CLAUDE.md` surfaces (recursive + agnostic install template). Pure rules work — no code changes.


# Steps


## Phases

| Phase | Scope | Steps |
|-------|-------|-------|
| 1 | Audit and sync visibility rules across both CLAUDE.md surfaces | 1–2 |

---

## Phase 1 — Audit and sync visibility rules

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
|      | 1 | Audit the visibility-prefix table in both `CLAUDE.md` and `LOOM_CLAUDE_MD` template. Confirm all prefixes from the design's table (`📘`, `🌟`, `🧵`, `📡`, `🔧`, `📄`, `⚠️`) are documented with operation-specific rules (session start, chat-reply first/subsequent/after-refine, refine, do-step, requires_load). Add any missing entries. | `CLAUDE.md`, `packages/app/src/installWorkspace.ts` | — |
|      | 2 | Verify the two surfaces mirror: every rule shared by both files is identical in wording. Diff the visibility section between the recursive `CLAUDE.md` and the `LOOM_CLAUDE_MD` template; reconcile any drift. | `CLAUDE.md`, `packages/app/src/installWorkspace.ts` | 1 |

**Notes:**
- This plan is mostly "verify what was done in the prior chat session." Step 1 is read-and-fix-gaps; step 2 is read-and-confirm-sync.
- Done state for each step is recorded in `done/showing-docs-loaded-plan-001-step-N.md`.
- No code changes. No tests. Verification is "read both files; rules match; all prefixes documented."

## Out of scope

- Adding markdown-link forms to visibility lines (`[doc-id](file://path)`) — post-MVP per `mvp-scope`.
- Building any IDE UI from these prefixes — out entirely.
