---
type: reference
id: rf_01KQYDFDDDRH48GS6GK97QS23P
title: loom — Implementation Contract
status: active
created: "2026-04-22T00:00:00.000Z"
version: 2
tags: [reference, implementation, contract, packages]
parent_id: null
requires_load: []
slug: loom-reference
load: by-request
load_when: [design, plan, implementing]
---

# Loom — Implementation Contract

The technical contract for working inside `packages/`: deps shape, DI pattern,
reducer purity, ID lifecycle, file naming, `requires_load` semantics. Complements
[architecture-reference.md](architecture-reference.md), which covers the system
overview, MCP surface, and doc-type catalogue — read that first for big-picture
orientation. This doc is the *implementation* counterpart.

For the canonical workflow loop see [workflow.md](workflow.md). For terminology see
[../loom-ctx.md](../loom-ctx.md) section 2 (the canonical glossary).

---

## Package dependency rule

```
cli / vscode / mcp  →  app  →  core + fs
```

- `core/` — pure domain. Zero IO, zero VS Code, zero async. Entities, reducers, events, validation, ID utilities.
- `fs/` — Markdown read/write. Repositories, serializers, link index, path utils. Depends only on `core/` types.
- `app/` — Use-case orchestration. Calls `core/` + `fs/`. No CLI/UI logic.
- `cli/` / `vscode/` — Thin delivery layers. The VS Code extension **must not** import `app` directly; it routes through MCP.
- `mcp/` — Agent surface. Imports from `app` only — it is the gate.

Never import upward. Never import `vscode` outside `packages/vscode/`.

---

## The two API surfaces (in `app`)

| Surface | What it does | When to call |
|---------|-------------|-------------|
| `getState(deps)` | Builds link index, loads all threads, returns `LoomState` | Any read — tree view, status, validate |
| `runEvent(threadId, event, deps)` | Loads thread → `applyEvent` → saves | Any mutation |

`buildLinkIndex` is called **once per `getState`** call, then passed down to `loadThread`. Never call it N times.

`getState()` is internal to MCP — the VS Code extension must never call it directly. All reads from the extension go through MCP resources (`loom://state`, `loom://thread-context/...`).

---

## Dependency injection pattern

Every `app/` use-case signature:

```typescript
async function useCase(input: Input, deps: Deps): Promise<Result>
```

`deps` is always passed explicitly — never imported directly inside use-case bodies. This is the contract that makes the layer testable and consistent across CLI, VS Code, and MCP.

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

Cross-plan blockers in `isStepBlocked`: missing plan = blocked, existing plan = not blocked (best-effort).

---

## ID lifecycle

| Stage | ID format | Example |
|-------|-----------|---------|
| Freshly woven (draft) | `tmp-{timestamp}` | `tmp-1713780000000` |
| After finalize | Kebab-case from title | `payment-system` |
| Plan IDs | `{parent-id}-plan-{NNN}` | `payment-system-plan-001` |
| Done IDs | `{plan-id}-done-{NNN}` or `{plan-id}-done` | `payment-system-plan-001-done` |

`generateTempId`, `generatePermanentId`, `generatePlanId` all live in `packages/core/src/idUtils.ts`.

`generatePlanId` regex matches the ID string, not the filename — no `.md` suffix in the pattern.

---

## Frontmatter canonical key order

```yaml
type → id → title → status → created → version → tags → parent_id → child_ids → requires_load
# design-only:
→ role → target_release → actual_release → design_version
# reference-only:
→ load → load_when
```

Enforced by `serializeFrontmatter` in `packages/core/src/frontmatterUtils.ts`. Always use it for writes — never hand-build YAML.

The full frontmatter shape (with field semantics) is in [architecture-reference.md](architecture-reference.md) section 3.

---

## File naming conventions

| Type | Pattern | Example |
|------|---------|---------|
| Idea | `*-idea.md` | `payment-system-idea.md` |
| Design (primary) | `*-design.md` | `payment-system-design.md` |
| Plan | `*-plan-{NNN}.md` | `payment-system-plan-001.md` |
| Done | `*-done.md` | `payment-system-plan-001-done.md` |
| Chat | `*-chat.md` | `mvp-plan-to-publish-chat.md` |
| Ctx | `*-ctx.md` | `loom-ctx.md` |
| Reference | `*-reference.md` (in `loom/refs/`) | `architecture-reference.md` |

Watch out for the **double type-suffix** bug class: a doc named `foo-design-design.md` is wrong and indicates a path-builder didn't strip the existing suffix before appending `-design`. Always test rename / promote tools against IDs that already end in their type word.

---

## Workspace layout (Stage 2, current)

```
{workspace}/
  .loom/                    # System config, hooks, prompts (committed)
  loom/
    loom-ctx.md             # global context (auto-loaded)
    refs/                   # static reference docs (citation-loaded)
      .archive/             # archived references
    chats/                  # weave-root / project-level chats
    .archive/               # archived project-level docs
    {weave-id}/             # one folder per weave (e.g. core-engine/)
      ctx/                  # weave-level ctx (optional)
      chats/                # weave-level chats
      .archive/
      {thread-id}/          # one folder per thread
        {thread-id}-idea.md
        {thread-id}-design.md
        ctx/                # thread-level ctx
        chats/              # thread-level chats
        plans/
          {thread-id}-plan-001.md
        done/
          {thread-id}-plan-001-done.md
        .archive/
  packages/
    core/                   # domain: entities, reducers, events, validation
    fs/                     # infrastructure: repositories, serializers, link index
    app/                    # use cases (MCP gate dependency)
    cli/                    # delivery: terminal commands
    vscode/                 # delivery: VS Code extension (human surface, MCP client)
    mcp/                    # delivery: MCP server (agent surface)
```

---

## `requires_load` rule

When a doc has a non-empty `requires_load` list, the AI must read all listed docs before working on that document. Example:

```yaml
requires_load: [vscode-extension-design, vscode-extension-toolbar-design]
```

`requires_load` lists doc IDs (workspace-relative, no `.md` suffix). The session-start protocol and the chat-reply context-injection rules in `CLAUDE.md` honour this. The MCP resource `loom://requires-load/{id}` returns the recursively resolved chain.

**`ctx` docs never appear in `requires_load`** — they are auto-loaded by scope (global ctx for every session, weave ctx when entering a weave, thread ctx when entering a thread). Reference docs are the right type for citation-based loading.

---

## Common implementation gotchas

- **Cross-plan blockers in `isStepBlocked`**: missing plan = blocked, existing plan = not blocked (best-effort).
- **`generatePlanId` regex** matches plan IDs not filenames — no `.md` suffix in the pattern.
- **`getState()` is internal to MCP** — the VS Code extension must never call it directly. All state through MCP resources.
- **`buildLinkIndex` once per `getState`** — never N+1 inside `loadThread`.
- **Reducers must stay pure** — no filesystem or VS Code calls inside reducer functions.
- **Path-based scans must scope to `loom/**`** — never substring-match `/loom/` in absolute paths because the repo path itself contains `loom`. Anchor on workspace root.
