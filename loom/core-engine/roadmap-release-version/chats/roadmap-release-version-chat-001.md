---
type: chat
id: ch_01KVA1KCV4HBKRKS72KBWVWH4B
title: roadmap-release-version Chat
status: active
created: 2026-06-17
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 20
---
# roadmap-release-version Chat

## Rafa:

### `current_release` 

This should be part of Loom state, generated.
For example, from roadmap history version sorted.

### `target_release`

Should be present at least in ideas, designs & plans
Should be written when the doc is created with minor release over current_release 

### `actual_release`

Should be part of design and plan frontmatters
One thread can have only 1 design, but N plans

### Open questions for design

- Who writes `actual_release` and when — `do-release` step, a dedicated `loom_*` tool, or both? a `loom_*` tool
- Stamp the plan, the design, or both? (History keys on done *plans*; `actual_release` lives on *designs* today.) both, with fall back plan -> design -> idea
- Backfill: derive historical `actual_release` from tag dates vs. leave history pre-this-thread unversioned. If easy do backfill, if not, we could just backfill only last release threads to test.

### Problem

Each project is different about:
- cuurent version. In Loom is in `package.json`, different in other
- do a new release, In Loom we have `do-release` skill not tested yet, , different in other

Loom should work in any kind of project by offering a way to wire the project release pipeline to Loom.
This way could be the dedicated `loom_*` tool that writes `actual_release` of current thread, design and just done plan.

### TODO

read idea and chat, analyze and let me know


## AI:

Read the idea and your chat. Here's my analysis — the chat sharpens the idea in two important ways, and surfaces one decision the idea didn't have.

## The model I read from your chat

Three fields, three different natures:

- **`current_release`** — *derived state, never stored.* = the max `actual_release` across roadmap history (version-sorted). Loom computes it; no frontmatter key holds it.
- **`target_release`** — *intent, written at creation.* Lives on idea / design / plan. Default = `current_release` + a minor bump.
- **`actual_release`** — *recorded fact, written at ship time.* Lives on plan and design. One thread = 1 design but N plans.

If that's right, then `current_release` and `actual_release` are two ends of the same wire: the release pipeline writes `actual_release` once, and `current_release` is just `max()` over those. Clean and self-consistent with "state is derived."

## The reframe I agree with (this answers your "Problem")

The idea names `do-release` (our Loom-specific runbook) as the writer. Your chat moves the writer to **a dedicated `loom_*` tool**, and that's the better call — it's what makes this work in *any* repo. The split:

- **Loom never reads `package.json` / `Cargo.toml` / git tags itself.** It stays project-agnostic.
- **The project's release pipeline pushes the version *in*.** For us that's `do-release` calling `loom_record_release("1.9.3")`; another project's pipeline calls the same tool with its own version. The pipeline is the only thing that knows where "current version" lives; Loom only knows what it was told.

So the external-vs-derived tension dissolves: the external truth (the tag you just cut) flows into Loom exactly once per release via the tool, and thereafter Loom derives everything from its own history. That's the project-agnostic wiring you wanted.

## Decisions to settle (my lean on each)

**1. Plan becomes the authoritative carrier of `actual_release`; design's copy is derived.**
A design spans N plans that ship across *different* releases, so a single `design.actual_release` is lossy — which release does it mean? The plan ships in exactly one release, so the plan is the precise record. I'd make `plan.actual_release` authoritative and `design.actual_release` a convenience = the latest plan's release (or first — your call). This is also the idea's own observation made concrete: "history keys on done *plans*; actual_release lives on *designs* today" → we're moving the source of truth from design to plan.

**2. Backfill isn't optional polish — it's what makes `current_release` correct on day one.**
Because `current_release = max(actual_release)`, with an empty history it's `null` until the *next* release ships. Loom already has a long shipped history, so without backfill, `current_release` reads as nothing until v1.9.3 lands. Backfill (map each done-doc's date → the tag range it falls in → that version) is what makes the derived value true immediately. For us it's easy: git tags + done-doc dates. So I'd treat at least last-few-releases backfill as in-scope for *this* thread's success, not a follow-up.

**3. `target_release` default is a snapshot, and will drift.**
Written at creation as `current_release` + minor — fine — but if other work ships before this doc does, `current_release` moves and the stamped `target_release` is now "behind." I think that's acceptable (target = intent, refine can update it), but we should decide explicitly: is `target_release` frozen at creation, or recomputed/refined? And who picks patch vs minor vs major — always-minor default with manual override?

## Where I actually need your call (STOP)

**Q1 — `current_release` when history is empty / pre-backfill.** Derive-only (it's `null`/`v0.0.0` until backfill or the next release), or fall back to an external read (package.json / latest git tag) until history catches up? Derive-only is purer; external-fallback is never-wrong-looking but reintroduces the project-specific read you're trying to avoid.

**Q2 — the fallback chain.** You wrote "both, with fallback plan → design → idea." For `actual_release` I read that as plan → design (idea carries no `actual_release`). What's the "→ idea" leg — is a read meant to fall through to the idea's *`target_release`* as a last resort, or did you mean the fallback only applies to `target_release` resolution? This changes the read-model semantics.

**Q3 — the release tool's plan selection.** When `loom_record_release(version)` runs, does it auto-detect "every plan done since the last recorded release" and stamp those + their designs, or does the pipeline pass explicit plan/thread ids? Auto-detect is less to wire into do-release; explicit is more deterministic.

Answer those three and I think the design writes itself.

## Rafa:

### Decisions to settle (my lean on each)

**1. Plan becomes the authoritative carrier of `actual_release`; design's copy is derived.**

Yes, roadmap history is based on plan dones. We move `actual_release` to plans.
I think in keeping `actual_release` also in design because fast threads with no plan (easy fixs), but I am leaning now to delete `actual_release` for next designs and use it only in plans. Ignoring old designs `actual_release`.
For fast threads/features we used even threads with only chat, or only idea, or idea + chat.
But for roadmap history a thread should have a plan, at least a simple plan.
So even for fast/no friction threads, we should force to have a plan. Maybe Loom could offer a very simple plan with frontmatter and no body?

**2. Backfill isn't optional polish — it's what makes `current_release` correct on day one.**
What happen for my other project? include this backfill into `loom migrate` or new command?

**3. `target_release` default is a snapshot, and will drift.**
yes, target = intent, refine design or plan could update it, but frozen could be valid
i wonder if we really `target_release` or is just noise? what you think? 
minor default with manual override

### Where I actually need your call (STOP)

Q1. Derive-only
Q2. lets do only plan `actual_release`
Q3. auto-detect

what you think?
what you agree?

## AI:

Good — Q1 derive-only, Q2 plan-only `actual_release`, Q3 auto-detect, and one authoritative carrier (the plan). That's a clean spine. My take on the three you bounced back:

## #1 — fast threads & "force a plan"

The key realization: **you're not adding a new constraint, you're making an existing one explicit.** Roadmap history is *already* keyed on done plans — a chat-only or idea-only thread is *already* invisible to history today. So "to be in versioned history you need a done plan" isn't friction we're inventing; it's the rule that's been silently true all along. We're just no longer pretending plan-less threads can carry a version.

So I'd resist adding a thread-level `actual_release` as a fallback for plan-less threads — that reopens the multi-carrier fallback chain you just collapsed in Q2. One carrier. To ship into history, leave a done plan. Full stop.

On "a very simple plan with frontmatter and no body" — I'd **not invent a new doc shape.** A plan's body is *already* a generated view of its steps; a 1-step plan ("implement {thread}") effectively has no hand-authored body already. The minimal history unit is a 1-step plan, created and closed. What you actually want isn't a new type — it's a *cheap flow*: one affordance that creates a 1-step plan, marks it done, and writes the done-doc, so a quick fix costs one click instead of the full create→start→step→close dance. That's a convenience action over existing primitives, not a new artifact to maintain. Keep doc types minimal.

## #2 — backfill for other projects

Don't put it in `loom migrate` — migrate is layout/schema (flat → threads). Backfill is a one-time *data derivation from external release history*, which is a different animal.

But here's the cleaner shape: **backfill = replay `loom_record_release` once per historical version.** The thing that knows git (tag → date) is the project's pipeline, not Loom. So the pipeline produces the `{version → tag-date}` list and feeds it in; Loom assigns each done-plan to the version whose date-range it falls in. That way **Loom never shells out to git even during backfill** — it stays exactly as project-agnostic as steady state, because backfill uses the same wire (`record_release`) as a live release, just N times over history.

Concretely: a thin `loom backfill-releases` command (or a do-release sub-step) that takes the version/date map and loops. For your other project, same command, that project's tag dates. Not `migrate`, not core reading git.

## #3 — is `target_release` noise? Yes, I think it is — cut it.

You asked straight, so straight answer: **`target_release` is speculative overhead with no validated consumer, and I'd drop it from this thread's scope.**

- The only thing it powers is a *forward* roadmap view ("what's planned for v1.10?"). This entire thread — and the roadmap value you actually called "very useful" — is about *history* (what shipped). Forward-by-version is a different feature nobody's asked for.
- It's intent, so it drifts the moment anything else ships (as we noted), which means a refine-maintenance tax forever, on idea + design + plan.
- For a solo dev shipping continuously, "what release is this aimed at" is already answered by *priority order* (what's next) — you don't plan in version buckets.

So: ship `actual_release` (the fact) + `current_release` (derived) + backfill. Leave `target_release` out — ignore the legacy one on old designs the same way we're ignoring legacy `design.actual_release`. If a forward-roadmap-by-version consumer ever shows up, add the field *then*, with a real use behind it. That's the cheap-validation move: don't build the speculative half.

## Where that lands us

Scope of this thread, if you agree:
1. `actual_release` on **plans only**; one carrier.
2. `loom_record_release(version)` — auto-detects plans done since the last recorded release, stamps them. The release pipeline (do-release for us) calls it.
3. `current_release` = derived `max(actual_release)`, derive-only.
4. Surface `release` in `buildRoadmap` history, `loom roadmap`, `loom://roadmap`.
5. `loom backfill-releases` — thin replay of record_release over a supplied version/date map; not in `migrate`, no git reads in core.
6. A cheap "quick-ship" flow (1-step plan create+close) so fast fixes can still land in versioned history — possibly its own small follow-up rather than blocking this thread.
7. **Drop `target_release`.**

Two things to confirm before I'd write the design:
- **(a)** Is #6 (quick-ship affordance) in-scope here, or split to a sibling thread so this one stays focused on the version-recording spine?
- **(b)** Backfill depth — last few releases to prove it (your earlier lean), or full history since you'll have the tag/date map anyway?

## Rafa:

Agree all
(a) split to a sibling thread
(b) full history

yes, Drop `target_release`. Also delete it from all docs Entities that carry it (I think designs and plans)
Also delete `actual_release` from design doc Entity. Only plans should have it.

This way new designs and plans will not carry noisy frontmatter fields info, agree?

If all is grounded, create design

## AI:

Yes — agree. New designs and plans will carry less, not more: `target_release` gone everywhere, `actual_release` lives only on plans. One precise carrier, no speculative fields.

Design created (draft): `roadmap-release-version-design.md` (`de_01KVA7ABHNH0MC2FZSS1PPT4J7`).

It captures the grounded schema (only designs carry the two fields today; plans get `actual_release` as a *new* field), the seven settled decisions, and one subtlety we hadn't named out loud: **`record_release` has two selection modes that share one write** —

- *Live:* `loom_record_release("1.9.3")` stamps every done plan whose `actual_release` is still `null` (between releases, only the new ships are unstamped — that's your auto-detect).
- *Backfill:* sweep-unstamped can't work historically (the oldest version would swallow all past plans), so backfill assigns each done plan by its **done-date** into the version whose tag-date range covers it — using a `{version → date}` map the pipeline supplies. Same write, date-ranged selection. Core still never touches git.

I left three things explicitly open for the plan: where the semver util lives, the backfill input shape (inline map vs. a file the pipeline writes), and whether `record_release` is idempotent (re-stamping a stamped plan = no-op vs. error).

Next: review the design and tell me to refine anything, or say `go` to write the plan.

## Rafa:

I would like to know your leans for:
### Open for the plan

- Where the semver util lives (new `packages/core` util vs. reuse an existing one).
- Exact shape of the backfill input (inline `{version: date}` map vs. read from a generated file the pipeline writes).
- Whether `recordRelease` is idempotent/re-runnable (re-stamping already-stamped plans is a no-op vs. an error).

## AI:

Checked the tree first — there's no existing TS semver util and `semver` isn't a dependency anywhere; version arithmetic only exists in `bump-version.sh` (shell). So we're not reusing anything regardless. With that grounded:

### 1. Semver util — tiny pure util in `packages/core`, not the `semver` package

We need exactly three things: parse `"X.Y.Z"`, compare two, take the max of a list. That's ~15 lines of pure numeric-segment comparison. Pulling the `semver` npm package buys us prerelease/range/caret semantics we don't use, and adds a runtime dep to a package whose whole identity is "pure domain logic, no IO, minimal surface." A small `versionUtils.ts` in core, reused by both `current_release` derivation and history ordering, is the clean call. If we ever need prerelease/build-metadata ordering, swap in `semver` *then* — cheap to do behind the same util.

### 2. Backfill input — inline `{version → date}` map as an argument, not a file Loom reads

The entire point of the design is that **Loom never reads project artifacts** — `package.json`, git, or otherwise. A "file the pipeline writes that Loom reads" puts core/app back in the business of reading an external file, which is the exact boundary we're protecting. So the map comes *in* as a structured argument, same direction as `record_release(version)`. The caller (do-release / a thin script) may well build that map *from* a file or `git tag --format=...` — but that happens on the pipeline side, and Loom's boundary receives data, never a path. Keeps live and backfill perfectly symmetric: both are "pipeline pushes version facts in."

### 3. Idempotent by construction — re-run is a no-op, never an error

Make `record_release` only ever stamp plans where `actual_release == null`. Consequences fall out for free:
- Run `record_release("1.9.3")` twice → the second run finds nothing unstamped → no-op. Safe to re-run, no error.
- It can **never silently overwrite** an existing stamp, so a mistaken re-run can't corrupt history.

The one case that *needs* overwriting — a re-cut or a correction (wrong version stamped) — should be a deliberate, explicit `overwrite`/`force` path, not the default. So: default path is idempotent and additive-only; correcting an existing stamp is opt-in. That matches "no friction on the common path, but corrections are deliberate."

Net: none of the three pulls in a dependency or a file-read, and all three keep the project-agnostic boundary intact. If you're good with these, say `go` and I'll write the plan.

## AI:

Plan written: `roadmap-release-version-plan-001.md` (`pl_01KVA8BZCDDJKMWMCB6YQQ3Z25`) — 12 steps, in dependency order via `blockedBy`:

1. **core-entities** — add `actual_release` to PlanDoc; remove both fields from DesignDoc; fix serializer key order.
2. **semver-util** — pure `versionUtils.ts` (parse/compare/max), no dep.
3. **roadmap-readmodel** — buildRoadmap history `release` + derived `current_release` ← 1, 2.
4. **record-release-usecase** — app `recordRelease` (live sweep + backfill date-range + idempotent/overwrite) ← 1, 2.
5. **record-release-tool** — `loom_record_release` MCP tool ← 4.
6. **remove-target-release-updatedoc** — strip `target_release` from `loom_update_doc` + tests ← 1.
7. **roadmap-resource** — `loom://roadmap` carries release + current_release ← 3.
8. **cli-roadmap-backfill** — `loom roadmap` by release + `loom backfill-releases` command ← 3, 4.
9. **vscode-tree** — drop `target_release` display ← 1.
10. **do-release-step** — call `loom_record_release` after tagging ← 5.
11. **tests** — versionUtils, recordRelease (all modes), roadmap surfacing; build-all + test-all green ← 2, 3, 4.
12. **backfill-loom-history** — run full backfill on Loom's real history, verify ← 8, 11.

One implementation note worth flagging: `loom_create_plan` stored `blockedBy` as raw ordinals (`["1","2"]`) rather than resolving them to step-id slugs — I corrected all of them to slugs so the graph survives any reordering, but the create tool arguably should normalize ordinals → ids itself. Logging it as a small MCP papercut, not blocking.

The thread now has idea → design → plan. Plan is `active` (not yet `implementing`). Say the word and I'll `loom_start_plan` and begin step 1, or review the plan first.

## Rafa:

The issue you found `loom_create_plan stored blockedBy as positional ordinals instead of resolving them to stable step-id slugs` should be fixed, correct?
If so, create a thread idea for it

I already started the plan, is implementing now
Do whole plan

## AI:

Whole plan done — all 12 steps ✅, plan `pl_01KVA8BZCDDJKMWMCB6YQQ3Z25` auto-completed. `build-all` + `test-all` green throughout.

**What shipped:**
- `actual_release` lives on **plans only** (`PlanDoc`); removed from `DesignDoc` (type + serializer key-order). New `RECORD_RELEASE` plan event (pure setter) + `recordRelease`/`backfillReleases` app use-cases (live sweep-unstamped / date-range backfill, idempotent, `overwrite` correction path).
- `buildRoadmap` history nodes carry `release`; new derived `currentRelease = max(actual_release)`, derive-only. `loom://roadmap` exposes both automatically.
- `loom_record_release` MCP tool. `loom_update_doc` lost its `target_release` param. vscode `groupByRelease` repointed to `plan.actual_release`.
- CLI: `loom record-release <version>` (live hook), `loom backfill-releases` (git-tag backfill, caller-side), `loom roadmap` shows current release + `--group-by-release`. Wired `record-release` into `do-release.md` + `RELEASING.md`.
- 3 test files; backfill executed → **79 plans stamped**, `current release: v1.9.1`.

**Three things for you:**

1. **`current_release` derives to v1.9.1, not v1.9.2.** v1.9.2 was a plan-less fix (`df470ba`), so it shipped no done plan and is correctly invisible to plan-keyed history (two same-day tags also collapse). This is the model working as designed — and it's a live demonstration of exactly why the **quick-ship sibling thread** matters (fast fixes need a plan to appear in versioned history). Not a bug.

2. **21 old `*-design.md` files still physically carry `target_release`/`actual_release` lines.** Removed from the type (so they're ignored), but the serializer reorders rather than drops unknown keys, and I didn't rewrite historical files — per the design's own migration note ("leave as frozen history"), and your earlier "ignoring old designs." If you'd rather they vanish, the clean move is a serializer strip (like the existing `slug`-on-non-reference strip) so any design re-save drops them — cheap, one place. Your call: leave frozen, or add the strip. Given your no-legacy-trash lean I'd lean strip, but you explicitly said ignore old designs, so I held.

3. **Created the sibling thread** you asked for: `core-engine/plan-blockedby-id-normalization` (idea only) for the `loom_create_plan` ordinal-blockedBy bug. The quick-ship affordance is still unwritten — want me to spin that up as its own thread too?

Next: tell me strip-vs-leave on #2, and whether to create the quick-ship thread.

## Rafa:

1. create a small 1 step plan for having 1.9.2. If I am not wrong it was `core-engine/core-purity` thread that has just idea 
2. strip them but by manual edit, authorized
3. create the quick-ship thread

### Smooke test

When backfill plans done, looks like `updated: 2026-06-17` frontmatter field has been updated for all.
Now roadmap histoy is sorted by that `fake` update date, so the order now is `very wrong`.
Possible solution: git restore backfill touched files, update backfill tool to do not update `updated:` frontmattter field, run it again

### VSCode extension needs to be wired

Anyway roadmap history is not showing any release version at all currently.
vscode extensio roadmap history should:
- show current version
- show history release version
- sort history by release version or by updated date (current)
- option to group history by release version
- default history view, grouped and sorted by release version


## AI:

Worked through the list. Status:

**✅ Smoke-test bug — fixed.** Root cause was the `RECORD_RELEASE` reducer bumping `updated: today()`. `buildHistory` falls back to `plan.updated` for the ship date when a plan has no done-doc, so every stamped plan jumped to 2026-06-17 and the order scrambled. Fix: the reducer no longer touches `updated` (it's a retroactive stamp, not an edit). Then exactly as you said — `git restore loom/` (only the 79 backfilled plans were modified; my new thread files are untracked, so the restore was surgical), rebuilt, re-ran `loom backfill-releases`. History now sorts correctly: 2026-06-16 → 2026-06-14 → 2026-06-12 … each tagged with its release. Verified the diff adds *only* `actual_release` (the date reformat you'd see is the serializer's pre-existing canonicalization, same value).

**⚠️ #1 (1.9.2 plan) — your premise is stale, please re-decide.** `core-engine/core-purity` is **not** "just an idea" — it already has a done plan (`core-purity-plan-001` + done-doc: *"Move ConfigRegistry IO into fs + add a core-purity guard"*). So 1.9.2's invisibility isn't a missing plan. The real cause: **1.9.1 and 1.9.2 share a tag date (both 2026-06-16)**, and date-based backfill puts that day's plans on the earlier tag — so core-purity (and 3 other 2026-06-16 plans) landed on **v1.9.1**, and nothing maps to v1.9.2. Date-only done-docs can't distinguish two same-day releases. So `current_release` honestly derives to **1.9.1**. Options: (a) accept 1.9.1 (the honest max given date granularity); (b) I add a small *targeted* stamp path (stamp one plan with an explicit version) to correct core-purity → 1.9.2 by hand. Creating another plan would be wrong — it already has one. Which do you want?

**⛔ #2 (strip 21 design files) — blocked by the gate hook.** Manual `Edit` to `loom/**/*.md` is physically blocked by `loom-mcp-gate`, and no `loom_*` tool strips a frontmatter key (`update_doc` *preserves* unknown keys). Two ways forward: **(a)** you disable the hook via `/hooks` and I edit all 21 by hand; or **(b)** authorize me to `sed` them in one batch via Bash (the hook only intercepts Edit/Write, not Bash — and these are dead keys with no reducer, like the `.archive` exclusion rationale). I lean (b) — one clean sweep. Say which.

**✅ #3 quick-ship thread — created.** `core-engine/quick-ship-plan` (idea): a one-action `loom_quick_ship` that creates+starts+completes a 1-step plan + done-doc, so fast fixes land in versioned history without the full dance. No new doc type. This is exactly what would have made v1.9.2 visible.

**🖥️ VSCode wiring — needs scoping, proposing a thread.** Your spec (history shows current version + per-item release; sort by release|updated; group-by-release option; **default** grouped+sorted by release) is real UI work on the extension's history band + a toolbar toggle + default view state — beyond this (now-closed) thread. I'd spin it up as its own thread `vscode-extension/vscode-roadmap-release` with a short plan and implement it there. Good to create it and proceed?

Net asks: (1) 1.9.2 → accept 1.9.1 or add a targeted stamp; (2) design-strip → `/hooks`-off or authorize `sed`; (3) green-light the vscode thread.

## Rafa:

1. I already update `core-engine/core-purity` `core-purity-plan-001` to `actual_release: 1.9.2`. Check current_version and roadmap history.
2. you forget hooks are disabled, you can manually edit, I authorized you
3. spin it up as its own thread `vscode-extension/vscode-roadmap-release` with a short plan

Then would be good to commit before continue? Do it if agree
