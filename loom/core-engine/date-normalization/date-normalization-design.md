---
type: design
id: de_01KV7K8QRWASFRVD0RECSB96D2
title: Canonical Date Handling
status: done
created: 2026-06-16
updated: 2026-06-16
version: 2
idea_version: 2
tags: []
parent_id: id_01KV7K7BT499TMH7ZDQN9Q7ZV4
requires_load: []
---
# Canonical Date Handling

## Vision check

Serves *"both User and AI always know weaves/threads state"* by making the date-derived parts of that state — History ordering and staleness — correct regardless of how any date was written. Removes the latent manual-debugging step of chasing format-mismatch ordering bugs (the roadmap History symptom). The only thing authored stays the same (a `created`/`updated` calendar day); everything about *how it is produced and compared* moves behind one owner.

## Architecture at a glance

One pure module in `core`, consumed through the existing layered seams — nothing imports upward, no new dependency.

```
core/dates.ts   (today / toEpoch / compareDates / toCanonical)   ← pure, no IO, unit-tested
        │
        ├─► core/frontmatterUtils.ts  serializeFrontmatter → toCanonical() on date fields  (write-side hygiene)
        │
        ├─► core/derived.ts           buildHistory sort → compareDates()                    (read-side fix)
        │
        ├─► app/getStaleDocs.ts       parent-vs-child compare → compareDates()              (read-side fix)
        │
        ├─► every write site          new Date()...split('T')[0]  →  today()
        │
        └─► app/migrateThreads (registry)   optional `normalize-dates` migration → toCanonical() in place
```

The module is the **seam**: the underlying date library (`Date` today) is an implementation detail no caller names. That is what makes the Temporal decision reversible at near-zero cost later.

## 1. The `core/dates.ts` module

A pure, dependency-free module. Canonical format = `YYYY-MM-DD` (**decision A**, locked in chat — already the de-facto standard at nearly every write site and the documented frontmatter convention).

```ts
/** The canonical Loom date stamp: a calendar day, no time, no zone. */
export type LoomDate = string; // 'YYYY-MM-DD'

/** Today as a canonical YYYY-MM-DD stamp. Replaces every `new Date().toISOString().split('T')[0]`. */
export function today(): LoomDate;

/** Tolerant parse to epoch ms for ORDERING ONLY. Accepts 'YYYY-MM-DD', full ISO, and legacy shapes.
 *  Unparseable / empty → a sentinel (−Infinity sorts oldest; choose deliberately, see §4). */
export function toEpoch(s: string | undefined): number;

/** Chronological comparison via toEpoch. Returns <0, 0, >0. The ONLY way Loom orders two dates. */
export function compareDates(a: string | undefined, b: string | undefined): number;

/** Normalize any accepted date string to canonical YYYY-MM-DD. Used by serializeFrontmatter and migration. */
export function toCanonical(s: string | undefined): LoomDate | undefined;
```

- **`today()`** is the single source of "now" stamps. Internally `new Date().toISOString().slice(0, 10)` — but callers never see that.
- **`toEpoch` is tolerant by design** — it must order legacy and downstream-install docs that will never be migrated. `new Date("2026-06-16").getTime() === new Date("2026-06-16T00:00:00.000Z").getTime()`, so a mixed set orders correctly without any on-disk change. This is the layer that actually fixes and *prevents* the class of bug.
- **`toCanonical`** is the write-side normalizer; idempotent, so re-serializing a canonical date is a no-op.

## 2. Read-side: route every comparison through the module

- **`core/derived.ts` `buildHistory`** — replace the raw `a.date < b.date` string sort with `compareDates(b.date, a.date)` (newest-first). Keep the existing `date = done?.created ?? plan.updated ?? plan.created ?? ''` *fallback chain* — the chat established the fallback's *axis-mixing* is a separate concern (see §6); this change makes the *comparison* format-proof, which is the bug in front of us.
- **`app/getStaleDocs.ts:60-61`** — replace the `parentUpdated`/`docCreated` raw string compare with `compareDates`. Same latent fragility, same fix, one shared function.

A grep for raw date comparisons (`< b.date`, `.updated >`, etc.) and ad-hoc `new Date()` date stamps is part of the plan's acceptance — the invariant is "no date logic lives outside `core/dates.ts`."

## 3. Write-side: canonical enforcement in `serializeFrontmatter`

`serializeFrontmatter` (`core/frontmatterUtils.ts`) already owns canonical key *order*; it gains canonical date *format*. When emitting `created` / `updated` (and any date-typed field), pass the value through `toCanonical`. Effects:

- New docs are always canonical (most already were).
- The full-ISO outliers (`registry.ts:73`, `ctxBody.ts:23`) and any hand-authored ISO (`loom/ctx.md`) **self-heal on their next save** — no flag day.
- Every `today()`/stamp site (`frontmatterUtils.ts:38`, all reducers, `closePlan.ts:89`, `req.ts`, `rename.ts`, `finalize.ts`, `refinePlan.ts`, `thread.ts`, `buildCtxSource.ts`, `installWorkspace.ts`) switches from inline `new Date()...` to `today()` — uniform and grep-able.

**Open call for you (§D1):** should `serializeFrontmatter` coerce *only* the known date keys (`created`, `updated`), or any value matching a date shape? My lean is **known keys only** — narrow, no surprise coercion of a body field that happens to look like a date.

## 4. The empty / unparseable date

Today the fallback bottoms out at `''`, which the old string sort treated as "oldest." With `toEpoch`, an empty/unparseable value needs a deliberate sentinel:

- `−Infinity` → sorts oldest (matches today's `''` behavior; least surprising).
- `+Infinity` → sorts newest (wrong for History).

**Lean: `−Infinity`**, preserving current ordering semantics. But a done-plan that hits the empty case at all is a *data smell* (a shipped plan with no resolvable date) — so §6 proposes surfacing it rather than silently sinking it.

## 5. Migration (optional, low priority)

Because `toEpoch` is tolerant, **nothing breaks if we never migrate** — legacy ISO docs sort fine. For cleanliness, register a `normalize-dates` migration in the existing `migrateThreads`/migration-registry seam: walk all docs, `toCanonical` their date fields, rewrite only those that change. Idempotent + `--dry-run`, same contract as `backfill-thread-manifests`. This is hygiene, not a correctness dependency — sequence it last.

## 6. Explicitly out of scope (named, not silently dropped)

- **The History fallback-axis problem.** `done.created → plan.updated → plan.created` mixes *ship time* with *last-mutation time*. This design fixes the **format/comparison** bug only; deciding what a done-plan-without-a-done-doc *should* sort by (and surfacing it as a diagnostic instead of an `''` fallback) is a **separate roadmap/derived concern** — note it in the `roadmap` thread, don't fold it here.
- **Temporal.** Parked. The module seam is precisely what keeps adoption a localized, caller-invisible swap if a real zoned/calendar/duration need ever appears. No polyfill enters `core` now.

## Resolved decisions (chat, roadmap-chat-005)

1. **Canonical format = `YYYY-MM-DD` (decision A).** Aligns to the existing majority + documented convention; date-only is sufficient because no Loom date carries sub-day meaning. Accepted cost: same-day shipments tie → broken by a **deterministic stable secondary key** (plan id, then threadId) so re-derivation is identical.
2. **Shared `core` normalizer** covering both History sort and staleness — not a local patch in `buildHistory`.
3. **Temporal parked**, swappable behind the module seam.

## Trade-offs / risks

- **Same-day precision loss** — date-only can't order two plans shipped the same day; mitigated by a deterministic tiebreak, and §6 leaves the door open to let done-docs carry full ISO later (tolerant `toEpoch` already handles the mix, so that would *not* reintroduce the bug).
- **Sweep completeness** — the fix only holds if *every* date site routes through the module; enforced by a grep-based acceptance check in the plan, not trust.
- **Self-heal vs. churn** — canonical-on-save means some untouched-looking docs rewrite their date on their next legitimate save; acceptable (it's a one-time convergence) and avoids a flag-day migration.
