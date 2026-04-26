---
type: ctx
id: vscode-extension-ctx
title: "VS Code Extension — Session Context"
status: active
created: 2026-04-22
version: 1
tags: [vscode, extension, ctx]
parent_id: vscode-extension-design
child_ids: []
requires_load: []
---

# VS Code Extension — Session Context

Load this instead of reading all four design docs cold. It summarises where the extension work stands as of 2026-04-22.

---

## What's built (plan-004 steps 1–4 ✅)

| File | What it does |
|------|-------------|
| `packages/vscode/src/extension.ts` | Activation, command registration, file watcher skeleton, disposes cleanly |
| `packages/vscode/src/tree/treeProvider.ts` | `LoomTreeProvider` — calls `getState`, renders thread nodes; grouping logic in `viewStateManager` |
| `packages/vscode/src/icons.ts` | Unified icon system; maps doc types to Codicons with SVG fallback |
| `packages/vscode/src/view/viewStateManager.ts` | Manages `ViewState` (grouping, filters, showArchived, focusedThreadId); persists to `workspaceState` |
| `packages/vscode/src/view/viewState.ts` | `ViewState` interface + `defaultViewState` |
| `packages/vscode/src/commands/weaveIdea.ts` | Thin wrapper → `app/weaveIdea` |
| `packages/vscode/src/commands/weaveDesign.ts` | Thin wrapper → `app/weaveDesign` |
| `packages/vscode/src/commands/weavePlan.ts` | Thin wrapper → `app/weavePlan` |
| `packages/vscode/src/commands/grouping.ts` | Toolbar grouping QuickPick command |

---

## What's stubbed / missing

| Item | Plan | Notes |
|------|------|-------|
| File watcher (`watcher.ts`) | plan-004 step 6 | Registered but not wired to incremental index update |
| Diagnostics (`diagnostics.ts`) | plan-004 step 7 | Skeleton only — no Diagnostic objects emitted yet |
| Commands: `finalize`, `rename`, `refine`, `startPlan`, `completeStep`, `validate`, `summarise` | plan-004 step 5 | Not yet implemented |
| Thread-based grouping in tree | plan-005 | Draft plan |
| Toolbar controls (full) | plan-006 | Draft plan |
| Full test in Extension Host | plan-004 step 8 | Requires F5 launch |

---

## Known bugs fixed this session

- `packages/fs/src/repositories/linkRepository.ts` — was scanning `threads/` (non-existent), now scans `weaves/`. Link index was silently empty; `validate` and diagnostics were no-ops.

## Known issues remaining

- File watcher glob in design docs still says `**/threads/**/*.md` — needs updating to `**/weaves/**/*.md` in `vscode-extension-visual-design.md` and `vscode-extension-plan-004.md`.
- `updateIndexForFile` derives `docId` from filename (`path.basename`), not from frontmatter `id`. Will silently break if they diverge.
- `loomRoot` parameter in `updateIndexForFile` is unused (TS hint, non-breaking).

---

## Architecture reminder

```
extension.ts  →  commands/  →  app/ use-cases  →  core/ + fs/
              →  treeProvider  →  getState()
              →  viewStateManager (ViewState → tree projection)
```

- **`getState()`** is the only query entry point. Never traverse files from the extension directly.
- **`runEvent()`** is the only mutation entry point.
- All commands are thin wrappers: collect VS Code input → call app use-case → refresh tree → show notification.

---

## Active plans at a glance

| Plan | Status | Next action |
|------|--------|-------------|
| `vscode-extension-plan-004` | Step 5 in progress | Implement remaining commands (finalize, rename, refine, startPlan, completeStep, validate, summarise) |
| `vscode-extension-plan-005` | Draft | Blocked on plan-004 |
| `vscode-extension-plan-006` | Draft | Blocked on plan-004 + 005 |

---

## Design docs (load only if you need detail)

- `vscode-extension-design.md` — Architecture, components, DI, open questions
- `vscode-extension-visual-design.md` — Tree structure, icons, context menus, file watcher flow, AI panel
- `vscode-extension-toolbar-design.md` — ViewState definition, toolbar layout, grouping interaction
- `vscode-extension-user-personalization-design.md` — `loom.user.name` setting usage
