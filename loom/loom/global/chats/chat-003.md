---
type: chat
id: ch_01KTB6ARK05D9EC75KFTRKHH5D
title: Loom why exists
status: done
created: 2026-06-05
version: 1
tags: []
parent_id: null
requires_load: []
---
# Loom why exists

## Rafa:

I need your help, ideas and suggestions to improve Loom documentation. Also check content are up to date.

### Main docs

README.md
packages/vscode/README.md
packages/cli/README.md

docs/AI_INTEGRATION.md
docs/ARCHITECTURE.md
docs/USER_GUIDE.md
  docs/EXTENSION_USER_GUIDE.md
  docs/CLI_USER_GUIDE.md 

### Fixes

I did some fixes to 
`🔗 **Get Loom:` line of packages/vscode/README.md & packages/cli/README.md


### Context

I would like to improve Loom’s documentation by highlighting what I consider to be its key differentiators compared to other tools, and ensuring that this is reflected in all README files and throughout the documentation.

Loom:
1. Graph documents database
2. Context relative to the current workstream (global, weave)
3. Reference docs linked (required_load, load_when > conditional context)
4. Requirements for all the workflow (thread: include, constrains, exclude)

Concepts: context becomes architecture, context routing system, memory hierarchy

Documents should hightlight this and `Context Extension Panel` making context loaded visible to the user

### Why Loom

I think we should expand this in README docs, why Loom Exists:

> The idea for Loom came to me whilst I was developing the Nuget library REslava.Result https://github.com/reslava/nuget-package-reslava-result. The project grew enormously and became significantly more complex. I encountered the typical problems of the AI chat era and ended up hating working in that window with its ephemeral conversations. I started setting up CLAUDE.md to ensure that we would continue to design and plan ideas in a persistent chat document in Markdown format. Soon I also created a structure with ideas, designs and plans grouped by feature. I realised that this gave the AI a specific context for each feature. I also started creating ‘done’ documents with notes on implementation. I realised the need for context, reference and requirements documents to give the AI a sense of state, always starting each session with all the information related to the work to be done.  I did all this manually on that project and then thought: it would be very interesting to have this automated, graphical collaboration environment.


Someting like:
```
Traditional AI workflow:

Chat
Chat
Chat
Chat

Knowledge drift & disappears.

Loom:

Knowledge becomes artifacts.
Artifacts become context.
Context drives implementation.
```

context management should be treated as a first-class concept

the most novel part of Loom isn't the workflow itself

It's:

requirements
global context
weave context
reference
  required_load
  load_when
context panel

many users will underestimate how important these are

we should dedicate an entire section to:

`How Loom decides what the AI sees`

chat
→ requirements
→ idea
→ design
→ plan → implement → done

summarize
global context
weave → weave context

### Requirements

docs/USER_GUIDE.md
docs/EXTENSION_USER_GUIDE.md

should be update with the new features implemented in `core-engine` weave, thread `requirements-driven-development`

### Important reference loom docs

these docs are for User<->AI collaboration but should be synced to the corresponding docs for final users. For example:
- loom/refs/architecture-reference.md - docs/ARCHITECTURE.md
- loom/refs/workflow-reference.md
- loom/refs/vision-reference.md
- loom/refs/workspace-directory-structure-reference.md
- loom/refs/loom-context-pipeline-reference.md

we should create loom/refs/loom-requirements-reference.md

this makes me wonder if we should have only one source of Truth, the Loom reference doc? and link them from README and user docs/*.md directly?

### Demo & GIFs

Current demo & GIFs should be updated to show requirements and context use as first class feature, but this will be done later in thread `vscode-extension` `vscode-demo`

## AI:

Let me start with the question that shapes everything else — your #5: *"should we have only one source of truth, the Loom reference doc, and link them from README and user docs directly?"*

## The single-source question

Short answer: **yes to single-source for *facts*, no to a single *file*.** What you actually want is a layered source-of-truth model, not one master doc. Here's why.

There are two audiences hiding in your doc set, and they pull in opposite directions:

- **`loom/refs/*-reference.md`** — written for *us* (AI ↔ Rafa) building Loom. They assume you're inside `packages/`, they're loaded by `requires_load` / `load_when`, they're terse and mechanism-first.
- **`docs/*.md` + READMEs** — written for someone *adopting* Loom on their own repo. They assume you've never seen the codebase, they're task-oriented and tone matters (this is marketing + onboarding).

If I collapse those into one file, that file has to serve two masters and ends up serving neither — the internal contract gets polluted with onboarding prose, and the user guide gets polluted with reducer-purity rules. That's worse, not better.

But your *instinct* is right: the **drift** comes from re-explaining the same mechanism (the loop, the doc types, the context pipeline, the requirements model) in parallel prose in five places. So the fix is:

> **One canonical statement per fact, living in a ref. Every user-facing doc is a *view* that links into the ref instead of re-deriving it.**

This is literally Loom's own thesis — context routing / memory hierarchy — applied to the docs themselves: canonical truth at the "global" layer (refs), audience-shaped views at the edges (docs, READMEs). Concretely:

- A ref **owns** a concept (e.g. `loom-context-pipeline-reference.md` owns "how context gets routed"). It is the source of truth.
- `docs/USER_GUIDE.md` may carry a *one-paragraph summary* + a link into the ref for depth. It must **not** re-derive the mechanism.
- READMEs can't transclude (GitHub renders static markdown), so they get a hand-written **pitch** + links. Accept a *little* curated duplication at the very top of the funnel (the elevator pitch), but **zero** duplicated mechanics.

One caveat that blocks this today: the refs themselves overlap. `architecture-reference.md` and `loom-reference.md` (which is actually titled *Implementation Contract*, not a master "Loom reference") both restate the dependency rule and frontmatter order. That's internal drift already. Before docs link into refs, each fact needs exactly one home among the refs. So step one of the cleanup is reconciling ref overlap, not adding more docs on top.

## Your differentiator framing — I agree, strongly

You wrote: *"the most novel part of Loom isn't the workflow itself."* Correct, and the docs should lead with that. The loop `chat → idea → design → plan → done` is **legible but not unique** — every task-decomposition tool has some version of it. The genuinely differentiated thing is the **context-routing system**:

- graph document database
- scope context (global / weave)
- reference docs with `requires_load` + `load_when` → *conditional* context
- requirements as context *constraints* (include / constrain / exclude)
- the **Context Extension Panel** making "what the AI will see" *visible* before you act

That last one is the killer demo: most tools hide context assembly; Loom shows it. The "How Loom decides what the AI sees" section you proposed should be the spine of the user-facing docs, and the READMEs should open on it — not on the workflow loop.

Your `Knowledge → artifacts → context → implementation` framing is the right tagline for that section. I'd keep it exactly as you drafted it.

## On `loom-requirements-reference.md`

Create it — and create it **early**, because two other deliverables depend on it existing as the thing to cite: the USER_GUIDE/EXTENSION_USER_GUIDE updates (#4) and the "How Loom decides what the AI sees" section (#2). Right now the requirements model (include/constrain/exclude, citation, coverage check, staleness) only lives in the `core-engine/requirements-driven-development` thread's idea + design. That ref would be the canonical distillation of that thread's outcome.

## Proposed sequencing

1. **(this discussion)** Lock the source-of-truth model: layered, refs own facts, docs are views.
2. **Reconcile ref overlap** so each fact has one home (architecture vs implementation-contract vs context-pipeline). Cheap, high-leverage, unblocks everything.
3. **Create `loom/refs/loom-requirements-reference.md`** — canonical requirements model, distilled from the RDD thread.
4. **Confirm `loom-context-pipeline-reference.md` is the owner of "How Loom decides what the AI sees"** (it likely already is) and tighten it to be citable as that section.
5. **Rewrite user-facing docs as views**: USER_GUIDE, EXTENSION_USER_GUIDE, CLI_USER_GUIDE, ARCHITECTURE, AI_INTEGRATION — add the requirements + context sections, link into refs, stop re-deriving.
6. **READMEs**: add "Why Loom exists" origin story + the Knowledge→artifacts→context framing + differentiator pitch (context-routing first) + links into docs/refs.
7. **Demo/GIFs** — deferred to `vscode-extension/vscode-demo`, per your note.

Two things I want your call on before I touch a file:

- **(A)** Do you accept the layered model (refs = source of truth, docs/READMEs = views), or do you want to push harder toward literal consolidation (e.g. fold some refs together first)?
- **(B)** Sequencing: I'd do step 2 (reconcile ref overlap) before step 3 (new requirements ref). Some people prefer to land the new visible deliverable first and clean up overlap later. Your preference?

I'll stop here for your go before doing any of the above.

## Rafa:

A. I like layered model
B. Yes, 2 before 3

### Refs

We should review all other reference docs, clasify them (with what weaves, threads are they related, when require_load, load_when) and take decisions like if some should be fusioned, deleted, maybe add new ones. Maybe make some of thm for our internal use, not public. Use frontmatters tags. There are so much info... Loom has grew at same time as developed, creating a little recursive mess.

Maybe some reference docs should be renamed if you consider to be clear purpose name, like `loom-reference.md` 

### Requirements

We will use req docs creation in demo, but maybe we could also select some Loom thread(s) to generate them and test its results, also showing up req docs in codebase

## AI:

Locked: **A** = layered model, **B** = step 2 (ref audit) before step 3 (requirements ref). Here's the audit you asked for — every ref classified by relation, current load behaviour, audience, and recommended action. I read frontmatter + titles across all 23 refs; for the ones marked "read first" I want to read the body before committing to delete/fuse.

## First, the recursive mess in one number

Of 23 refs, **9 have neither `load:` nor `load_when` and aren't cited in any `requires_load`** — they are dead context. They exist but nothing ever loads them. That's the core of the "so much info" problem: the graveyard isn't too many docs, it's docs with no routing. The audit's real job is to give each ref a *reason to load* or send it to `.archive`.

## Proposed tag convention (no schema change — uses existing `tags: []`)

- `public` — this ref is the **source of truth for a public artifact** (`docs/*.md` or a README). The layered model links here.
- `internal` — build-only; for us building Loom. Never mirrored to public docs.
- `historical` — one-time/superseded; candidate for `.archive`.

(Note: "public" means *owns a public doc's content*, not *ships to users*. `loom/refs/` never ships via `loom install` — these are the Loom-project's own design refs.)

## Classification table

| Ref | Relates to | Loads now | Audience | Action |
|-----|-----------|-----------|----------|--------|
| **vision-reference** | global | via ctx `requires_load:[vision]` | `public` | keep — canonical, mirror → README "Why Loom" |
| **workflow-reference** | global | via ctx | `public` | keep — canonical |
| **architecture-reference** | global | `load_when:[design,plan]` | `public` | keep — owns system overview; mirror → `docs/ARCHITECTURE.md` |
| **loom-context-pipeline-reference** | core-engine/context | none ⚠️ | `public` | keep — **owns "How Loom decides what the AI sees"**; wire `load_when:[design,plan,implementing]` |
| **workspace-directory-structure-reference** | global | `load: always` | `public` | keep |
| **getting-started** | global | `load: by-request` | `public` | keep; rename? off-convention (`getting-started.md` not `*-reference.md`) — your call |
| **cli-commands-reference** | cli | none ⚠️ | `public` | keep — source for `docs/CLI_USER_GUIDE.md`; wire `load_when:[implementing]` |
| **vscode-commands-reference** | vscode-extension | none ⚠️ | `public` | keep — source for `docs/EXTENSION_USER_GUIDE.md` |
| **mcp-reference** | ai-integration | none ⚠️ | `public` | keep — source for `docs/AI_INTEGRATION.md` |
| **loom-reference** (*Implementation Contract*) | packages/* | `load_when:[design,plan,implementing]` | `internal` | **RENAME → `implementation-contract-reference.md`** + reconcile overlap w/ architecture-reference |
| **app-query-use-cases-reference** | app layer | none ⚠️ | `internal` | keep; wire `load_when:[implementing]` |
| **plan-steps-table-and-blockedby-format-reference** | core-engine/plans | none | `internal` | keep; wire `load_when:[plan]` |
| **toolbar-icons-map-reference** | vscode-extension | none ⚠️ | `internal` | keep; wire `load_when:[implementing]` |
| **fs-extra-esm-reference** | tests | none | `internal` | keep — narrow test gotcha |
| **CLAUDE-reference** | global/contract | none | `internal` | keep — check staleness vs live `CLAUDE.md` |
| **CLAUDE-template-reference** | docs-infra | none | `internal` | keep — mirrors `installWorkspace.ts` template |
| **demo-script-reference** | vscode-extension/vscode-demo | none | `internal` | keep; **fix wrong body heading** |
| **loom-related-vocabulary-reference** | branding | none ⚠️ | `internal`? | **read first** — fix wrong title; likely **fuse into ctx.md glossary** or delete (glossary already canonical) |
| **loom-claude-own-vision** | global | `load_when:[idea,design]` | `historical`? | **read first** — likely superseded by vision-reference → archive |
| **loom-analysis-reference** | global | none | `historical` | **read first** — one-time analysis → likely archive |
| **mvp-scope-reference** | mcp | none ⚠️ | `historical` | **read first** — past MVP (we're 0.4.0); title/slug bug → likely archive |
| **migration-reference** | docs-infra | none ⚠️ | `historical` | **read first** — one-time thread migration → likely archive once migration done |
| **vscode-roadmap-reference** | vscode-extension | none ⚠️ | `historical`? | **read first** — roadmap, likely stale → archive or refresh |

## Fusions / overlaps to resolve (step 2's real payload)

1. **`architecture-reference` ↔ `loom-reference`** — both restate the dependency rule (`cli/vscode/mcp → app → core+fs`) and frontmatter key order. One must own each fact. Proposal: architecture-reference owns *system overview + dep rule + frontmatter schema*; the renamed implementation-contract-reference owns *DI pattern, reducer purity, ID lifecycle, file naming, gotchas* and **links** to architecture for the shared facts instead of repeating them.
2. **`loom-related-vocabulary-reference` ↔ ctx.md §2 glossary** — the canonical glossary already lives in ctx.md. The vocabulary ref is redundant unless it holds brand/marketing vocabulary the glossary doesn't. Read-first, then fuse or delete.
3. **`loom-claude-own-vision` ↔ `vision-reference`** — two vision docs. vision-reference is the one ctx loads. Read-first; if own-vision is just an older draft, archive it.

## New ref (step 3, after this)

- `loom/refs/loom-requirements-reference.md` — canonical requirements model (include/constrain/exclude, citation, coverage check, staleness), distilled from `core-engine/requirements-driven-development`. Tag `public` (sources the new USER_GUIDE requirements section).

## What I need from you

1. **Tag convention** — OK with `public` / `internal` / `historical` in `tags`, or do you want a dedicated frontmatter field (`audience:`/`visibility:`) instead? (A field is cleaner long-term but needs core schema + reducer support — more work. Tags are zero-cost today.)
2. **`getting-started.md` naming** — leave as-is (intentional public tutorial name) or normalise to the `*-reference.md` convention?
3. **Archive go** — may I read the 6 "read first" docs and come back with a concrete archive/fuse recommendation per doc? I won't move anything until you approve each.

Stopping here for your call on 1–3. No files touched.

## Rafa:

1. OK. Also add tags to relate the doc with Loom layer (core, app, mcp), weave, context, AI, etc or whatever you consider useful.
2. normalize it
3. yes


## AI:

Read all six. Per-doc verdict below. Headline: **4 archive, 1 keep-and-fix, 1 keep-and-promote** — and the promote one (`loom-claude-own-vision`) is a goldmine for the "Why Loom" README work, not a deletion candidate. My step-2 read was wrong on that one; reading the body changed it.

## 1. `loom-related-vocabulary-reference` → **ARCHIVE** (historical)
Not a glossary — it's an English/Spanish weaving-vocabulary brainstorm (Loom=Telar, Weave=Tejer…) plus a CLI-subcommand wishlist (`loom unravel`, `loom stitch`, `loom spindle`). None of those subcommands were adopted; the real glossary lives in `ctx.md §2`. So "fuse into glossary" was wrong — there's nothing to fuse, the canonical terms are already in ctx. This is a creative naming artifact with no routing and no live use. Archive. (The broken title becomes moot.) *Unless* you still want the Spanish branding palette for marketing — if so I'd extract the one vocab table into a `branding-` note and archive the rest.

## 2. `loom-claude-own-vision` → **KEEP + PROMOTE to public-messaging source**
This is the surprise. It's a first-person "why Loom matters" essay — *"AI assistance degrades over time," "make the AI's memory structural rather than conversational," "decisions that don't rot," "a project that can be picked up cold."* That is exactly the differentiator copy you want for the README "Why Loom exists" section (#3) and the differentiators framing. It is **not** superseded by `vision-reference` — vision-reference is the product north-star spec; this is persuasive narrative. Keep it, retag `public`, and mine it directly when we rewrite the READMEs. One fix: its `load_when:[idea,design]` is wrong (it's not implementation context) — drop it so it stops auto-loading into design sessions.

## 3. `loom-analysis-reference` → **ARCHIVE** (historical), but verify 2 findings first
A point-in-time code audit from 2026-04-22 (Stage 1 era). Most is obsolete: it references `_status.md` (gone), plan-004/005/006 "in progress" (long done), pre-MCP tree view. Archive the doc. **But** two findings might still be open and worth not losing:
- `updateIndexForFile` deriving `docId` from filename (`linkRepository.ts:82`) instead of frontmatter `id`
- unused `loomRoot` param in the same function

I'll grep current `linkRepository.ts` before archiving; if still open, I'll surface them so they become a proper idea/bug rather than vanishing into the archive. (This is a packages/ check, normal Edit/Grep — not blocked by the gate.)

## 4. `mvp-scope-reference` → **KEEP until 1.0** + fix title/slug
Its own text says *"Archives with the MVP weave once Loom 1.0 ships."* We're at 0.4.0, so by its own rule it stays — but the in-MVP items (visibility prefixes, chat-reply injection, stale surfacing, two-CLAUDE sync) all look shipped. The still-live value is the **"Out of scope"** section (no multi-user, no web UI, markdown-only) — a real boundary statement. Two options:
- (a) **Keep active** until 1.0, fix the title bug (`mcp — Scope and Boundaries` → `loom — MVP Scope and Boundaries`), tag `internal`. *(my lean)*
- (b) Extract the "Out of scope" boundaries into `vision-reference`/`architecture-reference`, archive the rest now.

## 5. `migration-reference` → **ARCHIVE** (historical)
A one-time thread-assignment migration table — *"All decisions resolved — ready for execution via organize-loom-plan-001."* The repo is fully in thread layout now, so this executed long ago. Pure completed-operation record; keep only for provenance → archive.

## 6. `vscode-roadmap-reference` → **ARCHIVE** (historical)
Execution-order roadmap dated 2026-04-18; items 1–5 all ✅, only item 6 (`cli-error-standardization-idea`) deferred. Completed snapshot, pre-MCP, pre-extension-refactor. Archive — and if `cli-error-standardization` is still wanted, it should live as an idea in its thread, not in a roadmap ref.

## Net
| Doc | Verdict |
|-----|---------|
| loom-related-vocabulary | archive |
| loom-claude-own-vision | **keep + tag public** (README source) |
| loom-analysis | archive (after verifying 2 code findings) |
| mvp-scope | keep until 1.0 + fix title (option a) |
| migration | archive |
| vscode-roadmap | archive |

Archives go via `loom_archive` to `loom/refs/.archive/` (the refs already have one).

## Your calls before I execute
1. Approve the 4 archives (vocabulary, analysis, migration, vscode-roadmap)?
2. `loom-claude-own-vision`: agree keep + promote to public README source?
3. `mvp-scope`: option (a) keep-until-1.0, or (b) extract-and-archive?
4. Want me to grep `linkRepository.ts` now to settle whether the 2 analysis findings are still open before I archive that doc?

Stopping for your calls. Nothing moved yet.

## Rafa:

1. OK
2. Ok
3. b, if nothing useful just archive it
4. grep it, but i think it is obsolete info

## AI:

Executed the approved cleanup:

**Archived → `loom/refs/.archive/`** (via `git mv`):
- `loom-related-vocabulary-reference.md`
- `loom-analysis-reference.md` (both code findings verified obsolete — `linkRepository` uses `doc.id` and now uses `loomRoot`)
- `migration-reference.md`
- `vscode-roadmap-reference.md`
- `mvp-scope-reference.md` (nothing uniquely useful to extract)

**Promoted** `loom-claude-own-vision`: `tags: [vision, ai, context, public, messaging]`, dropped the wrong `load_when: [idea, design]`. It's now flagged as the public "Why Loom" messaging source for the README rewrite.

⚠️ One dangling link to decide later: the **done** plan `organize-loom-plan-001` still has `requires_load: [migration-reference]`. Archived refs stay slug-indexed so it resolves fine, but if you want it spotless I can either archive that done plan too (it's the migration's matched pair) or drop the now-pointless `requires_load`. Low priority — your call when we get there.

## Remaining in step 2 (ref audit) — not done yet
1. **Reconcile overlap** `architecture-reference` ↔ `loom-reference` (dep rule + frontmatter key order duplicated). Decide which owns each fact.
2. **Rename** `loom-reference.md` → `implementation-contract-reference.md` (matches its title; you flagged this).
3. **Normalise** `getting-started.md` → `getting-started-reference.md` (you approved).
4. **Fix bug**: `demo-script-reference.md` body heading (`# landing-page — Weave Context` → correct).
5. **Wire `load_when`** on the dead-context keep-refs so they actually load (context-pipeline, cli-commands, vscode-commands, mcp, app-query, plan-steps-table, toolbar-icons).
6. **Systematic retag pass**: apply `public`/`internal` + layer/weave/context/AI taxonomy tags to all remaining keep-refs.

Then step 3 (create `loom-requirements-reference.md`), then steps 4–6 (docs as views, READMEs).

I'd tackle the remaining step-2 items in that order — #1 (overlap reconcile) and #2 (rename) are coupled, so I'd do them together. Want me to proceed with #1+#2 next, or reorder?

Stopping here.

## AI:

#1 and #2 done.

**#1 — overlap reconciled.** Ownership is now split with no duplication:
- `architecture-reference` (bumped v2→v3, tagged `public`) **owns** the structural facts: dependency rule, MCP surface, doc-types table, frontmatter schema, directory layout, file-naming rules. Added a banner at the top pointing to the implementation contract for impl-side detail.
- `implementation-contract-reference` (bumped v3→v4, tagged `internal`) **owns** the implementation specifics: the two API surfaces (`getState`/`runEvent`), DI pattern, reducer purity, ID lifecycle (ULID model), and gotchas. The five duplicated sections (dep rule, frontmatter key order, file naming, workspace layout, `requires_load`) are now **one-line pointers** into architecture-reference, each keeping only the genuinely impl-side nugget (e.g. "always serialize via `serializeFrontmatter`", "double type-suffix bug", "ctx never in `requires_load`").

Cross-links are now bidirectional, so either doc leads you to the other.

**#2 — renamed.** `git mv loom/refs/loom-reference.md → loom/refs/implementation-contract-reference.md`, slug `loom-reference` → `implementation-contract-reference`. Safe — no live `requires_load` cited the old slug.

⚠️ **Out-of-scope finding (not fixed):** while reconciling I noticed `architecture-reference` still describes **thread-level ctx** (`{thread}/ctx/` in the §3 doc-types table and the §6 directory tree). That contradicts the shipped ctx-scope decision (ctx = global + weave only; no thread ctx). That's a content-accuracy fix, separate from this overlap pass — I left it alone. Worth folding into a later accuracy sweep of architecture-reference (it's a `public` source doc, so the error would propagate to `docs/ARCHITECTURE.md`).

## Remaining in step 2
3. Normalise `getting-started.md` → `getting-started-reference.md`
4. Fix `demo-script-reference.md` body heading bug
5. Wire `load_when` on the dead-context keep-refs
6. Systematic retag pass (public/internal + layer/weave/context/AI taxonomy)

Plus the staleness fix above if you want it in this pass.

Stopping here. Want me to continue with #3+#4 (both quick), or do the retag pass (#6) next so tags are settled before everything else?

## Rafa:

- Fix you Out-of-scope finding (line 371), it is important 
- Do 3,4,6,5 



## AI:

Did the staleness fix + #3, #4, #6, #5. Summary:

## Ctx staleness (your "important" finding) — fixed in 4 refs
The stale thread-level-ctx model existed in more than just architecture-reference, so I corrected all of them (the same fact):
- `architecture-reference` (§3 doc-types, §6 tree, §7 file-naming) → v4
- `workspace-directory-structure-reference` (tree, 3-level table, ctx-hierarchy table, prose) → v3 — **this one is `load: always`, so it was actively feeding the wrong model into every session**
- `CLAUDE-reference` (ctx hierarchy)
- `CLAUDE-template-reference` (ctx hierarchy — propagates to user installs)
- `loom-context-pipeline-reference` was already correct.

## #3 — `getting-started` normalised
`git mv getting-started.md → getting-started-reference.md`. **Caught a public link:** `packages/vscode/README.md` linked the old path via a GitHub URL — updated it so it doesn't 404. Kept slug `getting-started` (nothing cites it; short-slug like `vision`).

## #4 — false alarm, no change
The `# landing-page — Weave Context` in `demo-script-reference` is **legitimate demo content** (a sample ctx-doc body inside the "Expected Generate Weave Ctx output" section), not a heading bug. The doc correctly has no top-level title heading. My step-2 flag was an artifact of how I extracted headings. Nothing to fix.

## #6 + #5 — retag + load_when (12 docs)
Tag convention applied: `public`/`internal` + layer/domain (`app`, `cli`, `vscode`, `mcp`, `ai`, `context`, `workflow`, `architecture`, `plan`, `tests`, `demo`).

| Ref | audience | load behaviour |
|-----|----------|----------------|
| architecture-reference | public | load_when [design,plan] (unchanged) |
| workspace-directory-structure | public | load: always (unchanged) |
| vision-reference | public | via ctx requires_load |
| workflow-reference | public | via ctx requires_load |
| implementation-contract | internal | load_when [design,plan,implementing] |
| loom-context-pipeline | public | **load_when [design,plan]** (newly wired) |
| plan-steps-table | internal | **load_when [plan]** (newly wired) |
| cli-commands | public | by-request (explicit) |
| vscode-commands | public | by-request (explicit) |
| mcp-reference | public | by-request (explicit) |
| app-query-use-cases | internal | by-request (explicit) |
| toolbar-icons-map | internal | by-request (explicit) |
| fs-extra-esm | internal | by-request (explicit) |
| getting-started | public | by-request (unchanged) |
| demo-script | internal | by-request (explicit) |
| loom-claude-own-vision | public | by-request (done earlier) |

## Two decisions for you

**(A) load_when granularity.** `load_when` is **mode-only** — there's no weave scoping. So if I wire `vscode-commands` to `[implementing]`, it auto-loads even during *core-engine* work that never touches the extension. I therefore only auto-wired refs that are useful regardless of weave (`plan-steps-table`→plan, `loom-context-pipeline`→design/plan) and left the weave-specific catalogs (cli/vscode/mcp/toolbar/app-query) as explicit `by-request`. They're now intentionally citation-only rather than accidentally dead. **Is that the right call, or do you want the command catalogs auto-loading on `[implementing]` anyway?** (Longer-term fix would be weave-scoped `load_when`, but that's a core schema change — a separate idea.)

**(B) `CLAUDE-reference` + `CLAUDE-template-reference`.** Both have **no frontmatter** (raw markdown), so they fell outside the retag. And `CLAUDE-reference.md` is now stale-by-premise: it calls itself "the target CLAUDE.md for when MCP ships" — but MCP shipped, so it duplicates the live root `CLAUDE.md`. Options:
- **(b1)** Archive `CLAUDE-reference.md` (root `CLAUDE.md` is the live contract) and keep `CLAUDE-template-reference.md` but add proper frontmatter + `internal` tag (it still mirrors `installWorkspace.ts`).
- **(b2)** Add frontmatter to both, tag `internal`, keep both.
- **(b3)** Leave both untouched for now.

I lean **(A) keep catalogs by-request** and **(b1)**. Your call on both before I move on to step 3 (create `loom-requirements-reference.md`).

Stopping here.

## Rafa:

A
b1
Do 3

## AI:

Confirmed A (catalogs stay by-request — already in place) and did b1 + step 3.

**b1 done:**
- Archived `CLAUDE-reference.md` → `loom/refs/.archive/` (root `CLAUDE.md` is the live contract; it was a stale-by-premise duplicate).
- Added frontmatter to `CLAUDE-template-reference.md`: `type: reference`, minted id, `tags: [reference, internal, docs-infra, contract]`, `slug: claude-template-reference`, `load: by-request`. It stays — it still mirrors the `installWorkspace.ts` template.

**Step 3 done — `loom/refs/loom-requirements-reference.md` created** (tagged `public`, `load_when: [design, plan]`). It's the canonical distillation of the `requirements-driven-development` thread (both shipped phases). Sections:
- Why it exists (constraints dropped / scope invented; faithful translation, not policy)
- The `req` doc (flat `req.md`, body = three ID'd lists, `parseReq`)
- What belongs in `req` vs design/idea (the "can a later design change it?" rule + the table)
- Position & always-load (first in chain; fills the no-thread-ctx slot)
- Lifecycle (generate → draft → curate → finalize → locked → reopen → version+1 → stale)
- Verification (planner `satisfies` citation → structural reducer → semantic backstop → `req_version` staleness)
- MCP surface + relation to ctx/reference

It's grounded strictly in the thread's idea + design, so it should be accurate — but you should review it as the new canonical source before docs link into it.

## Where step 2 + 3 leave us
All of step 2 (ref audit) and step 3 (requirements ref) are complete. The refs are now: classified, tagged (`public`/`internal` + taxonomy), deduplicated (architecture ↔ implementation-contract), ctx-staleness-corrected, archived where dead, and the requirements model has a canonical home.

Remaining in the overall plan:
- **Step 4** — rewrite user-facing docs as *views* (USER_GUIDE, EXTENSION_USER_GUIDE, CLI_USER_GUIDE, ARCHITECTURE, AI_INTEGRATION): add requirements + "How Loom decides what the AI sees" sections, link into refs, stop re-deriving.
- **Step 5** — READMEs: "Why Loom exists" origin story + Knowledge→artifacts→context framing + differentiator pitch (context-routing first), mining `loom-claude-own-vision`.
- Plus your requirements-dogfooding idea (generate `req` docs on real Loom threads to test + showcase).

Want to review the requirements ref first, or go straight into step 4? And if step 4 — all five docs, or one at a time for review?

Stopping here.

## Rafa

Do 4 all 5 docs

## AI:

**Step 4 complete — all five `docs/*.md` rewritten as views into the refs.**

First I verified the ground truth so nothing was invented: the VS Code extension *does* have fully-wired req commands (`packages/vscode/src/commands/req.ts` → **Generate Requirements**, **Refine Requirements**, **Finalize (Lock) Requirements**, **Verify Plan Against Requirements**), so I described real UI, not aspirational UI.

**Targeted edits (the three already-good guides):**
- **USER_GUIDE.md** — added `req` to the doc-types table; added it to the loop (`chat → req → idea → …`) + a stage row; new "Requirements: lock the scope before you build" subsection; new **§4.3 req docs — the thread's locked scope, always loaded** (renumbered reference/requires_load/combine/example to 4.4–4.7); added `thread req` to the assembly-order diagram; linked into `loom-requirements-reference` and `loom-context-pipeline-reference`.
- **EXTENSION_USER_GUIDE.md** — added the four req buttons to the action table with their real titles; "Requirements are optional but powerful" note; linked `vscode-commands-reference` as the full command list.
- **CLI_USER_GUIDE.md** — added req entry points to the agent table (`loom_create_req`→`loom_finalize_req`, `loom_verify_req`); a requirements paragraph; corrected the stale "create shell then `loom_update_doc`" line to single-call `loom_create_*` with `content`; linked `cli-commands-reference` + `mcp-reference`.

**Full rewrites (the two badly-stale docs):**
- **ARCHITECTURE.md** — the old Orchestrator/Effects-Layer/`payment-system` model was fiction. Rewrote around the real six-package layering (`cli/vscode/mcp → app → core+fs`), the MCP gate, derived state + staleness (incl. `req_version`), pure reducers, the context pipeline, multi-loom, security. Top banner defers canonical facts to `architecture-reference` + `implementation-contract-reference`.
- **AI_INTEGRATION.md** — the old native-DeepSeek-client / `loom ai respond` / `proposed_action` JSON-handshake model is entirely gone. Rewrote around the MCP agent surface (resources/tools/prompts/sampling), the two AI paths (Claude Code host vs extension API-key sampling), context injection, chat vs tool-gated state changes, single-call generation, requirements verification, and the `📄`/`🔧`/`📡` visibility markers. Defers to `mcp-reference`, `loom-context-pipeline-reference`, `loom-requirements-reference`.

Every doc now links *into* the refs instead of re-deriving facts — the layered source-of-truth model end to end.

**Remaining:** step 5 (READMEs — "Why Loom exists" origin story + context-routing pitch, mining `loom-claude-own-vision`) and the req-dogfooding idea.

Want to review the doc rewrites first, or go straight to step 5?

## Rafa:

Do 5. Keep the GIF in the top, improve my English writing of `origin story` if needed (I’m Spanish)

## AI:

**Step 5 complete — all three READMEs.** (Confirmed: I used your origin story from line 54 verbatim as the source, then polished the English.)

**Root `README.md`:**
- **GIF kept at the top**, untouched — only added sections *below* it.
- New **## Why Loom exists** — your line-54 origin story, English polished (kept first-person, kept the REslava.Result link, signed *— Rafa Eslava*), followed by your `Traditional vs Loom / knowledge → artifacts → context → implementation` block as a side-by-side.
- New **## How Loom decides what the AI sees** — the differentiator spine you asked to lead with. States outright that "the part that matters most isn't the loop" and lays out the five context-routing mechanisms (graph DB, scope `ctx`, references + `requires_load`/`load_when`, requirements include/exclude/constrain, Context panel) + the deterministic assembly order. Links into `loom-context-pipeline-reference`, `loom-requirements-reference`, and USER_GUIDE §4.
- Added `req` to the workflow loop (`chat → req → idea → …`, renumbered 0–6, "each step citing the req it satisfies").
- Added Context Pipeline + Requirements rows to the References table.

**`packages/vscode/README.md`** and **`packages/cli/README.md`:**
- GIF kept at top in both.
- Added a compact **## Why Loom** — a 2-sentence origin distillation + the `knowledge → artifacts → context` block + the "what matters most is how Loom decides what the AI sees" pitch, each linking to USER_GUIDE §4. (Tighter than the root, since these are marketplace/npm landing pages.)

**English fixes in the origin story** (the polish you asked for): "whilst" → "while"; "Nuget" → ".NET"/proper noun; "ended up hating working in that window" → "came to dislike working in that window"; tightened the run-on about CLAUDE.md; "it would be very interesting to have this automated, graphical collaboration environment" → "this should be an automated, visual collaboration environment. That environment is Loom." Meaning and voice preserved.

---

That closes the whole doc-overhaul effort: step 2 (ref audit), step 3 (requirements ref), step 4 (docs as views), step 5 (READMEs). The only remaining item from this chat is your **requirements-dogfooding** idea — generate `req` docs on real Loom threads to test the feature and showcase it in the codebase. Want to start that, or review the READMEs first?