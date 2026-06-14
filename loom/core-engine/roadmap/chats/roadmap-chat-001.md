---
type: chat
id: ch_01KV3C6SKC40ED9K818CV3R6JR
title: roadmap Chat
status: done
created: "2026-06-14T00:00:00.000Z"
updated: "2026-06-14T00:00:00.000Z"
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 17
---
# roadmap Chat

## Rafa:

Target version: 1.8.0

### Fix:

Sometimes AI add double, repeated `## AI:` header when reply a chat. loom_append_chat already add that header and sometimes AI add anoher one.
Possile fix: add better description to mcp tool `loom_append_chat` to indicate to AI: just reply, no `## AI:` header

### Filter

Current extension filter has these 2 option:
- Active
- Implementing

Add a new one for Active or Implementing, maybe. Suggeest proper name.

### Roadmap

We can take advantage of Loom and implement a roadmap tool that allow users and AI to know:

1. History, Past, : all threads already done in order, recently done first.
2. Roadmap, Present & future: all threads currently implementing and the pending ones in order of dependency.

This will be showed in extension, by presing a new `Roadmap` toolbar button (Enabled / Disabled). 
When enabled, current Filter button will allow filter by: all, history, roadmap

#### A Loom roadmap tool 

It should be derived, not authored.** this is the one cross-weave view that's missing, sometimes I used a hand mantained roadmap in a markdown chat doc — which is precisely the "hand-written active-work pointer" anti-pattern Loom tells AI to avoid (It is supposed to read state from MCP, not a manual list). 

#### New thread feature: depends-on

Let a **thread declare depends-on other threads** (like steps have `blockedBy`), then a `loom roadmap` view does a topological sort and overlays live status (done / active / blocked) — derived from the docs, never typed. That fits Loom's "state is derived" core. Keep it a read-model/view, not a new planning system — the edge is that it falls out of existing state, not that it's another PM tool.

#### Other Features

- **History of done threads** — already derivable: every closed plan has a dated done doc, so a thread's completion is a fact in the data. A **timeline** ("what shipped when") falls straight out of done-doc dates — pure read-model, nothing new to author. This is the strongest part: it's free and it's the part people actually want to look back on.
- **Show in the extension** — the natural home; a graph/timeline panel next to the existing AI buttons. Past (done) at the bottom as history, present (active/blocked) in the middle, future (pending, dependency-ordered) at the top. One glance = where the project is.
- **Priority/Reorder** — here's the one real design tension, worth calling out: a *derived* roadmap and *free* drag-to-reorder fight each other. We wil resolve it as **two layers**: the **dependency graph is hard** (you can never drag a thread before something it depends on — the tool refuses, same spirit as `blockedBy`), and on top of that a **priority/order overlay is soft** (among independent threads the partial order leaves free, user can drag to set what comes first). So reorder = setting priority within the slack the dependencies allow, not overriding them. That keeps it honest *and* gives users the control they want.

Net shape: **derived skeleton (deps + live status) + soft priority overlay (your reorder) + done-history timeline**, rendered in the extension. The deps and history are derived; the only thing you author is priority among ties — which is exactly the bit that genuinely needs a human. That's a tool I'd use over hand-maintaining this list.

## AI:

Strong agree on the core. **Vision-check:** a derived roadmap serves "both User and AI always know weaves/threads state" and removes a real manual step — the hand-maintained roadmap markdown, which is exactly the "hand-written active-work pointer" anti-pattern Loom already tells the AI not to trust. So this is vision-aligned, not feature-creep. The instinct (derived skeleton + soft priority overlay + done-history) is right. Below is where I'd push, in order of how much it matters.

### 1. The real architecture decision: where does `depends-on` live?
A thread is a *folder*, not a doc — it has no single canonical frontmatter today. So `depends-on` (and the soft `priority`) need a **home**. Options:
- **(a) On the idea doc's frontmatter.** The idea is the natural "head" of a thread (it's what starts it, it's required before design/plan). Co-located, travels with the thread, no central file.
- **(b) A per-thread metadata doc** (`{thread}-thread.md` or similar). Cleaner conceptually but adds a new doc type — heavy.
- **(c) A central `.loom/roadmap.yml`.** Rejected on sight: that *is* the hand-maintained list we're killing.

I lean hard on **(a)** — `depends_on: [thread-id]` and `priority: N` on the idea doc. It keeps the authored bit minimal and co-located, and there's no new doc type. This is a STOP-worthy decision before any code, but I wanted to name it first because everything else hangs off it.

### 2. History should key on **done plans**, not "done threads"
This is my biggest substantive disagreement. A thread is almost never "finished" — you can always add another plan to it, so "when is a thread done?" has no clean answer. But a **plan** has a crisp terminal state (all steps ✅ → `{plan-id}-done.md` with a date). So:
- **Timeline / history unit = the completed plan**, not the thread. "What shipped when" falls straight out of done-doc dates with zero ambiguity.
- You can still *group/display* by thread, but the atomic shipped event is the plan. This sidesteps the entire "thread completion" definitional swamp and is, as you said, the part that's free and that people actually look back on.

A thread's live *status* (active/implementing/blocked) is still derivable for the present/future buckets — that part's fine. It's only "done" that's slippery, and pinning it to plans fixes it.

### 3. Cross-weave is the part with teeth
Everything in Loom today is weave/thread-scoped; the roadmap is the **first cross-weave read-model**. Implications worth deciding up front:
- `depends_on` targets must be **globally resolvable thread ids** (a thread in `ai-integration` can depend on one in `core-engine`). Confirm thread ids are unique across weaves, or qualify them (`{weave}/{thread}`).
- New top-level MCP resource `loom://roadmap` (sibling of `loom://state` / `loom://catalog`), not a scoped one.

### 4. Two diagnostics the topo sort *must* produce
The dependency graph opens two failure modes that need to be findings, not crashes — same spirit as `isStepBlocked`'s best-effort rule:
- **Cycles** — A depends-on B depends-on A. Detect, flag as a `validate-state` diagnostic, still render the rest.
- **Dangling deps** — depends-on an archived/renamed/missing thread. Reuse the existing blocker convention: archived-as-done = satisfied; missing/unknown = flagged blocked. Decide this explicitly rather than letting it fall out.

I'd surface both through the existing `validate-state` prompt so the roadmap and the diagnostics share one truth.

### 5. Sequence it: derived skeleton first, drag-UI last
The honest split on cost vs. validation value:
- **Cheap + high-value (build first):** the pure derivation — `buildRoadmap(state)` in core (topo sort, status overlay, history-from-done-docs), exposed as a `loom roadmap` **CLI** that prints the ASCII timeline. This is fully **headless-testable** — the hard logic (deps, ordering, status, cycles) gets unit tests with no UI. It also gives *you and me* the cross-weave view immediately, in this repo.
- **Expensive + lower validation value (build last):** the extension panel + drag-to-reorder soft-priority UI. Drag-reorder is genuinely nice but it's the most UI-heavy, least-testable, least-load-bearing piece.

Given Loom is still an unvalidated bet, I'd ship the derived `loom roadmap` CLI + read-model first, prove it's useful, *then* invest in the panel. The skeleton is where 80% of the value lives.

### 6. The killer feature is "blocked," not the timeline
One reframe: the thing a human genuinely *can't* see today is **"this thread is blocked on that unfinished one, across weaves."** The timeline is pleasant but you can already eyeball done dates. The cross-weave blocked-by signal is the part that's hard to compute by hand and high-leverage. I'd make that the headline of the idea doc, not the history.

### Soft-priority detail
Store `priority` on the idea doc (per #1), drag-reorder writes it via MCP. Among ties the topo order leaves free, sort by `priority` then a stable secondary (created date) so the view is deterministic even when nobody's set a priority. Reorder = "set priority within the slack the deps allow," exactly as you framed it — the tool refuses a drag that violates a hard edge.

### On the other two items (briefly — they're separate, smaller)
- **Double `## AI:` fix:** agree, the fix is sharpening the `loom_append_to_chat` *tool description* (and the extension launch prompt, which out-ranks tool descriptions) to say "reply body only, the tool adds the role header." Worth noting the launch prompt is the stronger lever than the tool description alone.
- **Filter combo:** note the "Active or Implementing" filter is just a **mini-roadmap** — its "present" bucket *is* active+implementing. If the roadmap ships, this filter and the roadmap's present-bucket are the same query; might fold rather than add a third filter value. For a name: **"In Progress"** (or "Open"/"Working set").

**Net:** I'm in. One decision to make before code — where `depends_on`/`priority` live (#1) — and one design change I'd insist on — history keyed on done-plans, not threads (#2). Build order: pure read-model + `loom roadmap` CLI first, extension panel + drag last.

Want me to turn this into the thread's idea doc (headlining the cross-weave blocked-by signal), or keep pressure-testing here first? I'd hold on #1 until you pick a home for the dependency field.

## Rafa:

### 1.  where does `depends-on` live

New doc type: just `thread.md` similar to actual `reqs.md` or `ctx.md`
Usually a thread start with a chat, sometimes with an idea created from a chat of other thread, sometimes I create 4 threads with no idea yet, etc
I want to see the thread in the roadmap and order them by priority or add dependency.

frontmatter:

```markdown
---
type: thread
id: ULID 
priority: Soft-priority detail
---
```

Agree? Or you still prefer on idea doc?

### 2. History should key on **done plans**, not "done threads"

Agree. With grouping by thread option.

### 3. Cross-weave is the part with teeth

We can resolve this with: `thread.md` with ULID Id in the frontmatter: 
`id: th_xxxxxxxxxxxxxxxxxxxxxxx`

### 5. Sequence it: derived skeleton first, drag-UI last

Agree. When create the plans make them in 2 phases.

### 6. The killer feature is "blocked," not the timeline

Agree.

## AI:

### 1. `thread.md` — you're right, I'll drop the idea-doc home
Your counter kills my option (a): threads don't always have an idea (you spin up 4 empty threads, or a thread starts from another thread's chat). If `depends_on`/`priority` lived on the idea doc, those threads would be invisible to the roadmap until an idea exists. That's a real hole. **A `thread.md` with its own `th_` ULID is the correct anchor** — it gives a thread a stable identity independent of which docs exist yet, and the ULID (not the folder path) is what `depends_on` points at, so rename/move/cross-weave all resolve through the id index instead of breaking. This is better than what I proposed; switching to it.

So: `loom/{weave}/{thread}/thread.md`
```yaml
---
type: thread
id: th_01K…              # ULID, stable ref target
title: "Roadmap"
priority: 100            # soft order among dependency-free slack
depends_on: [th_…, th_…] # hard edges, cross-weave by id
---
```

But a new doc type drags in five things we should decide now so we build it right:

**(a) Status stays DERIVED — never a field on `thread.md`.** This is the trap to avoid. `thread.md` holds only the *authored* bits (id, title, priority, depends_on). `done/active/blocked/pending` is computed from the thread's plans + done-docs + dep edges, every read. The moment a `status:` field appears on thread.md we've recreated the hand-maintained-state anti-pattern this whole feature exists to kill. Keep it out.

**(b) Required + auto-created, with a migration.** If `thread.md` is optional, the derived roadmap has holes (threads that "don't exist" to the read-model). So: every thread folder gets one, auto-scaffolded at thread-creation time, and a one-time migration script generates `thread.md` (fresh ULID) for all existing threads — same pattern as `migrate-to-threads.ts`. Cheap, and it makes the roadmap total instead of partial.

**(c) Validate edges on WRITE, not just on read.** The drag-reorder / add-dependency action should go through a tool that *refuses* a write creating a cycle or pointing at a non-existent thread — same spirit as `blockedBy`. Catching it at write time means the read-model rarely has to render a broken graph. Read-time validation (cycle/dangling diagnostics via `validate-state`) is still the backstop for edges that rot later (a depended-on thread gets archived). Both layers, write is primary.

**(d) `thread.md` has no staleness.** It's authored metadata with no parent to go stale against — so it's excluded from stale-detection (unlike plan/ctx). One less thing to track.

**(e) Doc-type ripple.** New `type: thread` touches the doc-type table (architecture-reference §3), `serializeFrontmatter` key order, and the MCP gate (it's `loom/**/*.md`, so writes go through a tool — `loom_create_thread` + a `loom_set_priority` / `loom_set_thread_deps`, or just validated `loom_update_doc`). Worth a line in the plan, not a blocker.

One optional nicety I'd *not* do yet: back-reference `thread_id: th_…` on idea/design/plan docs so membership is by-id instead of by-folder. Rename-safe, but folder-based membership works fine today — skip unless it earns itself later.

### 2 / 5 / 6
Agree on done-plans-keyed history with a group-by-thread display option. And yes — **two plans**: Plan-1 = pure `buildRoadmap(state)` in core (topo sort, status overlay, done-plan history, cycle/dangling diagnostics) + `loom roadmap` CLI, fully headless-testable; Plan-2 = extension Roadmap panel + toggle + drag-reorder. Plan-1 is where the value and the tests are; Plan-2 is rendering on top.

### Net / open
Converged. The shape is: `thread.md` (id + title + priority + depends_on, authored) → derived `buildRoadmap` read-model (status, topo order, history, diagnostics) → CLI first, panel second. Status and history stay derived; only priority + depends_on are authored.

One thing still open before I draft the idea doc: **is `thread.md` required for every thread (with migration), or opt-in?** I argued required in (b) — but that's a model change (threads become doc-backed entities, not just folders), so it's your call. Pick that and I'll write the idea doc headlining the cross-weave blocked-on signal.

## AI:

Agree on both — required-for-every-thread, and ship the migration as a **CLI command, not a repo-internal script**. The reasoning is exactly the downstream case: every existing `loom install` out there created threads before `thread.md` existed, so on upgrade they hit the same backfill we do. A `scripts/` file only helps this repo; a `loom` subcommand helps everyone. That's vision-aligned ("Loom for any repo, not just itself"). So:

`loom migrate` — runs registered migrations; first one backfills `thread.md` (fresh `th_` ULID + title from folder slug) for every thread folder missing one.

Three properties it must have:
- **Idempotent** — skips threads that already have `thread.md`. Safe to re-run; safe to ship in every release.
- **`--dry-run`** — same as the existing `migrate-to-threads.ts`; print what it *would* create, touch nothing.
- **Reads stay pure** — the roadmap read-model must NOT auto-create `thread.md` on read (that'd be a mutating read). Instead, a thread with no manifest surfaces as a `validate-state` diagnostic: "N threads missing thread.md — run `loom migrate`." So discovery is automatic, the mutation is explicit and user-triggered. Keeps the "reads don't mutate" invariant intact.

(Internally this is the same `buildRoadmap` issue: missing manifest = thread invisible to roadmap until migrated. The diagnostic is what closes that gap without a silent write.)

That's the last open piece — we're converged. Shape is locked:
- `thread.md` (`th_` ULID + title + soft `priority` + `depends_on`), required, authored-only.
- `loom migrate` backfills it (idempotent, `--dry-run`), shipped for downstream too.
- Derived `buildRoadmap` read-model: status + topo order + done-plan history + cycle/dangling diagnostics. Reads never mutate.
- Two plans: Plan-1 core read-model + `loom roadmap` CLI (headless-testable); Plan-2 extension panel + toggle + drag-reorder.
- Headline: the cross-weave **blocked-on** signal.

Ready to write the **idea doc** for this thread (what we're building, why it matters, success criteria — headlining the blocked-on signal, with the derived-skeleton/soft-priority/done-history shape and the two-phase build). Say `go` and I'll generate it.

## AI:

Generated the idea doc → `roadmap-idea.md` (`id_01KV3GC10MFGWMKQ84JEGYQEQW`, status `draft`). It headlines the cross-weave blocked-on signal and captures everything we converged on: required `thread.md` (ULID + title + soft priority + depends_on, authored-only), derived `buildRoadmap` (status/topo-order/done-plan history/diagnostics, reads pure), `loom migrate` (idempotent, `--dry-run`, shipped downstream), and the two-phase build (core+CLI, then extension panel). Success criteria pin the invariants (no authored status, no hand-maintained list, deterministic re-derivation).

Review it when you can. Next natural steps: **finalize** the idea (draft → active), then move to the **design** doc (architecture: where `buildRoadmap` lives in core, the `thread.md` doc-type plumbing, MCP `loom://roadmap` resource + write tools, migration runner). I'll wait for your read before either.

## AI:

Generated the design → `roadmap-design.md` (`de_01KV3GPTMNXT66C4N73WAFN7ZW`, `draft`). It's grounded in the actual code — the key find is that **`req.md` is the exact precedent**: a flat per-thread `BaseDoc` with no reducer, loaded in `loadThread`. `thread.md` follows it case-for-case, and `getThreadStatus`/`derived.ts` already derive status purely, so `buildRoadmap` is a clean extension, not new machinery.

Architecture decided in the doc: `thread` doc type (kept **out** of the `Document` union so a manifest never counts as a deliverable — it loads onto `Thread.manifest`), `buildRoadmap(state)` as one pure function in `core/derived.ts`, `loom://roadmap` resource, validated write tools (`loom_create_thread` / `loom_set_priority` / `loom_set_thread_deps`), and `loom migrate`. Full doc-type-ripple checklist and two-plan split are in there.

**Three open decisions I need from you before Plan-1 is final** (§"Open decisions"):
1. **Auto-scaffold `thread.md`** on the first `loom_create_*` into a new threadId? I lean **yes** (makes "every thread has a manifest" an unforgettable invariant; explicit `loom_create_thread` + `loom migrate` still exist for empty/existing threads).
2. **History date source** — I lean the done-doc's `created` (born when the plan closes).
3. **BLOCKED** — merge dependency-blocked into the existing `blocked` status with `blockedOn` as the discriminator (lean yes), or a distinct state?

Review the design and answer those three and I'll move to the plans.

## AI:

All three decisions adopted and recorded in the design (the "Open decisions" section is now "Resolved decisions"). Both plans created:

**Plan-1 — Core Read-Model + CLI** (`pl_01KV3GY83XJXDAGJ87HK64MRXS`) — 7 steps, dependency-chained:
1. `thread` doc type + ripple (out of `Document` union)
2. load `thread.md` → `Thread.manifest` + index `th_` ids
3. `buildRoadmap(state)` in core + unit tests
4. `loom://roadmap` resource + diagnostics
5. thread write tools (validated, + auto-scaffold seam)
6. `loom migrate` backfill
7. `loom roadmap` CLI

**Plan-2 — Extension Surface** (`pl_01KV3GYQ36HM981ACDCMCE3ZYN`) — 4 steps, `blockedBy` Plan-1: toolbar toggle → panel → filter fold → drag-to-reorder.

Both are `draft`. Nothing is implemented yet — the loop stops here for your review.

Next: finalize + `loom start_plan` on Plan-1, then `go` to implement step 1 (`thread` doc type). Want me to start, or review the plans first?

## Rafa:

We missed 1 step, create reqs to be reflected in the plan.
Suggest best way to have them.

One way could be:
I run:
`Generate requirements` over the thread
`Refine plan`


## AI:

Good catch — req belongs right after design, before plans (so plans are born citing it with a `req_version`). We did plans first, so we back-fill once. Your two-step instinct is right, with one tooling wrinkle worth knowing:

**The wrinkle:** `loom_refine_plan` is a *sampling* tool — in this Claude Code session it returns `MethodNotFound` (Claude Code is already the AI; recursive sampling is blocked). So "Refine plan" works from the **extension** (it launches a Claude agent / uses the API key), but not from me here. Two clean paths:

- **(A) You drive it from the extension** — Generate requirements → Refine plan, exactly as you said. Uses the sampling path, regenerates the plans against the locked req.
- **(B) I do it in-session, surgically** — author `req.md` directly (it's *authored* content, not a sampled artifact, so writing it by hand is honest dogfooding), lock it, then add each step's `satisfies` via `loom_update_step` (the sanctioned step-amend tool — not hand-editing the generated table). This avoids regenerating two already-good plans; it just back-fills citations + `req_version`.

I lean **(B)** — the plans are solid, so amending `satisfies` per step is more surgical than a full refine-rewrite, and it's all in-session.

Either way, the req content is the same. Proposed handles, derived from the idea+design (one flat `req.md`, pooled coverage across both plans):

**Included**
- `IN1` `thread.md` doc type (`th_` ULID + title + soft `priority` + `depends_on`), authored-only
- `IN2` Load `thread.md` → `Thread.manifest`; index `th_` ids cross-weave
- `IN3` Pure `buildRoadmap(state)` — status overlay incl. dependency **blocked-on**, topo+priority order, done-plan history, cycle/dangling diagnostics
- `IN4` `loom://roadmap` resource + diagnostics integration
- `IN5` Validated write tools (`create_thread`/`set_priority`/`set_thread_deps`) + auto-scaffold seam
- `IN6` `loom migrate` backfill — idempotent, `--dry-run`, shipped downstream
- `IN7` `loom roadmap` CLI renderer
- `IN8` Extension Roadmap toggle + panel (future/present/history)
- `IN9` Filter fold to all / history / roadmap
- `IN10` Drag-to-reorder writing `priority`

**Excluded**
- `EX1` No central/hand-authored roadmap file or list
- `EX2` No `status` stored on `thread.md` (status always derived)
- `EX3` No new PM/planning system — read-model + soft priority only
- `EX4` Drag-reorder never overrides hard dependencies

**Constraints**
- `C1` Reads never mutate (missing manifest → diagnostic, not silent write)
- `C2` `depends_on` by `th_` ULID, never path (rename/cross-weave safe)
- `C3` `buildRoadmap` pure (no IO), in core; delivery layers thin
- `C4` `thread.md` out of the `Document` union (never a deliverable); no staleness
- `C5` Re-deriving over unchanged docs is deterministic

Step→req mapping I'd apply: Plan-1 steps 1–7 → IN1…IN7 (step 3 also cites C1/C3/C5; step 6 cites C2 implicitly via IN6); Plan-2 steps → IN8, IN8, IN9, IN10 (drag step also cites EX4/C-spirit). `EX*` aren't "satisfied" — they're guardrails the coverage checker uses to flag any step that cites an excluded id.

Pick **(A)** or **(B)** and confirm the handle set. On `go` with (B) I'll create + lock `req.md` and stamp the `satisfies` citations.

## AI:

Done — path (B) complete. `req.md` created and **locked** (`rq_01KV3HH7DNC60WN07ZMC8JZM4M`, IN1–IN10 / EX1–EX4 / C1–C5), and every plan step now cites its handles via `loom_update_step` (not a refine-rewrite — the plans were good, this is surgical citation):

**Plan-1 (core):** 1→IN1,C4 · 2→IN2,C2 · 3→IN3,C1,C3,C5 · 4→IN4 · 5→IN5 · 6→IN6,C1 · 7→IN7
**Plan-2 (extension):** 1→IN8 · 2→IN8 · 3→IN9 · 4→IN10

Coverage is complete: every Included (IN1–IN10) is covered by ≥1 step, and each constraint is cited where it bites. `loom://diagnostics` / `validate-state` will now report req-coverage for this thread.

**One honest caveat:** the plans predate the req, so they carry no `req_version` baseline (the refine path is what normally stamps it, and that's sampling-blocked here). Consequence: coverage checking works fully, but if you later `loom_amend_req`, the plans won't auto-flag as req-stale. Cheap to live with; if you want the baseline stamped, the clean way is a one-time refine from the extension. Flagging it rather than hiding it.

Thread is now fully formed: idea → design → **req (locked)** → 2 plans, all cross-cited. Nothing implemented yet.

Next: `loom start_plan` Plan-1, then `go` to implement step 1 (the `thread` doc type). Want me to start, or pause here?

## Rafa:

Plan 1 already started
Do whole plan 1
Stop if fall in a loop or any design decisions to make or have any doubt, question

## AI:

**Stopping on step 1 — a design decision the code just reopened (no code written yet).**

The design says "keep `ThreadDoc` **out** of the `Document` union so a manifest never counts as a deliverable." But now that I've read how `req` actually works — and `req` is the precedent we chose — the design's reasoning is off. Here's the real mechanism:

- `ReqDoc` **is** in the `Document` union (`document.ts`), **is** pushed into `thread.allDocs` (`loadThread`), and is kept out of the done-rollup **not** by union-exclusion but by `isDeliverable()` in `derived.ts`, which explicitly lists `ctx`/`reference`/`req`.

So "in the union" and "counts as a deliverable" are **independent** — the deliverable guard is `isDeliverable`, not union membership. That means I have a real fork for `thread.md`:

**Option A — out of the union (what the design currently says).**
- `thread.md` loads **only** onto `Thread.manifest`, never into `allDocs`.
- Pros: zero ripple into the codebase's `switch (doc.type)` sites; `thread.md` stays invisible as a doc (no tree node, no backlink indexing as a normal doc).
- Cons: **inconsistent with `req`**; needs `as unknown as ThreadDoc` casts on load; `'thread'` ends up in `DocumentType` but absent from the `Document` object union (a slight asymmetry).

**Option B — in the union, exactly like `req`.**
- `ThreadDoc` joins the `Document` union, loads into `Thread.manifest` **and** `allDocs`, and `isDeliverable` gains `'thread'` so it never blocks DONE.
- Pros: **consistent with `req`** (which is what "similar to req.md" implied); no casts; clean types.
- Cons: ripples into exhaustive `Document` switches (each needs a `'thread'` case or default); `thread.md` becomes a **visible doc** — it'd show as a tree node and be backlink-indexed like `req.md` does.

The crux is really: **should `thread.md` be a visible doc (like `req.md`) or an invisible metadata sidecar?** If `req.md` already shows in your tree and that's fine, B is the cleaner, more consistent path and I'd take it. If you'd rather `thread.md` stay hidden plumbing, A is right and I'll eat the casts.

I lean **B** (consistency with the precedent we deliberately chose, no casts), but the tree-visibility consequence is a UX call that's yours. Which way?

## AI:

**Plan-1 (Core Read-Model + CLI) is done — all 7 steps ✅, plan auto-finished.**

One design fork surfaced mid-build and you resolved it: `thread.md` mirrors `req` exactly (option B — in the `Document` union, visible doc, kept off the done-rollup by `isDeliverable`).

Shipped:
- **`thread` doc type** (`th_` ULID + soft `priority` + `depends_on`), loaded onto `Thread.manifest`; `th_` ids resolve cross-weave for free via the existing link index.
- **`buildRoadmap(state)`** — one pure function: status overlay (dependency **blocked-on** is the headline), Kahn topo + priority order, done-plan history, cycle/dangling/missing-manifest diagnostics. 8 pure unit tests, wired into `test-all`.
- **`loom://roadmap`** resource + diagnostics folded into `loom://diagnostics` and `validate-state`.
- **Write tools** `loom_create_thread` / `loom_set_priority` / `loom_set_thread_deps` (refuses cycles/unknown/self-dep at write time).
- **Auto-scaffold seam**: first idea/design/plan/req into a new thread materialises its `thread.md`.
- **`loom migrate`** (idempotent, `--dry-run`, downstream-shipped) and **`loom roadmap`** CLI.

Verified live in this repo: `loom roadmap` renders future/present/history across all weaves — the cross-weave shipped-history is exactly the view that was missing. Full `test-all` green; `build-all` clean.

**Two things for you:**
1. **The migration is NOT run yet** — `loom migrate --dry-run` shows **87** manifest-less threads here. Running it for real creates 87 `thread.md` files (one commit's worth of new docs). Say the word and I'll run `loom migrate` + show the populated roadmap; or hold it.
2. **Plan-2 (extension surface)** — toolbar toggle, panel, filter fold, drag-reorder — is still `draft`, `blockedBy` Plan-1 (now satisfied).

Next: waiting for your call on running the migration, and whether to start Plan-2.

## Rafa:

commit, push all before migration (safeguard)
run migration
check
commit, push all after migration

agree?

## AI:

Agree — that's the right safeguard: a clean code-only commit as a checkpoint, then the bulk data migration as a separate commit, so if the 87-file backfill ever looks wrong you can diff/revert it independently of the implementation. Executing in order: commit+push (code), `loom migrate`, check, commit+push (manifests).

One heads-up before I stage: `git status` at session start also had pre-existing **unrelated** edits (`requirements-driven-development` chat/done/plan files). "Commit all" will sweep those into the pre-migration commit too. I'll check the status and, if it's just those + my roadmap work, fold them in (solo-dev, main, all-in as you said) — but I'll show you exactly what landed. Proceeding.

## AI:

Safeguard sequence complete, plus a bug you caught along the way:

1. **Pre-migration checkpoint** — committed + pushed: `docs(rdd)` (stray edits) and `feat(roadmap)` (Plan-1) → `36aa320`.
2. **Migration run** — `loom migrate` created **87** `thread.md` manifests (fresh `th_` ULIDs).
3. **Check caught a real hang** — `loom roadmap` printed then never exited. Root cause: the `loom://roadmap`/`loom://state` handlers call `initStateCache`, which starts a recursive `fs.watch`; the CLI's `connectLocalMcp.close()` tore down the transports but **not** the watcher, so the Node event loop stayed alive. Latent for *any* state-backed CLI resource read, not just roadmap. Fixed at the root: added `closeStateCache()` and call it on client close (the long-running `loom mcp` keeps its watcher; the CLI now exits in ~1.5s). Killed the leaked processes.
4. **Post-migration** — committed + pushed: `fix(cli)` (hang) and `chore(roadmap)` (87 manifests) → `cb8daa0`.

`loom roadmap` now: 0 missing-manifest diagnostics, exits clean, renders the full cross-weave future/present/history.

**Plan-1 shipped end-to-end and on `main`.** Plan-2 (extension surface) remains `draft`, unblocked.

Next: waiting on whether to start Plan-2.

## AI:

Confirmed — you're right, the double-`## AI:` fix was **never actually done**. At line 104 I only *agreed* it was the right approach (sharpen the `loom_append_to_chat` tool description + the extension launch prompt) and then moved on with the roadmap design; no code changed. I just verified the live state before this reply:

- `packages/mcp/src/tools/appendToChat.ts` still had the bare description "Append a new message… do not edit chat files directly" — no "body only / no header" guidance.
- `packages/vscode/src/commands/chatReply.ts` still told the agent `body="<your reply>"` with nothing about omitting the header.

Now fixed, in all three places the agent reads:

1. **MCP tool description** — now states the tool writes the role header itself and you must pass the body only, calling out the doubled-header failure mode explicitly.
2. **`body` param description** — "the reply text ONLY… the tool adds the role header (including a header here produces a duplicate)."
3. **Extension chat-reply launch prompt** — the stronger lever (it out-ranks tool descriptions): now says the body must be reply text only, no `## AI:` line, because the tool adds the header.

`build-all` clean.

**Effect timing (two known caveats):**
- The running `loom mcp` in *this* session is stale — it won't serve the new tool description until the MCP server / session restarts. New sessions get it immediately.
- The extension launch-prompt change needs a **Reload Window** (it's baked into the bundled extension), so it takes effect next reload.

Not committed yet (sits with the uncommitted roadmap Plan-3 work in the tree). Want me to fold it into the same commit when we commit Plan-3, or keep it as its own `fix(mcp)` commit?