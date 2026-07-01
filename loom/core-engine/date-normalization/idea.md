---
type: idea
id: id_01KV7K7BT499TMH7ZDQN9Q7ZV4
title: Canonical Date Handling
status: done
created: "2026-06-16T00:00:00.000Z"
updated: 2026-06-16
version: 2
tags: []
parent_id: null
requires_load: []
---
# Canonical Date Handling

## What we're building

A single date module in `core` — `core/dates.ts` — that owns **all** date production, parsing, and comparison across Loom. One canonical on-disk format (`YYYY-MM-DD`, date-only), one tolerant parser for comparison, and one enforcement point in `serializeFrontmatter`. Every site that today stamps a date ad-hoc (`new Date().toISOString().split('T')[0]`) or compares dates as raw strings routes through this module instead.

This is the seam Loom should have had from the start: the place that answers "what *is* a Loom date, how is it written, and how are two of them ordered."

## Why it matters

Loom's central promise is that **state is derived** from the documents — and a meaningful slice of that derivation leans on frontmatter dates:

- **History ordering** — `buildHistory` sorts shipped plans newest-first by a date string.
- **Staleness** — `getStaleDocs` decides "parent updated after child" by comparing date strings.

Today there is no owner of dates. They are produced at ~12 independent sites (mostly `YYYY-MM-DD`, with full-ISO outliers in `registry.ts`, `ctxBody.ts`, and hand-authored `loom/ctx.md`) and compared **lexicographically as raw strings**. ISO-8601 only string-compares correctly when every value shares the same shape — so a date-only string compared against a full-ISO string of the *same day* sorts wrong (`"2026-06-16" < "2026-06-16T00:00:00.000Z"`). That is the concrete bug surfaced in the roadmap History view: a shipped plan whose date came from a different-format source landed in the wrong slot, and on the empty-string fallback sank to the bottom. The same fragility sits latent in staleness detection.

The root cause is not a buggy `Date` — it is **mixed formats on disk + string comparison, with no single owner**. A system whose derived state depends this heavily on dates needs exactly one place that produces and compares them.

**Vision link:** serves *"both User and AI always know weaves/threads state"* — the History timeline and staleness flags are part of that derived state, and they are only trustworthy if date ordering is correct regardless of how a date was written (legacy doc, downstream install, hand-authored). This is correctness infra under the derived-state guarantee, not a new user feature.

## Shape

Two layers, agreed in `roadmap-chat-005`:

1. **Read-side (the durable fix):** compare by parsed epoch, never raw string. A tolerant `toEpoch(s)` + `compareDates(a, b)` make any mix of formats — date-only, full-ISO, legacy — order correctly **forever**, including docs that are never migrated.
2. **Write-side (hygiene):** one canonical format (`YYYY-MM-DD`, **decision A** — it is already the de-facto standard at nearly every write site and matches the documented frontmatter convention), enforced centrally in `serializeFrontmatter` so the handful of ISO outliers self-heal on their next save and all new docs are uniform.

**Temporal is explicitly parked.** Loom's date needs are "stamp a calendar day, order two of them" — no timezones, calendars, DST, or durations, which are Temporal's entire reason to exist. Temporal would not have prevented this bug (frontmatter is text; objects still serialize to strings that can still mismatch). Because the library lives *behind* the `core/dates.ts` seam, adopting Temporal later — if Loom ever grows a genuine zoned/calendar need — is a localized swap of the module's internals touching zero callers. We pay nothing now and are not locked out.

## Success criteria

- `core/dates.ts` is the **single** place that produces "today" and compares dates; no remaining ad-hoc `new Date()...` date stamps or raw-string date comparisons outside it.
- `buildHistory` and `getStaleDocs` both order via epoch parse; a set mixing `YYYY-MM-DD` and full-ISO values sorts/flags correctly (regression test on the original History bug).
- `serializeFrontmatter` writes canonical `YYYY-MM-DD`; the ISO-outlier write sites (`registry.ts`, `ctxBody.ts`) and legacy docs converge to canonical on next save.
- Legacy full-ISO docs sort and stale-check correctly **without** requiring migration (tolerant parse); a `loom migrate` step can additionally normalize them in place.
- Same-day ties are broken by a deterministic stable secondary key (re-deriving over unchanged docs is identical).
- Temporal remains swappable behind the module — no caller references a date library directly.
