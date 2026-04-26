---
type: reference
id: loom-reference
title: "Loom — Session-Start Reference"
created: 2026-04-22
tags: [reference, architecture, session]
---

# Loom — Session-Start Reference

Everything worth knowing at the start of a session that isn't already in `CLAUDE.md`. Read alongside `.loom/_status.md`.

---

## Package dependency rule

```
cli / vscode  →  app  →  core + fs
```

- `core/` — pure domain. Zero IO, zero VS Code. Extractable as standalone npm package.
- `fs/` — Markdown read/write. Depends only on `core/` types.
- `app/` — Use-case orchestration. Calls `core/` + `fs/`. No CLI/UI logic.
- `cli/` / `vscode/` — Thin delivery layers. Parse input, call `app/`, render output.

Never import upward. Never import `vscode` outside `packages/vscode/`.

---

## The two API surfaces

| Surface | What it does | When to call |
|---------|-------------|-------------|
| `getState(deps)` | Builds link index, loads all threads, returns `LoomState` | Any read — tree view, status, validate |
| `runEvent(threadId, event, deps)` | Loads thread → `applyEvent` → saves | Any mutation |

`buildLinkIndex` is called **once per `getState`** call, then passed down to `loadThread`. Never call it N times.

---

## Dependency injection pattern

Every `app/` use-case signature:

```typescript
async function useCase(input: Input, deps: Deps): Promise<Result>
```

`deps` is always passed explicitly — never imported directly inside use-case bodies. This is the contract that makes the layer testable and consistent between CLI and VS Code.

Typical `deps` shape:

```typescript
{
  getActiveLoomRoot,   // from fs/workspaceUtils
  loadThread,          // from fs/repositories/threadRepository
  saveDoc,             // from fs/serializers/frontmatterSaver
  buildLinkIndex,      // from fs/repositories/linkRepository
  fs,                  // fs-extra (injected so it can be mocked in tests)
}
```

---

## Reducer contract

Reducers are pure: `(doc: T, event: Event) => T`. No filesystem calls. No VS Code calls. No async. Side effects run **after** the reducer, in `runEvent.ts`.

---

## ID lifecycle

| Stage | ID format | Example |
|-------|-----------|---------|
| Freshly woven (draft) | `tmp-{timestamp}` | `tmp-1713780000000` |
| After finalize | Kebab-case from title | `payment-system` |
| Plan IDs | `{parent-id}-plan-{NNN}` | `payment-system-plan-001` |

`generateTempId`, `generatePermanentId`, `generatePlanId` are all in `packages/core/src/idUtils.ts`.

Plan ID regex matches the ID string (no `.md` suffix).

---

## Frontmatter canonical key order

```yaml
type → id → title → status → created → version → tags → parent_id → child_ids → requires_load
# design-only:
→ role → target_release → actual_release
```

Enforced by `serializeFrontmatter` in `packages/core/src/frontmatterUtils.ts`. Always use it for writes — never hand-build YAML.

---

## Document workflow (standard path)

```
weaveIdea → (finalize) → weaveDesign → (finalize) → weavePlan → startPlan → completeStep(s)
```

"Anchor-free" means Rafa can attach docs to threads and set parent/child links whenever he chooses — no forced order. The underlying workflow above is the canonical path but not enforced.

---

## Two-stage operation

| | Stage 1 | Stage 2 |
|-|---------|---------|
| `_status.md` | Rafa maintains manually | `loom` CLI maintains automatically |
| Session start | Read as hint; verify plan step against actual file | Read as authoritative |
| Transition | Run `loom status --init` to hand over maintenance | `_status.md` instruction block auto-removed |

**Current: Stage 1.** The CLI is built and tested. Transition to Stage 2 is next after plan-004.

---

## File naming conventions

| Type | Pattern | Example |
|------|---------|---------|
| Idea | `*-idea.md` | `payment-system-idea.md` |
| Primary design | `*-design.md` | `payment-system-design.md` |
| Plan | `*-plan-{NNN}.md` | `payment-system-plan-001.md` |
| Context | `*-ctx.md` | `payment-system-ctx.md` |
| Chat | `*-chat.md` | `loom-setup-chat.md` |

---

## Workspace layout (key paths)

```
.loom/                   # System config (committed)
weaves/{thread-id}/      # All active threads
  {id}-idea.md
  {id}-design.md         # role: primary
  {id}-ctx.md            # auto-generated, overwritten
  plans/
    {id}-plan-001.md
  done/
  references/
_archive/                # Abandoned (cancelled / deferred / superseded)
references/              # Global reference docs (this file lives here)
```

---

## `requires_load` rule

When a doc has a non-empty `requires_load` list, read all listed docs before working on that document. Example:

```yaml
requires_load: [vscode-extension-design, vscode-extension-toolbar-design]
```

means load those two docs before responding to questions about the file.

---

## What's done vs. what's next

### Done
- `core/` — entities, reducers, applyEvent, filters, derived, planUtils, idUtils, linkIndex, validation, registry
- `fs/` — frontmatterLoader, frontmatterSaver, threadRepository, linkRepository (fixed), pathUtils, workspaceUtils
- `app/` — getState, runEvent, completeStep, weaveIdea, weaveDesign, weavePlan, finalize, rename, summarise, validate
- `cli/` — all commands

### In progress (vscode-extension)
- Tree view: built (`treeProvider.ts`, `viewStateManager.ts`, `icons.ts`)
- Commands: `weaveIdea`, `weaveDesign`, `weavePlan`, `grouping` done; remaining commands pending (plan-004 step 5)
- File watcher: registered, not yet wired to incremental index
- Diagnostics: skeleton only

### Next
- plan-004 step 5 (remaining commands)
- plan-004 steps 6–7 (watcher + diagnostics)
- plan-005 (thread grouping)
- plan-006 (toolbar controls)
