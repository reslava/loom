---
type: chat
id: ch_01KV7GXEVRRHCE2G0E2HMVTS1H
title: roadmap history sort criteria
status: active
created: "2026-06-16T00:00:00.000Z"
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 24
---
# roadmap history sort criteria

## Rafa:

Which sort criteria use roadmap for history tree node?
I am experimenting rare sorting, I think we used done docs to sort and when a plan have no associated done, the sorting breaks

Tell me

## AI:

Your instinct is right — here's the exact criterion and where it breaks.

## The sort key

History lives in `buildHistory(state)` (`packages/core/src/derived.ts`). It collects every plan with `status === 'done'` across all weaves, builds a `date` for each, and sorts **newest-first** by that string:

```ts
if (plan.status !== 'done') continue;
const done = (thread.dones ?? []).find(d => d.parent_id === plan.id);
const date = done?.created ?? plan.updated ?? plan.created ?? '';
...
return shipped.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
```

So the **intended** sort key is the **done-doc's `created`** — which matches the design decision (2026-06-14, decision 2: *"the done-doc is born when the plan closes, so its `created` is the shipping timestamp"*). That's the one true ship-time axis.

The tree node doesn't add its own sort: `createHistoryBand` (in `treeProvider.ts`) renders `roadmap.history` **in the order it's given**, and the group-by-thread variant just buckets while preserving that order. So whatever `buildHistory` decides is what you see.

## Where it breaks — exactly what you suspected

The `date` has a **3-level fallback chain**: `done.created → plan.updated → plan.created → ''`. The problem is those are *different time axes*, so when a done plan has no matching done-doc the key stops meaning "ship time":

1. **No done-doc found** → it falls back to `plan.updated` (last frontmatter mutation), then `plan.created`. A plan can have been *created* months before it shipped, or *updated* by some unrelated metadata touch after — so it lands in a misleading slot in the timeline. It's not random, it's just sorted on the wrong clock.

2. **All fallbacks empty** (`''`) → empty string is lexicographically smaller than any real date, so the plan sinks to the **very bottom** of History (treated as oldest). That's the most visible "broken" case.

3. **Mixed date formats** (a secondary gremlin) → the comparison is a raw **string** compare, not a date compare. Done-doc `created` is often `YYYY-MM-DD` while a plan's `created`/`updated` can be a full ISO timestamp (`2026-06-16T00:00:00.000Z`). `"2026-06-16" < "2026-06-16T00:00:00.000Z"` is `true` (shorter prefix wins), so two items on the same day can flip purely on format. So even *with* a done-doc, mixing the fallback axis in next to it makes ties non-deterministic.

There's also a quiet linkage assumption: a done-doc only counts if its `parent_id === plan.id`. If a done-doc exists but its `parent_id` is wrong/missing (or points at a step id), the `find` misses and you silently drop to the `plan.updated` fallback — same failure as "no done-doc."

## So, to answer directly

- **Criterion:** done plans, newest-first, keyed on `done-doc.created`, with a fallback to `plan.updated`/`plan.created`/`''`.
- **Why it breaks:** the fallback compares a *different clock* (and sometimes a *different string format*) against done-doc dates, so plans without a clean done-doc get mis-placed (or dumped to the bottom on the `''` case).

If you want to harden it, the root-cause fix is to **make the key one consistent axis**: normalize to a `Date`/epoch before comparing (kills the string-format flips), and decide deliberately what a done plan *without* a done-doc should mean — surface it as a diagnostic ("done plan missing done-doc"), or fall back to a normalized `plan.updated` but never to `''`/`created`. Want me to spin that into a small design note + plan step, or is this just for your sorting experiment right now?

## Rafa:

I disover the problem in date formats, a done doc `template` is created with frontmatter date format
created: 2026-06-16
wrongly sorted

when I update it to 
created: "2026-06-16T00:00:00.000Z"
sorted correctly

we could fix that `template` done creation
but the best fix will be:
- unify/normalize date formats
- accept/convert the legacy ones

## AI:

Agreed — fix the cause, not the done-template alone. But I checked every write site first, and the picture flips the "which format is canonical" question:

**The codebase is already overwhelmingly date-only `YYYY-MM-DD`.** Nearly every write does `new Date().toISOString().split('T')[0]`:
- `frontmatterUtils.ts:38` (the default `created`), `closePlan.ts:89` (the done-doc template itself!), all reducers (`ideaReducer`, `designReducer`), `req.ts`, `rename.ts`, `finalize.ts`, `refinePlan.ts`, `thread.ts`, `installWorkspace.ts`.
- CLAUDE.md's frontmatter convention also documents `created: YYYY-MM-DD`.

The **full-ISO strings are the outliers**: `registry.ts:73`, `ctxBody.ts:23`, and the hand-authored `loom/ctx.md` (`"2026-04-29T00:00:00.000Z"`). So the done-doc template is *already* date-only — meaning your "wrongly sorted" case is a bare-date done-doc being string-compared against an ISO-formatted *fallback* (`plan.created`/`plan.updated` from one of those outlier paths, or a legacy doc). That's the mix biting.

## This is bigger than history sort

The same fragile string-compare on dates also lives in **`getStaleDocs.ts:60-61`** — it compares `parent.updated` vs `doc.created` as raw strings to decide staleness. So a format mismatch there can mis-flag (or miss) stale docs too. A one-off fix in `buildHistory` would leave that latent. That argues for **one shared normalizer in `core`**, not a local patch.

## The actual root-cause fix — two layers

1. **Read-side (the real fix, non-negotiable): compare by parsed epoch, never raw string.** A single `toEpoch(dateStr): number` in core, used by `buildHistory`'s sort *and* `getStaleDocs`. `new Date("2026-06-16").getTime()` and `new Date("2026-06-16T00:00:00.000Z").getTime()` are equal — so any mix of formats (legacy docs, downstream installs, hand-authored) sorts correctly **forever**. This is what makes it durable, not just patched.

2. **Write-side (hygiene): one canonical format, enforced in `serializeFrontmatter`.** Normalize date fields on every write, so the handful of ISO outliers self-heal on next save and new docs are uniform. Optional `loom migrate` step to convert legacy in place.

Your two bullets map exactly: *"unify/normalize"* = write-side canonical + serialize enforcement; *"accept/convert legacy"* = read-side epoch parse (accept) + migration (convert).

## The one decision I need from you (design call)

**Which canonical format on the write side?**

- **(A) Date-only `YYYY-MM-DD`** — aligns to the existing majority + CLAUDE.md convention; tiny write-side change (fix ~3 outliers); human-clean frontmatter. **Cost:** no intra-day ordering — two plans closed the *same day* have equal keys, so their order falls to a deterministic tiebreak (plan id / thread). For a shipping timeline that's almost always fine.
- **(B) Full ISO timestamp** — intra-day-precise shipping order. **Cost:** fights the whole codebase + convention, touches many write sites, migrates most docs, uglier frontmatter — over-engineered for `created` dates nobody enters with sub-day precision.

My lean: **(A) date-only canonical + read-side epoch parsing**, with same-day ties broken by a stable secondary key for determinism. Note the nice property of doing the read-side layer: because epoch-parsing handles mixed formats, you *could* later let the done-doc alone carry full ISO for true ship-time precision without breaking anything — so (A) doesn't paint us into a corner.

This touches frontmatter serialization across all doc types + a core date helper, so I'm stopping here for your call before writing anything.

Pick A or B (and confirm "shared `core` normalizer covering both history sort + staleness"), and I'll turn it into an idea/design + plan in the right thread.

## Rafa:

A and confirmed "shared `core` normalizer", but don't code anything until we decide about temporal

note: this is bigger, we should have been careful about this from the very beginning in a system that relies heavily on the dates of the frontmatters

### Temporal

Do you know there is a new javascript/typescript feature called Temporal:

Temporal is the modern, immutable, and timezone-aware replacement for the legacy Date object in JavaScript, standardized as part of ECMAScript (ES2026).  It resolves decades of bugs associated with Date, such as mutation side effects, ambiguous parsing, and lack of timezone support, by providing distinct classes for different temporal concepts. 

Key features and components include:

Immutability: All Temporal objects are immutable, preventing accidental state changes and side effects common with Date. 
Timezone and Calendar Support: Native handling of time zones (including DST) and non-Gregorian calendars (e.g., Hebrew, Chinese, Islamic) without external libraries. 
Core Classes:
Temporal.Instant: A unique point in time (timestamp).
Temporal.ZonedDateTime: A specific moment with an associated time zone.
Temporal.PlainDateTime, PlainDate, PlainTime: Date and time components without timezone context.
Temporal.Duration: Represents a length of time (e.g., 2 hours, 3 days).
Namespace Structure: Unlike Date, Temporal is a namespace object with static methods; you cannot use new Temporal(). 

I think we should update Loom to use it, what you think?


## AI:

A + shared `core` normalizer — locked. No code until we settle Temporal. And yes, your meta-point is the real lesson: a system whose state derivation leans on frontmatter dates should have had **one** place that owns dates from day one. That's the fix worth making regardless of which library sits underneath.

But let me be honest rather than chase the shiny thing, because I think Temporal is the *right answer to a question Loom isn't asking*.

## What Loom actually needs from dates

Look at every date site I found: `created` / `updated` stamps (almost all `YYYY-MM-DD`), `today()`, and two comparisons (history sort, staleness). That's the whole surface. Loom needs to: **stamp a calendar date, and order two of them.**

It does *not* need: timezones, DST, non-Gregorian calendars, duration arithmetic, instants vs zoned vs plain. Those are exactly Temporal's reason to exist — and Loom has none of them. A `created: 2026-06-16` is a calendar day with no zone and no time; there's nothing for Temporal's power to bite on.

## Temporal wouldn't even have prevented *this* bug

This is the part that matters. The bug was **mixed string formats on disk + raw string comparison**. Frontmatter is text, so whatever object you use in memory you still *serialize to a string* — and you can still write two different string shapes unless one place enforces the format. Temporal objects serialize too (`.toString()`), and a `PlainDate` vs an `Instant` would serialize to *different* strings, so it could just as easily have produced the same mismatch. The thing that actually fixes and prevents it is: **one canonical format + parse-on-compare**, i.e. the normalizer we already agreed on. Temporal is orthogonal to the root cause.

## The real cost

- **Runtime availability.** Temporal is Stage 3 / ES2026; native engine support landed in browsers first and Node's native (un-flagged, LTS) support is recent-at-best — I'd want to *verify* the current Node LTS ships it before relying on it, not assume. Until then you need `@js-temporal/polyfill`, which is heavy (hundreds of KB).
- **`core` is supposed to be pure, dependency-light domain logic.** Dropping a large polyfill into `core` — which then rides along into the CLI, the MCP server, and the VS Code extension bundle — is a real weight cost for stamping `YYYY-MM-DD`. That's a poor trade for Loom's footprint.

## What I'd actually do — the seam, not the library

The durable fix to your meta-point is a **single date module in `core`** — call it `core/dates.ts` — that owns *all* date production and comparison:

- `today(): string` → canonical `YYYY-MM-DD` (decision A)
- `toEpoch(s: string): number` → tolerant parse for ordering (accepts legacy ISO too)
- `compareDates(a, b)` / `isAfter(a, b)` → used by `buildHistory` **and** `getStaleDocs`
- canonical-format enforcement that `serializeFrontmatter` calls

Every current `new Date().toISOString().split('T')[0]` and every string date-compare routes through this module. **That seam is the whole win** — it's where your "should've been careful from the beginning" concern gets resolved. And because the library is now an *implementation detail behind the seam*, adopting Temporal later (if Loom ever grows a genuine timezone/calendar need — I don't think it will for frontmatter) becomes a localized swap of that module's internals, touching zero callers. We don't pay for it now and we're not locked out of it later.

## Recommendation

**Defer Temporal; build the `core/dates.ts` seam now with plain `Date` internals (zero new deps).** Revisit Temporal only if (a) Loom acquires a real zoned/calendar/duration requirement, and (b) Node ships it natively so we owe no polyfill. The seam is what your instinct is really pointing at; the library is a swappable detail.

If that lands for you, the scope to write up is: `core/dates.ts` (today/toEpoch/compare + canonical enforcement) → route `serializeFrontmatter`, `buildHistory`, `getStaleDocs`, and the ~3 ISO-outlier write sites through it → optional `loom migrate` to normalize legacy docs in place. Which thread should own this — a new thread under `core-engine` (it's cross-cutting infra, not really "roadmap")? I'll draft the idea + design there once you confirm Temporal is parked.

## AI:

Done — new thread + idea + design drafted under `core-engine`.

- **Thread:** `loom/core-engine/date-normalization/` (`th_01KV7K6MEVANK37386ZTJ8ETZR`, "Canonical Date Handling")
- **Idea:** `date-normalization-idea.md` (`id_01KV7K7BT499TMH7ZDQN9Q7ZV4`) — the seam, the two-layer fix, decision A, Temporal parked, success criteria.
- **Design:** `date-normalization-design.md` (`de_01KV7K8QRWASFRVD0RECSB96D2`) — `core/dates.ts` module shape, the read-side (`buildHistory` + `getStaleDocs`) and write-side (`serializeFrontmatter` + every stamp site) routing, optional migration, and what's deliberately out of scope.

Both are `status: draft` — review before finalize.

**Two open calls I left in the design for you** (didn't pick unilaterally — they shape the API):

1. **§D1 — canonical coercion scope:** should `serializeFrontmatter` normalize *only* known date keys (`created`/`updated`), or *any* value that looks like a date? My lean: **known keys only** (no surprise coercion of body-ish fields).
2. **§4 — empty/unparseable date sentinel:** `−Infinity` (sorts oldest, matches today's `''` behavior — my lean) vs `+Infinity`. Plus the related note that a done-plan hitting the empty case is a data smell worth surfacing, not silently sinking.

I also explicitly scoped **out** the History *fallback-axis* problem (done-doc time vs plan-mutation time) — that's a separate `roadmap`-thread concern; this thread is format/comparison only. Flag if you'd rather fold it in.

Next: answer §D1 + §4 (or say "your leans"), then I'll draft the plan. Want me to leave them as drafts, or finalize idea/design once the two calls are settled?

## Rafa:

your leans

i marked idea, design done

## AI:

Plan drafted: `date-normalization-plan-001.md` (`pl_01KV7KWADJVS0ZVQQEFTC0S90X`), with your leans baked in (§D1 known keys only, §4 −Infinity sentinel).

**5 steps:**
1. `core/dates.ts` module (`today` / `toEpoch` / `compareDates` / `toCanonical` + `LoomDate`) + unit tests — the seam.
2. Write-side: canonical enforcement in `serializeFrontmatter` (created/updated only) + replace every `new Date()...split('T')[0]` stamp with `today()`. *(blocked by 1)*
3. Read-side: `buildHistory` sort + `getStaleDocs` compare → `compareDates`. The durable fix. *(blocked by 1)*
4. Acceptance sweep (grep for stray date logic outside the module) + regression test on the original History mixed-format bug. *(blocked by 2, 3)*
5. *Optional* `normalize-dates` migration — hygiene only, tolerant `toEpoch` means it's never a correctness dependency. *(blocked by 1, sequence last)*

Steps 2 and 3 both unblock after step 1, so they can go in either order (or parallel-ish across DoSteps). Plan is `status: draft`.

Next: finalize + start the plan when you're ready (`loom_finalize_doc` → `loom_start_plan`), then DoStep from step 1 — or tell me to start. Want any step split/merged before we lock it?

## Rafa:

plan started
do whole plan

## AI:

Good question — and I already built for it, so the short answer is **no separate `loom migrate-dates` command.** Here's the reasoning:

**1. It's folded into `loom migrate`, which is *the* downstream migration runner.** That command already ships in the `loom` binary specifically so any upgrading install (here or someone else's repo) can run registered migrations — that's how `backfill-thread-manifests` reaches downstream projects. I registered `normalize-dates` as a second migration in the same command. So `loom migrate` now runs both and reports each, with the same `--dry-run`. A downstream user types the one command they already know; a separate `migrate-dates` would fragment the surface (this is the rails `db:migrate`-runs-all model, not one command per migration).

**2. Downstream projects mostly don't *need* it.** This is the important part. Because of the three-layer fix, a downstream repo with mixed-format dates is already correct *without* migrating:
- `toEpoch` is **tolerant** — History and staleness sort right whether dates are `YYYY-MM-DD`, full-ISO, or mixed.
- Docs **self-heal** to canonical on their next legitimate save (the `serializeFrontmatter` enforcement), and the load→save **Date-drift that *created* the mixing is now closed** (the loader coerces, the serializer canonicalizes).

So `normalize-dates` is **cosmetic cleanup** — it makes on-disk dates uniform in one pass instead of waiting for each doc's next save. Not a correctness dependency. That's also why I sequenced it last and made it non-fatal per-file.

**3. If you want it more discoverable**, a dedicated `loom migrate --only dates` flag or a `loom migrate-dates` alias is a ~5-line add over the same `normalizeDates` use-case — say the word. My lean is to leave it folded: one migration command, runs everything, `--dry-run` to preview.

---

**Plan complete.** All 5 steps ✅, `date-normalization-plan-001` auto-closed to `done`. Summary of what shipped:
- `core/dates.ts` seam (`today` / `nowIso` / `toEpoch` / `compareDates` / `toCanonical`), tolerant of `Date` inputs.
- Write-side: canonical enforcement in `serializeFrontmatter` + `today()`/`nowIso()` at all ~19 stamp sites.
- Read-side: `buildHistory`, `getStaleDocs`, `sortDocumentsByCreated`, and the roadmap tie-breaker all compare via `compareDates`.
- **Bonus root-cause:** the gray-matter load→save Date-drift (unquoted `created` → `Date` → full-ISO on save) — the actual mechanism that mixed your formats — is closed at the load boundary.
- `normalize-dates` migration folded into `loom migrate`.
- Full suite green (incl. the new History regression test and the byte-stability test that caught the drift).

The original symptom — History mis-ordering on a bare-date done-doc — is fixed and locked by a regression test. Want me to commit this?

## Rafa:

commit push

can I test with `loom migrate --dry-run` in other project?

## AI:

Committed + pushed to `main` (`a5405a9`, 36 files).

**Yes — `loom migrate --dry-run` in another project is safe to test right now.**

- `build-all.sh` just relinked the global `loom` binary, so it has the new code. `loom migrate` is a plain CLI command (fresh process each run), so it picks up the new build immediately — *no* MCP-staleness caveat (that only bites live MCP tool calls in a running session).
- The other project must be a Loom workspace (have a `.loom/`). `cd` into its root and run `loom migrate --dry-run`.
- `--dry-run` **touches nothing** — it scans and prints what it *would* do for both registered migrations: any missing `thread.md` (backfill) and any non-canonical `created`/`updated` it would rewrite (e.g. `created: 2026-06-09T00:00:00.000Z → 2026-06-09`). Drop `--dry-run` to actually apply.
- Expect it to list a fair number of date normalizations in an older project — those are exactly the full-ISO timestamps the load→save drift had been accumulating.

One note: `--dry-run` reports what it'd change but, because the fix is also self-healing + tolerant-compare, you're not obligated to run the real migration — it's cleanup, not a correctness gate. Good way to *see* the scale of the drift in a real repo, though.

## AI:

**My lean: `1.9.1` (patch).**

Semver by user-facing surface:
- The headline change is a **bug fix** — roadmap History mis-ordering. That's textbook patch.
- **No new public surface**: no new CLI command, no new MCP tool, no new API. `core/dates.ts` is internal; the stamp/compare refactor is invisible to users.
- The one thing that smells minor-ish is the `normalize-dates` migration — but it's **hygiene folded into the existing `loom migrate` command**, behind `--dry-run`, not a new headline capability. That doesn't clear the bar for a minor bump on its own.

So it lands as a patch: fixes a bug, hardens internals, no additive public feature.

**When I'd say `1.10.0` instead:** if we were presenting `normalize-dates` as a *promoted feature* users should act on (e.g. release notes leading with "run `loom migrate` to normalize your dates"), or if there were a new command/flag/tool. There isn't — the migration is opportunistic cleanup and the system self-heals without it.

**One caveat worth a CHANGELOG line either way:** on-disk frontmatter dates now self-heal to canonical `YYYY-MM-DD` on save (some docs that carried full-ISO will rewrite their `created`/`updated` on their next save). It's non-breaking — purely a normalization — but it's a visible diff in users' repos, so it's worth noting.

Recommendation: **1.9.1**, with a CHANGELOG entry covering the History fix + the date-self-heal note. Want me to run the version bump (and the tag-push gotcha applies — I'll push the tag explicitly so the release triggers)?