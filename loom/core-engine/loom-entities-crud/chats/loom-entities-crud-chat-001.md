---
type: chat
id: ch_01KWEBK75MMT5QAFJGNPFNER0Z
title: Loom entities CRUD Chat
status: done
created: 2026-07-01
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 33
---
# Loom entities CRUD Chat

## Rafa:

currently:

1. hook `.claude/hooks/loom-mcp-gate.ps1` should block writting `loom/**/*.md` docs, but is deactivated. 
2. `loom rename` and `extension` only rename loom docs titles, not the filenames
3. `weaves` and `threads` are no documents, they are special container `folders`. Extension shows right mouse menu option on them to rename and then ask for doc id, this is bad wiring.

### Weave CRUD

Should be just OS folder commands 

### Thread CRUD

Should be just OS folder commands, but `thread.md` has also a frontmatter field `title`
I really don't know why, maybe we should just delete that field
I think renaming a thread should not rename its documents
Moving a thread to other weave should also be allowed.

### UX Extension

Proposal:
- `F2` to rename weaves, threads and doc filename. 
- drag & drop to move threads

### TODO

What do you think? Agree? Better approach?
Some essential operation I missed?

## AI:

I read the code before answering. Short version: your mental model is right, and the architecture already leans your way more than the current tooling shows. Grounded findings first, then where I'd push, then the one real decision I want you to make.

### Your three "currently" items — all confirmed in code

1. **Hook deactivated.** It's not broken — `.claude/settings.json` is renamed to `settings.jsonDISABLED`, so nothing wires the `PreToolUse` matcher. The script `loom-mcp-gate.ps1` is intact and correct. Re-enabling = rename the file back. Worth remembering *why* you disabled it though (was it firing on something legitimate?) before we flip it on again.
2. **rename = title only.** `packages/app/src/rename.ts` deliberately touches only `title` (+ synced body H1). The header comment spells out the intent: identity is the ULID, the filename is cosmetic, and every backlink (`parent_id`, `requires_load`, plan `blockedBy`) points at the ULID — so a title change needs zero cross-doc rewrites. That's *good* design, not a bug. What's missing is a **separate** capability to rename the filename slug. It was never wired, not "half-done".
3. **Bad wiring confirmed.** `packages/vscode/package.json:766` wires `loom.rename` for `weave|thread|...` viewItems, but `commands/rename.ts` only does doc-by-ULID rename → it literally prompts "Document ID to rename" for a folder. A weave/thread has no doc id, so it's nonsense wiring. Same story for `loom.delete`/`loom.archive` on those nodes.

### The frame I agree with — with one correction

Weave/Thread are **containers, not documents**. CRUD on them is folder-shaped. The architecture already backs this:

- **Weaves already have no title** — in the state summary they're pure folder ids (`ai-integration`, `core-engine`). So weaves are *already* your model. Threads are the odd one out.
- **Move-thread-across-weaves is already safe** *because* `thread.md` carries a stable `th_` ULID and `depends_on` edges reference that ULID (not the folder path). Move the folder → the ULID travels with it → every dependency edge survives. That's exactly why the ULID is on the manifest. Your instinct ("moving a thread should be allowed") is already structurally supported; it just has no tool/gesture.
- **Renaming a thread won't touch its docs** — docs are ULID-identified and never embed the thread name, so a folder rename can't ripple into them. Your instinct there is *automatically* true.

**The one correction:** "just OS folder commands" can't be literally OS commands, because the extension is layered `vscode → mcp → app → fs` and must never call `fs` directly. So these stay folder-*shaped* operations but need thin MCP tools (`loom_rename_thread`, `loom_move_thread`, `loom_rename_weave`, `loom_delete_weave`…) that do the `fs` op server-side. The upside: none of them edit `.md` *content*, so they don't fight the MCP gate at all — the gate only guards markdown *body/frontmatter* writes, and a folder rename/move is neither.

### The one real decision: the `thread.md` `title` field (I want your call)

This is the crux and I don't want to just pick. Two coherent options:

- **A — Drop `title`, derive the display name from the folder slug.** Makes threads exactly like weaves: folder *is* the name, rename = rename folder, one identity. Cleanest model. **But** it degrades every existing descriptive title. Folder `ai-transport` currently displays as "AI Provider Transport Abstraction (API Key vs Subscription vs Ollama)" — that title has parens and slashes that can *never* be a folder name. Deriving from the slug gives you "Ai Transport". You'd lose real information across ~90 threads.
- **B — Keep `title` as display; folder slug = human-editable identity; ULID = stable cross-ref.** This mirrors *exactly* how docs already work (ULID id + filename slug + title). Rename-folder (change slug) and edit-title (change display) become two distinct, honest operations. My recommendation — the descriptive titles are worth keeping, and it makes threads consistent with docs rather than with weaves.

If B, then F2 has to pick a lane (see below). If you'd rather threads match weaves at the cost of the titles, that's A.

### F2 / drag-and-drop semantics (follows from the decision above)

- **F2 on a weave/thread** → rename the folder slug (needs the new MCP tools). Clean.
- **F2 on a doc** → here's the sub-question: rename the **filename slug**, the **title**, or both? Two-name docs (slug + title) mean these can drift. I'd suggest F2 = rename the **filename slug only** (keeping the `-{type}.md` suffix — the tree derives type from it, so that suffix is load-bearing and must be preserved), and keep the existing title-rename as its own action. Or we collapse them and say "F2 renames the human name, which re-slugs the file to match." Your call, but we should decide *before* wiring, because it changes what the tool does.
- **Drag a thread onto a weave** → `loom_move_thread`. Safe, per the ULID reasoning above.

### Operations I think you're missing

1. **Move a *doc* between threads** (and loose-fiber → thread). You listed drag&drop for threads but not docs. Promoting a loose fiber idea into a thread, or reassigning a misfiled doc, is a core CRUD gesture — and it's safe for the same ULID reason. Worth having alongside move-thread.
2. **Archive vs delete for folders.** `loom_delete` on a weave/thread is `rm -rf` on a folder full of history — irreversible. `loom_archive` already supports folders (moves to `loom/.archive/{weave}/{thread}/`). I'd make the destructive tree action *archive by default* and gate true delete behind explicit confirmation, rather than exposing a bare folder-delete on right-click.
3. **Create weave/thread from the tree.** Is there a "+" gesture, or is creation only implicit (first `loom_create_*` auto-scaffolds the thread.md)? If the tree is meant to be the full CRUD surface, empty-container creation should be a visible action too.

### So, concretely, agree + additions

Agree with: weave/thread = folders; rename-thread ≠ rename-docs; move-thread-across-weaves; F2 + drag&drop as the gestures. Add: thin MCP tools for the folder ops (not raw OS), move-*doc*-between-threads, archive-first delete, and settle the `title` + F2 semantics before wiring.

**My one blocking question:** thread.md `title` — **A (drop it, folder = name)** or **B (keep it, my recommendation)**? And if B, does F2 on a doc rename the filename slug, the title, or re-slug-from-title? Once you answer those two, the rest is a clean plan.

Next: waiting on your call on the `title` field + F2 doc semantics before proposing a design.

## Rafa:

- thread.md `title` B. I didn't realize that titles is showed in the extension, my mistake 
- my slip-up "just OS folder commands", good catch, of course it is `fs` not `OS`
- rename docs, agree with your suggestion

### Operations I missed
1. Agree. moving / drag docs to another weave / thread is essential. Note about `loose-fiber`, I think currently there is no possible to have them, all docs are attached to its corresponing entity. This `lose-fiber` concepts come from past loom versions, but good to keep the concept, maybe we will need it...
2. Agree
3. Extension start with `Create weave` button already availabe. Then right mouse option on weaves  to create a child threads. So I think this is already implemented.

### TODO

When all is grounded, write design, if not tell me

## AI:

Not fully grounded yet — I hit one finding that breaks two of the decisions we just made. Telling you instead of writing the design.

### The finding: doc filenames are *not* human slugs today

I read how files are actually named (`packages/fs/src/repositories/threadRepository.ts`). There are three different schemes:

- **idea / design** → `{threadId}-idea.md`, `{threadId}-design.md` — derived from the **thread folder name**, one singleton each per thread.
- **plan / done / chat** → `{docULID}.md` — opaque (e.g. `pl_01KT4NKFH0TD8RSDJ674XPV71H.md`). Not human-readable at all.
- **reference** → `{slug}.md` — the *only* file actually named by a human slug.

Also confirmed while here: `loom.weaveCreate` + `loom.threadCreate` exist (your point 3 ✓), `archiveItem`/`loom_delete` both take folder targets `{ weaveId, threadId? }` ✓, and no move tool exists yet.

### Why this breaks two decisions

**1. "F2 on a doc = rename the filename slug" has no coherent target.** For plan/done/chat the filename is a ULID; for idea/design it's the thread name. There's no per-doc human slug to rename (except references). So F2-renames-filename only makes sense if we *first* give docs real slugs. The honest fork:

- **Path A — doc "rename" = title only.** Filenames stay derived/opaque; nobody browses them, the tree shows titles. This is just what `loom_rename` already does, and it's internally consistent with the existing "ULID identity, title presentation" decision. Cheap, small.
- **Path B — give docs real slugs** (migrate plan/done/chat off `{ULID}.md`, decouple idea/design). Files become greppable/browsable by name — arguably more "markdown-is-the-DB". But large blast radius (filename derivation, tree type-inference, link index) and it fights the deliberate ULID-filename decision.

**2. "Renaming a thread should not rename its documents" collides with idea/design filenames.** Because `idea`/`design` files embed the *threadId*, renaming a thread folder `foo → bar` leaves `foo-idea.md` / `foo-design.md` sitting inside a `bar/` folder — mismatched. To keep your rule literally true, one of these has to give.

### The clean resolution I'd recommend (one decision covers both)

Make **idea/design flat singletons like `thread.md` and `req.md` already are** — i.e. rename them to plain **`idea.md` / `design.md`** (drop the `{threadId}-` prefix). Then:

- Thread rename becomes a **pure folder rename, zero doc files touched** — your rule #2 becomes literally true, not "true except for two files".
- idea/design/thread/req are all consistent flat per-thread singletons.
- No thread-slug coupling anywhere in filenames.
- `findDocumentById` resolves by frontmatter id (not filename), so nothing breaks — safe migration.

Pair that with **Path A** for the doc-rename gesture: **F2 on a doc renames its title** (what we want the human to edit anyway); filenames stay machine-owned (`idea.md`/`design.md`, ULIDs for the many-per-thread types). plan/done/chat keep `{ULID}.md`; reference keeps `{slug}.md`.

Net: F2 renames *title* on a doc and *folder* on a weave/thread; the file layout gets one small migration (`{threadId}-idea/design.md` → `idea.md`/`design.md`) that makes thread-rename genuinely doc-free.

### The call I need from you

1. **Doc rename gesture:** Path A (F2 = rename title, filenames machine-owned) — recommended — or Path B (introduce real per-doc slugs, bigger change)?
2. **idea/design filenames:** flatten to `idea.md`/`design.md` (recommended, makes thread-rename doc-free) — or leave them thread-prefixed and tolerate the mismatch after a rename?

Answer those two and I'm fully grounded to write the design.

Next: waiting on your two calls above before writing the design doc.

## Rafa:

Yes, only reference docs uses slug now.
1. A
2. I like flatten idea design, even also plans to plan-001, plan-002, agree? My concern here is that we will need another migration loom command

I think we have another concept to be aware before allowing moving docs to another thread and `lose-fiber` concept its needed again.
We only should allow move docs with no children yet (new lose-fiber concept) to another thread or move them all together, if not the doc chain is not clear and become cross-threads, agree? what you think? I lean only allow moving docs with no children (idea or design) if thread already have req or plan do not allow

Tell me and stop before design

## AI:

Both good calls. Here's where I land, then I stop.

### Plans → `plan-001.md`, `plan-002.md` — agree

With three notes:

- **Ordinal is presentation, ULID stays identity.** The `pl_…` ULID remains in frontmatter and every cross-ref (`parent_id`, `blockedBy`, done→plan) keeps pointing at it. `plan-001.md` is just a human-facing, sequence-carrying filename — and sequence *is* meaningful for plans (plan-001 before plan-002), which is exactly why ordinals fit plans better than they'd fit anything else.
- **Assign by creation order, never renumber on delete.** Leave gaps (like DB migrations) — if `plan-002` is deleted, `plan-003` does not slide down to `002`. Renumbering would make a "stable" filename unstable and could collide with a done doc that referenced the old number in prose.
- **It extends cleanly to done**, and there's a chat question. done becomes `plan-001-done.md` (today it's named by the done doc's own ULID — the migration cleans that up too). Chats are also many-per-thread — do you want `chat-001.md` for full consistency, or leave chats as `{ULID}.md`? I'd do `chat-001.md` so the whole thread folder is human-readable, but it's your call since chats are churny.

**On the migration concern:** it's real but bounded — it's **one** command, and it's a **pure file-rename pass, zero content rewrites**. Because identity and every link are frontmatter-ULID based (and `findDocumentById` resolves by scanning frontmatter, not filename), renaming files touches no doc *content* at all. So `loom migrate-filenames` is mechanical and low-risk: idea/design → `idea.md`/`design.md`, plans → `plan-NNN.md`, dones → `plan-NNN-done.md`, (chats → `chat-NNN.md` if you say yes). One command, one pass, reversible if we snapshot first.

### Move-doc across threads — agree with your intent, and I'd tighten the rule

Your instinct (don't let a chain split across threads) is exactly right. I'd make the rule crisper by defining the movable unit as a **loose fiber = a doc with no parent AND no children**, rather than just "no children". Here's why the parent side matters too:

Take a thread with `idea → design` linked (no req, no plan yet). By your "no children" rule the design is movable. But moving *just* the design leaves its idea behind — `design.parent_id` now dangles into the old thread. That's the same cross-thread split you're trying to prevent, it just happens on the parent edge instead of the child edge.

So the clean rule:

- **Movable across threads = a loose fiber only** (no parent, no children). In practice that's a *standalone* idea or design — one that hasn't been chained to anything. Your "if the thread has a req or plan, don't allow" falls out automatically: once there's a plan, the idea/design are its parents (they have children) → not loose → not movable.
- **A developed chain moves by moving the *thread*** (folder move across weaves — already agreed), which keeps `idea → design → plan → done` intact by construction. No partial-chain moves.
- **Precondition on the destination:** singleton slots. You can't move an idea into a thread that already has an `idea.md` (slot taken) — that's now naturally enforced by the flat `idea.md`/`design.md` naming.

Net: the only cross-thread *doc* move is a loose fiber landing in a free slot; everything attached travels as a thread. That resurrects the loose-fiber concept precisely where you said we'd need it, and keeps the graph honest — no dangling parent_id, no dangling child_ids, ever.

### One thing this settles

Loose fibers become reachable again: a childless, parentless idea/design (at weave root, or in a thread that has nothing else) is a loose fiber, and it's the *only* thing move-doc operates on. That's a clean, small surface.

So: agree on plan ordinals (+ my three notes, + the chat question), agree on move-doc with the "loose fiber = no parent & no children" tightening. Answer the chat-naming question (`chat-001.md` or leave ULID?) and confirm the loose-fiber tightening, and I have everything to write the design.

Next: stopping before design, as you asked — waiting on the chat-naming call + your OK on the loose-fiber tightening.

## Rafa:

Agree all. Flat chats also.

note: in a weave can only live threads, docs should live in a thread. An idea or design need to be under a thread. We can reuse `lose-fiber` concept to name it has no parent, no children or maybe assign a better name to refer this, options?

note: chat live under `chats/` if we allow move them

so F2 will only rename Titles for all docs 
reference docs should allow also rename filename slug

## AI:

Good — that tightens the model further. Two of your notes are actually decisions with consequences worth naming out loud, then the naming question you asked me for.

### "Weaves contain only threads; every doc lives in a thread"

This is a real simplification (I like it), but it retires weave-root docs entirely. Consequences the design has to cover:

- The weave-level create commands — `loom.weaveIdea`, `loom.weaveDesign`, `loom.weavePlan`, and weave-root `loom.chatNew` ("Weave Chat") — either go away or become "pick/create a thread first, then create the doc there." No doc is ever born at weave root.
- Migration must sweep any *existing* weave-root docs into a thread (I'll enumerate what's actually there when I write the design — it feeds the same one-pass `migrate-filenames`/`migrate-layout` command).
- A weave folder then contains exactly: thread folders. Nothing else. Clean invariant, easy to validate.

So a **loose fiber no longer means "doc at weave root"** — that location ceases to exist. It now means purely a graph position: *a doc not woven into its thread's chain*. Which is your naming question.

### Naming the "no parent, no children" doc

We're naming a **graph position**, not a location: a doc with no parent and no children — not yet woven into the idea→design→plan→done chain. Options, all staying in the weave metaphor except one:

- **loose fiber** *(reuse, recommended)* — a fiber not yet woven into the thread. Keeps the existing vocabulary; we just redefine it precisely (position, not location). Zero new terms to teach.
- **loose end** — the English idiom already means "an unconnected, unfinished thing," and it's thread-adjacent ("a thread's loose end"). Most self-explanatory to a new user; signals the redefinition cleanly.
- **strand** / **free strand** — in-metaphor variant, but adds a new noun to the glossary.
- (Avoid **orphan** — it connotes a broken/dangling reference, i.e. a *bug*, which is the opposite of what this is. A loose fiber is healthy, just unattached.)

My pick: **loose fiber** for continuity, unless you want the redefinition to be obvious to newcomers — then **loose end**. Your call.

### F2 / rename gestures — locking it

- **F2 on any doc → rename Title only.** Uniform, no surprises.
- **F2 on a weave/thread node → rename the folder** (the `fs` folder op via a new MCP tool).
- **Reference docs additionally** get a separate **"Rename file"** action that renames the `{slug}.md` — references are the one type whose filename *is* a human slug, so they're the one type where a filename rename is meaningful. F2 stays title even on references; slug rename is the extra action.

### Chats under `chats/`

Confirmed — moving a chat targets the destination thread's `chats/` folder, and chats flatten to `chat-001.md` there.

### Decisions locked so far (this will seed the design)

1. Weave/thread = `fs` containers; CRUD via thin MCP tools (`loom_rename_thread`, `loom_move_thread`, `loom_rename_weave`, …), not raw fs from the extension.
2. `thread.md` keeps `title` (display); folder name = slug; `th_` ULID = stable cross-ref. Weaves stay title-less (folder = name).
3. Filenames flatten/humanize: `idea.md`, `design.md`, `plan-NNN.md`, `plan-NNN-done.md`, `chat-NNN.md`; references keep `{slug}.md`. ULIDs stay the identity in frontmatter. One-pass migration command, rename-only, zero content rewrites.
4. Ordinals assigned by creation order, never renumbered on delete (gaps allowed).
5. Every doc lives in a thread; weaves contain only threads; weave-root docs retired + migrated.
6. Cross-thread **doc** move = **loose fibers only** (no parent, no children → only a standalone idea/design). Developed chains move by moving the **thread**. Destination must have a free singleton slot.
7. Delete is **archive-first** (folders → `loom/.archive/…`); true delete behind explicit confirm.
8. F2 = title (docs) / folder (weave-thread); references get an extra slug-rename action.
9. Re-enable the MCP gate (`settings.jsonDISABLED` → `settings.json`).

Give me the name (loose fiber vs loose end) and a **go**, and I'll write the design doc.

Next: stopping before design — waiting on the name pick + your go.

## Rafa:

### "Weaves contain only threads; every doc lives in a thread"

I think this is Loom current behaviour

### Naming the "no parent, no children" doc

Agree, keep loose fiber

go

## AI:

Design written — `loom-entities-crud-design.md` (draft, `de_01KWEGNABRHPMVY50E6DGRX4WQ`). It captures the entity model + invariants, all 9 locked decisions, the filename before→after table, the loose-fiber definition + move rules, the new MCP tool surface (`loom_rename_weave` / `loom_rename_thread` / `loom_move_thread` / `loom_move_doc` / `loom_rename_doc_file`), the extension/F2/drag-drop wiring fixes, the one-pass `loom migrate-layout`, and the gate re-enable.

One thing I confirmed while writing that simplified the migration: **there are no live weave-root docs** (only `loom/.archive/` and `loom/refs/`), so weave-only-threads is already true in the data — the migration is filename-only, and we just remove the dead weave-root *creation* code paths (`weaveIdea`/`weaveDesign`/`weavePlan` no-thread branch, weave-root `chatNew`) to enforce it going forward.

Two open questions I left in the design for you:
1. `loom migrate-layout` as its own command, or fold into the existing `scripts/migrate-to-threads.ts`?
2. `loom_move_doc` on a doc with a (shouldn't-happen) stale `parent_id` — hard-refuse (my current design) or auto-detach?

Next: design is a draft — review it, answer the two open questions, and tell me to finalize + promote to a plan when you're happy.

## Rafa:

I renamed this chat to `loom-entities-crud-chat-001.md`
I marked design done

1. `loom migrate-layout` as its own command
2. hard-refuse

Write plan

## AI:

Plan written: `loom-entities-crud-plan-001.md` (`pl_01KWEHB46B8AKB9WNRZCFYZ4RV`) — 9 steps, dependency-ordered.

Two honesty corrections I made after verifying the real code (my earlier "current filename" claims were wrong):
- **Design table fixed.** Plans are actually `{threadId}-plan-NNN.md` today (not `{ULID}.md`), done docs are *inconsistent* (`{planULID}-done.md` recent / `{threadId}-plan-NNN.md` legacy), and chats are `{threadId}.md`. Root cause: filename derivation is split across **disagreeing sites** — `docPathInThread` is only a fallback (`doc._path ?? …`) and the per-type MCP create tools compute their own names. Step 1 now explicitly *unifies all sites into one module* (the real fix), and the design's filename table + derivation note are corrected.
- **Plan dependency graph fixed.** `loom_create_plan` stored my `blockedBy` as ordinals (`"1"`, `"4"`…), which don't match the slug step-ids — dangling refs. I rewired them all to the real step ids. (This is the `plan-blockedby-id-normalization` gap biting live — worth noting for that thread.)

Nice dogfooding datapoint: you renamed this chat to `chat-001.md` via the OS mid-session and it still resolved by ULID on the next `loom_append_to_chat` — that's exactly the "filenames are cosmetic, identity is the ULID" premise the whole design rests on, validated for real.

The natural first step is **Step 1 (canonical filename module)** — it's the foundation everything else blocks on. Say `start` (I'll `loom_start_plan` and do Step 1), or `go` to start and run Step 1.

Next: plan ready and corrected — waiting for `start`/`go` to begin Step 1, or your review notes first.

## Rafa:

side question: did you updated design and do not ammed plan? 
design, version: 4
plan, design_version: 2
so plan is stale, could I update plan, design_version: to 4, or plan need to be synced to design?

I started the plan
Do whole plan if all ready

## AI:

Yes — that's exactly what happened, and it's a *false* stale. Sequence: I created the plan right after the first design patch (design was v2 then), and then patched the design twice more (the filename-table fix + the derivation note → v3, v4) **after** the plan existed. So the plan's `design_version: 2` now trails `design.version: 4`, and `loom_get_stale_plans` flags it.

But the plan's **content is already in sync** — when I corrected the design I amended plan steps 1 & 2 in the same breath (step 1 → "unify all derivation sites", step 2 → the real current filenames). So nothing in the plan needs rewriting; only the version *stamp* lags.

So to your question: **yes, `design_version: 4` is the correct value** — it's a re-bless, not a cheat, because the plan already matches design v4. No content sync needed.

The catch (and a real Loom gap this surfaces): the *normal* way to clear it is `loom_refine_plan`, but in a Claude Code CLI session sampling is blocked, so refine returns MethodNotFound — and there's **no non-AI "re-bless" tool** that just re-stamps `design_version` when the content already matches. `loom_update_doc` only touches body/status/requires_load. So right now neither of us has a clean MCP path to flip that stamp (hand-editing frontmatter is gated). That's a genuine missing affordance — staleness has an AI-driven collector but no cheap "content's already fine, re-stamp it" op. Worth a small follow-up thread (fits alongside `staleness-model`/`align-stale-surfaces`): e.g. a `loom_rebless_plan` or a `--rebless` flag.

For now the flag is harmless — it doesn't block execution. I'll proceed with the whole plan as you authorized; we can re-bless (or add the affordance) at plan close.

Next: executing the plan end-to-end (Step 1 → 9), marking each ✅ + appending done notes as I go; I'll stop only for a genuine architecture fork or a repeated failure.

## AI:

Before I mutate anything, a real architecture fork surfaced inside Step 1 — and it carries a recursive hazard on *this* repo. Stopping to get your call (stop-rule 3 still interrupts an authorized range).

### Step 1 is bigger than its file list says

Filename construction isn't 2 sites — it's spread across at least these, and they must all move onto the one module *plus* the read-side filters that recognise filenames:

- **Write sites:** `generatePlanId` + `generateChatId` (core/idUtils.ts), `weaveIdea.ts`, `weaveDesign.ts`, `weavePlan.ts`, `chatNew.ts`, `promoteToIdea/Design/Plan.ts`, `closePlan.ts` (done + plan-into-done), `req.ts`/`thread.ts` (already flat), and the `docPathInThread` fallback (fs).
- **Read sites that pattern-match filenames:** `chatNew.ts` (`/-chat-\d+\.md$/`), `doStep.ts` (`/-chat(-\d+)?\.md$/`), `migratePlanSteps.ts` (`/-plan-\d+\.md$/`), `backfill*`, and the tree's type-inference. These decide "is this a chat/plan file?" and will stop recognising docs the moment names change unless updated in lockstep.

So Step 1 = one naming module + rewire ~10 write sites + widen ~5 read matchers to accept **both** old and new names. That's the honest size; I'll update the step's file list to match.

### The fork: transition strategy (pick one)

Changing *writes* to the new scheme means existing docs (old names) and new docs (new names) coexist until a migration runs. Two coherent ways:

- **A — Dual-read + migrate-last (recommended).** Readers accept old *and* new names; writers emit new names; the `migrate-layout` command normalises a repo to all-new in one pass, run when you choose. Safe, incremental, no flag-day. Cost: read matchers carry both patterns until you migrate (small, temporary).
- **B — Atomic per-thread.** No dual-read; derivation change + migration land together so nothing ever coexists. Cleaner end state, but it's a flag-day: the repo must be migrated in the same commit the code changes, or it breaks.

I recommend **A** — it's the low-risk path and lets us verify each layer before the repo-wide rename.

### The recursive hazard (this matters)

`migrate-layout` run on **this** repo will rename `loom-entities-crud-chat-001.md → chat-001.md` and `loom-entities-crud-plan-001.md → plan-001.md` — i.e. the exact chat and plan driving this session. If I run it mid-plan, I rename the files under my own feet (the active plan's `_path`, this chat's path). So regardless of A/B: **build the command now, but run it against loom-repo itself LAST — ideally in a fresh session after this plan is closed.** I'll implement + unit-test the migration on throwaway fixtures, not on our live docs.

### What I need from you

1. Transition strategy: **A (dual-read, migrate-last)** — my rec — or **B (atomic)**?
2. Confirm the recursive-hazard plan: implement + fixture-test `migrate-layout`, but **do not** run it on loom-repo until the plan is closed (fresh session).

Give me those two and I'll drive Steps 1→9 in order (running the loom-repo migration itself deferred to the end per your call).

Next: stopped on the transition-strategy fork + recursive-migration hazard — waiting on your two answers, then I implement Step 1.

## Rafa:

1. A
2. confirmed, migration after implement this in a fresh session

Maybe better split plan in phases you consider well defined
Maybe just start doing step 1

## AI:

✅ **Step 1 done — canonical filename module + dual-read (strategy A).** Build green, full `test-all` green.

What landed:
- **`packages/core/src/docNaming.ts`** — single source of truth for filenames. Writers (`planFileName`→`plan-NNN.md`, `doneFileName`→`plan-NNN-done.md`, `chatFileName`→`chat-NNN.md`, `singletonFileName`→`idea.md`/`design.md`), a gap-preserving `nextOrdinal`, and dual-read recognisers. (Put it in **core**, not fs as the plan said — it's pure logic that core's own generators and fs both consume; noted in the done doc.)
- **Writes** rewired to new names: weaveIdea/weaveDesign/weavePlan/chatNew, promoteToIdea/Design/Plan, closePlan + appendDone (done filename derived from the plan's ordinal; done *id* stays `{planId}-done`).
- **Reads** made dual-read (canonical first, legacy second): loadThread idea/design, req/parentDesign/parentIdea parent lookups, backfill. Plans/dones/chats already dual-read (loadMdFiles filters by frontmatter `type`, not filename).
- Fixed 3 tests that asserted the legacy done name; the **seeded-legacy-done cases pass unchanged**, and the MCP integration test reads this repo's still-legacy docs green — dual-read proven end-to-end.

**Operational note (the stale-MCP-server gotcha, live):** when I recorded this step, `loom_append_done` wrote the done doc at the *legacy* name (`pl_…-done.md`) instead of `plan-001-done.md`. That's because `build-all` updates `dist/` but does **not** restart this session's running `loom mcp` — so the MCP tools I call in-session still run pre-build code. Harmless here (dual-read + migrate-layout will normalise it), but it means: to actually exercise the new CRUD tools (Steps 6–7) live, we'll need an MCP/session restart. Something to bear in mind — and arguably another paper-cut worth a follow-up.

You suggested phasing — Step 1 is a clean **Phase 1 (foundation)** boundary: it's self-contained, green, and everything else builds on it. Given the session's length and that Steps 6–7 will need a fresh MCP server to test anyway, I'd suggest committing Phase 1 now, then continuing. Two ways forward — tell me which:
- **Continue straight through** Steps 2→9 here (migrate-layout is fixture-only, safe), or
- **Phase it:** commit Phase 1, then I pick up Step 2+ (ideally after an MCP restart so later live-tool testing is real).

Next: Step 1 ✅ (files: docNaming.ts + ~10 write/read sites; tests green). Awaiting your call on continue-straight vs phase-and-commit — or say `go` and I continue with Step 2 (build + fixture-test `loom migrate-layout`).

## Rafa:

### Migration, clean legacy read (after this)

When we finish this thread / plan, we will run migration on a fresh new session and we will need to clearn legacy-read docs from actual dual-read docs.
We could spin up a new thread with this, correct? maybe when we conclude this one.

### Phases

I already reconnected mcp, when you need it, just tell and I will reconnect it
commit phase 1
do steps 2-5
I reconnect mcp
do steps 6-9
commit
spin up new thread `Migration, clean legacy read`
open new session and do there
in this session you could verify how migration worked

Correct? Suggestions? 

If so, go, if not tell me better approach

## AI:

Your plan is right. Three refinements:

1. **Reconnect MCP *after* Step 6's build, not before it.** Step 6 is what registers the new `loom_*` tools; reconnecting before they're built + compiled to `dist/` won't surface them. So the order is: do 2→6 (Step 6 = code + `build-all`), *then* you reconnect, then 7→9 (7 = extension, which calls the now-live tools; 9 = final verify). I'll ping you for the reconnect right after Step 6 builds green.

2. **Removing dual-read is gated on *downstream* repos, not just loom-repo.** Dual-read isn't only for our repo — chord-flow, loom-flow, and any installed user repo also have legacy-named docs. So the `Migration, clean legacy read` thread has a real decision to make: either (a) auto-run `migrate-layout` on `loom` upgrade so every repo normalises itself, then drop dual-read; or (b) keep dual-read permanently as cheap back-compat (its cost is ~2 extra path checks + suffix-tolerant regexes — negligible). Dropping it is a breaking change for any un-migrated repo. Good to capture as *the* open question for that thread.

3. **Commit after 2–5 too** (not just after 6–9). Steps 2–5 are a coherent app/core/cli chunk; committing them as their own phase keeps the history reviewable and means nothing large sits uncommitted across your MCP reconnect. So: commit phase 1 → do 2–5 → **commit phase 2** → reconnect → do 6–9 → commit phase 3.

Everything else — new thread at conclusion, run migration in a fresh session, verify from this one — agreed.

Proceeding now: committing Phase 1, then starting Step 2 (`loom migrate-layout`, fixture-tested only — not run on this repo).

Next: committing Phase 1 (Step 1 foundation), then Step 2.

## AI:

✅ **Phase 2 (Steps 2–5) done — build + full test-all green.**

- **Step 2** — `loom migrate-layout` (rename-only, dry-run, idempotent, collision-safe). Fixture-tested; **not run on this repo**.
- **Step 3** — weave-only-threads enforced for idea/design/plan (weave-root creation throws; CLI `--loose` retired, `--thread` defaults to kebab-of-title). Left weave-root *chats* intact (vision says chats live at any level) and left `promoteTo*` weave-root branches as a noted follow-up.
- **Step 4** — `renameWeave` / `renameThread` / `moveThread` app use-cases (fs behind app). renameThread also flattens legacy `{thread}-idea/design.md` so it holds pre-migration; moveThread carries the `th_` ULID so depends_on survives.
- **Step 5** — `moveDoc` (loose-fiber-only: hard-refuse on parent/children, idea/design/chat only, dest singleton slot guarded) + `renameDocFile` (references only, updates filename + slug frontmatter in lockstep).

**Your comment note applied:** reconciled code comments so "loose fiber" = *no parent, no children* everywhere (fixed the ones that conflated it with weave-root in weaveRepository/promoteTo*/create_weave). Flagged: the `weave.looseFibers` **field** still encodes the old weave-root meaning across core/fs/vscode — renaming that field is a broader cleanup I've queued for the `Migration, clean legacy read` thread.

Committing Phase 2 now. Then, per our plan, **please reconnect the MCP server** (Step 6 registers the new `loom_*` tools + the create_weave desc change; they won't be live until you reconnect) — I'll ping you right before Step 7 needs them. Next up after commit: Step 6 (MCP tools) → build → your reconnect → Steps 7–9.

Next: commit Phase 2, then Step 6 (register loom_rename_weave / loom_rename_thread / loom_move_thread / loom_move_doc / loom_rename_doc_file).

## AI:

✅ **Step 6 done** — the 5 new tools (`loom_rename_weave`, `loom_rename_thread`, `loom_move_thread`, `loom_move_doc`, `loom_rename_doc_file`) are built and show up correctly grouped in a fresh `loom catalog` (weave / thread / doc). MCP integration 18/18.

**🔌 Please reconnect the MCP server now** (`/mcp` → reconnect) — this is the reconnect point from our plan. After Step 6's build, the session's live server is stale; reconnecting makes the 5 new tools callable in-session so I can actually exercise them in Step 9's verification (and so the create_weave description update is live).

Remaining after reconnect:
- **Step 7** — extension wiring (F2 = title on docs / folder on weave-thread; reference "Rename file"; drag-drop thread→weave + loose-fiber→thread; archive-first delete; fix package.json `when` clauses). Writing this is just TypeScript — doesn't need the reconnect — but its real test is in a VS Code Reload Window.
- **Step 8** — re-enable the MCP gate (`settings.jsonDISABLED` → `settings.json`). I'll confirm with you *why* it was disabled before flipping it.
- **Step 9** — dedicated tests (naming/ordinal, migrate-layout already done, moveDoc loose-fiber/slot guards) + final build/test-all; then I verify the new tools live.

Next: reconnect MCP, then I proceed with Steps 7–9. (Say `go` after reconnecting; or tell me to start Step 7's code meanwhile.)

## Rafa:

mcp reconnected
do step 7-9
about step 8, I do not remember now why we deactivated it, but I know we have no issues since then, you never tried to modify any loom doc directly, so we need a strong motive to reactivate it, stop and let me know what you found

## AI:

Reconnected — the 5 new tools are live in-session (I'll exercise them in Step 9). Proceeding with Step 7 (extension) and Step 9 (tests). For Step 8 I'll **investigate and stop with a finding + recommendation rather than flip the gate** — your "need a strong motive" is the right bar, and my initial read is I probably won't find one (the gate guards direct `Edit`/`Write` to loom docs, which hasn't happened, and it doesn't even cover the new folder/move operations). I'll confirm properly and report.

Next: Step 7 — extension wiring.

## AI:

## Step 8 (MCP gate) — finding: no strong motive to re-enable

You asked for a strong motive before reactivating. I looked; I don't find one. Evidence:

1. **Zero incidents while off.** This whole thread wrote a *lot* of loom docs and every write went through `loom_*` MCP tools — the discipline holds without the hook. The gate exists to catch a direct `Edit`/`Write` to `loom/**/*.md`; that simply hasn't happened.
2. **It doesn't cover this thread's new risk surface.** The gate only intercepts `Edit`/`Write`/`MultiEdit` on `.md` files. The new rename/move operations go through `fs.move` (folders/files), which the hook never sees. So re-enabling wouldn't protect the very operations we just added.
3. **It's dev-only, not shipped.** Confirmed `loom install` doesn't install the hook or any PreToolUse wiring — downstream users rely on the CLAUDE.md rule + tool descriptions, not this gate. So it's purely a recursive-dogfooding net for *this* repo.
4. **It has a cost.** Friction (false-positive denies) + a maintenance surface (the excludes list: refs/.archive/CLAUDE.md/packages must stay in sync). Likely why it got disabled in the first place.

**Recommendation: leave it off** — mark Step 8 as won't-do/deferred. The MCP-only discipline is self-enforcing in practice (this session is the proof), and the hook guards a non-occurring failure mode while not covering the new one. If you ever want real enforcement, the higher-value target is a *shipped* guard for downstream (less-disciplined agents on installed repos) — a different mechanism, and a separate thread — not this dev hook.

Your call: leave off (my rec) / re-enable anyway / or spin a follow-up for a shipped guard.

## Phase 3 done (Steps 6, 7, 9) — committing now

- **6** ✅ 5 MCP tools (rename_weave/thread, move_thread, move_doc, rename_doc_file) — live-verified (`loom_move_doc` correctly refused the design: "has 1 child").
- **7** ✅ extension: rename dispatch by node kind (fixes bug #3), reference "Rename File", F2 keybinding, archive-first delete. **Drag-and-drop deferred** to the live-verification session (roadmap-coupled DnD + only testable in a Reload Window).
- **9** ✅ `entities-crud.test.ts` (docNaming, folder ops, moveDoc guards, renameDocFile) + full suite green.
- **8** ⏸ your decision (above).

**Plan status: 8/9 steps done.** After you decide on Step 8, remaining tail: (a) live-verify the extension + do drag-and-drop in a Reload Window, (b) run `migrate-layout` on this repo in a fresh session, (c) spin the `Migration, clean legacy read` thread (drop dual-read + rename the `weave.looseFibers` field). I'll commit Phase 3 as the last action of this turn.

Next: committing Phase 3; stopped for your Step 8 call (recommend: leave the gate off).

## Rafa:

Leave the gate off (I prefer it, no more extra useless friction)

I tested extension in a new workspace, somes issues I found:

- F2 fires old doc rename doc bad wire asking for doc id first
- on selected weave, thread, idea, design, chat, using right mouse `Rename (Title / Folder) F2` works OK
- idea, design fails when renamed if they draft state, need to be active or done
- DnD didn't work at all
- chat docs need sufix ` chat` if not the doc is not showed in the extension tree

## Rafa:

I reviews the chat issue, it is not only with chat, ita affects all docs types and it has nothhing to do with the sufix.

If I renamed to a new title that no contain any letter, just numbers for examples, it has no guard but fails:
`Extension reslava.loom-vscode has provided an invalid tree item`

And the tree is broken, doc not showed.

## AI:

That's a much better diagnosis than my chat/suffix red-herring — thank you. I found the root cause, and it's a serializer bug that affects **every** doc type (nothing to do with chats or suffixes).

### Root cause: numeric/boolean/null-looking titles round-trip as the wrong YAML type

The canonical frontmatter serializer (`packages/core/src/frontmatterUtils.ts`) only quotes a string when it contains structural characters. `needsBlockQuote("123")` is **false** (no `:`/`#`/newline, no leading indicator), so a title `"123"` is written **unquoted**:

```yaml
title: 123
```

When that's read back (gray-matter/js-yaml), `123` parses as the **number** `123`, not the string `"123"`. So `doc.title` becomes a number. The tree then does `new vscode.TreeItem(123, …)` — and VS Code rejects a non-string label with exactly *"Extension … has provided an invalid tree item"*, and the node vanishes.

It's general: any field value that YAML would coerce breaks the same way — `123`, `1.5`, `true`/`false`/`yes`/`no`, `null`/`~`, etc. Titles just made it visible because they're the tree label.

### The fix (root cause, in the serializer)

Quote a string whenever YAML would otherwise parse it back as a *non-string* scalar. I'll extend `needsBlockQuote` (which also feeds `needsFlowQuote`, so array items are covered too) to also quote when the value matches:
- a number — `/^[-+]?(\d[\d_]*\.?\d*|\.\d+)([eE][-+]?\d+)?$/`
- a YAML boolean — `/^(true|false|yes|no|on|off)$/i`
- null — `/^(null|~)$/i`

Result: `title: "123"` stays a string on the round-trip; the tree gets a proper string label. This corrects the *data* for every consumer (CLI, MCP, extension), not just the tree.

I'll also add a **defensive `String(...)`** on the tree-item label (createDocumentNode/createChatNode/etc.) so a bad value can never again crash the whole tree — belt-and-suspenders, but the serializer is the real fix.

Plus a serializer unit test: round-trip a doc whose title is `"123"` / `"true"` / `"null"` and assert `typeof title === 'string'` and value preserved.

This is separate from the CRUD plan (it's a pre-existing serializer bug the F2 flow exposed) — I'd fix it as its own small commit. Want me to go? (I'd also fold the other live-test fixes already made — draft-rename unblock, F2 selection fallback, and the drag-and-drop implementation — into the same round.)

Next: awaiting go on the serializer fix (numeric/bool/null title quoting) + folding in the draft/F2/DnD fixes.

## AI:

Fixed — all from your live testing, built + full `test-all` green + vscode typecheck clean:

1. **Serializer (root cause of the "invalid tree item" / vanishing doc).** `needsBlockQuote` now also quotes strings that YAML would coerce to a non-string (numbers incl. hex/octal/float/scientific, `true`/`false` any case, `null`/`~`). So `title: "123"` round-trips as the string `"123"`, not the number `123`. Fixes it for every consumer, every doc type. Added a round-trip test (`123`/`1.5`/`true`/`false`/`null`/`007`/`-42`/`1e3` all preserved as strings).
2. **Defensive tree labels.** Wrapped all four doc-node label sites (`createDocumentNode`/`createChatNode`/`createDoneDocNode`/`createPlanNode`) in `String(...)` — belt-and-suspenders so a bad value can never crash the whole tree again.
3. **F2 fired the old doc-rename.** The keybinding passed no node → fell to the doc branch → asked for an id. Now the `loom.rename`/`loom.renameFile` registrations fall back to `treeView.selection[0]`, so F2 dispatches by the selected node's kind (folder vs title) like the right-click.
4. **Draft idea/design couldn't be renamed.** Removed the obsolete "Draft documents cannot be renamed" guard (identity is the ULID, filename is fixed — nothing provisional to protect). Draft title rename now works; test updated.
5. **Drag-and-drop implemented** (was deferred). Extended the controller: in the normal tree, drag a thread onto a weave → `loom_move_thread`; drag a loose-fiber doc onto a thread → `loom_move_doc`. The move tools own the guards and surface a clear "Move refused: …" on an illegal drop. (Roadmap reorder unchanged.) Needs your Reload-Window pass to confirm the gestures.

Committing these now as one "live-test fixes" commit.

Next: commit; then please Reload Window + retest (F2 rename incl. a numeric title, draft rename, drag-and-drop thread→weave and loose-fiber→thread).

## Rafa:

Looks all working.

Some little issues:
1. Deleting an archived doc fails:
  `Delete failed: MCP error -32603: Nothing to delete at loom\we2.` looks in the not archived path
2. Archive an already archived doc is an allowed option and it shouldn't. Fails same than 1.   
3. F2 with `Chats` tree node selected still fires old rename command asking first for Doc ID. This command should not be fired more.
4. If I move a lose-fiber idea and a lose-fiber design to an empty thread loom should assign design.parent_id: idea.id, and this is really weird. 

Maybe,
- we are over-complicating Loom by allowing too many moving operations? 
- is enough with renaming and moving threads?

What do you think?

## AI:

You're right, and issue #4 is the tell. Let me answer the design question first, then the bugs.

### Are we over-complicating with move-doc? Yes — I'd drop it.

I agree. `loom_move_doc` (moving a loose fiber between threads) is the one operation that doesn't compose cleanly, and #4 proves it:

- A thread isn't a bag of docs — it's a **chain** (idea → design → plan → done) held by `parent_id`. Moving a loose idea and a loose design into one thread leaves them **unlinked** (both `parent_id: null`). To make the thread coherent you'd have to *auto-write* `design.parent_id = idea.id` on move — which, as you say, is weird: a move silently rewriting the graph. The alternative (leave them unlinked) is an incoherent thread. Either way it's bad.
- It's also **rare**: since we made weaves contain only threads, every idea/design already lives in a thread. A "loose fiber to relocate" is niche, and the clean way to relocate real work is **move the whole thread** (the chain travels intact by construction — that's the operation that actually composes).
- It cost the most surface: the loose-fiber-move machinery, parent/child guards, singleton-slot-on-move checks, the doc→thread DnD, and #4.

**Recommendation — the CRUD surface becomes:**
- **Rename** a doc (title only) · reference file-slug rename · **rename** weave/thread (folder) · **move** thread → weave · archive · delete.
- **Drop:** `loom_move_doc` (app + MCP tool), the loose-fiber move guards, and the loose-fiber→thread drag-and-drop. Keep the *loose fiber concept* (a childless/parentless doc) as vocabulary — we just don't offer an operation that tries to move one across threads.

That kills #4 entirely and shrinks the model to exactly your "renaming + moving threads is enough." I'd keep thread→weave DnD (it composes) and remove only the doc→thread DnD.

If you agree, I'll remove move-doc in the same pass as the bug fixes.

### The three bugs (real regardless of the above)

1. **Delete/archive of an *archived* item hits the live path** (`Nothing to delete at loom\we2`). The archive/delete resolution builds the `loom/{weave}` path and ignores that the item lives under `loom/.archive/`. Fix: resolve archived targets under `.archive/` (the tool needs to detect/accept the archived location).
2. **Archive offered on already-archived items** — the `when`-clause for `loom.archive` includes archived viewItems; it should exclude them (and archiving-an-archive should refuse). Restore should be the only lifecycle action on an archived node.
3. **F2 on a section node** (`Chats`, `Plans`, …) fires the doc-rename → asks for an id. `renameCommand` must **guard to renamable kinds only** (weave / thread / a node with `doc.id`); on a section/summary node it should no-op (and ideally the keybinding/menu `when` excludes sections). This is a clean guard I'll add.

So the plan: **(a)** guard renameCommand to renamable kinds (#3), **(b)** fix archived-path resolution for delete/archive + hide archive on archived nodes (#1, #2), **(c)** remove `loom_move_doc` + doc→thread DnD + loose-fiber move machinery (#4 + simplification) — pending your yes.

Next: your call on dropping move-doc; then I fix #1–#3 and (if yes) remove move-doc, in one pass.

## Rafa:

Glad we agree. Drop move-doc. A `thread` is the minimal atomic unit of information and is not a doc is a chain, so it is indivisible.
Go

## AI:

Done — build + full `test-all` green + vscode typecheck clean.

**Simplification: move-doc removed.** A thread is the atomic, indivisible unit, so docs never move between threads. Deleted the `loom_move_doc` MCP tool + the `moveDoc` app use-case + its test, and stripped the loose-fiber→thread branch from the DnD controller (thread→weave drag stays). The design doc now records this as a superseding decision ("Move rules — the thread is the atomic unit"). #4 is gone by construction.

**Three bugs fixed:**
1. **Delete of an archived item hit the live path.** `removeItem` now targets `loom/.archive/{…}` when the live folder is absent (and still throws only when neither exists). Regression test added.
2. **Archive offered on already-archived nodes.** The `loom.archive` menu `when`-clause now excludes `-archived` viewItems; and `archiveItem` gives a clear "'…' is already archived" error if it's ever reached.
3. **F2 on a section node (`Chats`, `Plans`, …) fired the doc rename.** `renameCommand` now guards to renamable kinds only (weave / thread / a node with `doc.id`); section/summary nodes no-op with a hint instead of prompting for an id.

Remaining surface is exactly what we agreed: rename doc (title) · reference file-slug rename · rename weave/thread (folder) · move thread→weave · archive · delete. Committing now.

Next: commit; then a Reload-Window retest of these four, and the fresh-session tail (run `migrate-layout` on this repo + spin `Migration, clean legacy read`).