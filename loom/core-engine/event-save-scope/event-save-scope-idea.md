---
type: idea
id: id_01KSGJSN9N8DHX4G7M2P281BMS
title: Scope runEvent saves to the changed doc/thread
status: done
created: 2026-05-25
updated: 2026-06-30
version: 3
tags: []
parent_id: null
requires_load: []
---
# Scope runEvent saves to the changed doc/thread

## Problem

`runEvent` (`packages/app/src/runEvent.ts`) loads the whole weave, applies the event, and calls `saveWeave` — which re-serialises **every document in the weave**, not just the one the event changed:

```
runEvent → loadWeave → applyEvent → saveWeave (saveThread × N → saveDoc × all docs)
```

So a single `loom_complete_step` / `loom_start_plan` on one plan rewrites every idea, design, plan, done, and chat in that weave. This was discovered on 2026-05-26 during the context-pipeline Phase 1 build: completing 8 steps on `context-pipeline-plan-001` silently rewrote every doc in the `ai-integration` weave.

Two harms:
1. **Blast radius / data risk.** Any non-idempotent step in the per-doc save path hits *every* doc. It already bit us once: a truncation bug in `updateStepsTableInContent` ([[plan-table-truncation]] — fixed separately) deleted `### Notes` sections from four unrelated sibling plans because they were re-saved as collateral. The truncation is fixed, but the blast radius is what turned a one-plan operation into six-doc corruption.
2. **Spurious churn.** Even with a lossless save path, re-serialising every doc normalises frontmatter key order and re-syncs the body H1 on docs that were never touched — producing noisy git diffs and misleading `updated`/version drift on unrelated docs.

## Idea

A workflow event mutates exactly one doc (or, at most, one thread). `runEvent` should persist only what changed:

- After `applyEvent`, diff the returned weave against the loaded one (or have reducers report the touched doc id) and `saveDoc` only the changed document(s).
- Keep `saveWeave` for genuine whole-weave operations (migrations, bulk re-layout), not for single-event mutations.

This bounds the blast radius to the doc the user actually acted on and eliminates collateral churn.

## Why now

The truncation incident proved the blast radius converts an isolated bug into widespread corruption. Narrowing the save scope is defence-in-depth: even a future regression in the save path would be contained to the one doc being mutated.

## Open questions

1. How does `runEvent` learn which doc(s) an event touched — diff the weave, or have reducers return a changed-doc set? Reducer-reported is cleaner and avoids a structural diff.
2. Are there any events that legitimately change multiple docs in one shot (e.g. a cascade)? If so, the changed-set return handles them naturally.
3. Should `saveWeave` keep a guard that only writes docs whose serialised form actually differs (cheap idempotency net), independent of this change?

## Relationship to other work

- Sibling/root-cause to the `updateStepsTableInContent` truncation fix shipped in the context-pipeline Phase 1 commit (that fix stops the data loss; this idea stops the blast radius that amplified it).
- Pure-core / app-orchestration concern; no MCP or extension surface change.