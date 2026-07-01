---
type: chat
id: ch_01KWCRTEZ8M211JEQ8PP8C5707
title: staleness-model Chat
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 6
---
# staleness-model Chat

## Rafa:

This is now active chat and thread

I read `loom/refs/staleness-reference.md`, well written!
I deleted thread `version-on-content-only`
I started the plan
Do whole plan

## AI:

Whole plan **done** (6/6) — build + full suite green.

Landed the directional, version-based model end to end:
- **version-on-content** — `loom_update_doc` bumps version/updated only on a content edit; finalize stopped touching `updated`. Marking a doc done no longer cascades staleness.
- **`design.idea_version`** + **`req.design_version`** baselines stamped on create/refine/amend; `parentIdeaVersion` helper added.
- **reversed design↔req** — req now parents to the design and stamps `design_version`; design dropped `req_version`; idea dropped its vestigial `req_version`.
- **`staleEntries` rewritten** to the four directional reasons; deleted `idea_behind_design`/`design_behind_idea` and `getReqStaleDocs`. Extension badge now sums `thread.stale` (includes reqs).
- **migration** `loom backfill-staleness-baselines [--dry-run]`.
- **tests** — stale-parity (asserts *an idea is never stale*), version-on-content, staleness-baselines; updated req + context-assembler tests.

Dry-run on this repo: **44 baseline fields** would be set (designs' `idea_version`, reqs' `design_version` + parent repoint idea→design). I did **not** run it for real or commit yet.

Two things for you, same as last time:
1. **Run `loom backfill-staleness-baselines`** to stamp the 44 baselines here (and later in Chord Flow)? Or eyeball the dry-run first.
2. **Commit** — the staleness-model code + thread docs + reference doc are uncommitted. I'd do two: `feat:` the model + `docs:`/data for the migration run.

Also: the running `loom mcp` and the extension need a **reconnect + Reload Window** to pick up the new `getState`/`staleEntries` (build-staleness caveat). STOP — your call on run + commit.

## Rafa:

I already reconnected mcp + reload window
I think we could do:
1. commit
2. `loom backfill-staleness-baselines`
3. commit
4. update READMEs main, CLI and Extension. Maybe link `loom/refs/staleness-reference.md` 
5. do-release 1.12.0 

Then in Chord Flow (I did nothing there yet) I will do:
1. reconnect mcp + update extension
2. `loom backfill-design-versions`
3. `loom backfill-staleness-baselines`

Do you agree? have better steps?

## AI:

Agree with the sequence — it's the right order (code → data → docs → release). Three refinements:

1. **Fold a `req_version` cleanup into the migration before committing.** I removed `req_version` from the design/idea entities, but existing design docs on disk still carry the dead field, and the migration re-saves every design anyway — so it's free to strip `design.req_version` at the same time (no-legacy, your preference). Small change to `backfillStalenessBaselines` + its dry-run output. Want this in? (I'd add it, then commit.)

2. **READMEs (step 4): document the new surface, not just link.** Cover `loom stale --all`, `loom backfill-design-versions`, `loom backfill-staleness-baselines`, and the staleness model — with the link to `loom/refs/staleness-reference.md`. Main + CLI + Extension READMEs.

3. **This repo only needs `backfill-staleness-baselines`** — `backfill-design-versions` already ran here (plan baselines are current). Your Chord Flow plan correctly runs **both** (it's never had either). 👍

`do-release 1.12.0` is the right bump (last tag was 1.11.0); this minor bundles the design_version fix, the staleness unification + directional model, version-on-content, and the three new CLI surfaces. I'll drive it via `/do-release 1.12.0`.

So the concrete plan:
1. (add req_version strip to migration) → **commit** `feat:` staleness-model
2. `loom backfill-staleness-baselines`
3. **commit** data
4. update 3 READMEs + link reference → **commit** `docs:`
5. `/do-release 1.12.0`

Give me the go (and a yes/no on #1) and I'll run it through. STOP.

## Rafa:

1. Yes
go

## AI:

Sequence running — steps 1–4 done, all on `main`:
- `276b643 feat:` directional, version-based staleness model (incl. the `req_version` strip you ok'd).
- `0a40690 chore:` ran `loom backfill-staleness-baselines` — 41 docs (designs' `idea_version`, reqs' `design_version` + parent repoint). Diff verified clean.
- `b6f199c docs:` staleness model + new CLI surface documented in all three READMEs, linking `staleness-reference.md`.

Now firing **`/do-release 1.12.0`** (it runs changelog → bump → build/test → tag → push → monitors publish). Will report the outcome.

## AI:

🚀 **v1.12.0 shipped.** The whole sequence is done:
1. ✅ `feat:` staleness model
2. ✅ `loom backfill-staleness-baselines` (41 docs)
3. ✅ `chore:` data
4. ✅ `docs:` READMEs + reference links
5. ✅ `/do-release 1.12.0`

Release outcome — all green:
- Workflow run `28466664726`: **success** (guard → build-test → publish npm·vsce·ovsx → release).
- **npm** `@reslava/loom@1.12.0` ✓ · **VS Code Marketplace** ✓ · **Open VSX** ✓
- **GitHub release** `v1.12.0` published (not draft).
- `record-release` stamped this release's 3 done plans (`create-plan-parent-version`, `align-stale-surfaces`, `staleness-model`) with `actual_release: 1.12.0`.

That closes the staleness arc: created the bug-fix thread, unified the surfaces, made the model directional + version-based + trustworthy, wrote the reference, and shipped it.

Your Chord Flow plan is the right follow-up: reconnect MCP + update extension, then `loom backfill-design-versions`, then `loom backfill-staleness-baselines` (both idempotent, `--dry-run` first if you want to eyeball). Want me to do anything else here, or are we done for now?