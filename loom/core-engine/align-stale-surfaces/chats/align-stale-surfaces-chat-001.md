---
type: chat
id: ch_01KWC56N3238EA7QXW24ZJ23X7
title: align-stale-surfaces Chat
status: done
created: 2026-06-30
updated: 2026-06-30
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 6
---
# align-stale-surfaces Chat

## Rafa:

This is new active chat
Agree on your leans on A/B/C, update design
write plan

## AI:

Decisions settled (A: one `staleEntries` + `actionable` flag · B: attach to `getState` like `reqCoverage` · C: full reason union incl. both date directions) — patched into the design's "Decisions (settled)" section.

Plan written: **`align-stale-surfaces-plan-001`** (`pl_01KWC5CCKKPCC2RJT7AWWNWXNB`), 6 steps:
1. Core `staleEntries(weave)` predicate + typed reasons + `actionable` flag (`derived.ts`).
2. App: `getStaleDocs` thin wrapper (`includeDone`) + `getState` attaches the set; summary counts derive from it.
3. MCP: `loom_get_stale_docs` gains `all`; `loom://state` carries the set.
4. Extension: delete `threadHasStale` / `staleIds` recompute → read the attached set (zero local logic).
5. CLI: `loom stale [--all]`.
6. Parity test (extension-set == CLI-set) + wire into `test-all`.

**One transparency note — I tripped over the very bug this all started from.** The plan was initially born *stale*: design is now v2 (my "settle A/B/C" patch bumped it), but the plan stamped `design_version: 1`. Cause: I ran the design patch (which bumps version) **in parallel with** the plan creation, so the plan was minted against the pre-patch version — a sequencing mistake on my part (those two had a data dependency). Repaired it by running `loom backfill-design-versions` — a nice dogfood: the command from the previous thread fixed it 1→2 cleanly.

Two follow-on observations worth holding for this thread:
- The session's running `loom mcp` may still be on pre-fix `create_plan` code (build-all doesn't restart it) — restart it so freshly-created plans pick up the live-version stamp directly rather than needing a backfill.
- The backfill re-baselined `event-save-scope`'s **done** plan (3→4) because marking its design `done` bumped the design version. A done plan arguably shouldn't have its baseline rewritten — it shipped against v3. Small, but it suggests staleness/backfill should treat done plans' baselines as frozen history. Fits naturally under this thread's "exclude done from the actionable set" theme.

Plan is draft, nothing built. These thread docs (idea/design/plan/chat) + the 2 backfilled plans are uncommitted.

## Rafa:

I reconnected mcp and started the plan
Do whole plan

## AI:

Pausing the plan here (Step 1 — core `staleEntries` predicate — is done; Steps 2–6 pending) to settle the version-bump question, because it's an API-semantics decision and it changes the staleness story.

**Confirmed the mechanism.** `loom_update_doc` (`packages/mcp/src/tools/updateDoc.ts:42`) does `version: doc.version + 1` **and** `updated: today()` **unconditionally** — even for a status-only change. So marking a design `done` bumps its version (and its `updated`), which makes every child plan at the old `design_version` go stale, *and* trips the idea↔design date-drift check. A lifecycle change is masquerading as a spec change.

**Root cause:** `version` (and `updated`) are overloaded. Staleness reads them as *"the parent's spec changed, children should catch up."* But marking done is **not** a spec change — it's lifecycle. So it shouldn't move either signal.

**Options:**
- **(A) — recommended.** A content edit bumps `version` + `updated`; a **status-only / requires_load-only** update touches **neither**. Marking done (or finalize draft→active) stops invalidating downstream. This makes `version` mean "spec revision" — exactly what staleness already assumes — and kills a whole false-staleness class at the source. Small change in `updateDoc` (and align `closePlan`/`finalize` to the same rule). It's the root-cause fix.
- **(B)** Keep bumping on everything, but make staleness ignore done parents. Treats the symptom, not the cause; a design with real pre-done content changes would also be wrongly ignored.
- **(C)** Split fields: `spec_version` (content) vs `version` (any edit). Cleanest in theory but heavyweight — new frontmatter field + migration + rewire every comparison. Overkill for a solo, event-sourced system.

**My call: (A).** Your instinct ("marking done shouldn't add 1 to version") is right, and it should extend to `updated` too, since the date-drift axis reads that.

This is a **separate root cause** from the align-stale-surfaces refactor — `staleEntries` reads versions correctly no matter how they're set; (A) stops bad versions being written in the first place. They're complementary.

**Two questions before I move:**
1. Agree on (A) (version **and** `updated` only move on a content edit)?
2. Fold (A) into this thread (it's small), or spin a sibling thread (e.g. `version-on-content-only`) and keep this thread purely about surface alignment? And: resume the align plan now, or after we land (A)?

STOP — waiting on your decision.

## Rafa:

1. A
2. Fold A in if you agree (small scope) or spin up a new thread, you tell me

## AI:

Going with **a separate thread** — `core-engine/version-on-content-only`. Reason: this thread's idea/design/plan are settled around one job (make the stale surfaces agree). The version-bump fix is a *write-time* concern, independent and self-contained; folding it in means amending the just-settled design and blurring the thread's focus. Cleaner as a sibling — and they can land in either order (`align` makes surfaces agree on what's stale; `version-on-content-only` stops false staleness being written in the first place).

Captured decision (A) as the new thread's idea (`version-on-content-only-idea.md`): a content edit bumps `version` + `updated`; a status-only / requires_load-only update touches neither. Scope flagged: `updateDoc.ts` primarily, plus an audit of `finalize` / `closePlan` for the same rule.

Now resuming the align plan — Steps 2–6 (app wrapper + getState attach → MCP `all` arg → extension reads attached set → CLI `--all` → parity test), then build + test. Will report when green.

## AI:

Align plan **done** (6/6) — build + full test suite green, including the new `stale-parity` test.

What landed:
- **core** — one `staleEntries(weave)` predicate, typed reasons (design_version / req_version / idea↔design both directions) + per-entry `actionable` flag. The only definition of "stale" now.
- **app** — `getStaleDocs` is a thin filter over it (`includeDone`); `getState` attaches the actionable set to `thread.stale` (like `reqCoverage`) and derives the summary counts from the same entries.
- **mcp** — `loom_get_stale_docs` gains `all`; `loom://state` carries `thread.stale`.
- **extension** — deleted `threadHasStale` + the `staleIds` recompute + the `getReqStaleDocs` import. Zero local staleness logic; it reads the server set.
- **cli** — `loom stale [--all]`.

Dogfood: `loom stale` → **1 actionable** (a `design_behind_idea`), `loom stale --all` → **7**. The count fell from the old 25 because the blunt "any parent updated after child" check (mostly done-doc noise) is replaced by the four canonical axes — intended consolidation.

Two notes:
- **Extension won't reflect this until you reconnect MCP + Reload Window** — the running `loom mcp` still has the old `getState` (no `thread.stale` attach), same build-staleness caveat as before. After reconnect, badge + Stale filter both read the new set; the parity test guarantees they match `loom stale`.
- **Minor, pre-existing:** the root badge number sums plans+ideas+designs only, so a *req*-stale doc shows in the Stale **filter** (via `thread.stale`) but isn't added to the badge **count**. The hard requirement (filter == `loom stale`) holds; only the headline number omits req, exactly as before. Worth a one-line follow-up if you want the badge to count req too — say the word and I'll fold it in.

State: plan done; this thread's docs + the `version-on-content-only` idea + the code are **uncommitted**. The `version-on-content-only` thread (decision A) is still pending — idea written, no design/plan yet.

## Rafa:

commit this thread job

### Stale questions

I think we should review loom stale detection behaviour together with loom docs state changes.

`loom stale --all` shows these cases:
1. de_01KQYDFDD86RBSXN3X643NQGPB  [design]  Token Optimization & Cost Management Strategy
     design_behind_idea: idea updated 2026-04-23 after design 2026-04-14
     this is a real stale doc, idea has been update after design, design is stale and should be refined
2. id_01KQYDFDDBJSRCQTW60ANFM9YR  [idea]  Doc IDs — ULID-based identity with slug presentation
     idea_behind_design: design updated 2026-05-05 after idea 2026-05-03

     why is this a stale doc? if so, then updating/refining design should update the parent idea also
3. pl_01KV408365QQGYX687RVYKGM03  [plan]  Derived Roadmap — Merge Present+Future
     req_version: req v2 > doc baseline v1    
     req is v2 and plan v1, also this thread has multiple plans, how to avoid this stale case?

most common workflow:
chat -> idea -> design -> req -> plan -> done
we need a clear simple way to detect real stale docs and loom CLI commands and mcp tools should change state of docs accordenly

create a table or schemma or whatever you consider to describe the process, how it should be and how is currently?

this is main feature of loom and now I do not trust it
