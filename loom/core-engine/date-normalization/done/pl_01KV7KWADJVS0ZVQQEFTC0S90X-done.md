---
type: done
id: pl_01KV7KWADJVS0ZVQQEFTC0S90X-done
title: Done — Canonical Date Handling — core/dates.ts seam
status: done
created: "2026-06-16T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KV7KWADJVS0ZVQQEFTC0S90X
requires_load: []
---
# Done — Canonical Date Handling — core/dates.ts seam

## Step 1 — Create core/dates.ts: today() (canonical YYYY-MM-DD), toEpoch(s) tolerant parse (date-only + full-ISO + legacy; empty/unparseable → −Infinity), compareDates(a,b) via toEpoch, toCanonical(s) idempotent normalizer, and the LoomDate type. Export from core/index.ts. Unit-test each: equal-day across formats, ordering, sentinel, idempotent toCanonical.

Created `packages/core/src/dates.ts` — the single date owner. Exports: `LoomDate` type, `today()` (canonical `YYYY-MM-DD` via `new Date().toISOString().slice(0,10)`), `nowIso()` (full ISO instant for prose/config timestamps that legitimately want sub-day precision), `toEpoch(s)` (tolerant parse → epoch ms; empty/unparseable → `-Infinity`; **also handles `Date` objects** since gray-matter parses unquoted YAML dates as Dates), `compareDates(a,b)` (chronological, never `NaN`), `toCanonical(s)` (idempotent normalizer; safe on garbage; handles `string`+`Date`). Exported from `core/index.ts`. Unit tests in `tests/dates.test.ts` (registered in `test-all.sh`): canonical shape, mixed-format equal-epoch, chronological ordering across formats, the same-day mixed-format regression, `-Infinity` sentinel/no-NaN, and `toCanonical` normalize/idempotent/safe — all green.

## Step 2 — In serializeFrontmatter, pass known date keys (created/updated only — §D1) through toCanonical so all written docs are YYYY-MM-DD and ISO outliers self-heal on next save. Replace every ad-hoc `new Date().toISOString().split('T')[0]` (and the full-ISO outliers) stamp with today().

Write-side. `serializeFrontmatter` (`core/frontmatterUtils.ts`) now normalizes the known date keys (`created`/`updated`) through `toCanonical` on every write — handling both strings and `Date` objects. Replaced every ad-hoc `new Date().toISOString().split('T')[0]` stamp with `today()`, and the two genuine full-instant sites with `nowIso()`:
- **`today()`**: `frontmatterUtils.createBaseFrontmatter`, `applyEvent`, `reducers/ideaReducer`, `reducers/designReducer` (deleted their local `today()` helpers), `app/closePlan`, `app/buildCtxSource` (aliased to avoid a local-var clash), `app/refinePlan`, `app/finalize`, `app/req` (both sites), `app/weaveDesign`, `app/rename`, `app/thread` (deleted local helper), `app/installWorkspace`, `mcp/tools/updateDoc`, `mcp/tools/patchDoc`, `mcp/tools/createReference`.
- **`nowIso()`**: `core/registry` (`~/.loom/config.yaml` entry), `core/bodyGenerators/ctxBody` (`*Generated: …*` prose), `app/getState` (`generatedAt` runtime snapshot).

**Deeper root cause found + fixed:** gray-matter parses an unquoted `created: 2026-06-09` back as a JS `Date`, and the old `serializeValue(Date)` re-emitted it as a full-ISO quoted string — so a doc *drifted* date-only → full-ISO simply by being loaded and re-saved. That load→save drift was itself a primary source of the mixed formats Rafa hit. Fixed by (a) `toCanonical`/`toEpoch` accepting `Date`, and (b) coercing `created`/`updated` to canonical strings at the load boundary (`fs/frontmatterLoader`), so the in-memory domain is always canonical strings. Verified by the `plan-frontmatter-steps` byte-stable round-trip test (was failing, now green).

## Step 3 — Replace buildHistory's raw `a.date < b.date` string sort with compareDates(b.date, a.date) (newest-first). Replace getStaleDocs' raw parent.updated vs doc.created string compare with compareDates. Keep the existing date fallback chains unchanged — this step fixes the comparison, not the fallback axis (out of scope, §6).

Read-side — every date comparison now routes through `compareDates`:
- `core/derived.ts` `buildHistory`: raw `a.date < b.date` string sort → `compareDates(b.date, a.date)` (newest-first). **The roadmap History fix.**
- `app/getStaleDocs.ts` `isNewerDate`: raw `a > b` → `compareDates(a,b) > 0`.
- `core/filters/sorting.ts` `sortDocumentsByCreated` (a 3rd site beyond the plan's named two): `new Date().getTime()` ad-hoc parse → `compareDates`.
- `core/derived.ts` `ROADMAP_CMP` tie-breaker (a 4th site): raw `a.created < b.created` → `compareDates(a.created, b.created)`.

Verified by `roadmap.test.ts`, including a new `buildHistory`-level regression case (7b): a date-only done-doc vs a full-ISO done-doc order chronologically, not by raw string. All green.

## Step 4 — Grep the codebase for remaining raw date comparisons and ad-hoc new Date() date stamps outside core/dates.ts; route or justify any stragglers. Add a regression test reproducing the original roadmap History mixed-format bug (a date-only done-doc date vs a full-ISO date on the same/adjacent day) and asserting correct order.

Acceptance sweep + regression. Grepped all `packages/**/src/**/*.ts`: every `new Date(` / `toISOString` / `Date.parse` / `.getTime()` occurrence now lives **only** in `core/dates.ts` (the invariant: no date logic outside the seam). A second grep for raw `<`/`>` comparisons on `.created`/`.updated`/`.date` found the two stragglers fixed in step 3 (`sortDocumentsByCreated`, `ROADMAP_CMP`). Regression test added at the `buildHistory` level (`roadmap.test.ts` case 7b) plus the unit-level same-day mixed-format case (`dates.test.ts`). Full suite green: `./scripts/test-all.sh` passes end-to-end (incl. MCP integration 17/0), and the `plan-frontmatter-steps` byte-stable round-trip that initially regressed now passes — proving the load→save Date-drift is closed.

## Step 5 — Register a `normalize-dates` migration in the existing migration registry: walk all docs, toCanonical their date fields, rewrite only those that change. Idempotent + --dry-run, mirroring backfill-thread-manifests. Hygiene only — not a correctness dependency since toEpoch is tolerant; sequence last.

`normalize-dates` migration. New `app/normalizeDates.ts`: walks all `loom/**/*.md` (skipping the frozen `.archive/`), and for any doc whose `created`/`updated` isn't canonical, re-saves via the blessed `loadDoc → saveDoc` round-trip (which canonicalizes through `serializeFrontmatter` and parses plan steps correctly, so a re-save never corrupts structured steps). Idempotent, `--dry-run`, per-file try/catch (an unreadable doc is reported, not fatal). Wired into the existing `loom migrate` command (`cli/commands/migrate.ts`) as a second registered migration after `backfill-thread-manifests` — `loom migrate` now runs both and reports each. **Downstream coverage:** because `loom migrate` already ships in the binary, every upgrading install gets date normalization for free; and since `toEpoch` is tolerant + docs self-heal on next save, the migration is cosmetic, not a correctness dependency (see the chat reply on Rafa's `loom migrate-dates` question).
