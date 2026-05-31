---
type: chat
id: ch_01KSY9XWDKZRN4FW0A65M9GDTR
title: ctx-load Chat
status: active
created: 2026-05-31
version: 1
tags: []
parent_id: null
requires_load: []
---
# ctx-load Chat

## Rafa:

`ctx-load-design.md` decisions:

§1 Flat
§3 Filter ctx from every-done
§4 extend refreshCtx to weave/thread scope, explicit scope + ids, `scope: 'global' | 'weave' | 'thread'`, when user click on refresh, function calls & params will depend of tree node selected
§6 Global, Weave and thread should behave symmetry

Do you agree?
Tell me if everything is 100% clear
Update the design and the plan with decision taken

## AI:

Agreed on all four — each matches the design's lean, so nothing here surprises me.

- **§1 Flat** — ctx is a sibling of idea/design: `loom/{weave}/{thread}/{thread}-ctx.md` and `loom/{weave}/{weave}-ctx.md`. Zero walk change; `thread.allDocs` / `weave.looseFibers` already surface these. ✅
- **§3 Filter ctx from every-done** — recorded. One thing to confirm: the design lean **and** plan step 2 filter **both `ctx` *and* `reference`** from the predicate; you wrote only "ctx". I recorded it as ctx + reference — a reference doc is never "done", so if it counted, any thread holding a ref could never reach `done`. Say the word if you want ctx-only; flagging, not blocking.
- **§4 Explicit scope + ids** — `refreshCtx({ scope: 'global' | 'weave' | 'thread', weaveId?, threadId? })`, pure inputs. The caller (MCP tool / extension) maps the selected tree node → scope+ids; the use-case never reads "active selection" itself. ✅
- **§6 Symmetry** — weave and thread share the same flatness rule, the same every-done filter, the same `refreshCtx` interface; only the scope tag differs. No "weave is closer to global" special case. ✅

**100% clear** except the §3 ctx-only vs. ctx+reference nuance above — I went with the design's lean.

One coordination note (not a blocker): choosing Flat `{thread}-ctx.md` now is itself a naming decision that the `ctx-naming/` thread nominally owns. The idea doc said this thread "takes whatever convention ctx-naming lands on." Since ctx-naming hasn't landed, we're effectively setting the convention here. If ctx-naming later wants `ctx/` subdirs, §1 reopens — fine to proceed for now.

Recorded the four decisions into the `ctx-load-design.md` decisions log and updated the plan Goal note (confirmed 2026-05-31).

## Rafa:

§3 Filter ctx and reference from every-done, they are not part of the work stream, they are the context

I think all ctx docs should be named `ctx.md` and use Title for little description if needed. What do you think?

If you agree, do the whole plan


## AI:

**§3** — recorded as **ctx + reference** filtered from every-done. Settled.

**Naming — I agree, and it's the *better* call, not just a preference.** I traced the loader before answering. `ctx.md` lets the walk load ctx by **exact path** per scope — exactly how `loadThread` already loads `{threadId}-idea.md` / `{threadId}-design.md` — and it matches the global file, which is already `loom/ctx.md`. So the rule becomes uniform and deterministic across all three scopes: **"a scope's ctx is `ctx.md` in that scope's folder."** That *is* §6 symmetry, made literal. The `title` frontmatter carries the human description (your point). I'm sold on `ctx.md`.

**But I found a real problem with the design's §2.** §2 claims "no walk change — thread ctx already lands in `thread.allDocs` via the existing thread-files pass." **There is no such pass.** Here's what the code actually does:

| Scope | On disk | Loaded today? | Mechanism |
|---|---|---|---|
| Global | `loom/ctx.md` | ✅ | `getState` globs root `*.md` → `globalDocs` |
| Weave | `loom/{weave}/ctx.md` | ✅ | `loadWeave` globs weave-root `*.md` → `looseFibers` |
| Thread | `loom/{weave}/{thread}/ctx.md` | ❌ **dropped** | `loadThread` reads **only** `{threadId}-idea.md`, `{threadId}-design.md` by exact path + the reserved subdirs (`plans/ done/ chats/ refs/`). It **never scans the thread root** for anything else. |

So a thread ctx — under *any* filename — is silently dropped today. Classification itself is fine (`loadDoc` types purely from frontmatter `type:`, and `assembleContext` keys on `doc.type === 'ctx'`), so the only gap is that `loadThread` never *reads* the file. **Plan step 1's verification will return "no" → a walk change in `loadThread` is required.** The fix is one clean addition: load `path.join(threadPath, 'ctx.md')` if it exists, mirroring the idea/design loads, push to `allDocs`. (Weave + global already work, so they need no walk change — just the §3 status filter and the save path.)

**One scope question for you.** Two *other* ctx writers don't match the unified `ctx.md` rule and will drift if I leave them:
- `summarise.ts` writes weave ctx to `loom/{weave}/{weave}-ctx.md` (hyphenated).
- `generateGlobalCtx.ts` writes `loom/loom-ctx.md` — which also looks like a **latent bug**: global ctx is *loaded* from `loom/ctx.md` (id `loom-ctx`), so this writes a second, duplicate-id file to the wrong name.

Under "all ctx = `ctx.md`", both should be aligned to the canonical path. My lean (clean path) is to **fold both into this thread** so we land one convention with no legacy spellings left behind. The alternative is to keep this thread tight (just the `loadThread` walk + `refreshCtx` + status filter) and file the writer cleanup separately.

Also minor: the every-done predicate is in `packages/core/src/derived.ts` (`getWeaveStatus` L10, `getThreadStatus` L41), not the files plan step 2 currently names — I'll correct the plan's file pointers.

**So before I "do the whole plan":** the plan as written rests on §2's wrong premise and the old `{thread}-ctx.md` naming. I want to revise the design (§2 corrected, naming = `ctx.md`, §4 paths) and the plan (add the `loadThread` walk change; fix file pointers; decide the writer-alignment scope) in one pass, then implement. I need your call on the scope question above first.

Two trade-offs, then I stop:
1. **Writer alignment** — fold `summarise` + `generateGlobalCtx` into this thread (clean, my lean), or scope out?
2. **Existing files** — if any `{weave}-ctx.md` files already exist on disk, do we migrate them to `ctx.md` as part of this, or leave them?

## AI:

Your rename argument is exactly right — and it turns out you already won this argument months ago. I checked the sibling `ctx-naming/` thread before answering: **its design and plan are both `status: done`, and they landed precisely `ctx.md`.**

From `ctx-naming-design.md` ("Unify ctx filenames to plain ctx.md", done):
```
loom/ctx.md                     ← global, id: loom-ctx
loom/{weave}/ctx.md             ← weave,  id: {weave}-ctx
loom/{weave}/{thread}/ctx.md    ← thread, id: {thread}-ctx
```
> Resolved: **Plain `ctx.md` vs `{id}-ctx.md`? → Plain. Path-as-scope wins; the id-prefix form double-encodes information.**

That's your "hard on rename" point, already adopted as the rule. So this isn't a decision for us to make — **ctx-load just conforms to it.** It also fully resolves my earlier §1 "does this conflict with ctx-naming?" worry: zero conflict, exact alignment.

**One detail to carry forward:** filename is positional (`ctx.md`); the durable identity is **frontmatter `id` = `{weave}-ctx` / `{thread}-ctx`** (global stays `loom-ctx`). The link index resolves by `id`, never filename — ctx is *the* documented exception to "filename matches id." So `refreshCtx` writes `ctx.md` but stamps `id: {scope}-ctx`.

**Migration: non-issue.** I globbed the whole repo — the only `type: ctx` file that exists is `loom/ctx.md`. There are no `{weave}-ctx.md` / `{thread}-ctx.md` files anywhere, so nothing to rename or migrate.

**But ctx-naming's "done" plan left two code leftovers that violate its own convention** — I found them, and they're why the writer-alignment question matters:
1. `generateGlobalCtx.ts` still writes `loom/loom-ctx.md` — the *exact literal* ctx-naming's audit (step 1/5) was supposed to kill. It writes a second file with duplicate `id: loom-ctx` to the wrong path → latent bug.
2. `summarise.ts` writes weave ctx to `{weave}-ctx.md`, not `ctx.md`. (ctx-naming assumed weave writers already conformed; this one never did.)

Fixing these isn't new scope — it's **finishing the convention ctx-naming already ratified.** Given your "no legacy spellings left behind" stance, my strong lean is to fold both into this thread.

**So the actual ctx-load work, corrected:**
- `loadThread` — add the missing load of `ctx.md` (the §2 gap: thread root is never scanned). This is the core fix.
- `derived.ts` — filter `ctx` + `reference` from the every-done predicate (§3).
- `refreshCtx` — accept `scope` + ids, write `ctx.md` with `id: {scope}-ctx`, global byte-identical (§4/§5).
- Align the two stray writers above.
- Update `loom_refresh_ctx` MCP surface; update the pipeline reference.

**Plan-as-written is wrong on two counts** (§2 "no walk change" premise; old `{thread}-ctx.md` naming; file pointers name `entity.test.ts` but the predicate is in `derived.ts`). I want to revise the ctx-load design (correct §2, cite ctx-naming as the settled convention) and plan (add the `loadThread` walk; refreshCtx `ctx.md`+id; the two writer fixes; correct file pointers), then implement the whole thing.

**Go to revise design + plan and run it?** The only open call is whether you want the two writer fixes (1 + 2) folded in — I recommend yes. Then I'll execute end to end.

## AI:

You're right, and the architecture backs you up. Here's the reason in one line:

**At thread scope the pipeline already loads the idea + design + active plan in full** (that's the "parent chain" step of `assembleContext`). A thread-`ctx.md` would be a *summary of documents already in context* — more tokens, not fewer. Compression only pays off where the full docs are **not** loaded: **weave** (you're in one thread, you don't load the other threads' idea/design/plan) and **global** (you don't load every weave). Thread is the leaf — its own docs *are* its context. So ctx belongs at **global + weave only**; thread has none.

That also means I overcomplicated the work two messages ago. **Weave ctx already loads end-to-end today** — I re-read the code to be sure: `loadWeave` globs the weave root for `*.md` → `looseFibers`, and `assembleContext` already emits weave loose fibers of `type: ctx` as weave ctx. So the `loadThread` walk change I was about to make **isn't needed at all** — it only existed to serve thread ctx, which we're now dropping. (The idea doc's claim that "only global flows today" was imprecise — weave already flows; what's missing is narrower.)

**What's actually left, corrected and much smaller:**
1. **§3 status filter** — exclude `ctx` + `reference` from the every-done predicate in `derived.ts`, so a weave `ctx.md` doesn't permanently block the weave from `DONE`. (This is the one genuine bug today.)
2. **`refreshCtx` weave scope** — let the tool *write* `loom/{weave}/ctx.md` with `id: {weave}-ctx`. Global stays byte-identical. No thread scope.
3. **Align the two stray writers** to the `ctx.md` convention (`summarise.ts`, `generateGlobalCtx.ts`) — finishing what ctx-naming started.
4. **Remove the dead thread-ctx slot** (`assembleContext` step 2c) and note "thread scope has no ctx" in the pipeline reference — so the "inert slot that promises a feature we don't deliver" trap (the exact thing the idea doc warned about) doesn't survive in the code.

**This rewrites the thread's framing**, which is fine — idea + design are still `draft`:
- **Idea** — retitle/reframe from "thread/weave ctx not loaded" to "weave ctx: status gap + not writable; thread ctx intentionally dropped (parent chain already loads the real docs)."
- **Design** — §1/§2/§4 narrow to weave-only; **§6 flips** from "weave⇄thread symmetric" to "ctx = global + weave; thread is the leaf, no ctx." Record the rationale.
- **Plan** — drop the `loadThread` step; keep status filter + refreshCtx(weave) + writer alignment + remove dead slot.

One small call for you: in step 4, **remove** the thread-ctx slot (my lean — make "no thread ctx" explicit in code) vs. **leave it inert** (harmless, since `loadThread` never produces one). I lean remove.

**Go to revise idea + design + plan to this narrower shape and implement?** This is a real pivot off the idea doc's original premise, so I'm stopping here for your confirm before rewriting anything.

## AI:

Did the implementation recon. The status filter and the dead-slot removal are trivial and unambiguous. But there's a **third ctx writer** I didn't know about, and it's worse than the two you folded in:

| Tool | Writes to | Verdict |
|---|---|---|
| `loom_generate_global_ctx` | `loom/loom-ctx.md` | wrong name → fix to `loom/ctx.md` |
| `loom_summarise` (`summarise.ts`) | `loom/{weave}/{weave}-ctx.md` | wrong name → fix to `loom/{weave}/ctx.md` |
| **`loom_refresh_ctx`** (`refreshCtx.ts`) | `loom/{weave}/[{thread}/]ctx/{id}-YYYYMMDD.md` | **broken three ways** |

`loom_refresh_ctx` writes into a **`ctx/` subdirectory** with a **date-stamped id** (`{weave}-ctx-20260531.md`) — *both* shapes ctx-naming explicitly rejected ("single file, not directory"; "filename = positional `ctx.md`"). And critically: `loadWeave`/`loadThread` only ever read the weave/thread **root**, never a `ctx/` subdir — so **this tool's output has never once been loaded by the pipeline.** It's the inert-ctx bug in its purest form, hiding behind a button that looks like it works.

It also explains the pipeline reference's "known gap" note (line 170): that note describes the *old* `ctx/`-subdir model and is itself stale — written before ctx-naming flipped to flat `ctx.md`.

**The full corrected work, then:**
- `derived.ts` — filter `ctx` + `reference` from every-done (the one real status bug).
- `assembleContext.ts` — remove the dead thread-ctx slot (2c) + fix the ordering comment.
- All three writers → flat `ctx.md` at the canonical path, stable id (`loom-ctx` / `{weave}-ctx`).
- `loom_refresh_ctx` → drop `threadId` (pivot: no thread ctx), drop the `ctx/` subdir + dated id.
- Pipeline reference — replace the stale gap note with the shipped reality.

**One call for you — it's an MCP API change, so I'm stopping for it.** `loom_refresh_ctx` (sampling-based, weave+thread) is *redundant* with `loom_summarise` (AIClient-based, weave) — two tools generating weave ctx with incompatible frontmatter. Under the pivot both collapse to "weave ctx → `loom/{weave}/ctx.md`". Options:

- **(B — my lean)** Repoint `loom_refresh_ctx` to flat `loom/{weave}/ctx.md`, `id: {weave}-ctx`, drop `threadId`; fix `summarise` to the same path; **leave both tools in place** and flag the redundancy as a separate consolidation follow-up. Smallest correct change, no API removed.
- **(A)** Same, but consolidate the two into a single weave-ctx tool now — bigger MCP-surface refactor, removes a tool.
- **(C)** Fix only `summarise` + `generate_global_ctx` now; defer `loom_refresh_ctx` to its own follow-up thread.

I recommend **B**. Confirm and I'll revise idea + design + plan to this corrected shape in one pass, then run the entire thing end to end (build + test green).

STOP — waiting on the B/A/C call.

## AI:

Got it — future-first, no reconciling with legacy, docs are evidence not authority. Making the call myself and running it. Clean target state:

**ctx exists at global + weave only.** Flat `ctx.md` per scope, stable id (`loom-ctx` / `{weave}-ctx`), single file (regenerate = overwrite). No thread ctx, no `ctx/` subdirs, no dated ids — none of those survive.

**Executing now:**
1. `derived.ts` — exclude `ctx` + `reference` from the every-done predicate (weave/thread status), so a ctx never blocks `DONE`.
2. `assembleContext.ts` — global + weave ctx slots only; delete the thread slot; fix the ordering/docstring.
3. All ctx writers point at the canonical flat path: `generate_global_ctx`→`loom/ctx.md`, `summarise`→`loom/{weave}/ctx.md`, `refresh_ctx`→`loom/{weave}/ctx.md` (drop `threadId`, the `ctx/` subdir, the dated id).
4. Rewrite the pipeline reference's ctx section to the shipped reality.
5. Build + full test green; smoke-load a hand-written weave `ctx.md`.

**One thing I'm deliberately *not* doing here:** collapsing the three generation tools into one. That's a real cleanup, but the blocker is an orthogonal architecture choice — AIClient (`summarise`) vs MCP sampling (`refresh_ctx`/`generate_global_ctx`) as the canonical inference path — which belongs to a generation thread, not a *loading* thread. I'm fixing all three so none write to a wrong/dead path (the broken behavior dies now); I'm only deferring the "one tool vs three" surface. Shout if you want that folded in too.

Revising idea/design/plan to match, then implementing.

## AI:

Shipped — `ctx-load-plan-001` is **done** (auto-completed, all 5 steps ✅, build + full suite green).

What landed:
- **Status** — `derived.ts` excludes `ctx` + `reference` from the every-done check (with a guard so a ctx-only scope isn't a false `DONE`). New regression test.
- **Assembler** — thread-ctx slot removed; global + weave only.
- **Writers** — all three point at the canonical flat path: `generate_global_ctx`→`loom/ctx.md`, `summarise`→`loom/{weave}/ctx.md`, `refresh_ctx`→`loom/{weave}/ctx.md` (weave-only, no `ctx/` subdir / dated id; now actually sources content). Extension command + toasts + tool descriptions aligned.
- **Reference** — pipeline ref rewritten to the shipped reality (no more stale "inert / `ctx/` subdir" note).
- **Verified** — full test-all green incl. MCP 8/8; end-to-end smoke: a real `loom/{weave}/ctx.md` loads via `loadWeave` and assembles as scope `weave`.

Net effect: weave ctx is now a live part of the assembled context, and the three "refresh ctx" buttons stop writing to dead/wrong locations.

**Flagged follow-up (not done, by design):** consolidate the three ctx generators into one — blocked on the orthogonal AIClient-vs-MCP-sampling canonical-path choice. Worth its own thread when you want it.

## Rafa:

to consolidate the three ctx generators into one for global and weave ctx, what decisions should be taken?

