---
type: reference
id: rf_01KQYDFDDDH3GW66SQJ1XHAC2J
title: Loom — Deep Analysis & Improvement Opportunities
created: "2026-04-22T00:00:00.000Z"
tags: [reference, analysis, architecture]
slug: loom-analysis-reference
---

# Loom — Deep Analysis & Improvement Opportunities

An honest, independent assessment of the project as of 2026-04-22. Covers what's solid, what carries risk, and concrete things worth improving.

---

## What's solid

### Architecture discipline
The layered architecture (`core → fs → app → cli/vscode`) is well-enforced. `core/` has zero VS Code or Node imports. Reducers are pure `(doc, event) → doc` functions with no side effects. This is not a common level of discipline in solo projects and makes the system genuinely testable and portable.

### `getState` as the single query surface
Centralising all state derivation in one call (`buildLinkIndex` + `loadThread` for all threads) eliminates the N+1 scan problem. The index is built once and passed down — a deliberate, correct design choice.

### Frontmatter as the database
Using frontmatter fields as the authoritative state (not an in-memory cache) means Git becomes the history store for free. Any file-editing tool can modify documents without breaking consistency. The `serializeFrontmatter` canonical key order enforces a stable diff surface.

### Event sourcing shape
The `applyEvent → reducer → saveDoc` pipeline is a clean event-sourcing pattern even without a full event log. Switching to a persisted event log later would be a contained change to `runEvent.ts`.

---

## Risks & concerns

### 1. `updateIndexForFile` derives `docId` from filename, not frontmatter
**Location:** `packages/fs/src/repositories/linkRepository.ts:82`
```typescript
const docId = path.basename(filePath, '.md');
```
If a document's frontmatter `id` ever diverges from its filename (e.g., after a rename that doesn't update the file's internal `id` field), the index will silently associate the wrong ID with the entry. The `rename` use-case in `app/` presumably handles this, but there's no guard in `updateIndexForFile` itself.

**Fix:** Load the doc and use `doc.id` as the key, fall back to filename only if loading fails.

### 2. File watcher glob references `threads/` in design docs (stale)
**Locations:** `vscode-extension-visual-design.md` §5, `vscode-extension-plan-004.md` step 6 code snippet
Both reference `**/threads/**/*.md`. The correct glob is `**/weaves/**/*.md`. When implementing the watcher, this will cause it to watch a non-existent path and miss all events silently.

### 3. No error boundary in `treeProvider` around `getState`
If `getState` throws (e.g., malformed frontmatter, missing `.loom/` directory after activation), the tree view silently empties with no user-visible message. A `try/catch` with a fallback error node or VS Code notification would make failures observable.

### 4. `linkRepository.ts` `loomRoot` parameter unused in `updateIndexForFile`
**Location:** `packages/fs/src/repositories/linkRepository.ts:82`
`loomRoot` is declared in the signature but never used. The function derives the path entirely from `filePath`. This is a TS hint (6133), not a runtime bug, but it creates API confusion about what callers are expected to pass.

### 5. `getState` rebuilds the full index on every call
Correct for consistency, but expensive as the workspace grows. The visual design already notes this and defers incremental updates to a future path. The risk is that the performance cliff is invisible until a workspace reaches ~200–300 documents, at which point the watcher debounce window becomes the only mitigation.

### 6. No test coverage for the VS Code layer
`core/`, `fs/`, `app/` have integration tests. The `vscode/` package has none. Commands, tree provider, and viewState manager are untested. The Extension Host test (plan-004 step 8) is manual. Any regression in the UI layer will be caught by eye only.

### 7. `_status.md` drift is a recurring failure mode
Stage 1 relies on Rafa updating `_status.md` manually. The file drifted significantly (last session 2026-04-13, active weave still `core-engine`). This is expected for Stage 1, but the longer the drift the more misleading the session start context becomes. Priority should be getting the CLI `loom status --init` working so Stage 2 takes over.

---

## Improvement opportunities (prioritised)

| Priority | Item | Effort |
|----------|------|--------|
| High | Fix `updateIndexForFile` to use `doc.id` not filename | Small |
| High | Add error boundary in `treeProvider.getChildren` | Small |
| High | Update file watcher glob to `**/weaves/**/*.md` in all docs and code | Trivial |
| Medium | Add TS strict mode to `packages/vscode/tsconfig.json` if not set | Trivial |
| Medium | Add at least smoke tests for commands and tree provider | Medium |
| Medium | Transition to Stage 2 (`loom status --init`) to eliminate manual `_status.md` maintenance | Medium |
| Low | Fix unused `loomRoot` in `updateIndexForFile` (remove or use) | Trivial |
| Low | Incremental index update path (defer until perf data justifies) | Large |

---

## What I'd prioritise next

Given the current state (plans 004/005/006 in progress), the highest-leverage actions before shipping the extension MVP are:

1. **Complete plan-004 step 5** (remaining commands) — the tree view is useful only when commands actually work.
2. **Fix the file watcher glob** — otherwise the watcher watches nothing.
3. **Add the `getState` error boundary** — extension crashes are very visible to users.
4. **Run step 8** (Extension Host test) — no amount of code review replaces actually running the extension.

Everything else (incremental index, full test suite) is post-MVP.
