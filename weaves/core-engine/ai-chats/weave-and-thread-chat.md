# CHAT

## Rafa:

About `weaves/core-engine/plans/weave-and-thread-plan-001.md`

### Key Decisions to Confirm Before Starting

1. **Branch strategy:** yes
2. **Default thread-from-name:** yes
3. **Reserved subdir names** yes
4. **Thread auto-naming on promotion:** (b)
5. **Old CLI scripts (`test-all.sh`):** yes
6. **Chat files during migration:**  Per-thread chats defered

TODO: Update `weaves/core-engine/plans/weave-and-thread-plan-001.md` to confirm the decisions

### Flat threads structure when move docs to done/

I think this way has more disadvantages than keeping thread structure in done/

Done Flatten              vs     Done Threads (* are disadvantages)
---------------------------------------------------------------------
will grown messy                 grown grouped by thread
lose thread visual info          keep thread visual info 
                                 renaming a thread in done/ same than in weave/
lose history                     we even can show sorted threads done by done date             
clean weaves                     clean weaves
less subdirs                     more subdirs*
collapsable only by root done/   collapsable by thread
comples restore                  easy restore of thread, just move it, drag & drop

(derive state of a thread: done is all done docs are done)
break the chain                  keep the chain of done docs
you could move docs individual   you can move the thread only. note: only cancelling, or archivining move individual docs

Let me know what you think?


## AI:

All 6 decisions confirmed — updating the plan after this response.

---

### Done placement — you're right, keep thread structure

The plan already has `{thread}/done/{id}-done.md` in Step 7, so we're aligned. Done docs stay inside their thread, not flattened to a weave-level `done/`. Your comparison table makes the case clearly — the main cost (more subdirs) is trivial against the benefits (grouped history, easy restore, sortable by done date, chain intact).

The concrete layout after Phase 4:

```
weaves/vscode-extension/
  tree-view/                             ← Thread (active)
    tree-view-design.md
    plans/tree-view-plan-001.md
    done/tree-view-plan-001-done.md      ← done doc inside thread
  toolbar/                               ← Thread (done — stays in place)
    toolbar-design.md
    plans/toolbar-plan-001.md            ← plan stays in plans/
    done/toolbar-plan-001-done.md
  ai-chats/                              ← weave-level (unscoped)
```

A thread with all plans closed stays in place — its folder doesn't move. Only explicit `loom archive` pushes it to `_archive/`. The VS Code tree derives "DONE" status from all plans being closed; the thread node shows a done icon. No file moves required on completion.

One implication for Step 8 of the plan (migration): weave-level `done/` files from the flat layout need to be moved *into* their respective thread's `done/` subfolder during migration. The migration script should handle this by tracing each done doc's `parent_id` back to its plan and placing it alongside that plan's thread.

Plan will be updated now.

## Rafa:

### Done & filters
Visual icon showing derived thread status.
Actually we can group by status.
But to keep thinks more clear, and instead of moving anything, we take advantage of loom system and implement filters by status:
Show only threads - implementing 
                  - active 
                  - active or implementing 
                  - done

Agree? if so, create an idea in weaves/vscode-extension

### Save tokens
In order to save maximun tokens before reaching weekly limit...
What do you think about doing this?
- commit docs, Do Feature branch, Phase 1, commit, Phase 2, commit, compact
- Phase 3, commit, Phase 4, commit, compact
- ... repeat pattern
Is this approach good idea?

## AI:

### Done & filters — agreed

Filters are the right call. No file movement, no special done-folder logic beyond what we already have — just derive thread status and let the user filter. The existing `statusFilter` in `defaultViewState` already works this way for plans; extending it to threads is natural.

Filter presets I'd suggest:

| Label | Filter value |
| :--- | :--- |
| Active | `active` |
| Implementing | `implementing` |
| Active + Implementing | `active`, `implementing` (default view) |
| Done | `done` |
| All | (no filter) |

This also removes the need to "archive" completed threads just to hide them — set filter to "Active + Implementing" and done threads disappear cleanly. Archive becomes reserved for permanently cancelled/irrelevant threads.

Idea created in `weaves/vscode-extension/` — see `thread-status-filter-idea.md`.

---

### Save tokens — yes, good pattern

The commit → compact → continue cycle is exactly right. Each phase ends with tests green + commit, so compaction never loses context — the plan doc and git log are the persistent state. Claude resumes from the plan step table, not from conversation memory.

Suggested cadence (phase boundaries are natural break points):
plan weave-and-thread-plan-001
- [x] Do Feature branch, Phase 1, commit → compact
- [x] Do Phase 2, commit → compact  
- [x] Do Phase 3, commit, Phase 4, commit → compact (both are shorter)
- [x] Do Phase 5, commit → compact
- [x] Do Phase 6, commit → compact
Talk about loom docs migration 
- [ ] Do Phase 7, commit, Phase 8, commit → compact
- [ ] Do Phase 9, commit → done

One rule: always compact *after* committing, never before. That way if context is lost mid-phase, the last commit is the restore point and the plan table shows exactly which step to resume from.

## Rafa:

Before doing Phase 7, 8: migrate own loom documentation  
- Actual loom docs where manually mantained, so many of them 
  - wrong frontmatter
  - wrong parentId, childIds
  - stale fields, for example, designs with `role`
- Trying to automatize this migration could be so difficult, maybe we need an hybrid approach, when a doc does not match for being automattically migrated, read it and assign thread manually, updating frontmatter
- We need the migration follow the restrictions per thread: 1 idea, 1 design, N plans, M done. We should apply split rules defined in: `weaves/core-engine/weave-and-thread-design.md` section `### 2.1 What About Multiple Designs Exploring Alternatives?`

what you think?

## AI:

Good instinct — fully automatic migration on hand-maintained docs is fragile. Here's my take on the trade-offs and a concrete hybrid approach.

### The core problem

The script in Step 26 was designed assuming clean `parent_id` chains. Real loom docs have:
- Broken `parent_id`/`child_ids` (the chain can't be traced)
- Stale fields like `role` on designs (not a blocker, but noise)
- Multiple designs per idea (valid per section 2.1, but requires splitting into threads)

If we auto-migrate with broken chains, docs get dropped or mis-assigned — hard to detect later.

### Recommended: two-pass hybrid

**Pass 1 — Frontmatter repair (manual, before the script runs)**

Before writing any migration code, do a manual sweep of `weaves/` and fix:
- Remove `role` from designs
- Fix obviously wrong `parent_id`/`child_ids` references
- Flag any "multiple designs on one idea" cases (decide: complementary threads? or cancel one?)

This is tractable — maybe 30–40 docs across 6 weaves. An hour of editing gives the script clean inputs.

**Pass 2 — Migration script (automated, with manual-review fallback)**

The script then:
1. Traces `parent_id` chains for each weave
2. Groups clean chains (idea → design → plans → dones) into proposed thread folders — auto-migratable
3. Flags anything it can't resolve: orphan docs, broken chains, multi-design situations
4. Outputs a dry-run report in two sections: `AUTO` (will be moved) and `REVIEW` (needs human decision)

User reviews the `REVIEW` section, assigns threads manually in the report, then script executes with those overrides.

### Split rules from section 2.1

For the "multiple designs" case in your docs:
- **Complementary** (both survived, different workstreams) → split into separate threads, link via `parent_id` to a shared idea
- **Dead candidate** → mark `status: cancelled`, move to `_archive/cancelled/` — it doesn't become a thread

The script should detect "idea has 2 design children" and put it in `REVIEW`, not auto-split — that decision needs human judgment.

### What this means for the plan

Steps 26–28 stay as written but the scope is clearer:
- Step 26: build the script with `AUTO`/`REVIEW` report sections
- Step 27: dry-run on a copy of `weaves/`; *before that*, do the manual frontmatter repair pass (unlisted prep work)
- Step 28: execute on real `weaves/` after reviewing the dry-run report

Main open question: do you want the frontmatter repair to be a separate script, or just do it by hand directly in the files?

## Rafa:
I think you will do a better frontmatter repair by reading docs a doing manually directly in the files.
If you consider good approach:
1. read all weaves: 
   1. fix all frontmatter errors except parentId and childIds
   2. create a `reference doc` with docId, weave, title, short description, current parentId and childIds 
2. analyse the `reference doc` and 
   1. add a column, thread, for each doc
   2. now it easy to update parentId, childIds
What you think? 
Reply bellow inside doc

## AI:

Yes — that's a clean, safe approach. Reading and fixing manually avoids the risk of a script mis-parsing ambiguous frontmatter, and it lets you apply judgment as you go.

Here's how I'd refine your two steps slightly:

**Step 1 — Frontmatter repair pass**

I read every `.md` under `weaves/`, fix in place:
- Remove stale fields (`role`, `target_release`, `actual_release` if no longer relevant)
- Normalize canonical key order (enforced by `serializeFrontmatter`)
- Fix obvious type errors (e.g. `status: Active` → `status: active`)
- Leave `parent_id` and `child_ids` untouched for now

**Step 2 — Reference table**

After the repair pass I produce a table (written to a temporary doc, e.g. `weaves/core-engine/ai-chats/migration-reference.md`):

| docId | weave | type | title | parent_id | child_ids | proposed thread |
|-------|-------|------|-------|-----------|-----------|-----------------|
| ... | ... | ... | ... | ... | ... | ← you fill this |

You fill the `proposed thread` column — one pass of reading the table, not re-reading every doc. That gives us the full thread assignment map before anything moves.

**Step 3 — Apply thread assignments**

With the table filled, I update `parent_id`/`child_ids` in every doc to match the proposed thread structure, then we run the migration script on clean inputs.

---

Two questions before starting:

1. Do you want the reference table as a real `.md` doc in `weaves/` (so you can edit it in the IDE), or output to terminal?
2. Should I fix frontmatter across **all** weaves in one pass, or one weave at a time so you can review incrementally?

## Rafa:

1. Yes, real `.md` doc
2. All weaves

Try to fill also `proposed thread` if you can, you are reading all docs and you manage information much better than me.
Then I will review, and fix the gaps.

Also if you have better `weave` name, or you think will be good to create some new `weave` mention it in the reference table.

Include whatever you consider to get the better docs organization.

In case all clear, create a side plan `weaves/docs-infra/plans/organize-loom-plan-001.md`
If not, tell me

## AI:

Read all 91 docs. Reference table and plan created. Several issues found — not all clear, but clear enough to proceed with a plan that covers them.

### What was created

- `weaves/docs-infra/migration-reference.md` — full table: every doc, proposed thread, flagged issues
- `weaves/docs-infra/plans/organize-loom-plan-001.md` — 20-step plan: cleanup → thread assignment → decisions

### Key findings

**Duplicate files (delete):**
- `core-engine/plan-refactor-design.md` — exact copy of `plan-steps-v2-design.md`
- `core-engine/core-engine-run-command-design.md` — exact copy of `workflow/workflow-run-command-design.md`

**Misplaced docs (move to `weaves/workflow/`):**
- `core-engine/core-engine-feature-model-design.md` — id and content belong in workflow
- `core-engine/core-engine-app-version-design.md` — same
- `core-engine/done/workflow-user-personalization-design.md` — same

**Broken frontmatter:**
- `canonical-frontmatter-serializer-idea.md` — status is literally `draft | active | done | cancelled`, invalid date, title has trailing `}`
- `app-layer-refactor-plan-001.md` — old format with `design_id` + `target_version` instead of `parent_id`
- `workflow-idea.md` — `parent_id: workflow-idea` (self-reference)
- `link-index-plan-001.md` — in `done/` folder but `status: draft`

**Stale child_ids pointing to non-existent template files** (`design-template.md`, `AI_INTEGRATION.md`) in 2 docs.

### 11 decisions still need your call (marked ⚠️ in the table)

Most impactful ones:
1. `anchor-free-threads-design` + plan — superseded, archive?
2. `multi-workspace-design` v1 alongside `multi-workspace-mvp-design` v2 — archive v1?
3. `load-when-design` — own thread or child of `reference-load-context`?
4. `canonical-frontmatter-serializer` — thread in core-engine or keep tiny weave?
5. `weaves/tests/` — merge `fs-extra-esm-reference.md` into core-engine and delete weave?

Review the ⚠️ column in `migration-reference.md`, fill your decisions, then we run `organize-loom-plan-001` step by step.

### Your note on stale/superseded docs

Agreed — several docs are clearly historical. The reference table flags `anchor-free-threads-design` and `enforce-single-primary-design-plan-001` as `📦 consider archiving`. The organize plan (Step 16-17) handles these. For any other docs you consider stale as you review the table, just mark them `📦` or `🗑️` in the issues column and I'll include them in the cleanup pass.

## Rafa:

I append section `## Decisions` line 214 to `weaves/docs-infra/migration-reference.md` 
Update `weaves/docs-infra/migration-reference.md` 
Tell me if anything is still pending 

## AI:

All 11 decisions incorporated. Both files updated.

**For decision 8 (weave name):** chose `chats` — shorter, no redundancy. All session chats by definition, so "session" adds nothing.

### What changed

`migration-reference.md` v2:
- All ⚠️ rows resolved — table now shows final thread assignment for every doc
- Archive/delete targets clearly marked (📦 / 🗑️)
- `Resolved decisions` section replaces the open `Summary` section

`organize-loom-plan-001.md` v2:
- Restructured into 5 passes: Delete/Archive → Move → Frontmatter → parent_id chains → Verify
- 25 steps total, concrete per-file instructions
- Absorbs all decision outcomes (canonical-frontmatter-serializer thread, tests/ merge, chats/ rename, token-optimization chain, load-when own thread, etc.)

### Nothing is pending

All decisions filled. The reference is authoritative. We can run `organize-loom-plan-001` step by step.

Suggested next: commit these two new docs (`migration-reference.md`, `organize-loom-plan-001.md`) to `feat/weave-threads`, then start executing the plan. Or if you prefer, compact first — the plan doc is the full context needed to resume.

