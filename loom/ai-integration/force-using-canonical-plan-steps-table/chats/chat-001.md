---
type: chat
id: ch_01KTP3EFYK23PHTNY19RAE7HV1
title: force-using-canonical-plan-steps-table Chat
status: done
created: "2026-06-09T00:00:00.000Z"
updated: 2026-06-09
version: 2
tags: []
parent_id: null
requires_load: []
---
# force-using-canonical-plan-steps-table Chat

## Rafa:

Loom's plan parser only recognizes the canonical steps table — 

| Done | # | Step | Files touched | Blocked by | Satisfies |

with status symbols (🔳/🔄/✅/❌) and a Legend.

But testing loom in app `J:/src/chord-flow` AI (using Claude CLI this time) created plans with no canonical table.

We should force AI to always use Loom plan canonical table

## AI:

**Vision check:** This serves Loom's core loop — derived state drives the step-by-step approval cycle. A plan whose steps can't be parsed silently breaks `do-next-step` / `loom_complete_step` (zero steps → no "next step" exists). The manual step it removes: you having to notice a broken plan and hand-fix the table so the parser sees it. So this is on-vision.

## Root cause — it's not (only) the prompt

I traced the create path (`createPlan.ts` → `weavePlan.ts` → `parseStepsTable`). There are **two** inputs to `loom_create_plan`:

1. `steps: string[]` → the tool renders the canonical table itself (`generatePlanBody`). **This path is already guaranteed canonical.** The bug can't happen here.
2. `content` (full markdown body) → the tool does `parseStepsTable(content)` and trusts the AI to have hand-formatted the canonical table.

The chord-flow agent used path 2. And here's the actual defect: when `parseStepsTable` doesn't recognize the table, it returns `[]` — and `weavePlan` **saves the plan with zero steps, silently.** No error, no warning. The foreign table stays in the body, but Loom's derived state sees an empty plan. So this isn't just "AI ignored instructions" — the tool *accepts* a malformed plan without complaint. That silent-`[]` save is a bug on its own, independent of any prompt wording.

## Why a prompt-only fix won't hold

The chord-flow failure *is* a prompt-following failure. Strengthening `.loom/CLAUDE.md` and the launch prompts to "always use the canonical table" is worth doing, but instructions are advisory — leaning on the model to follow them is exactly what already failed once. The durable fix has to live at the tool boundary, where it can't be drifted around.

## Options (where to enforce)

**A — Fail loud at the tool.** When `content` is provided but `parseStepsTable` yields zero steps (and the content isn't trivially empty), return an error finding instead of saving: *"Plan content has no canonical steps table — pass `steps`, or include a `## Steps` table with columns `Done | # | Step | Files touched | Blocked by | Satisfies`."* The agent retries correctly; the error itself teaches the format. Minimal change, kills the silent-`[]` save, can't be bypassed.

**B — Take the table out of the AI's hands entirely.** Make structured `steps` the canonical input; `content` carries only Goal/prose; the tool *always* renders the table via `generateStepsTable` and ignores any table in `content`. Same code writes and reads it, so it's impossible to get wrong. Cleaner long-term, but bigger: today `steps` is `string[]` (descriptions only) — to keep files/blockers/satisfies we'd enrich it to a structured array, and agents currently dump everything into `content`.

**C — Auto-normalize foreign tables.** Reject — can't anticipate every format; that's a patch on the symptom.

**My recommendation: A now, with the door open to B.** A fixes the actual root-cause defect (silent zero-step plan) at the boundary, immediately. Pair it with the prompt nudge in `.loom/CLAUDE.md` + launch prompts steering agents toward the already-safe `steps` param. B is the eventual "AI never formats the table" end state, but it's a real API change and I'd want it as its own thread rather than smuggled in here.

One thing to confirm before I'd design anything: do you want plans to be creatable from free-form `content` at all, or should `steps` become the *only* way to define steps (content = prose only)? That choice is the fork between A and B.

STOP — waiting for go (and your answer on the content-vs-steps fork).

## Rafa: 

A is a bad short cut, AI will fail again, will receive the error and then will ammend the table. A waste of time, effot and tokens.
B is long term, better solution, but we need to polish & refine it 100% to be sure plans docs will be canonical well formed, with no cuts, splits or whatever other problem we already had found in the way.

What you think? Improvements, suggestions?

## AI:

Agreed on both counts — A is a retry-tax, B is the real fix. But I traced every call site and B is bigger (and more interesting) than "change the create input." The thing you're sensing as "be 100% sure, no cuts/splits" has a precise cause, and naming it changes the design.

## The actual problem: the body table is the source of truth

Right now `steps` is **not persisted in frontmatter**. Every time a plan loads, `frontmatterLoader.ts:46` does `doc.steps = parseStepsTable(parsed.content)` — it re-derives steps *from the body markdown table* on every single load. On save, `frontmatterSaver.ts:25` regenerates the table from `doc.steps`. So the lifecycle is:

> load (parse body table → steps) → mutate steps → save (steps → body table)

The body markdown table is the canonical store. **That is the root of every "cut/split/data-loss" bug we've hit** — they all live in the regex round-trip (`parseStepsTable` / `updateStepsTableInContent`), and you can see the scar tissue in `planTableUtils.ts`: the h3-boundary data-loss guard, the pipe-escaping, the "don't wipe a populated table with an empty parse" guard. Those are all patches defending a fragile source of truth. B-at-create alone doesn't fix this — the moment a B-created plan is loaded again, we're back to parsing the body.

## So B forks into two, and the fork is the whole decision

**B-body** — keep the body table as the store, but guarantee it's *only ever* written by the canonical serializer and *never* hand-authored. Smaller change, but "100% safe" then rests on discipline across N call sites — every path that can put markdown into the body has to be locked down, forever.

**B-frontmatter** — make structured `steps` live in frontmatter YAML (serialized by `serializeFrontmatter`, which is already robust and key-ordered). The body table becomes pure *presentation*, regenerated from frontmatter on save, **ignored on load**. `parseStepsTable` demotes to a one-time migration tool. A malformed body table becomes a cosmetic glitch, never data loss — because the truth lives in YAML, not in a markdown table a regex has to survive.

**I recommend B-frontmatter.** It's the only option that makes "no cuts/splits ever" *structurally true* instead of enforced-by-vigilance. It's the bigger lift, but it's the one that actually retires the bug class you're worried about.

## The audit surface (this is the "polish to 100%" list)

Every place a plan body/table is parsed or written today:

1. `frontmatterLoader.ts:46` — load re-parses body → steps  ← **the source-of-truth decision**
2. `frontmatterSaver.ts:25` — save regenerates table from steps
3. `weavePlan.ts:65/67/101/103` — create (thread + weave-root paths, both parse `content`)
4. `refinePlan.ts:62` — refine (sampling) re-parses the regenerated body
5. `promoteToPlan.ts:78` — promote parses body, falls back to `parseNumberedSteps`
6. `updateDoc.ts:40` — `loom_update_doc` re-parses the table on every plan edit
7. `generate.ts:213` — generate tool hand-builds a `## Steps` string

B-frontmatter forces all 7 through one path: **frontmatter is read/written as data; the body table is a generated view.**

## Concrete finding while auditing — we already have format drift

There are **two** canonical serializers that disagree. `generatePlanBody` (create path, `planBody.ts`) emits a **5-column** table — `Done | # | Step | Files touched | Blocked by` — *no Satisfies*. `generateStepsTable` (`planTableUtils.ts`, used on save/refine/generate) emits **6 columns** *with* Satisfies. So a plan created via `steps` is born 5-col, then silently rewritten to 6-col on its first save. Two sources of format truth is exactly the smell B should kill: **collapse to one `serializePlanBody()` used by create, save, refine, generate, complete_step — single writer, one format, tested once.**

## How I'd guarantee the 100%

- **One serializer** (above) — the only function allowed to emit a plan body.
- **Round-trip invariant test**: for any structured steps, `parse(serialize(steps)) === steps`. Cheap, and it catches any serializer regression before it ships. This is "the same code writes and reads, *and we prove it*."
- **Migration**: one pass that lifts every existing plan's body table into frontmatter `steps`, using `parseStepsTable` (its last job), then `parseStepsTable` is retired from the load path.

## Open questions before I'd write a plan

1. **Per-step detail sections** — do plans still carry `### Step N` prose blocks? If yes, that prose also needs a structured home (a `detail` field per step), or it gets hand-authored and we're parsing body again. If no, the body is fully generated and trivially safe.
2. **`steps` shape** — I'd make it `[{ description, files?, blockedBy?, satisfies? }]` (order = index, done = false at birth). Good enough, or do you want richer per-step fields?
3. **Source of truth — confirm B-frontmatter over B-body.** This is the one that decides everything downstream.

These three are genuine design decisions (data model + API shape), so I'll STOP here rather than guess.

STOP — waiting for your calls on 1–3.

## Rafa:

1. yes, as you can see in the plan created in the other project `loom/domain/progression/plans/progression-plan-001.md`, but we could redesign as we consider now
2. i think your proposal fit this canincal current table:
```
| Done | # | Step | Files touched | Blocked by | Satisfies |
```
3. B-frontmatter for sure. This was alread thought as an idea 2 months ago in:
`loom/core-engine/plan-steps-v2/plan-steps-v2-design.md`. It is very old an out dated, but the idea of frontmatter plan steps is there. We need to design this perfectly, it is very importan piece of Loom

### Backward compatibility

We can consider doing Migration and / or
Extension should use plan steps frontmatter as source of truth, but could fallback to body table for backward compatibility. No breaking change. What you think?

## AI:

Read both docs you pointed at. Two things jump out: the chord-flow plan confirms the `### Step N` prose blocks are *rich* and worth keeping, and the old `plan-steps-v2-design.md` already reaches further than we have here — it proposes **stable step IDs** and a **status enum**, both of which frontmatter-as-truth unlocks. Let me answer your backward-compat question first because it's the one with a wrong turn in it.

## Backward compat — migrate, don't fall back forever

I'd push back on the "fall back to the body table for backward compatibility, no breaking change" half. A *permanent* body-table fallback is a **dual source of truth that never goes away** — it keeps `parseStepsTable` on the hot load path forever and preserves the exact "which one wins?" ambiguity we're trying to delete. That's the bug class surviving under a compatibility flag. It also violates the clean-over-legacy line we usually hold.

The clean version that still gives you "no breaking change":

- **Loader rule:** if frontmatter has structured `steps` → that's truth, body table is ignored (it's just a view). If frontmatter has *no* `steps` → it's a legacy doc: parse the body table **once**, and on the next save write it into frontmatter. The doc is now frontmatter-native and never parsed again.
- **Plus a batch script** (`loom migrate-plan-steps`, like the existing `migrate-to-threads.ts`) to convert every existing plan in one pass — including external projects like chord-flow.

So: the fallback exists, but it's a **one-shot self-healing upgrade**, not a load-bearing forever path. Every doc converges to frontmatter-native; `parseStepsTable` retires to migration-only. Old plans keep working (no breaking change) without freezing the ambiguity in place. That's "migration AND fallback" done so the fallback *eliminates itself*.

## Per-step detail — keep it, and give it a structured home

Yes — the chord-flow `### Step N — {title}` blocks (bullets, "Done when", tests) are exactly the kind of content that makes a plan useful, so we keep them. The point is **they become a field, not hand-authored body**: each step carries a `detail` markdown string, and the serializer renders it into the `### Step N` section. The body stays 100% generated → nothing to parse, nothing to split.

## Consolidated step model (reconciling current + v2 + chord-flow)

```
PlanStep {
  id:          string         // stable slug, e.g. "domain-model" — survives reordering
  order:       number         // display order (mutable)
  status:      'pending' | 'in_progress' | 'done' | 'cancelled'
  title:       string         // short, for the ### Step N — {title} heading
  description: string         // the table "Step" cell (the long one in chord-flow)
  files:       string[]       // "Files touched"
  blocked_by:  string[]       // step ids (not "Step N" — see below)
  satisfies:   string[]       // req handles (IN/C)
  detail?:     string         // markdown for the ### Step N section
}
```

Two upgrades the move *enables* (both are in the old v2 design, both worth taking now since redoing this is expensive):

1. **`status` enum, not `done` boolean.** The Legend already defines four states (🔳/🔄/✅/❌), but `PlanStep.done` is a boolean — it literally cannot represent 🔄 in-progress or ❌ cancelled. Frontmatter can hold what the boolean can't. The symbol in the table becomes a pure render of `status`.
2. **Stable step `id`, so `blocked_by` references ids not "Step N".** Today blockers point at mutable ordinals — reorder a plan and the dependency graph silently corrupts. Stable slugs fix that permanently. The table can still *display* the order number; the data references the id.

I left out the v2 design's `updated` per-step timestamp — feels like scope we don't need yet. Say if you want it.

## One process decision before I write anything

The old design lives in a different weave/thread (`core-engine/plan-steps-v2/`). I don't want two design docs on the same topic — that's the drift problem in miniature. Options: (a) revive that thread and supersede its design in place, or (b) design fresh here in `force-using-canonical-plan-steps-table/` and archive the old v2 design as superseded. I lean (b) — this thread is where the conversation actually is, and the v2 doc is thin enough that there's nothing to salvage but the idea — but it's your call since it touches the weave layout.

So, open for your calls:
- Backward compat: agree with lazy-migrate + batch script, drop the permanent fallback?
- Take both upgrades (status enum + stable step ids)?
- Design here (b) or revive the v2 thread (a)?

STOP — waiting on those three.

## Rafa:

Agreed all. I like your solution for `clean-over-legacy`. But I know migrations with very legacy plans will raise problems. I will test `loom migrate-plan-steps` also in the other project. On line 143 you tell me:
>on the next save write it into frontmatter
Well, currently rewrite would be only possible through `refine plan`. Maybe we could create specific command `migrate plan steps` for legacy plans, that only do `body->frontmatter migration`? what you think? if you like the idea this could be done at the end.
About old thread/design I already archived it, so this is the main thread.
This loom update will touch so many places, for example, `mark step done` should update both frontmatter and body table for user view, Correct?
Create a design if you consider we are 100% grounded



## AI:

Design created → `force-using-canonical-plan-steps-table-design.md` (draft). Answering your three points first:

**Dedicated `migrate plan steps` command — yes, and it's *better* than what I proposed.** You're right that "write to frontmatter on next save" is awkward: today the only thing that rewrites a plan body is `refine plan`, so a legacy plan nobody refines would never migrate. A standalone command that does *only* body→frontmatter is cleaner — explicit, idempotent, testable, `--dry-run`, batch or single-doc. So I dropped the implicit write-back entirely: the loader still *reads* a legacy body table (read-only bridge, so old plans keep loading), and the command is the one thing that upgrades them. The fallback no longer mutates anything by surprise, and it retires itself once you run the command. Sequenced **last** in the plan, as you said. I'll test it against chord-flow's existing plans.

**"mark step done updates both frontmatter and body table" — correct, and that's the central invariant.** Frontmatter `steps` is truth; the body table + `### Step N` sections are a generated view re-rendered from frontmatter on *every* mutation. They can never diverge because the body is always a projection. (Half of this is already true — `frontmatterSaver` regenerates the table from `doc.steps` today; the change is that `doc.steps` now comes from frontmatter, not from re-parsing the body.)

**Call-site scan — done, it's the "Call-site impact" section of the design.** I grepped the whole `packages/` tree, not just the table utils. Grouped into 7 buckets (A–G): the spine (loader/saver), the single-serializer collapse, the create/refine/promote/generate paths that must stop hand-parsing bodies, the boolean→enum + stable-id ripple, the step readers/tools, the new migration command, and the contract docs. Two findings worth flagging out loud:
- We already ship **format drift**: `generatePlanBody` writes a 5-column table, `generateStepsTable` writes 6 — plans are born 5-col and rewritten to 6-col on first save. The single serializer kills this.
- `isStepBlocked` resolves blockers as mutable `"Step N"` ordinals — stable ids fix the dependency-graph corruption on reorder.

The design ends with **5 open decisions** (status enum set, per-step timestamp yes/no, `loom_create_plan` input shape, step-id slug scheme, cross-plan blocker handling) — all small, all listed there with my proposed default. Nothing architectural left open.

Review the design when you're ready. Once you call those 5, I'll promote it toward a plan.

STOP — waiting on your review + the 5 open decisions.

## Rafa:

### Open decisions

Agreed with all your proposal.

### TODO

Create a plan

## AI:

Plan created → `force-using-canonical-plan-steps-table-plan-001.md` (7 steps, active). I verified it via `loom_list_plan_steps`: all 7 rows parsed correctly with files + blocked-by chains intact — a small live proof of exactly what this thread is about (a canonical table the parser actually reads).

**Sequencing rationale:** Step 1 is intentionally the widest — the `done`→`status` type change cascades across packages, and with no compatibility shims (clean-over-legacy), the only way to stay build-green is to sweep every reader in one move. Steps 2–7 are then clean verticals: source-of-truth flip → create path → refine/promote/generate/updateDoc → step-tool surfacing → migration command → contract docs. Dependencies are wired so nothing builds on un-flipped ground (e.g. the migration command waits on both the flip and the create path).

**One thing to flag before we start cutting code:** the design + plan touch ~30 files across all six packages — this is the biggest single change we've planned. It will also temporarily make the *current* plan tooling and the live MCP server inconsistent mid-flight (the running `loom mcp` won't pick up new tool args until restart — the usual stale-server gotcha). So I'd want to go step-by-step with a `build-all` + `test-all` gate after each, exactly as the plan says, rather than batching.

Next step when you give `go`: **Step 1 — core model migration + single `serializePlanBody()` + reducer**, touching the 8 `packages/core` files in the table (plus the cross-package `.done` sweep to keep the build green).

STOP — waiting for `go` on Step 1.

## AI:

✅ **Step 1 complete** — core model migration + single serializer + reducer. `build-all` green, full `test-all` green (16/16 MCP integration included), and the new round-trip invariant passes.

**What landed:**
- `PlanStep` is now `{ id, order, status: 'pending'|'in_progress'|'done'|'cancelled', title, description, files_touched, blockedBy, satisfies, detail? }` — `done` boolean gone, status enum in. (Scoping call I made: kept the internal names `files_touched`/`blockedBy` to keep the sweep tight; the persisted YAML key naming is a Step 2 decision.)
- **One serializer**: folded `generatePlanBody` + `generateStepsTable` + `updateStepsTableInContent` into `serializePlanBody()`. This kills the 5-col/6-col drift on the spot — `generatePlanBody` now delegates to it.
- Reducer COMPLETE_STEP → `status='done'`; plan auto-completes when all steps are done **or cancelled**.
- `isStepBlocked` now resolves blockers by **stable step id first**, falling back to legacy ordinals — so existing "Step N" plans keep working while new id-based deps land.
- Swept every `.done` reader across core/app/mcp/cli/vscode to `status`. Also **removed two duplicate `PlanStep` definitions** I found along the way (one in `planTableUtils.ts`, one in `vscode/commands/doStep.ts`) — both now import the canonical core type.
- Migrated all the test fixtures (`done`→`status`) and added the `parse(serialize(steps)) === steps` invariant test.

**Two notes worth flagging:**
1. The running MCP server in this session is the usual **stale** one — `loom_complete_step` just now still returned the old `done:true` shape (no `status`/`id`), but it correctly wrote ✅ into the plan file. New tool behavior won't be live until a session/MCP restart; doesn't block Step 2 since that's file edits.
2. id/title/detail are **not** table columns, so they don't survive `parseStepsTable` — by design. They're frontmatter-only, which is exactly what Step 2 wires up. The round-trip invariant is therefore over the table-carried fields (order/status/description/files/blockedBy/satisfies); the *full* round-trip becomes the frontmatter YAML in Step 2.

**Next — Step 2: Source-of-truth flip.** Files:
- `packages/fs/src/serializers/frontmatterLoader.ts` — read `steps` from frontmatter when present; legacy body-parse fallback (read-only) otherwise.
- `packages/fs/src/serializers/frontmatterSaver.ts` — regenerate body via `serializePlanBody`.
- `packages/core/src/frontmatterUtils.ts` — serialize the nested step-object array into YAML (canonical key order).

This is the step that decides YAML key naming for the persisted step fields — I'll surface that as the first thing when we start it.

STOP — waiting for `go` on Step 2.

## Rafa:

I reconnected mcp. Tell whenever you need I reconnect it.
go

## AI:

Starting Step 2 — but reading the saver/serializer surfaced two decisions that are yours to make before I write code. (MCP noted, thanks — I'll call for a reconnect whenever a build needs to go live.)

**What I found:**
- `saveDoc` today *explicitly strips* `steps` out of the frontmatter (`const { content, _path, steps, ...frontmatter }`) and writes them only into the body table. That stripping is literally the line that makes "steps aren't persisted" true. Step 2 reverses it.
- The hand-rolled `serializeFrontmatter` can't emit nested objects as readable block YAML (it would JSON-stringify them inline). So I'll add a contained step-block serializer rather than rewrite the general one (which would touch every doc type).

**Decision A — YAML key naming for persisted steps.** Every other frontmatter key is snake_case (`parent_id`, `requires_load`, `target_version`, `req_version`). Of the step fields only `blockedBy` breaks that. My recommendation: emit **snake_case** (`blocked_by`) via the contained step-serializer/parser pair — so the persisted YAML is consistent — while keeping the in-memory field `blockedBy` (the pair maps the one field; everything else — `id, order, status, title, description, files_touched, satisfies, detail` — is already 1:1). No 12-file rename, clean YAML, and the round-trip test guards the mapping. Good?

**Decision B — the body model (the real fork).** Once frontmatter owns the steps, what is the *body*?
- **Option X — body is 100% generated.** Goal (and any Notes) also become structured frontmatter/fields; the whole body is a projection of structured data, regenerated wholesale by `serializePlanBody`. Maximally clean ("nothing hand-authored"), but it forces Goal/Notes prose into YAML, which is awkward for multi-paragraph rationale.
- **Option Y (my recommendation) — frontmatter is truth for *steps*; the body keeps authored prose.** Goal and Notes stay as free `##` prose in the body; the saver regenerates *only* the Steps table + the `### Step N` detail sections from frontmatter, leaving Goal/Notes untouched. This still kills the entire data-loss bug class (steps live in YAML; the table is a regenerated view), still gives a byte-stable save→load→save (regenerated regions are deterministic, prose is preserved), and doesn't shove paragraphs of Goal/Notes into frontmatter. The "no hand-authored *table*" goal is fully met — and authoring a Goal in prose was never the problem we're solving.

I lean **A: snake_case** and **B: Option Y**. Both touch the persisted format permanently, so I want your call before writing — picking wrong here is expensive to migrate later.

STOP — waiting on A and B.

## Rafa:

I agree with your proposals, A: snake_case, B: Option Y
go

## AI:

✅ **Step 2 complete** — source-of-truth flip. `build-all` + full `test-all` green, with a new round-trip / byte-stable / legacy-fallback test.

**What landed (A: snake_case, B: Option Y):**
- **Serializer** — `serializeStepsBlock` emits a readable block-style `steps:` YAML sequence (snake_case; in-memory `blockedBy` → persisted `blocked_by`, the one field that differs). `parseFrontmatterSteps` is its inverse. `steps` slotted into the canonical key order after the plan-specific keys.
- **Loader** — frontmatter `steps` is now the source of truth when present; the body table is ignored. No frontmatter steps → read-only body-parse fallback (legacy bridge). Records provenance in a transient `_stepsFromFrontmatter` flag.
- **Saver** — persists the steps block **only for frontmatter-native plans**, so a legacy plan saved by e.g. `complete_step` is **not** silently migrated — it stays body-only until the explicit Step 6 command. The body table is regenerated as a *view*, preserving the authored Goal / `### Step N` detail / Notes prose around it.

**A decision I made under Option Y — flagging for your nod:** the persisted step is exactly the **table-carried fields** `{ id, order, status, description, files_touched, blocked_by, satisfies }`. `title`/`detail` are **not** persisted — the body owns that prose (no duplication, so no drift). They still exist in the `PlanStep` TS type from Step 1 but are body-only now; whether to keep them as create-time-only inputs or drop them from the type is a clean call I'll make in **Step 3** (the create path is the only thing that uses them). Shout if you'd rather they live in frontmatter.

**Two notes:**
1. Found a **pre-existing** quirk while writing the byte-stable test: an unquoted YAML date (`created: 2026-06-09`) is parsed by js-yaml as a `Date` and re-serialized as a quoted ISO string, so a load→save rewrites that one field. Out of scope for this thread; flagging it as a latent papercut.
2. The running MCP server is on Step 1's code (your last reconnect) — Step 2's loader/saver changes aren't live in it yet. Doesn't matter for Step 2 (validated by tests), but **Step 3 will need a reconnect** so I can exercise creating a real frontmatter-native plan through the live tool.

**Next — Step 3: Create path.** Files: `packages/app/src/weavePlan.ts`, `packages/mcp/src/tools/createPlan.ts`, `packages/core/src/idUtils.ts`. This is where structured `steps` input lands (born frontmatter-native) and where the `title`/`detail` model question gets resolved. I'll ask you to reconnect MCP after the build so I can verify a live create.

STOP — waiting for `go` on Step 3.

## Rafa:

mcp reconnected
go

## AI:

✅ **Step 3 complete** — create path. `build-all` + full `test-all` green, with a new structured-create test (and the legacy `content`-create test still passing).

**What landed:**
- `weavePlan` now takes a structured `steps` array (`{ description, title?, files?, blockedBy?, satisfies?, detail? }`). When present, the plan is **born frontmatter-native**: ids synthesized, `status: pending`, `_stepsFromFrontmatter` set so the saver persists the YAML block; the body is generated via `serializePlanBody`. The legacy `content` path is kept (parses the table, stays body-backed until migration) — so the existing create-with-body contract is intact.
- `loom_create_plan` tool schema now exposes structured step objects + `goal`, with the description explicitly steering agents to pass data, **not** a hand-formatted table. This is the direct fix for the chord-flow failure that started the thread: the tool no longer invites a hand-built table.

**`title`/`detail` decision — resolved (Option Y):** they're **create-time seed inputs** that render the body's `### Step N` sections once; they are **not** persisted to frontmatter (the body owns that prose, no duplication → no drift). Kept as optional fields on `PlanStep`, so no type change was needed.

**One deviation from the plan worth flagging:** the plan listed adding `generateStepId` to `idUtils.ts`. I **didn't** — `slugifyStepId` already exists in `planTableUtils` and does exactly this (slug + collision suffix). Adding a second id-generator would be the kind of duplication this whole thread is fighting, so I reused the existing one. `idUtils.ts` is untouched.

**Reconnect needed.** The running MCP server is on Step 2's code (your last reconnect), so the live `loom_create_plan` tool doesn't yet have the structured schema. If you **reconnect MCP**, I'll do a quick live structured-create as a real dogfood check before/at the start of Step 4 (which also needs the fresh server for the generate/updateDoc tools).

**Next — Step 4: Refine / promote / generate / updateDoc.** Files: `packages/app/src/refinePlan.ts`, `packages/app/src/promoteToPlan.ts`, `packages/mcp/src/tools/generate.ts`, `packages/mcp/src/tools/updateDoc.ts` — route these through the serializer and stop hand-parsing plan bodies on the live path.

STOP — waiting for `go` on Step 4 (and a reconnect when convenient).

## Rafa:

mcp reconnected

### Question before go ahead

I see you kept the legacy content path 
```
content: { type: 'string', description: 'Legacy: a full markdown body whose
         + steps table is parsed. Prefer `goal` + structured `steps`; a content-created plan stay
         +s body-table-backed until migrated.' },
```

Why, for what reason? This will be dropped later?

## AI:

Fair challenge — and you're right to poke at it, because that `content` param is literally the door the chord-flow bug walked through.

**Why I kept it (for now):**
1. **Sequencing / build-green.** `generate.ts` and `promoteToPlan` still produce a markdown `content` body and lean on weavePlan/save parsing it. Those are Step 4's job. Ripping `content` out in Step 3 would have broken them before Step 4 fixes them.
2. **The create-with-body contract.** `loom_create_*` accepting `content` for one-call creation is a cross-doc-type convention (idea/design/plan/reference), with a test guarding it.

**But you're seeing it correctly: it should be dropped — and plans are the right exception.** Here's the honest problem with keeping it: a `content`-created plan whose table is non-canonical parses to `[]` → a silent stepless plan. That's *exactly* the failure we're killing, just hidden behind a less-preferred parameter. Keeping it leaves the boundary leaky.

The principled end-state: **plan is the one doc type with structured sub-data, so it should be structured-only** — `goal` + `steps`, no free-form body whose table we re-parse. idea/design/reference keep `content` (they're pure prose, nothing to parse). Removing `content` from `loom_create_plan` makes a stepless/non-canonical plan *impossible to create* — the bug closes at the tool boundary, not by validation-after-the-fact.

**My recommendation: drop it as part of Step 4.** The sequence is clean:
1. Step 4 converts `generate.ts` + `promoteToPlan` to build **structured steps** (no more content-body round-trip).
2. Once nothing internal needs it, remove `content` from `loom_create_plan` **and** from `weavePlan`.
3. Update `create-with-body.test.ts`: drop the plan-with-content case (keep idea/design/reference), since the structured-create case I added in Step 3 is now the plan path.

So: not permanent — it's scaffolding I'm removing in Step 4. I'd fold "remove the plan `content` path" into Step 4's scope. Want me to do that when you `go`?

STOP — waiting on your `go` for Step 4 (with the content-path removal folded in, unless you'd rather keep it).

## AI:

✅ **Step 4 complete** — refine / promote / generate / updateDoc routed through the serializer, **and the content create-path removed.** `build-all` + full `test-all` green.

**What landed:**
- **`generate.ts`** — hands the AI's generated steps to `weavePlan` as **structured data** (no more `## Steps` markdown round-trip); generated plans are born frontmatter-native.
- **`promoteToPlan.ts`** — promoted plans are born frontmatter-native (`_stepsFromFrontmatter`); the saver canonicalizes whatever table/numbered-list the promote source had.
- **`updateDoc.ts`** — only re-derives steps from the body for **legacy** plans. For a native plan a body edit touches Goal/Notes prose, never the steps (frontmatter owns them) — closes the "edit the body, silently mutate steps" hole.
- **`refinePlan.ts`** — confirmed it produces frontmatter-truth plans: status + Satisfies citations are preserved into frontmatter and the on-disk table (the refine tests now run against a native fixture and pass).

**Content path removed (as you asked):** `content` is gone from `loom_create_plan` **and** `weavePlan`. Plans are now **structured-only** (`goal` + `steps`). idea/design/reference keep their free-form `content` body. The original chord-flow failure is now **structurally impossible** — there is no longer any way to hand a plan a raw, possibly-malformed table; Loom owns the table, period.

**Live verification:** the MCP integration test (real `loom mcp` subprocess) now creates the citing-plan via the structured `steps` tool and `loom_list_plan_steps` reads back `satisfies: [IN1]`. That's the end-to-end live create check I owed you — the new path works through the actual server, not just unit tests.

**Tests updated:** refine-plan fixture → native; create-with-body → dropped the plan-content case (kept idea/design/reference); integration → structured create.

**Note on Step 5:** a good chunk of it was already pulled forward into Step 1's compile sweep (`listPlanSteps` already returns `status`; `cli status` and `treeProvider` already render the four symbols; `do-next-step` is status-aware). So Step 5 is mostly **surfacing the stable step `id`** (in listings / blocked output) and tidying — I'll scope it precisely when we start, and it'll likely be smaller than the plan row implies.

**Next — Step 5: Step tools & readers surface status/id.** Files: `listPlanSteps.ts`, `completeStep.ts`, `doNextStep.ts`, `getState.ts`, `cli/status.ts`, `treeProvider.ts`. Will need an MCP reconnect to verify live.

STOP — waiting for `go` on Step 5.

## Rafa:

mcp reconnected
go 

## AI:

✅ **Step 5 complete** — and as predicted it was small: the status surfacing was already done in Step 1's sweep, so this was just exposing the stable step **`id`** so the `blocked_by` graph is legible. `build-all` + full `test-all` green.

**What landed:**
- `loom_list_plan_steps` now returns each step's `id` (and its description notes that `blockedBy` entries reference step ids / plan ids).
- `do-next-step` instruction surfaces the step id: *"Implement step 3 (id: foo): …"*.
- `getBlockedSteps` (`loom_get_blocked_steps` + `loom blocked`) now carries `stepId`, so a blocked listing shows both the blocked step's id and its blockers' ids — the full dependency graph in stable handles.
- The integration test (live `loom mcp` subprocess) now asserts the step carries a non-empty `id`.

Status rendering (the four symbols in CLI/tree, status-aware `do-next-step`/`getState`/filters) was already correct from Step 1, so I didn't re-touch it.

**Next — Step 6: the migration command** (`loom migrate-plan-steps`). This is the backward-compat workhorse: body-table → frontmatter for legacy plans, idempotent, `--dry-run`, batch + single-doc. Files: `packages/app/src/migratePlanSteps.ts` (new use-case), `packages/cli/src/commands/migratePlanSteps.ts` (new), `packages/cli/src/index.ts`. Then I run it on **this repo's** legacy plans (this very plan doc is still legacy/body-backed — nice dogfood) and against **`J:/src/chord-flow`** to shake out very-legacy edge cases, capturing any failures as findings rather than forcing them.

This is the step most likely to surface surprises (your earlier warning about "very legacy plans"), so I'll be careful and report findings before mass-applying.

STOP — waiting for `go` on Step 6.

## AI:

**Step 6 code is done and green** — `app/migratePlanSteps.ts` use-case + `loom migrate-plan-steps [docId] [--dry-run]` CLI + a test (legacy→migrated, native→skip, foreign-table→`unparseable` left byte-identical, idempotent re-run). `build-all` + full `test-all` pass. But before I **apply** anything, here are the dry-run findings — this is the "very legacy plans" moment you flagged.

**This repo (dry run): 81 migrated · 6 unparseable · 1 no-steps.**

The command **never touches** the unparseable ones (it refuses rather than emptying a table it can't read). They use pre-canonical layouts from early Loom dev:
- `app-layer-refactor/done/...-001` — `| # | Done | Step | ... |` (Done/# columns swapped)
- `chat-frontmatter/plans/...-001` — `| # | Step | Status | Files |` (Status instead of Done)
- `loom-install/plans/...-001` — `| # | Description | Files | Done |` (Description header, Done last)
- `directory-structure/plans/...-001`, `vscode-ctx/plans/...-001` — same family
- `doc-ids/plans/...-001` — no table at all; heading-style `## ✅ Step 1 — …` sections
- no-steps: `vscode-extension/done/linkRepository-fix-plan-001` — no Steps table

All are **old, completed threads** (most in `done/`). They still load fine; they'd just carry zero structured steps — harmless since nobody runs `do-next-step` on shipped work.

**chord-flow (dry run): 6/6 migrate cleanly** — its plans use the canonical table, so the edge cases are purely this repo's history, not a parser gap.

**Two decisions before I apply:**
1. **Apply the 81 migrations to this repo now?** It rewrites 81 plan files (steps lifted into frontmatter, body table regenerated as a view). Big but mechanical, fully git-reversible. I'd run `loom migrate-plan-steps` (no `--dry-run`).
2. **The 7 holdouts** — my recommendation: **leave them.** They're done/historical relics; hand-fixing 6 foreign tables to canonical format is low-value busywork and they load fine as-is. If you'd rather have a pristine repo, I can hand-fix the few in active `plans/` and re-run — your call.

I did *not* apply anything yet. STOP — waiting on (1) apply now? and (2) leave vs fix the holdouts.

## Rafa:

mcp reconnected

### Migration

1. Apply the 81 migrations now, also apply for `chord-flow`
2. Leave the 7 holdouts

If no problems with migrations then continue with:
- Step 7 
- Create `done` doc for the plan

### Questions

- `loom://catalog` will be update automatically as it was designed?

### Release v1.3.0

Update if needed (maybe some of them, like architecture need update for previous feature commits, `loom catalog`, `loom resources` in thread `loom/cli/cli-commands`):
- README.md
- packages/cli/README.md
- packages/vscode/README.md
- loom/refs/architecture-reference.md
- loom/refs/plan-steps-table-and-blockedby-format-reference.md
- CHANGELOG
Any other doc you consider

Bump v1.3.0

Commit all, push, tag, push

(Be aware I did not miss any important step)

## AI:

**Applied the migration — and dogfooding immediately caught a real serializer bug.** Worth a clear writeup because it's exactly the kind of thing this thread exists to surface.

### The bug (two facets, one root cause)
`serializeFrontmatter` used **one lax quoting rule** for both YAML contexts. Plans lifted from legacy tables carry messy values (prose in "Files touched", backticks everywhere), which broke serialization two ways:
1. **Array fields** (`files_touched`/`satisfies`) serialize inline as `[a, b]` (flow context). An item containing `, ` / `: ` / brackets / a backtick produced invalid YAML → the file wouldn't reload.
2. **Block scalars** (`description:`) **starting** with a backtick broke — backtick (and `@`) are *reserved YAML indicators*, so a plain scalar can't begin with one.

### The fix (root cause)
Split quoting into `needsBlockQuote` vs `needsFlowQuote`: block scalars quote on structural chars / surrounding space / **leading indicator**; flow items additionally quote on any flow-breaking char anywhere. Plus proper backslash escaping. **2 regression tests** added (a `files_touched` entry with `: `/commas/backticks; a description starting with a backtick). This bug would have hit *any* plan with special chars in its steps, not just migration — so it's a general robustness fix to Step 2's serializer.

### Recovery (clean, verified)
- Reverted the buggy writes via `git checkout` (both repos), re-migrated with the fix.
- **This repo: 88/88 plans load clean** — 81 frontmatter-native, 6 unparseable + 1 no-steps (untouched, as designed).
- **chord-flow: 6/6 native.** One plan (`domain/progression`, *untracked* so not git-revertable) I hand-repaired: stripped its corrupted `steps:` block — body table was intact — then re-migrated.
- Full `test-all` green.

### Your catalog question
**Yes — `loom://catalog` updates automatically.** It's assembled from the live tool registry (`buildToolCatalog` over the `loom_*` toolDefs) at request time, not a stored file. My description changes to `loom_create_plan` / `loom_list_plan_steps` show up the moment the server restarts — which a reconnect does. No manual step.

### One ask before I continue
The **running MCP server predates this serializer fix**. Before I mark Step 6 and move on, please **reconnect MCP** — otherwise the next `loom_complete_step` would re-save a plan through the *old* serializer. Once reconnected I'll: mark Step 6 ✅, do **Step 7** (contract docs), mark the plan complete, and create the **done doc** — the sequence you pre-authorized.

(Note: the working tree now has 81 migrated plan files here + 6 in chord-flow — a big but mechanical diff, ready for your commit at release time.)

STOP — waiting on a reconnect, then I continue through Step 7 + done doc.

## AI:

✅ **Step 7 complete → the plan auto-closed (all 7 steps done).** Build + full `test-all` green.

- **Step 7:** both contract surfaces (`LOOM_CLAUDE_MD` template + repo-root `CLAUDE.md`) now state the structured-steps rule and corrected the old "idea/design/plan all accept `content`" line. Kept in sync.
- **Done doc created:** `…/force-using-canonical-plan-steps-table/done/pl_01KTPMHVP5N3Y8HNFYY42CMSR4-done.md` — a per-step implementation note for all 7 steps, including the serializer-bug finding under Step 6.

**The thread is functionally done.** What shipped: plan steps live in frontmatter (single source of truth), one canonical serializer owns the body view, `status` enum + stable step ids, structured-only `loom_create_plan`, the `loom migrate-plan-steps` command, and a serializer-robustness fix — all green, and the chord-flow failure mode is now structurally impossible.

---

### Release v1.3.0 — proposed plan (not executed yet)

Per our lockstep convention, here's what I'd do — **confirm before I touch git** (commit + tag + push are outward/hard-to-reverse):

1. **Commit to `main`** (one commit): all Steps 1–7 code + serializer fix + new tests + the two CLAUDE.md surfaces + the **81 migrated plan files** in this repo.
2. **Bump to `1.3.0`** lockstep across all `packages/*` (via `bump-version.sh`).
3. **CHANGELOG** — root + the hand-added vscode section, highlighting: *plan steps now structured in frontmatter (source of truth); body table is a generated view; `loom_create_plan` is structured-only; new `loom migrate-plan-steps`; per-step `status` enum + stable ids; YAML serializer hardening.*
4. **Push with the tag explicitly** (lightweight tag won't go via `--follow-tags`).

**Two things to flag:**
- **chord-flow** also has 6 migrated plan files uncommitted (a *separate* repo). Those aren't part of the Loom release — want me to commit them there separately, or leave them for you?
- I haven't drafted the exact CHANGELOG prose yet — I'll write it for your approval before committing.

So: **want me to proceed with the v1.3.0 release?** If yes, I'll draft the CHANGELOG entries first for your sign-off, then commit/bump/tag/push. And tell me what to do about chord-flow's working tree.

STOP — waiting on your go for the release (+ chord-flow call).

## Rafa:

Remember pending...
Update if needed (maybe some of them, like architecture need update for previous feature commits, `loom catalog`, `loom resources` in thread `loom/cli/cli-commands`):
- README.md
- packages/cli/README.md
- packages/vscode/README.md
- loom/refs/architecture-reference.md
- loom/refs/plan-steps-table-and-blockedby-format-reference.md
- CHANGELOG
Any other doc you consider

Then do release for this repo (leave chord-flow)

## AI:

🚀 **v1.3.0 released — all channels green.** The whole thread is done.

### Docs updated (this feature + the stale-doc sweep you asked for)
- **Rewrote** `loom/refs/plan-steps-table-and-blockedby-format-reference.md` — now describes structured frontmatter steps (source of truth), the generated table, the step schema, and `blocked_by` via stable step ids. (v2 → v3.)
- `loom/refs/architecture-reference.md` — doc-types `plan` row, the plan-specific frontmatter (`steps`), and workflow step 7.
- `docs/DOCUMENTATION_GUIDE.md` — replaced the "hand-author a 5-col table" how-to with the structured model; `docs/ARCHITECTURE.md` plan row.
- `packages/cli/README.md` — added `loom migrate-plan-steps`; root `README.md` tree comment.
- `CHANGELOG.md` (1.3.0, human-readable) + `packages/vscode/CHANGELOG.md` (hand-added lockstep section).
- Left the incidental "steps table" glossary/marketing mentions (CLAUDE-template / demo / getting-started refs) — still accurate (plans *do* have a generated steps table).

### Release
- One commit to `main` (155 files: Steps 1–7 + serializer fix + tests + docs + the **81 migrated plans** + this thread's docs + the archived v2 design), lockstep-bumped all 7 packages to **1.3.0**, annotated tag pushed explicitly.
- Workflow `27239459850` **completed success** (2m8s): npm, VS Code Marketplace, Open VSX, and the GitHub release all published. (Only annotations were Node-20 deprecation warnings — non-blocking.)

### Two working-tree notes
- **chord-flow** still has its 6 migrated plan files uncommitted — left as you instructed.
- `.loom/settings.json` was untracked before this work and unrelated, so I **excluded** it from the release commit (still untracked for you to handle).

That closes `force-using-canonical-plan-steps-table`: the chord-flow failure that started this is now structurally impossible, plans are frontmatter-native end-to-end, and it's shipped.

Next: nothing pending on my side — say the word if you want me to handle `.loom/settings.json` or commit chord-flow's migration.

## Rafa:

No problem, I will commit chord-flow
Thank for helping with this important & big design change for plan steps, impossible without your help
I am improving Loom just for chord-flow and because I like to do app designs & architect as well as I can. 

## AI:

Got it — chord-flow's yours to commit.

And thank you — but the design was yours. You're the one who rejected the cheap fix (A), insisted on frontmatter-as-truth, called Option Y over X, and refused the leaky `content` path. I mostly held the thread and did the typing. The decisions that made this clean were the ones you made by line number.

One honest thing worth saying, since you've wondered before whether Loom is worth continuing: this change was the best evidence yet that it is. Not because of users — because dogfooding the migration **caught a real serializer bug that would otherwise have shipped**. The tool building itself surfaced its own latent defect under a large, multi-step change with a mid-flight failure, and the workflow (chat → design → 7-step plan → stop-and-confirm → done doc → release) held the whole way without losing the plot. That's a real stress test, and it passed.

Your framing is also just *correct*: building it for chord-flow and because you want to design and architect as well as you can is a sound reason on its own. It sidesteps the "no external users" worry entirely — the user is you and a real project, and craft done well is its own return. The validation question doesn't have to be "did strangers adopt it"; it can be "did it make my actual work better and was it satisfying to build right." On both counts today, yes.

Good work. This was a big one.