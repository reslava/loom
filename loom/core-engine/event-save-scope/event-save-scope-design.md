---
type: design
id: de_01KSNACN3T97M7HVG3K0W3WBQB
title: Scope runEvent saves to the changed doc set
status: done
created: 2026-05-27
updated: 2026-06-30
version: 4
idea_version: 3
tags: []
parent_id: id_01KSGJSN9N8DHX4G7M2P281BMS
requires_load: []
---
# Scope runEvent saves to the changed doc set

> Design for [[event-save-scope]]. Source: `event-save-scope-idea.md` (`id_01KSGJSN9N8DHX4G7M2P281BMS`). Discovered 2026-05-26 during the context-pipeline Phase 1 build, where completing 8 steps on one plan silently re-saved every doc in the `ai-integration` weave and a non-idempotent save-path bug ([[plan-table-truncation]]) corrupted four unrelated siblings.

## 1. Problem (recap)

`runEvent` (`packages/app/src/runEvent.ts`) does:

```
runEvent → loadWeave → applyEvent → saveWeave
```

`saveWeave` re-serialises **every document in the weave** (`saveThread × N → saveDoc × all docs`). So a single `loom_complete_step` / `loom_start_plan` on one plan rewrites every idea, design, plan, done, and chat in that weave. Two harms:

1. **Blast radius.** Any non-idempotent step in the per-doc save path hits *every* doc. It already converted one isolated bug (the `updateStepsTableInContent` truncation) into six-doc corruption.
2. **Spurious churn.** Even with a lossless save path, re-serialising untouched docs re-normalises frontmatter key order and re-syncs body H1, producing noisy diffs and misleading `updated`/version drift.

## 2. Goal / invariant

**A workflow event persists exactly the documents it changed — no more.** A `complete-step` on plan X writes plan X and nothing else. `saveWeave` (whole-weave write) is reserved for genuine bulk operations (migrations, bulk re-layout), never for single-event mutations.

## 3. Decision — applyEvent reports the changed doc set

`applyEvent` returns not just the new weave but **the set of doc ids the event semantically changed**, and `runEvent` persists only those.

```ts
// core/applyEvent.ts
interface ApplyResult {
  weave: Weave;
  changed: string[];   // doc ids this event mutated (usually 1; ≥1 for cascades)
}
function applyEvent(weave: Weave, event: WorkflowEvent): ApplyResult
```

```ts
// app/runEvent.ts
const { weave: updated, changed } = applyEvent(weave, event);
await deps.saveDocs(deps.loomRoot, updated, changed);
return updated;
```

`applyEvent` is the orchestrator — it is the code that decides which doc each reducer output replaces, so it already knows every id it reassigned. It collects those ids into `changed` at each reassignment site (and at the stale-child-plan marking step). **Reducers stay pure `(doc, event) => doc` — unchanged.** The signal is **semantic** (what the event mutated in memory), independent of serialisation; collecting it in the orchestrator rather than threading an id out of every reducer is the cohesive, lower-churn realisation of the same guarantee.

> Note (2026-05-27, during build): the idea/first draft framed this as "each reducer returns its touched id." On implementation the cleaner locality was clear — the orchestrator, not the reducer, owns placement and therefore the changed-id signal. The external contract (`ApplyResult`, save-only-changed, serialisation-independent) is identical either way.

## 4. Why not a serialize-and-diff approach

The tempting cheaper route — keep `applyEvent` unchanged, have `runEvent` diff the loaded weave against the updated one by serialised content and write only the docs that differ — **does not meet the goal, and would not have prevented the corruption.**

A diff is computed from the serialiser's output. If the save path is non-idempotent (exactly the truncation bug), serialising an *untouched* doc yields *different* bytes than what's on disk, so the diff flags it as "changed" and `runEvent` writes the corrupted version. A serialisation-derived signal inherits the serialiser's bugs. Only a signal **independent of serialisation** — what the event actually changed — bounds the blast radius. Hence orchestrator-reported, not diff-derived. (A serialised-form equality check may still live inside `saveWeave` as a cheap secondary net for the bulk path — see §6 — but it is not the primary mechanism.)

## 5. Affected surfaces (as built)

- `packages/core/src/applyEvent.ts` — returns `ApplyResult` instead of `Weave`; collects changed ids into a `Set` at each reassignment site. `ApplyResult` exported from `packages/core`.
- `packages/core/src/reducers/*` — **unchanged** (stay pure `(doc, event) => doc`). The orchestrator owns the changed-id signal.
- `packages/fs` — new `saveDocs(loomRoot, weave, docIds)` (filters the weave by id set, resolves each path via `_path` ?? `docPathInThread`); `docPathInThread` exported for reuse. `saveWeave` retained for bulk.
- `packages/app/src/runEvent.ts` — destructures `changed`, calls `saveDocs(loomRoot, weave, changed)`; `RunEventDeps.saveWeave` replaced by `saveDocs`.
- All `runEvent` injection sites — cli `completeStep`/`startPlan`/`refine`, mcp `completeStep`/`startPlan`, and tests (`commands`, `workspace-workflow`, `vscode/commands`) — inject `saveDocs` instead of `saveWeave`.

## 6. `saveWeave` retained, plus an optional idempotency net

`saveWeave` stays for genuine whole-weave operations (migrations, the `migrate-to-threads` script, bulk re-layout). Independent of this change, `saveWeave` MAY gain a cheap guard: skip writing a doc whose freshly serialised form is byte-identical to what's on disk. That trims churn on the bulk path — but per §4 it is a secondary net only; it cannot be the blast-radius defence because a lossy serialiser defeats it. (Not implemented in this pass.)

## 7. Cascade / multi-doc events

If any event legitimately changes more than one doc in a single shot (e.g. a close-plan that also stamps a thread doc), the `changed: string[]` set models it naturally — the orchestrator records every id it touched. The stale-child-plan marking on `REFINE_DESIGN` is exactly such a multi-doc case and is already covered (the refined design + every dependent plan land in `changed`).

## 8. Testing (as built)

- Unit (pure core): `applyEvent` on a two-plan weave returns `changed = [onlyThatPlan]` for a `COMPLETE_STEP`; the sibling is excluded.
- IO regression: a `COMPLETE_STEP` on one plan, run through `runEvent` against a real temp workspace, leaves a sibling plan's file **byte-identical** — the sibling is written in non-canonical form (key order + missing H1 + trailing `### Notes`) so any accidental re-serialisation would demonstrably change its bytes. `tests/event-save-scope.test.ts`.

## 9. Open questions — resolved

1. *Diff the weave, or report from the mutation?* → **Orchestrator reports** (§3, §4). Diff-derived is rejected because it inherits serialiser bugs.
2. *Events that change multiple docs?* → Handled by the `changed` set (§7); the REFINE_DESIGN cascade is the live example.
3. *Keep a `saveWeave` idempotency guard?* → Optional secondary net only, not the primary mechanism (§6); deferred.

## Next

Shipped 2026-05-27 alongside the `generateStepsTable` pipe-escaping fix. See `plans/event-save-scope-plan-001.md`.