---
type: chat
id: ch_01KT3D88RNVMEDG4PD8M2357WW
title: agent-doc-dx Chat
status: done
created: "2026-06-02T00:00:00.000Z"
updated: 2026-06-02
version: 2
tags: []
parent_id: null
requires_load: []
---
# agent-doc-dx Chat

## Rafa:

from Idea:
### Open questions for design

- **Part 1:** I am confused, we already have this mcp tool:
loom_find_doc
  loom

  Tool name: loom_find_doc
  Full name: mcp__loom__loom_find_doc
    
  Description:
  Resolve a document id to its absolute
  file path. Returns an error if the
  document is not found.

  Parameters:
    ● id (required): string - Document id
      to look up

We could add path to `loom://link-index`

Review `loom/ai-integration/mcp/mcp-design.md` it is supossed we already have so many mcp resources / tools. Check if all are already implemented. Maybe we just need to add some parameter to some of them, or implement missed resources.

Let me know your conclusions

- **Part 2:** i lean to optional `body` on `create_*` and body on `loom_promote`. Your opinion, suggestions? How it interacts with `finalize` / auto-finalize? Suggestions?
- **Scope:** split into two plans resolution-dx, create-with-body


## AI:

I read `mcp-design.md` against the actual `packages/mcp` + `packages/fs` source. Conclusions below.

**Vision check:** both parts serve "the AI becomes as stateful as it can be — durable docs it rereads at every action" by removing per-operation friction in agent sessions. They remove manual steps: the guess-the-id retry loop, and the mandatory second `update_doc` call. No new user-visible behaviour, just sharpening the agent surface — matches the idea.

---

## Part 1 — id/path transparency (you're right to be confused)

**`loom_find_doc` already returns the path.** It resolves id → `{ id, filePath }` (`findDoc.ts`). So your instinct is correct — we do *not* need a new resolve tool. The path is already exposed there. The only gaps are (a) the agent has to know to call it, and (b) it's a separate round-trip per id.

**`loom://link-index` is broken for this purpose — real bug, flagging it.** `buildLinkIndex` returns an object whose fields are all `Map`s (`byId`, `documents`, `bySlug`, `backlinks`, ...). The resource handler does `JSON.stringify(index, null, 2)`. Maps have no enumerable own properties, so `JSON.stringify(new Map(...))` → `{}`. **Right now that resource emits `{"documents":{},"byId":{},...}` — every field is an empty object.** The id→path data already lives in the index (`byId: id→path`, `documents: id→{path,type,...}`) — it just never reaches the wire. The fix is to serialize the Maps to plain objects/arrays in the resource handler. That single fix hands you the *entire* id→path map for free, which is strictly better than `find_doc` one-at-a-time. So "add path to `loom://link-index`" → the path is already there; we just need to make the resource actually serialize it.

**Suggest-on-miss: nothing does it today.** `findDocumentById` returns `null` and callers throw a bare "not found" (`startPlan` → `resolveWeaveIdForPlan` → `"Plan 'X' not found"`). The clean place to fix this is the chokepoint, not each tool: `findDocumentById` is the single resolver that `find_doc`, `update_doc`, `promote`, and `resolveWeaveIdForPlan` all funnel through. Add a `resolveDocIdOrThrow` helper that, on miss, fuzzy-matches the key against the index's `byId` keys and throws `not found: X — did you mean Y?`. Centralize once → every id-taking tool inherits it. Patching each tool separately would be the symptom-fix.
- Efficiency caveat: `findDocumentById` re-walks the FS and parses frontmatter on *every* call (N file reads per lookup). The suggest-on-miss candidate set should come from the cached link index keys, not a second FS walk.
- One thing to nail down: the idea says the mis-call was filename `release-pipeline-plan-001` vs ULID `pl_01KT…`, but plan ids are actually semantic `{thread}-plan-NNN` (see `startPlan` description + `pathUtils`). Worth confirming which form is canonical so the suggestion points at the right id.

---

## Part 2 — create-with-body

State of play, confirmed in source:
- `create_idea` / `create_design`: title only → body is a generated stub (`generateIdeaBody`). No `body` arg.
- `create_plan`: builds a body from `goal` + `steps[]`, but no free-form body.
- `update_doc`: the mandatory 2nd call that carries `content`, and it **bumps version to 2**.
- `create_reference`: already writes `status: active` with a body placeholder directly.

**I agree with your lean: optional `body` on `create_*` is the cleanest path.** Smallest change, one code path (the app use-cases already build the doc; just let an optional `content` replace the generated stub). Bonus you may not have noticed: it kills a version artifact — today create→update lands every doc at **version 2** immediately, on content it was effectively born with. Body-on-create lands it at **v1 with real content**. Cleaner history.

**But the more urgent half is `loom_promote` + body.** `promote.ts` routes through `samplingAiClient(server)` — server→client sampling — which is **blocked in Claude Code** (`MethodNotFound`, per our own CLAUDE.md). So in a Claude Code session, `loom_promote` is effectively dead: the agent cannot promote chat→idea/design/plan at all today. Adding an optional `body` to promote (when provided, skip sampling and write it directly) doesn't just save a round-trip — it makes promote *usable* in CC for the first time. I'd rank this above create-with-body.

**Interaction with finalize / auto-finalize — my recommendation: don't auto-finalize.** Keep body-on-create at `status: draft`. `draft → active` is the deliberate human review gate (the Finalize/Start transition in the workflow). Body-in-one-call should collapse the *content* round-trip (the real tax), not the approval gate. If you ever want a one-call "create active doc," make it an explicit opt-in flag (`finalize: true`) rather than implicit — and I'd lean against it for ideas/designs specifically. `create_reference` is the natural exception: it's already born `active` with no draft gate, so a `body`/`content` there is pure win.

---

## Scope

Agree with the split — two plans, independent code:
- **`resolution-dx`** — fs/resource layer: fix `loom://link-index` Map serialization, add the `resolveDocIdOrThrow` suggest-on-miss helper at `findDocumentById`, decide the path-exposure surface (link-index resource vs. tool results).
- **`create-with-body`** — app layer: optional `body`/`content` on `create_idea`/`create_design`/`create_plan`/`create_reference`, and optional `body` on `loom_promote` (sampling-free path).

They touch disjoint code and ship separately. `resolution-dx` is mostly a read/resolve fix; `create-with-body` is the write path. If you want a sequencing opinion: do `resolution-dx`'s link-index serialization first (it's a live bug returning empty data), then `promote` + body (unblocks a dead path), then the rest of create-with-body (pure DX).

Want me to draft the design doc for this thread capturing these decisions, or discuss any of the open points (path-exposure surface, the `finalize` flag, plan-id canonical form) further before formalizing?

## Rafa:

Create design 

## Rafa:

I started both plans already, they are implementing state

do whole resolution-dx plan
do whole create-with-body plan


## AI:

Both plans are **`done`** — full authorized range complete, full test suite green.

## resolution-dx (`pl_01KT3FN2XQCSPJ58C1ZZ76PP12`) — done
- **link-index bug fixed:** `loom://link-index` was `JSON.stringify`-ing Maps → all-empty `{}`. Added `serializeLinkIndex` (id-keyed objects); the resource now carries real id→path data.
- **suggest-on-miss:** `resolveDocIdOrThrow` in `linkRepository.ts` — resolves ULID/slug, and on miss fuzzy-matches (filename-stem → substring → Levenshtein) to throw `did you mean 'pl_…'`. Routed `find_doc`, `update_doc`, `promote`, `start_plan` through it.
- **canonical plan-id = ULID:** corrected six tool/prompt descriptions that advertised the filename form as the id (the original mis-call's root cause).

## create-with-body (`pl_01KT3FNB25446NP4J0C6YEK9KH`) — done
- **one-call body:** optional `content` on `weaveIdea`/`weaveDesign`/`weavePlan` + `create_reference`; docs born at v1 with real content (plans parse steps from the body to keep table/frontmatter in sync).
- **sampling-free promote:** optional `title`/`body` on `loom_promote` + the three promote use-cases; when `body` is given, the AI call is skipped — `loom_promote` now works in Claude Code for the first time.
- **finalize untouched:** ideas/designs stay born `draft`, references `active`; no auto-finalize.

**Verification:** `build-all.sh` clean; two new test files (`resolution-dx.test.ts`, `create-with-body.test.ts`) pass; full `test-all.sh` green including all 9 MCP integration tests. Each step's done note is in the two `done/` docs.

A notable deviation from plan wording: `resolveDocIdOrThrow` lives in `linkRepository.ts`, not `pathUtils.ts` as the step said — putting it in `pathUtils` would have created a circular import (recorded in the done note).

Next: waiting for direction — the natural follow-up is routing the remaining `findDocumentById` callers (docs/plan resources, `appendToChat`, `archive`, `doStep`, refine tools, etc.) through `resolveDocIdOrThrow`, which I deliberately left out of scope.

## Rafa:

Create a plan for the remaining `findDocumentById` callers

## AI:

Done — but with two findings worth your attention.

**What happened:** `plan-003` (`resolution-dx-rollout`, `pl_01KT3H6YJN03AXKH7FQFMEVS4S`) now exists with the full authored body and 5 parsed steps, parented to the design. But I could **not** exercise the new `content`-on-create function through MCP this session.

**Finding 1 — stale MCP server (the important one).** The `loom mcp` server this session talks to was spawned at session start, before I rebuilt for `create-with-body`. `build-all.sh` updates `dist` + the global link but doesn't restart that running subprocess, so the live `loom_create_plan` had no `content` arg and **silently dropped it**, producing a stub. The `create-with-body` test passed only because it imports `weavePlan` from `dist` directly. I restored the body with `loom_update_doc` (pre-existing path, so the stale server handles it) and recorded the gotcha to memory.
- **To actually dogfood content-on-create end-to-end, the session/MCP server needs a restart.** The code is correct and unit-tested; this session just can't reach it.

**Finding 2 — `loom_archive` ignores the documented archive convention.** Archiving the first plan-003 placed it at `plans/.archive/agent-doc-dx-plan-003.md` — an in-thread `.archive/`. The convention is `loom/.archive/{weave}/{thread}/`. So `loom_archive`'s behavior contradicts the convention. There's now a stale stub at that in-thread archive path.

**Loose ends:** the archived stub (`pl_01KT3H2RNNKCW25ZYNVJ486J4F`) is sitting in `plans/.archive/`; and `plan-003` is `active` with 5 pending steps (I only created it, didn't start it).

**STOP — your call:**
1. Restart the session so the fresh MCP server has the new `content` args, then re-test create-with-body for real?
2. Want me to address Finding 2 (`loom_archive` path bug) — likely a new thread/plan?
3. Otherwise plan-003 is ready to start whenever.

## Rafa:

I restarted session to have new MCP content args
Fix `loom_archive` path bug directly
Do whole plan-003 (I already started it)

## AI:

Picking up the line-145 instructions on the fresh session. Two things done, one real blocker found.

**1. `loom_archive` path bug — fixed (source).**
`packages/mcp/src/tools/archive.ts` now mirrors the doc's path under a single top-level `loom/.archive/` tree (e.g. `loom/.archive/core-engine/agent-doc-dx/plans/x.md`), matching the VS Code `archiveItem` command — never an in-thread `.archive/`. Compiled into `dist`. Can't be exercised live yet (stale server, see blocker).

**2. Delete + recreate plan-003 — done, and it surfaced a real bug.**
Deleted the broken plan-003 **and** the misplaced in-thread stub, then recreated via `loom_create_plan` with a full 5-row `content` body. The new plan (`pl_01KT3J8B5EH4JE33C5KGSWD9SB`) **still parsed only steps 1, 2, 4, 5** — step 3 dropped again. So last session's loss wasn't bad authoring; it's reproducible, and content-on-create itself works (the plumbing accepted and stored the body) — it just exposed a latent parser bug.

**Root cause — `parseStepsTable` header heuristic.**
The parser skipped the header row with `line.includes('Done') && line.includes('Step')`. Step 3 is the *tools* step; its Files cell lists `appendDone.ts` (contains "Done") and `doStep.ts` / `listPlanSteps.ts` (contains "Step"), so the substring test false-positived and silently dropped the whole step. That's why it was *always* step 3, in both sessions. Confirmed with a direct repro against the compiled parser.

**Fix.** `packages/core/src/planTableUtils.ts`: detect the header by **exact cell match** after the column split (`cols[0] === 'Done' && cols[2] === 'Step'`) instead of a loose substring test. The `!isNaN(order)` guard already backstops it. Verified the real compiled parser now returns all 5 steps; added a regression test to `tests/plan-table-utils.test.ts` (a step row naming appendDone.ts/doStep.ts must not be read as the header). `build-all.sh` + `test-all.sh` both green, incl. the 9 MCP integration tests.

**Blocker — stale running MCP server.**
This session's `loom mcp` was spawned before these fixes, so it still runs the *old* parser and *old* archive code. The on-disk plan-003 therefore still carries the mangled 4-step table, and any MCP write this session (recreate/update) will just re-mangle it. I can't produce a correct plan-003 or dogfood the archive fix until the session/MCP server restarts.

**STOP — recommended next:**
1. Restart the session/MCP so the fresh server picks up the fixed parser + archive.
2. I recreate plan-003 (content-on-create will now parse all 5 steps), confirm via `list_plan_steps`, `start_plan`, then run the whole rollout.
3. Optional: re-test `loom_archive` to confirm it lands under `loom/.archive/...`.

I have **not** started plan-003 — running it now would skip its biggest step (the tools routing), since the live table is still missing step 3. Waiting on the restart.

## Rafa:

restarted, recreate plan-003 and do the whole plan

## AI:

Done on the fresh server — **plan-003 recreated correctly and the whole rollout shipped, plan auto-closed to `done`.**

**Recreate worked (content-on-create proven end-to-end).** Deleted the mangled `agent-doc-dx-plan-003` and recreated via `loom_create_plan` with a full 5-row `content` body. New plan `pl_01KT3KTH7F383XWGT0128QCD1G` re-took the `plan-003` filename and `list_plan_steps` returned **all 5 steps** — including step 3, whose Files cell names `appendDone.ts` / `doStep.ts` / `listPlanSteps.ts` (the exact cells that used to false-positive as the header). The fixed `parseStepsTable` (exact-cell header match) on the fresh server handled it. Last session's drop was the parser bug, not bad authoring — now confirmed fixed live.

*(On your "you did not include content" — it was included; my `🔧 MCP:` line just abbreviated the long `content` arg. A dropped body would have parsed 0 steps, not 5.)*

**The rollout — every agent-supplied (primary) id now suggests-on-miss; internal graph-walk lookups deliberately left on `findDocumentById`:**
- **Step 1 — resources:** `loom://docs/{id}`, `loom://plan/{id}`, `loom://requires-load/{id}` (top-level). Left `fetchRefs`' requires_load walk.
- **Step 2 — prompts:** `refine-design` (designId), `do-next-step` (planId).
- **Step 3 — tools:** `appendDone`, `archive`, `appendToChat`, `doStep`, `listPlanSteps`, `refineIdea` fully; `refineDesign`/`refinePlan`/`doStep` primary-only (their `context_ids` enrichment stays on `findDocumentById`).
- **Step 4 — generate + injected-dep:** routed `generate_chat_reply` (chatId) and `generate_reference` (id); left `loadExtraContext`. For `finalizeDoc`/`rename` I **pre-resolved the primary id at the MCP delivery boundary** rather than touching the app-layer `FinalizeDeps`/`RenameDeps` contract. This keeps the layering clean **and fixes a latent `rename` bug**: `updateAllReferences` matches `parent_id`/`blockedBy` against the id, so a non-canonical `oldId` would have located the file but silently updated zero references — pre-resolving to the canonical id makes that correct.
- **Step 5 — tests:** extended `resolution-dx.test.ts` to assert the suggestion surfaces through `handlePlanResource`, `handleDocsResource`, and `archive`.

**Verification:** `build-all.sh` clean; `test-all.sh` fully green incl. all 9 MCP integration tests (which spawn a fresh `loom mcp` against the new dist, so they *do* exercise the routed code); `resolution-dx` (6/6) and `plan-table-utils` pass directly. Grep confirms every remaining `findDocumentById` is an intended internal/secondary lookup.

**One caveat (the usual stale-server gotcha):** I rebuilt during step 5, so *this* interactive session's MCP server (spawned at session start) now runs pre-rollout code again. The routing is compiled + tested, but the new suggest-on-miss on these surfaces won't be observable in *this* live session until a restart. Not a blocker — the integration suite already exercises it against fresh dist.

**Two follow-ups worth a thread, not started:**
1. **Double FS walk** on `rename`/`finalize` (resolve builds the index, then the use-case's own `findDocumentById` walks again). Fine for these rare ops, but the clean fix is threading the prebuilt index/path into the use-case — a small app-contract change if you ever want it.
2. **`design_version` is hardcoded to 1** in `weavePlan`, so the recreated plan-003 shows as stale against design v3. Cosmetic here, but the plan-create path arguably should stamp the current design version.

Next: waiting for direction.

## Rafa:

Is worth to create a reference doc for loom mcp tools, resources...?
I think all agent can explorer mcp to know all mcp server capabilities, so creating a reference doc will not add too much value.
What you think?

## AI:

Agree with you — **don't create a tool/resource listing reference.** Your instinct is right, and it's the same principle the idea for this very thread was built on.

**Why the listing doc is anti-Loom:**
- MCP is **self-describing**. `tools/list` / `resources/list` / `prompts/list` return names, descriptions, and full input schemas — the agent gets all of it for free at connect time. A markdown doc mirroring those signatures is a hand-maintained copy of machine-readable data: it drifts on every tool change. That's precisely the desync Loom exists to kill — it's the same argument we used in Part 1 to reject a stored id→path dictionary. A static MCP catalog is that anti-pattern wearing a different hat.
- **The tool `description` fields *are* the reference**, and they're the single source of truth because they ship with the schema and can't drift from it. The original mis-call that spawned this whole thread was a *bad description* (advertising the filename as the id), and we fixed it by editing descriptions in `resolution-dx` — not by writing a side doc. The lesson points the other way: invest in sharp `description` strings, not a parallel file.

**The one thing schemas *don't* give you** — and the only part with real value — is the **choreography**: when to use which (`do-next-step` vs `do_step` vs `complete_step`), `create_*` vs `generate_*` and the sampling-blocked-in-CC rule, the all-writes-go-through-MCP gate, primary-vs-internal id resolution. That's not discoverable from `tools/list`. **But it already exists** — in `loom/ctx.md` and `loom/refs/architecture-reference.md` (the MCP-surface section), plus the workflow reference. A new MCP reference would just duplicate either the schemas (drift) or that choreography (redundant).

**So: net-new doc = no.** If there's a gap, the correct move is to sharpen what's already authoritative:
1. Tool/resource **descriptions** in code — the live, drift-proof reference.
2. The **MCP-surface section of `architecture-reference.md`** — for the cross-tool "how it fits together" that schemas can't express.

The only scenario that would flip my answer is a *human-facing* audience (a downstream dev reading docs, not an agent) — but even then I'd extend `architecture-reference.md` rather than start a new doc.

Next: waiting for direction.