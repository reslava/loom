---
type: plan
id: pl_01KV7KWADJVS0ZVQQEFTC0S90X
title: Canonical Date Handling — core/dates.ts seam
status: done
created: "2026-06-16T00:00:00.000Z"
updated: 2026-06-16
version: 1
design_version: 1
tags: []
parent_id: de_01KV7K8QRWASFRVD0RECSB96D2
requires_load: []
target_version: 0.1.0
steps:
  - id: core-dates-ts-module-unit-tests
    order: 1
    status: done
    description: "Create core/dates.ts: today() (canonical YYYY-MM-DD), toEpoch(s) tolerant parse (date-only + full-ISO + legacy; empty/unparseable → −Infinity), compareDates(a,b) via toEpoch, toCanonical(s) idempotent normalizer, and the LoomDate type. Export from core/index.ts. Unit-test each: equal-day across formats, ordering, sentinel, idempotent toCanonical."
    files_touched: [packages/core/src/dates.ts, packages/core/src/index.ts, tests/dates.test.ts]
    blocked_by: []
    satisfies: []
  - id: write-side-canonical-enforcement-today-everywhere
    order: 2
    status: done
    description: In serializeFrontmatter, pass known date keys (created/updated only — §D1) through toCanonical so all written docs are YYYY-MM-DD and ISO outliers self-heal on next save. Replace every ad-hoc `new Date().toISOString().split('T')[0]` (and the full-ISO outliers) stamp with today().
    files_touched: [packages/core/src/frontmatterUtils.ts, packages/core/src/reducers/ideaReducer.ts, packages/core/src/reducers/designReducer.ts, packages/core/src/registry.ts, packages/core/src/bodyGenerators/ctxBody.ts, packages/app/src/closePlan.ts, packages/app/src/req.ts, packages/app/src/rename.ts, packages/app/src/finalize.ts, packages/app/src/refinePlan.ts, packages/app/src/thread.ts, packages/app/src/buildCtxSource.ts, packages/app/src/installWorkspace.ts]
    blocked_by: [step-1]
    satisfies: []
  - id: read-side-route-history-staleness-through
    order: 3
    status: done
    description: Replace buildHistory's raw `a.date < b.date` string sort with compareDates(b.date, a.date) (newest-first). Replace getStaleDocs' raw parent.updated vs doc.created string compare with compareDates. Keep the existing date fallback chains unchanged — this step fixes the comparison, not the fallback axis (out of scope, §6).
    files_touched: [packages/core/src/derived.ts, packages/app/src/getStaleDocs.ts]
    blocked_by: [step-1]
    satisfies: []
  - id: acceptance-sweep-regression-test
    order: 4
    status: done
    description: Grep the codebase for remaining raw date comparisons and ad-hoc new Date() date stamps outside core/dates.ts; route or justify any stragglers. Add a regression test reproducing the original roadmap History mixed-format bug (a date-only done-doc date vs a full-ISO date on the same/adjacent day) and asserting correct order.
    files_touched: [tests/roadmap.test.ts, tests/dates.test.ts]
    blocked_by: [step-2, step-3]
    satisfies: []
  - id: optional-normalize-dates-migration
    order: 5
    status: done
    description: "Register a `normalize-dates` migration in the existing migration registry: walk all docs, toCanonical their date fields, rewrite only those that change. Idempotent + --dry-run, mirroring backfill-thread-manifests. Hygiene only — not a correctness dependency since toEpoch is tolerant; sequence last."
    files_touched: [packages/app/src/migrateThreads.ts, packages/cli/src/commands/migrate.ts]
    blocked_by: [step-1]
    satisfies: []
---
# Canonical Date Handling — core/dates.ts seam

## Goal

Introduce a single date owner in core (core/dates.ts) and route all of Loom's date production, comparison, and serialization through it. Canonical on-disk format is YYYY-MM-DD (decision A); comparison is tolerant epoch parsing so any mix of formats — date-only, full-ISO, legacy, downstream — orders correctly without migration. The read-side change (buildHistory sort + getStaleDocs compare) is the durable fix for the roadmap History mis-ordering and the latent staleness fragility; the write-side change (serializeFrontmatter canonical enforcement on known date keys + replacing every ad-hoc new Date() stamp with today()) is hygiene that converges all docs to canonical on next save. An optional normalize-dates migration cleans legacy docs in place but is not a correctness dependency. Temporal stays parked behind the module seam, swappable later with zero caller changes. Resolved calls: §D1 known date keys only (created/updated); §4 empty/unparseable sentinel = −Infinity (sorts oldest); same-day ties broken by a deterministic stable secondary key.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create core/dates.ts: today() (canonical YYYY-MM-DD), toEpoch(s) tolerant parse (date-only + full-ISO + legacy; empty/unparseable → −Infinity), compareDates(a,b) via toEpoch, toCanonical(s) idempotent normalizer, and the LoomDate type. Export from core/index.ts. Unit-test each: equal-day across formats, ordering, sentinel, idempotent toCanonical. | packages/core/src/dates.ts, packages/core/src/index.ts, tests/dates.test.ts | — | — |
| ✅ | 2 | In serializeFrontmatter, pass known date keys (created/updated only — §D1) through toCanonical so all written docs are YYYY-MM-DD and ISO outliers self-heal on next save. Replace every ad-hoc `new Date().toISOString().split('T')[0]` (and the full-ISO outliers) stamp with today(). | packages/core/src/frontmatterUtils.ts, packages/core/src/reducers/ideaReducer.ts, packages/core/src/reducers/designReducer.ts, packages/core/src/registry.ts, packages/core/src/bodyGenerators/ctxBody.ts, packages/app/src/closePlan.ts, packages/app/src/req.ts, packages/app/src/rename.ts, packages/app/src/finalize.ts, packages/app/src/refinePlan.ts, packages/app/src/thread.ts, packages/app/src/buildCtxSource.ts, packages/app/src/installWorkspace.ts | step-1 | — |
| ✅ | 3 | Replace buildHistory's raw `a.date < b.date` string sort with compareDates(b.date, a.date) (newest-first). Replace getStaleDocs' raw parent.updated vs doc.created string compare with compareDates. Keep the existing date fallback chains unchanged — this step fixes the comparison, not the fallback axis (out of scope, §6). | packages/core/src/derived.ts, packages/app/src/getStaleDocs.ts | step-1 | — |
| ✅ | 4 | Grep the codebase for remaining raw date comparisons and ad-hoc new Date() date stamps outside core/dates.ts; route or justify any stragglers. Add a regression test reproducing the original roadmap History mixed-format bug (a date-only done-doc date vs a full-ISO date on the same/adjacent day) and asserting correct order. | tests/roadmap.test.ts, tests/dates.test.ts | step-2, step-3 | — |
| ✅ | 5 | Register a `normalize-dates` migration in the existing migration registry: walk all docs, toCanonical their date fields, rewrite only those that change. Idempotent + --dry-run, mirroring backfill-thread-manifests. Hygiene only — not a correctness dependency since toEpoch is tolerant; sequence last. | packages/app/src/migrateThreads.ts, packages/cli/src/commands/migrate.ts | step-1 | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:core-dates-ts-module-unit-tests -->
### Step 1 — core/dates.ts module + unit tests

The module is the seam — the underlying library (Date today) is an implementation detail no caller names. today() internally `new Date().toISOString().slice(0,10)`. toEpoch relies on `new Date('2026-06-16').getTime() === new Date('2026-06-16T00:00:00.000Z').getTime()`. −Infinity sentinel preserves today's empty-string-sorts-oldest semantics (§4). No new dependency; Temporal stays parked behind this module.

<!-- step:write-side-canonical-enforcement-today-everywhere -->
### Step 2 — Write-side: canonical enforcement + today() everywhere

Known date keys only — no surprise coercion of body-ish fields (§D1 lean, accepted). The full-ISO outliers (registry.ts:73, ctxBody.ts:23) converge to canonical via serialize + today(). No flag-day migration needed; docs converge on their next legitimate save.

<!-- step:read-side-route-history-staleness-through -->
### Step 3 — Read-side: route history + staleness through compareDates

This is the durable fix: a mixed YYYY-MM-DD / full-ISO set now orders correctly regardless of on-disk format. The fallback-axis problem (done-doc time vs plan-mutation time) is explicitly a separate roadmap-thread concern.

<!-- step:acceptance-sweep-regression-test -->
### Step 4 — Acceptance sweep + regression test

Invariant being locked: no date logic lives outside core/dates.ts. The regression test is the proof the reported symptom is fixed and stays fixed.

<!-- step:optional-normalize-dates-migration -->
### Step 5 — Optional: normalize-dates migration

Because toEpoch tolerates legacy formats, nothing breaks if this never runs. This is cleanup that makes on-disk docs uniform; lowest priority of the plan.
