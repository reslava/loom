---
type: reference
id: rf_01KQYDFDDDRH48GS6GK97QS23P
title: loom — Implementation Contract
status: active
created: "2026-04-22T00:00:00.000Z"
version: 4
tags: [reference, implementation, contract, packages, internal]
parent_id: null
requires_load: []
slug: implementation-contract-reference
load: by-request
load_when: [design, plan, implementing]
---

# loom — Implementation Contract

The technical contract for working inside `packages/`: the two API surfaces, the
DI pattern, reducer purity, the ID lifecycle, and the implementation gotchas that
bite.

**This doc owns the *implementation* specifics.** The shared structural facts —
the package dependency rule, the frontmatter schema, the doc-types table, the
directory layout, the file-naming rules, and the `requires_load` model — live in
[architecture-reference.md](architecture-reference.md), which is the single source
for them. This doc links there instead of restating them. For terminology see
[../ctx.md](../ctx.md) §2 (the canonical glossary); for the workflow loop see
[workflow-reference.md](workflow-reference.md).

---

## Package layering (→ architecture-reference)

The canonical dependency diagram and the full rule set live in
[architecture-reference.md §1](architecture-reference.md). In one line:

```
cli / vscode / mcp  →  app  →  core + fs      (never import upward)
```

Two implementation-side rules to keep in mind: **never import `vscode` outside
`packages/vscode/`**, and `mcp` imports from `app` only — it is the gate.

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

A doc's `id` is a **ULID minted once at creation** and never re-minted — finalize
and rename leave it untouched (they change only the filename/title, never the id).
IDs have the shape `{2-char-prefix}_{26-char-ULID}`; the prefix encodes the type.

| Type | Prefix | Example id |
|------|--------|------------|
| Idea | `id_` | `id_01JT8Y3R4P7M6K2N9D5QF8A1BC` |
| Design | `de_` | `de_01JT8Y3R4P7M6K2N9D5QF8A1BC` |
| Plan | `pl_` | `pl_01JT8Y3R4P7M6K2N9D5QF8A1BC` |
| Done | `dn_` | `dn_01JT8Y3R4P7M6K2N9D5QF8A1BC` |
| Chat | `ch_` | `ch_01KT4F0224R6EN6CS5FR41ABHA` |
| Reference | `rf_` | `rf_01KQYDFDDDRH48GS6GK97QS23P` |
| Ctx | `cx_` | semantic id preferred — `loom-ctx` |

`generateDocId(type)` mints the id; `parseDocId` / `isUlidId` validate the
`{prefix}_{ulid}` shape. All three live in `packages/core/src/idUtils.ts`.

**IDs are not filenames.** Filenames stay human-readable and are generated
*separately* at creation (the suffix rules live in
[architecture-reference.md §7](architecture-reference.md)). The slug helpers
`toKebabCaseId` / `generatePermanentId` / `generatePlanId` / `generateChatId`
produce **filenames, not ids**; the old "finalize → kebab-from-title id" behaviour
is gone.

`generatePlanId`'s counter regex matches the `-plan-{NNN}` suffix of the *filename*,
not a `.md` filename — no `.md` suffix in the pattern.

---

## Frontmatter & file naming (→ architecture-reference)

The canonical frontmatter key order, the doc-types table, and the file-naming
suffix rules all live in
[architecture-reference.md §3 and §7](architecture-reference.md). Two
implementation rules belong here:

- **Always serialize via `serializeFrontmatter`** (`packages/core/src/frontmatterUtils.ts`) — never hand-build YAML. It enforces the canonical key order.
- **Double type-suffix bug class:** a doc named `foo-design-design.md` is wrong and indicates a path-builder didn't strip the existing suffix before appending `-design`. Always test rename / promote tools against IDs that already end in their type word.

---

## Workspace layout & `requires_load` (→ architecture-reference)

The directory layout (§6) and the `requires_load` model (§5) live in
[architecture-reference.md](architecture-reference.md). The one rule worth
repeating for implementers: **`ctx` docs never appear in `requires_load`** — they
are auto-loaded by scope (global + weave). Reference docs are the citation-loaded
type.

---

## Common implementation gotchas

- **Cross-plan blockers in `isStepBlocked`**: missing plan = blocked, existing plan = not blocked (best-effort).
- **`generatePlanId` regex** matches plan IDs not filenames — no `.md` suffix in the pattern.
- **`getState()` is internal to MCP** — the VS Code extension must never call it directly. All state through MCP resources.
- **`buildLinkIndex` once per `getState`** — never N+1 inside `loadThread`.
- **Reducers must stay pure** — no filesystem or VS Code calls inside reducer functions.
- **Path-based scans must scope to `loom/**`** — never substring-match `/loom/` in absolute paths because the repo path itself contains `loom`. Anchor on workspace root.
