---
type: chat
id: ch_01KXFFWDN6TM7TFVC90HM9ZE1M
title: release-notes-report Chat 001
status: done
created: 2026-07-14
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 25
---
# release-notes-report Chat 001

## Rafa:

let's talk through fork #1 (git-spine vs graph-sourced vs hybrid) 
my lean is hybrid, using also roadmap history `unversioned` done plans
we added descriptive title params to loom_quick_ship and quick ship also generate done docs, correct, we can use this to include release notes even for small fixes/coding/docs updates

also remind this release-notes report is project agnostic

what do you think?

just to take note: I am thinking about new kind of reports based on the doc graph history past but focusing in future, proposing future ideas, improvements

## AI:

Strong lean, and I'd back it — but let me sharpen the part that actually resolves the fork.

**Hybrid, but be precise about which side is the spine.** The idea doc framed hybrid as "git log for completeness, graph for the *why*." Your `unversioned done plans` insight flips that into something cleaner: **the graph is the spine, git log is the completeness net** — not the other way around.

- **Spine = unversioned done plans.** A done plan with no `actual_release` yet *is* this release's contents, by definition. That's not a heuristic — it's the exact set `record-release` stamps at the end of the run. So the report selects precisely what the release will stamp: draft-set and stamp-set are the *same set*. That kills the §2 chicken-and-egg outright. We never select by the not-yet-written `actual_release`; we select by its **absence**, which is a fact that already exists at draft time.
- This is strictly better than the `--since <last-tag>` date window the idea doc reached for. A date window is fragile at tag boundaries (done-before-tag/released-after, backfilled dates, timezones). "Unversioned" is exact — and it's already a bucket the roadmap computes (`loom://roadmap` splits shipped vs unversioned done). So the report reuses roadmap's own split instead of inventing date math.
- **git log = the net, not the source.** Its only remaining job: catch user-facing changes that shipped with *no* done plan (raw `chore:`/`docs:` commits, a typo straight to main). If the graph draft already covers everything, git log adds nothing; if there's a gap, we learn exactly where the graph is thin. That *is* the honest-dogfooding test the idea wants.

**quick_ship closes most of the gap you're pointing at.** Right — `loom_quick_ship` now takes a descriptive title and lands a real done plan+doc, so small fixes/coding/docs land as *unversioned done plans* too and get swept in for free. That shrinks "not every change has a done doc" from a structural hole to a residue (only truly ceremony-free commits escape). Which is exactly why git log can be a thin net rather than the spine.

**Project-agnostic — the reminder cuts a clean seam.** Keep two things apart:
- The **`release-notes` report kind** (select = unversioned done plans, framing from done-doc rationale) is generic — every Loom workspace has done plans and an `actual_release` field. That logic is a reports-engine capability (conceptually `doc-graph-reports`), no Loom specifics.
- The **`do-release` skill** wiring is our repo's runbook and *may* be Loom-specific. So: repo-specific skill invokes a generic report. Nothing about lockstep versioning or our package layout leaks into the kind.

**One risk to log:** if a prior release ever failed to stamp (the tag-push gotcha we've hit), its done plans stay unversioned and would leak into the *next* release's notes. The human-review gate catches it, but I'd add a cheap guardrail — flag unversioned dones whose completion date predates the previous tag. Not blocking; just a sanity line.

**Your future-report idea:** noted, and I think it's a genuinely *separate kind*. Retrospective reports say *what happened*; a "forward" report would mine the graph's *open* material — deferred "Open questions" sections, blocked steps, stale docs, unpursued idea branches — to propose next work. Different selection, different output. I'd give it its own thread under `doc-graph-reports` rather than fold it in here; happy to spin up that idea when you want.

**To close fork #1, one call to make:** do we commit to **select-by-unversioned** as the spine (my recommendation) with git log purely as the coverage net — no date math at all — or keep a date-window fallback alongside it? I'd go pure unversioned + git-log net. But that's the architectural decision, so I'll stop here for your read.

## Rafa:

pure unversioned + git-log net, no date math
if it is all grounded write design
spin up, thread + idea for future-report

## AI:

Locked. Fork #1 = **pure unversioned + git-log net, no date math.** Both docs written:

**1. Design — `release-notes-report/design.md`** (draft). It's grounded in the actual code, and the happy surprise is how *little* is left to build:
- The `release-notes` kind already exists (`reportKinds.ts:77`) as a roadmap-passthrough that buckets release==null work under **"Unreleased"** — and `buildHistory` (`derived.ts:316`) already stamps every done plan with `release: actual_release ?? null`. So the **unversioned-done spine is already computed by the roadmap**. This thread is *framing + wiring*, not a new selector.
- Architecture: do-release runs the report inline (in-session) → takes the Unreleased section → git-log net catches any change with no covering done plan (appendix) → assemble A/C/F → **existing human-review STOP unchanged** → bump/tag/push → record-release stamps the set.
- Project-agnostic seam held: generic `release-notes` kind, repo-specific `do-release` skill invokes it.

I left **three sub-decisions** in the design for your read rather than silently picking:
1. **Framing source** — plan-titles default (cheap; quick_ship titles are good enough) vs done-body enrichment behind the `full` flag. My rec: titles default, enrichment opt-in.
2. **git-log net** — inline appendix in the draft (rec) vs separate pre-check.
3. **Kind hardening** — extend `release-notes`' framing in place (rec) vs a mode param.

**2. Future-report — new thread `ai-integration/future-report` + idea** (draft). Framed as the *prospective* counterpart to the retrospective kinds: mines the graph's open seam (deferred "Open questions", blocked steps, stale docs, unpursued idea branches, roadmap `future`) to **propose next work**. Kept project-agnostic, parked its own design forks (new kind vs mode, derived-slice selection, ranking).

**Next:** your call on the three design sub-decisions above — or `finalize` the design if they read right and you want to move to a plan.

## Rafa:

three sub-decisions: I agree with your leans, settle the design
note: we can dogfood the report in this repo and also in Chord Flow `J:/src/chord-flow` that also have a `do-release` similar skill, so you could update it to use this feature also, include it in the plan

if it is all grounded, write plan

## AI:

Design settled (now `active`) and **plan-001** written.

**Design — three decisions locked**, with one grounding correction I want to flag: I'd loosely said "enrichment behind the `full` flag," but `full` only applies to doc-set kinds — `release-notes` is roadmap-passthrough (`docTypes: []`, and `report-selection.test.ts` #11 asserts it stays empty). So the settled shape is cleaner:
1. **Titles by default** — kind stays passthrough; A/C/F classified from plan titles. Optional per-change rationale is a *do-release-skill* concern (read the few unreleased done docs inline), never a change to the kind. Contract + test preserved.
2. **git-log net = inline appendix** in the reviewed draft.
3. **Extend `release-notes`' framing in place** — sub-structure each version group (incl. "Unreleased") as A/C/F. No new kind, no mode param; the standalone report benefits too.

Also folded **Chord Flow** in as a second dogfood target: generic kind + per-repo skill means the feature lands in both `loom` and `J:/src/chord-flow`. Chord Flow gets the A/C/F framing once it upgrades to a loom carrying the hardened kind (skill edit is independent).

**plan-001 — 5 steps, sequential chain:**
1. Harden `release-notes` framing (A/C/F in place) + test — `packages/core/src/reportKinds.ts`, `tests/report-selection.test.ts`
2. Rewire this-repo `do-release` to graph-draft the Unreleased set — `.claude/commands/do-release.md`, `RELEASING.md`
3. git-log coverage net + stale-unversioned guardrail — `.claude/commands/do-release.md`
4. Mirror into Chord Flow's `do-release` — `J:/src/chord-flow/.claude/commands/do-release.md`
5. build-all + test-all + dry-run the draft (no bump) for review

**Next:** `start plan` + `do step 1` when you want me to implement — or tell me if the step breakdown needs a change first.

## Rafa:

So we get everything from done plan titles, framing — Added / Changed / Fixed, and descriptions.
We are not including any enrichment, you mentioned enrichment as an opt-in.
Before going forward I would like to know:
- why you did not include any enrich option, do you think it will not be needed?
- how we could enrich this report to be more curated, appealing? via inference, skill?

## AI:

Fair challenge — you caught a real weakness in my "titles default." Let me be precise and honest.

**First, a correction: the passthrough gives titles *only*, not descriptions.** The roadmap slice (`buildHistory`) carries per-plan `{ planId, planTitle, threadSlug, date, release }` — no goal, no done-doc body. So "titles-only" is genuinely thin: the agent would write A/C/F bullets from ~5-word engineering titles and nothing else.

**Why I made it opt-in — and why that was probably wrong.** I optimized for token cost and for not breaking the kind's passthrough contract. But that undercuts the idea's *own thesis*: the whole reason to source from the graph instead of `git log` was that **done docs carry rationale a one-line subject doesn't**. Defaulting to titles throws exactly that away. So — do I think enrichment won't be needed? **No. I think it's needed by default.** An engineering title ("Wire do-release to draft from the graph") isn't a user-facing note ("Release notes are now drafted automatically from your project's history"). That reframing *is* the enrichment, and a curated/appealing changelog can't happen without it.

My actual mistake was treating cost as the deciding factor. The cost here is **bounded**: one release = a handful of unreleased done plans (~3–20), not a bulk report. Reading those bodies once per release is cheap. The cost you care about is *repeated / large* report generation — this isn't that.

**How to enrich — via skill *and* inference; they're one pipeline, not a choice:**
- **Selection stays in the kind** (its authority): the roadmap-passthrough says *which* plans are Unreleased, in order, with the version structure. Untouched.
- **The skill hydrates**: do-release already gets the unreleased plan ids from the report, so it reads *those* done-doc bodies inline (bounded set). Kind contract + `docTypes: []` test preserved, no engine change.
- **Inference curates**: do-release runs in a live Claude agent (no API key, no sampling — the primary path), so synthesis is infra-free. Feed it title + done-body per change with framing that says *reframe into user-benefit language, group by theme, lead with headline features, drop internal noise*. The human-review gate does final polish.

That's also the cleanest vision hook: the AI **rereads its own implementation notes at release time** and turns them into the changelog — "as stateful as it can be via durable docs it rereads."

**Appeal levers** (framing, not code): user-benefit voice over engineering-changelog; group related changes; a short **Highlights** lead above Added/Changed/Fixed; consistent tense. All live in the promptFraming + the skill's synthesis instructions.

**Revised recommendation:** make **done-body enrichment the default** for the do-release draft (skill-side hydration + inference), with titles-only as a cheap fallback flag. If you agree, I'll update the design (§3 + Decisions) and plan steps 2–3 to hydrate the unreleased dones and carry the curation framing.

Stopping here for your call before I touch the design or plan.

## Rafa:

update both: design and plan

## AI:

Both updated to make **done-body enrichment the default**.

**Design** (`design.md`, now v5) — §3 rewritten as a **two-layer pipeline**, plus Decisions #1 and the architecture sketch:
- **Structure (kind, generic)** — `release-notes` stays roadmap-passthrough; its framing owns the *shape*: A/C/F per version group, user-benefit voice, group-by-theme, a short **Highlights** lead. Passthrough contract + `report-selection` test intact.
- **Enrichment (skill, default)** — do-release hydrates the Unreleased plans' done-doc bodies inline (bounded, ~3–20 dones/release) and feeds title+body to synthesis. The vision hook: the AI rereads its own implementation notes at release time.
- **Inference (skill, free)** — live Claude agent curates; human gate polishes.
- Titles-only demoted to a **cheap fallback flag**.

**Plan** (`plan-001`) — steps 1–2 amended:
- **Step 1** now adds user-benefit voice + group-by-theme + Highlights lead to the kind framing (and asserts them in the test).
- **Step 2** now hydrates each Unreleased plan's done-body by default and curates title+body → A/C/F + Highlights, with the titles-only fallback.
- Steps 3 (git-log net + guardrail), 4 (Chord Flow mirror), 5 (build/test/dry-run) unchanged.

One note: `plan-001` came up at status `implementing` already, so `do step 1` is ready whenever — no `start plan` needed.

**Next:** `do step 1` to implement, or more discussion first.

## Rafa:

I started the plan
do plan

## AI:

**`plan-001` done — all 5 steps ✅** (auto-completed).

- **1 — kind framing** (`packages/core/src/reportKinds.ts`): `release-notes` now sub-structures each version as `### Added`/`### Changed`/`### Fixed` with a **Highlights** lead + benefit voice; stays roadmap-passthrough. Test 11b added + green.
- **2 — this-repo `do-release`** (`.claude/commands/do-release.md`, `RELEASING.md`): drafts from `loom://roadmap` `release: null` set, **done-body enrichment on by default**, titles-only fallback; git log demoted to coverage net.
- **3 — coverage net + guardrail**: "Not covered by a done plan" appendix + stale-leak warning.
- **4 — Chord Flow** (`J:/src/chord-flow/.claude/commands/do-release.md`): same wiring, adapted to its single-artifact shape + the version-caveat note.
- **5 — build + test + dry-run**: `build-all` green; `test-all` **23/23**; `report-selection` 11b green.

**Dry-run finding (honest):** the *current* Unreleased set is **empty** — everything is stamped through `1.24.0` and plan-001 is still fresh, so the live draft correctly renders nothing. Selection works; it just has nothing to show right now. To exercise the rendering I simulated the draft over the last shipped set (**v1.24.0**):

---
## [Unreleased]

**Highlights:** Doc-graph **Reports** arrive as a first-class feature — generate project, architecture, decisions, release-notes and more straight from your Loom graph, in both the CLI and the extension tree. Plus a lighter **Loom slang** context model and readable quick-ship titles.

### Added
- **Reports generated from your doc graph** — project-overview, architecture, decisions, drift-audit, ideas/designs/plans/shipped, and release-notes, across weaves/threads with weave/thread/date filters.
- **Reports in the VS Code tree** — a Reports node with one-click generate, and always-visible Reports/Refs/Context nodes so the surfaces are discoverable even when empty.
- **Token-budgeted report slices** — large reports degrade gracefully (full → summary → reference) with selectable keep-full ordering, so a report never blows the context window.

### Changed
- **Cheaper context via Loom slang** — pointed context splits into `load` (heavy, once per thread) vs `read`/`reply` (doc-only); you pay the full bundle once, then follow-ups stay light.
- **Quick-ship takes a descriptive title** — fast fixes land in history with a real name, not a generic stub.
---

That's benefit-voice, A/C/F + Highlights, empty buckets omitted, valid `## [Unreleased]` markdown → GitHub-release-body compatible. (Full enrichment would read each plan's done-body for sharper wording; this sim used titles + Highlights.)

One caveat logged in the done doc: the session's live `loom mcp` predates the rebuild, so an MCP `report release-notes` call would still show the *old* flat framing until a session/MCP restart — the built dist (what do-release's inline synthesis actually reads) already has the new framing, and the dist-importing test proves it.

Nothing committed (you didn't ask) — the tree has this thread's docs + the code/skill edits + the Chord Flow edit staged for whenever you want.

**Next:** say `commit` to land it (I'll commit the loom repo; Chord Flow's edit is a separate repo, commit there separately), or tell me what to adjust.

## Rafa:

mcp reconnected
Are you happy with the simulation and the results?
I am going to implement another thread in another session and will comeback here to test, commit and release, ok?

## AI:

Honest answer: **happy with the design, but I won't oversell the results — the thing that actually matters is still unproven.**

What I'm genuinely happy with:
- The architecture held up under implementation with zero friction — kind owns structure, skill owns enrichment, inference curates. The seam we argued about stayed clean.
- The unversioned-done selection is the strongest part: `release: null` reuses `buildHistory`, no new selector, no date math. It fell out of machinery that already existed.
- Build + 23/23 tests green.

Where I'd temper it — you should know this before relying on it:
- **The dry-run didn't exercise the real path.** The current unreleased set was empty, so I *hand-simulated* over v1.24.0 from titles. That shows what the output *can* look like; it does **not** prove the wired path produces it.
- **Enrichment — the thing we spent two turns deciding was essential — has never actually run.** The sim used titles only. Reading done-bodies and curating from them is the whole value proposition, and it's still at zero validation. The release was feature-heavy so `Fixed` came out empty too — A/C/F classification on a *mixed* release is untested.
- Skill edits are instructions to a future agent; nothing unit-tests that the do-release agent follows them. Only a live run does.

So your plan is **exactly the right validation**, and it's the cheap kind: implement your next thread → it produces real unreleased done plans → come back and run `do-release` for real. That live run is the first true test of selection + done-body enrichment + A/C/F over genuine content — the honest-dogfooding moment the idea was about. And the MCP reconnect means the live server now carries the new framing, so nothing's stale when you return.

One flag for the return: these changes are uncommitted, so the eventual `release:` commit would fold this feature in with your next thread's work. That's fine (it ships in that release), but if you'd rather it be a clean standalone commit, tell me to `commit` it separately first — do-release step 5 also asks about folding pending edits.

Go build the other thread. I'll be here to test → commit → release when you're back. 👍

## AI:

Committing the feature to `main` (loom repo) as one unit:
- `packages/core/src/reportKinds.ts` framing + `report-selection` test 11b
- `.claude/commands/do-release.md` + `RELEASING.md` graph-draft wiring
- this thread's `design.md`, `plan-001` (done), done doc, and chats
- new `ai-integration/future-report` thread + idea
- your `idea.md` `draft → done` flip — left as-is, folded in (not reverted)

**Chord Flow's `do-release.md` edit is in that separate repo** — commit it there when you release Chord Flow; it's not in this commit. Committing as the last action of this turn so the chat doesn't re-dirty itself.

## Rafa:

do-release do non-empty unreleased set + done-body by default and fallback to titles?

## AI:

Yes to all three — that's exactly what step 2 wires. Verbatim from the committed `do-release.md`:

- **Non-empty unreleased set** — *"Invoke the `release-notes` report inline … over the **Unreleased** set — `loom://roadmap` `history` where `release: null`."* Selection is the `release: null` plans (what `record-release` will stamp).
- **Done-body enrichment by default** — *"**Enrichment (default):** read each Unreleased plan's **done doc** … curate `title + done-body` into user-facing outcomes in a benefit voice."*
- **Titles-only fallback** — *"Skip the done-doc read only for a fast, low-token draft (**titles-only fallback**)."*

So: default = graph selection + done-body enrichment + curated A/C/F; fallback = titles-only.

**One honest gap** (and it's the state right now): the skill *assumes* the unreleased set is non-empty — there's no explicit "if `release: null` set is empty, say so" branch. When you come back with real shipped-but-unstamped plans, it's a non-issue. But if `do-release` ever runs with everything already stamped (like this moment), the graph draft is empty and only the git-log coverage net fires — which would look like "nothing to release" with a pile of uncovered commits. Worth one line in the skill: *if the Unreleased set is empty, flag it and fall back to the git-log net (or stop — likely you forgot to close/quick-ship the work).*

Want me to add that empty-set guard now, or leave it for the live run to shake out?

## Rafa:

Yes, I think we should add that one line in the skill: *if the Unreleased set is empty, flag it and fall back to the git-log net (or stop — likely you forgot to close/quick-ship the work).*

I lean to stop, and you?
- is possible to detect and inform about user forgot to close/quick-ship the work?
- maybe user run do-release by mistake with nothing done yet
- maybe git-log shows nothing

## AI:

Agreed — **stop**, and I'd sharpen it: *stop-and-diagnose*, never a silent git-log fallback. Auto-drafting from `git log` when the graph set is empty would undo the whole feature and, worse, hide the real problem (unrecorded work). So we're aligned on stop; the value is in *why* it stopped.

Your three cases map to a clean two-branch diagnosis, and yes — the "forgot to close/quick-ship" case is detectable. Three independent tells (any one fires it), and your unstaged-files point is the strongest:
1. `git log <lastTag>..HEAD` has user-facing commits, **or**
2. `loom://roadmap` shows threads still `implementing` (started, never closed), **or**
3. **working tree is dirty** (`git status` — uncommitted changes / pending done docs) ← your addition; catches work that isn't even committed yet.

Empty unreleased set **+ any of those** = "you shipped but didn't record it → `close` / `quick ship` / commit, then re-run." Empty set **and** all three clean = genuinely nothing → stop, "nothing to release" (ran by mistake).

Added to step 2 of both `do-release.md` files (this repo + Chord Flow):

> **Empty-set guard — check this first.** If the Unreleased set (`release: null`) is empty, do **not** draft — **STOP** and diagnose; never silently fall back to `git log`:
> - **Work shipped but not recorded** — if `git log` has user-facing commits, roadmap shows threads still `implementing`, or the working tree is dirty → name them, tell the user to close/quick-ship/commit, re-run.
> - **Genuinely nothing to release** — Unreleased set *and* `git log` both empty → stop, nothing to release.

Meta note: this edit leaves the tree dirty — which is *exactly* what tell #3 now flags. Want me to `commit` it (small follow-up to the feature), or leave it for the next commit when you're back? Chord Flow's copy is uncommitted in its own repo.

## Rafa:

Before commit
I see a little problem, we put all the logic, guards and workflow in the skill do-release
But if we want all loom projects take advantege of loom release-report, maybe this logic info should be showed in the report itself so the user can use it in his release CI.
What do you think?

## AI:

You're right, and it's the sharpest critique of the whole thread. Let me name it precisely: we shipped the **framing** generically (the kind, in the package) but left the **workflow** — selection, enrichment, the guards, the coverage net — as prose in a **per-repo skill**. So a downstream Loom user gets the A/C/F shape for free but has to *reinvent the whole procedure* to actually use it. The feature only half-ships. That contradicts the project-agnostic goal we wrote into the design.

**The fix: push the generic logic down into the Loom surface, keep only the repo-specific bits in the skill.** Split by what's actually generic vs local:

- **Generic → belongs in the report capability (ships to everyone):** select the `release: null` set · hydrate done-doc bodies (enrichment default, titles fallback) · A/C/F + Highlights framing · the *doc-graph* half of the empty-set guard (no unreleased plans / threads still `implementing`). All pure doc-graph — no reason it lives in our skill.
- **Repo-specific → stays in the per-repo skill:** where the changelog file is (CHANGELOG.md vs csproj vs the vscode dual-changelog) · bump script · tag/push · CI job names.
- **Git-process, in between:** the `git log` coverage net + dirty-tree tell touch git, not the doc graph — so they belong to a *release* wrapper, not the pure report engine.

**Which surface?** Depends on the consumer, and there are two:
- **Agents** (like me driving do-release) → an MCP prompt. The existing `report` prompt already assembles the release-notes slice; we'd extend its release-notes path to also do enrichment + the doc-graph guard.
- **CI** (your actual ask — "use it in his release CI") → a **CLI command**. CI isn't an agent; it runs commands. `loom report release-notes` already exists; the move is to make *it* do the done-body hydration + emit either the draft or a clean "nothing unreleased" signal — so any project's CI runs one command and gets the drafted notes.

My lean: **make `loom report release-notes` the single generic entry** (enrichment + doc-graph guard built in), consumed identically by our skill, Chord Flow's skill, and any user's CI. The per-repo do-release skill then shrinks to: *run the command → review → (repo-specific) write changelog file, bump, tag, push*. The git coverage-net + dirty-tree checks become a thin release-side add-on, not buried workflow.

This re-scopes the thread: plan-001 shipped the skill-heavy version; extracting the generic workflow into the report capability is a **plan-002** (and a design amendment — §4 "Invocation" currently says "skill assembles inline," which this changes). A lighter alternative if you want to stay small: keep the workflow in the skill but have the report *output* carry a short "how to wire this into a release" note, so it's at least self-documenting — but that's a band-aid; CI still can't *run* prose.

So, before I commit anything: do you want to **(a)** amend the design + open plan-002 to push selection/enrichment/guard into `loom report release-notes` (the correct path), or **(b)** ship the skill version now and open plan-002 as a follow-up, or **(c)** the lighter self-documenting-output route? I'd go (a). Holding the commit and the guard edits until you call it.

## Rafa:

yes, now we take the right way
(a)
include ammend chord flow skilld to take new enriched report
include in plan, update docs to showcase this special report to be used in projects CI

## AI:

Right path taken. **Design amended** (`design.md`, back to `active`):
- §4 rewritten — invocation is now a generic **`loom report release-notes`** (CLI + `report` prompt); the command does selection + done-body enrichment + the doc-graph empty-set guard; **synthesis stays with the agent** (no LLM in the CLI — CI runs an agent against the command, consistent with Loom's existing report model).
- Architecture diagram flipped: the command is the generic core (ships to everyone), the `do-release` skill is thin (git-process net + repo-specific bump/tag/push).
- Decision #4 added, explicitly **superseding** plan-001's "inline in the skill" invocation.

**plan-002 — 6 steps:**
1. Enrich the `release-notes` report path — select `release: null` + hydrate done-doc bodies into the brief (`--titles-only` fallback). *(app + mcp prompt + cli + core + test)*
2. Doc-graph empty-set guard in the command — emit a "nothing unreleased" signal (+ implementing threads) instead of an empty brief.
3. Re-thin this repo's `do-release` — call the command; keep only the git add-on + repo-specific tail.
4. Re-thin Chord Flow's `do-release` the same way.
5. **Docs showcase** (your add) — feature `loom report release-notes` as a CI-usable special report, with a concrete CI example. *(reports guide + WAYS-TO-USE + CLI README + mcp-reference)*
6. build + test + dry-run the command.

Note: the empty-set guard I hand-added to both skills earlier this turn becomes *interim* — step 3/4 rewrite those skills to call the command, moving the doc-graph guard into the command and leaving only the git bits in the skill. Nothing wasted; it gets folded.

Still **holding the commit** (your "before commit" stands — nothing committed since the feature commit). **Next:** `do plan` to implement plan-002, or review the steps first.

## AI:

**plan-002 done — all 6 steps ✅** (auto-closed). The generic workflow now lives in `loom report release-notes`; both skills and any CI consume it.

- **1 — command enriched** (`core/releaseNotes.ts` + `mcp/prompts/report.ts` + `cli`): `loom report release-notes` selects the Unreleased (`release: null`) set and hydrates each plan's done-doc body; `--titles-only` fallback. Pure `buildReleaseNotesBrief` in core. Framing rewritten to Unreleased-focused Highlights → A/C/F under `## [Unreleased]`.
- **2 — empty-set guard in the command**: returns a **"NOTHING UNRELEASED"** stop-signal (naming `implementing` threads), short-circuiting the "produce a report" instruction.
- **3 — this repo's `do-release` re-thinned**: runs the command; only the git-process bits (coverage net, dirty-tree tell, stale-leak) + repo-specific tail remain.
- **4 — Chord Flow's `do-release` re-thinned** the same way.
- **5 — docs showcase**: found **neither README mentioned reports at all** — fixed. Reports sections added to the CLI + extension READMEs, the release-notes-in-CI showcase to WAYS-TO-USE, plus root README / mcp-reference / reports-reference.
- **6 — build + test + real dry-run**: build green, **23/23** tests, and — because plan-001 is now an Unreleased done plan — the dry-run finally exercised the **enriched path end-to-end**: `loom report release-notes` selected 1 Unreleased plan and rendered its full done-doc body into the brief. The gap I flagged earlier (enrichment never actually run) is now closed with real content.

Tests: report-selection blocks **11b** (framing), **18** (brief selection/enrichment/titles-only/implementing/empty), **19** (empty stop-signal + non-empty render).

Working tree is dirty across core/mcp/cli, both `do-release` skills + RELEASING, six doc files, this thread's design(v10)/plan-002/dones/chats, and Chord Flow's skill (separate repo). Nothing committed — your call.

**Next:** `commit` to land it (loom repo; Chord Flow commits separately), or review anything first.

## AI:

Committing plan-002 to `main` (loom repo) as one unit:
- `loom report release-notes` enrichment — `core/releaseNotes.ts` (new), `core` framing/exports, `mcp/prompts/report.ts`, `cli` (`--titles-only`) + test 18/19
- both re-thinned surfaces: `.claude/commands/do-release.md` + `RELEASING.md`
- docs showcase: README, CLI + extension READMEs, WAYS-TO-USE, mcp-reference, reports-reference
- this thread's design amendment (v10), plan-002, done doc, and chats

Chord Flow's `do-release.md` is in its own repo — commit it there separately. Committing as the last action of the turn.