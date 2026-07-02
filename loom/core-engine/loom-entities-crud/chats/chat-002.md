---
type: chat
id: ch_01KWGJG8MWFQ58FQJ30WP0NN4R
title: loom-entities-crud update docs and contract Chat
status: done
created: 2026-07-02
updated: 2026-07-02
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 23
---
# loom-entities-crud update docs and contract Chat

## Rafa:

### Update

`README.md`
`loom/ctx.md`
`loom/refs/architecture-reference.md`
`loom/refs/workflow-reference.md`
`loom/refs/workspace-directory-structure-reference.md`

with the new canonical loom docs filenames 
also update any outdated info
for example, including `req` in the workflow:
chat ──▶ idea ──▶ design ──▶ req ──▶ plan ──▶ done
                    └──────────────▶ plan
(see `loom/refs/staleness-reference.md` line 29)

I want to include a hard contract in CLAUDE.md for:
- each time loom architecture, workflow, layout is modified which documents must be update

commit

### Taking advantage

Now we use very simple filenames:
idea.md design.md plans/plan-00N.md done/plan-00N-done.md chats/chat-00N.md
except reference docs that use slug filenames

I wonder:
- pros and cons of using these simple filenames? the only contra I see is that seeing a single file you don't know where it belongs
- how we could take advantage of it? for example, in loom://state to be used in extension. Do you see any way to improve loom with this?

## AI:

## Audit — docs that still carry the old scheme (beyond your 5)

I swept `loom/refs/`, the root docs, and the install template for both the **old thread-slug filenames** and the **outdated workflow (missing / mis-ordered `req`)**. Your list — `README.md`, `loom/ctx.md`, `architecture-reference.md`, `workflow-reference.md`, `workspace-directory-structure-reference.md` — is correct but **incomplete**. Two of the misses are load-bearing.

### ❗ The big miss — `packages/app/src/installWorkspace.ts` (the `LOOM_CLAUDE_MD` template)
This is the project-agnostic CLAUDE.md installed into **every downstream repo** by `loom install`, and it is **sync-locked to the root `CLAUDE.md`** by `tests/claude-md-sync.test.ts`. It carries the old scheme:
- L62–64: `` `*-plan-*.md` ``, `` `*-design.md` ``, and `loom/{weave-id}/{thread-id}/{thread-id}-idea.md`, `{thread-id}-design.md`
- L176–177: visibility example `📄 {thread}-idea.md` / `{thread}-design.md`

If you touch `CLAUDE.md` filenames without mirroring here, `test-all` fails — so this **must** be in the same commit.

### ❗ `CLAUDE.md` itself needs filename fixes, not just the new contract
You listed CLAUDE.md only for the "hard contract." But it also has stale filenames:
- L102: `Thread layout: loom/{weave-id}/{thread-id}/{thread-id}-idea.md, {thread-id}-design.md` → new flat scheme
- L315–316: visibility example `📄 {thread}-idea.md` / `{thread}-design.md` → `idea.md` / `design.md`
- L98–99: glossary globs `*-plan-*.md` / `*-design.md` (plan is now `plan-NNN.md`)

### Other refs with the old scheme
- **`architecture-reference.md`** (already on your list) — heaviest: L145–146 (`{thread}/{thread}-idea.md`), L190/192, the directory tree L224–231, filename table L257.
- **`workflow-reference.md`** (on your list) — L45 `*-chat.md`, L76/83 `{plan-id}-done.md` → `chat-NNN.md` / `plan-NNN-done.md`, plus add `req`.
- **`getting-started-reference.md`** L78 — `writes a structured *-idea.md doc` (public onboarding). Minor but user-facing.
- **`demo-script-reference.md`** L58 — workflow line `chat → idea → design → plan → done` (no `req`).

### ✅ Clean (no change) / do-not-touch
- `mcp-reference.md` — no old-scheme matches.
- `cli-commands-reference.md`, `plan-steps-table-…-reference.md`, `app-query-use-cases-reference.md`, `implementation-contract-reference.md` — matches were incidental (`loom_create_plan`, `plan-steps`, etc.), not filenames.
- All **chats / designs / plans / done docs** — historical conversation logs, leave as-is.
- `loom/refs/.archive/**` — frozen.

## ⚠️ Before you update: the `req` position contradicts itself in three places
Your message and `staleness-reference.md:29` put `req` **between design and plan**:
`chat → idea → design → req → plan → done` (with a `design → plan` bypass).

But the repo currently disagrees with itself:
| Doc | Ordering it states |
|---|---|
| your msg + `staleness-reference.md:29` + `README.md:294` (`idea → design → req → plan`) + `README.md:431` | **req after design** ✅ your target |
| `loom-requirements-reference.md:22,136` (the *authoritative* req doc) | `chat → req → idea → design → plan → done` — **req first, before idea** |
| `README.md:144` | `chat → req → idea → design → plan → implement → done` — **req first** |
| `demo-script-reference.md:58` + `README.md:17,124` | no `req` at all |

So `req` appears **first**, **after-design**, and **absent** across the docs. This is an architecture/workflow decision (stop-rule #3) — I won't silently pick. **Which is canonical?**

My read: `idea → design → req → plan` is the odd one out vs. how RDD actually works. In the requirements-driven-development thread, `req` is the **locked anchor the idea/design/plan build against** — which is why its own reference doc puts it *first*. If `req` is the spec everything cites, `chat → req → idea → design → plan → done` is the more coherent model, and your bypass arrow would instead be "req can be authored/locked before or refined alongside design." But you cited `staleness-reference.md:29` as the source of truth, which is `idea → design → req → plan`. These can't both be canonical.

**Also open:** should `vision-reference.md`'s abstract loop (`chat → {generate|refine} idea/design/plan/ctx → done`) gain `req`, or does the north-star intentionally stay req-free? (I lean: leave vision abstract, make `req` explicit only in workflow/architecture/staleness.)

## Suggested "which docs update when X changes" contract (for CLAUDE.md)
Since you want the hard contract anyway, here's the mapping this audit reveals — three surfaces that must move together:
- **Filename scheme changes** → `architecture-reference.md`, `workspace-directory-structure-reference.md`, `workflow-reference.md`, `getting-started-reference.md`, `README.md`, `CLAUDE.md`, **`installWorkspace.ts` template** (sync-locked pair).
- **Workflow / phase changes (e.g. `req`)** → `workflow-reference.md`, `staleness-reference.md`, `loom-requirements-reference.md`, `architecture-reference.md`, `demo-script-reference.md`, `README.md`, `vision-reference.md` (decide), `loom/ctx.md`.
- **Layer / architecture changes** → `architecture-reference.md`, `loom/ctx.md`, `CLAUDE.md` + template.

**Next:** tell me the canonical `req` ordering (req-first vs after-design) and whether `vision` gets `req`; then I'll do the full update + contract in one pass and commit. I did **not** change anything yet.

## Rafa:

req after design; keep vision abstract
go

## AI:

## Done — filenames + `req`-in-workflow aligned across all surfaces, contract added

Executed `req after design` (`chat → idea → design → req → plan → done`, `design → plan` bypass) and the flat filename scheme everywhere. 10 files changed:

**Filenames → flat canonical** (`idea.md` · `design.md` · `plans/plan-NNN.md` · `done/plan-NNN-done.md` · `chats/chat-NNN.md`; `req.md`/`thread.md`/`ctx.md` singletons; refs keep `{slug}.md`):
- `architecture-reference.md` — doc-type table, §4 workflow table, directory tree, §7 file-naming rules (rewrote the suffix table to flat names; fixed the stale "Loom does not manage file rename" line → it now does, via the naming module + `migrate-layout` + `loom_rename_thread/weave`).
- `workspace-directory-structure-reference.md` — tree + naming table (+ added `req.md`/`thread.md` rows).
- `workflow-reference.md`, `getting-started-reference.md`, `demo-script-reference.md`, `README.md` (tree + all four workflow diagrams), `loom/ctx.md` (glossary + loop, via MCP), `CLAUDE.md` + the `LOOM_CLAUDE_MD` template (key-terminology layout line + the chat-doc glob `*-chat.md` → `chat-NNN.md` + the context-injection visibility example).

**`req` folded into the workflow** in `workflow-reference.md` (one-liner, redrawn diagram, a `req` generate-output, a `Finalize Req` transition), `architecture-reference.md` §4 (heading + a "Author & lock req (optional)" step), `README.md` (**reordered the phase list** so Requirements sits *after* Design, not before Idea), `demo-script`, `loom/ctx.md`.

**Hard contract added** to `CLAUDE.md` — a new *"Doc-sync contract"* section with a 3-row table (filename/layout change · workflow/phase change · layer/architecture change → the exact doc set to update in the same commit), calling out the `CLAUDE.md`↔template sync-locked pair and the `docs/` sweep. It's Loom-repo-specific, so it carries no `rule:` marker and doesn't affect template parity — `claude-md-sync.test` passes (15 rule ids, 12 invariants).

## ⚠️ One change worth your review — I reframed the RDD reference
`loom-requirements-reference.md` said `req` is **"Born first — the first formal artifact, extracted from the chat opener before the idea."** That flatly contradicts "req after design," so I reconciled it to **"Authored after the design"** (crystallizes scope from a *complete* design, then locked; authored late in the chain, injected first). This aligns it with `staleness-reference.md:38` ("req is authored after the design"), which you'd cited as canonical — but it *does* shift the RDD model's rationale: the design phase now happens **before** scope is locked, so `req` is the backstop that re-anchors scope before *planning* rather than the up-front spec everything is built against. If you'd rather keep the "born first" thesis and treat the staleness `design → req` edge as a pure *dependency* axis (separate from authoring order), say so and I'll re-split them. As written, everything now consistently says req-after-design.

## Deferred (flagging, not done) — the `docs/` user guides
`docs/*.md` also carry the old scheme, and several are *more* stale than filenames:
- `COLLABORATION.md`, `EFFECTS.md` — old `threads/{thread}/...` sub-layout (pre-current-structure).
- `WORKFLOW_YML.md` — `file_pattern: "**/*-plan-*.md"` glob examples for the (future) `workflow.yml` matcher — changing these needs to know whether suffix-matching still applies under flat names.
- `USER_GUIDE.md`, `TROUBLESHOOTING.md`, `CLI_USER_GUIDE.md`, `EXTENSION_USER_GUIDE.md` — workflow-loop and `*-design.md` mentions.

I left these out of this commit because (a) some are a deeper rewrite than a filename swap and (b) `workflow.yml` matching semantics are a real question. The new contract tells future-me to sweep `docs/` — want me to do that pass next, or leave the guides until the `workflow.yml` matcher question is settled?

Committing this turn's work now.

## Rafa:

You did excellent job, thanks!

### Other repos

LOOM_CLAUDE_MD has been updated, so I need to run `loom install` in Chord Flow to update the repo `.loom/CLAUDE.md` accordenly, correct?

### `workflow.yml`

Explain briefly the situation with this doc

### Deferred (flagging, not done) — the `docs/` user guides

What do you think we should do with these docs, some are very outdated?
But we should update or delete them?
What do you suggest? option?

## AI:

Thanks!

### Other repos — `loom install` in Chord Flow

Correct in principle, with **one caveat you must not skip**: I edited the template in `installWorkspace.ts` **source**, but the globally-linked `loom` CLI runs from **dist**. So right now `loom install` would still write the *old* `.loom/CLAUDE.md`. Order:

1. `./scripts/build-all.sh` here (recompiles + relinks the global CLI so dist carries the new template).
2. In Chord Flow: `loom install` — Step 2 of install writes `.loom/CLAUDE.md` **unconditionally** (not gated by `--force`), so a plain `loom install` refreshes it. `CLAUDE-LOCAL.md` and your root `CLAUDE.md` imports are untouched.

This only matters if Chord Flow uses your **locally-linked dev CLI**. If it's on the **npm-published** `loom`, the new template ships with the next release, not before. And it's contract prose only — no rush unless you want chord-flow's agent on the latest wording now.

### `workflow.yml` — the situation

`.loom/workflow.yml` is a **documented-but-unbuilt** feature: the vision/workflow refs mention it as *"planned"* (let teams rename phases, add custom transitions, define which file patterns map to which phase), and `docs/WORKFLOW_YML.md` is a full spec for it — but **none of it is implemented**; the canonical `chat → idea → design → req → plan → done` loop is hardcoded. Its `file_pattern` examples (`**/*-plan-*.md`, `*-design.md`) are therefore **doubly stale**: they document (a) a feature that doesn't exist, using (b) the old thread-prefixed filenames — and worse, those globs wouldn't even match the new flat names (`plan-001.md` doesn't match `*-plan-*.md`). It's speculative documentation ahead of code.

### The `docs/` guides — my recommendation: **triage, don't bulk-update**

They're not one kind of thing, so "update vs delete" isn't one answer. Three buckets:

1. **Public front door — UPDATE.** `USER_GUIDE.md`, `EXTENSION_USER_GUIDE.md`, `CLI_USER_GUIDE.md` are linked from the README and are what a new user reads first. These matter for the one thing that matters (validation) — keep them and fix the filenames/workflow. Small edits.
2. **Describes dead/unbuilt systems — DELETE (or archive).** `WORKFLOW_YML.md` (unbuilt feature), `EFFECTS.md` + `COLLABORATION.md` (old `threads/` sub-layout / an effects model I should confirm still exists). Updating a doc that describes something that isn't real is wasted effort and *creates* a lie that looks maintained. Deleting is the clean path — fewer, correct docs beat many stale ones. (This matches your own "clean, no legacy trash" stance.)
3. **Config/reference — VERIFY then update or cut.** `CONFIGURATION.md`, `TROUBLESHOOTING.md`, `DOCUMENTATION_GUIDE.md`, `AI_INTEGRATION.md` — need a quick read to see if they still match the code before I decide.

**Honest caveat:** I can't hand you a firm keep/delete list for buckets 2–3 without actually reading each file against current code — I only have grep hits so far. So my suggested **next step** is a cheap **triage pass**: I read each `docs/*.md`, classify it `update` / `delete` / `keep-as-is`, and post the table here for your yes/no per file. Then one commit does the updates and one does the deletions. That way we don't sink an afternoon updating docs that should just be removed.

**Options for how to proceed:**
- **(A, recommended)** I do the triage pass and bring you a per-file verdict table to approve.
- **(B)** Update only the 3 README-linked public guides now; leave the rest until you care.
- **(C)** Update everything (I'd advise against — you'd be polishing docs for an unbuilt feature and a dead layout).

Which do you want? I lean **A** — it's the cheapest way to a clean, honest `docs/`.

## Rafa:

### Other repos — `loom install` in Chord Flow

I did build
In Chord Flow, should I ran `loom install` before or after doing `loom migrate-layout`?

### `workflow.yml`

I remembder now, this is an old nice idea, but due Loom has no feedback I think we will never implement it

### The `docs/` guides

Option A

## AI:

### Chord Flow — `loom install` vs `loom migrate-layout` order

**Order doesn't matter — they're orthogonal.** `loom install` only touches `.loom/` (config + the regenerated `.loom/CLAUDE.md` contract); `loom migrate-layout` only renames docs under `loom/**`. No overlap. Recommended sequence in Chord Flow:

1. **Commit Chord Flow first** (migrate renames files — you want a clean before/after diff).
2. `loom migrate-layout --dry-run` → eyeball the renames.
3. `loom migrate-layout` → apply.
4. `loom install` → whenever (before or after migrate; independent).

Both rely on the freshly-built CLI — which you've built.

### `workflow.yml` — agreed

Right — old nice idea, no feedback to justify building it. That makes its doc (and the effects doc that depends on it) dead weight → both go in the delete pile below.

---

## `docs/` triage — verdict table (needs your yes)

None of these 11 is linked from the README except the top three. Read each against current code:

| Doc | Verdict | Why |
|-----|---------|-----|
| `USER_GUIDE.md` | ✏️ **UPDATE** | README-linked front door, high quality. Fix: req-first framing (`chat → req → idea…` + "Born first") → after-design; example filenames (`login-throttle-idea.md` → `idea.md`); "loose fiber" wording. |
| `EXTENSION_USER_GUIDE.md` | ✏️ **UPDATE (light)** | Current + accurate. Just add `req` to the loop one-liner. |
| `CLI_USER_GUIDE.md` | ✏️ **UPDATE (light)** | Current. Add `req` to loop one-liner; `auth-design.md` → `design.md`; drop stale `loom finalize <temp-id>` "permanent ID" (ULID model — no temp→permanent). |
| `ARCHITECTURE.md` | ✏️ **UPDATE + link** | Good "reader's-eye" overview, defers to `architecture-reference`. Light filename pass. **Not linked from README** — should be, or it rots. |
| `AI_INTEGRATION.md` | ✏️ **UPDATE + link** | Excellent + current (knows `req`, MCP surface, single-AI). Near-zero edits. **Not linked** — link it. |
| `WORKFLOW_YML.md` | 🗑️ **DELETE** | Unbuilt feature you've decided to never build; old `threads/` layout. |
| `EFFECTS.md` | 🗑️ **DELETE** | Documents the effects catalog *configured via `workflow.yml`* — same dead feature; old `/looms/default/threads/...` paths. |
| `COLLABORATION.md` | 🗑️ **DELETE** | Team/feature-branch git workflow — contradicts your solo/main-only reality; old `threads/payment-system/...` layout. |
| `CONFIGURATION.md` | 🗑️ **DELETE** | Duplicates EXTENSION_USER_GUIDE §6 Settings, with *stale* defaults (`deepseek` vs `anthropic`, a "future collaboration" email field). Redundant. |
| `TROUBLESHOOTING.md` | 🗑️ **DELETE** | Both user guides already have Troubleshooting tables; this one tells users to **hand-edit `design_version` / `staled` frontmatter** — an anti-pattern now (MCP gate, derived state). Actively misleading. |
| `DOCUMENTATION_GUIDE.md` | 🗑️ **DELETE** | Unmaintained internal style guide (`## User:`/`## AI:`, not `## Rafa:`); not user-facing, partly stale. *(Softest delete — say keep if you still use it.)* |

**Net:** keep 5 (update), delete 6. Result is a small, honest `docs/` that matches the tool.

### Separate, bigger flag — `docs/internal/backup/OLD/`

`docs/` also contains **258 files** under `docs/internal/backup/OLD/…` — a pre-Loom archive of ChatGPT design analysis, old state-machine experiments, templates, etc. It's pure historical noise in the repo tree. Almost certainly a **bulk `git rm` (or move out of the repo / gitignore)**. I flagged it separately because it's a one-line decision, not a per-file one — want it gone?

---

**How do you want to proceed?**
- **(1)** Approve the table as-is → I do it in two commits: `docs: update guides for flat filenames + req-after-design` (the 5) and `chore: remove stale/dead docs` (the 6), plus link ARCHITECTURE + AI_INTEGRATION from the README.
- **(2)** Adjust any verdict first (e.g. keep `DOCUMENTATION_GUIDE`, or keep `CONFIGURATION`).
- **(3)** Also nuke `docs/internal/backup/OLD/` in a third commit.

I've changed nothing — waiting on your call.

## AI:

Understood — `docs/internal/` is out of scope; I'll leave that whole tree untouched (option 3 dropped).

Still holding on the top-level `docs/*.md` triage table above: approve as-is (option 1 → update the 5, delete the 6, link ARCHITECTURE + AI_INTEGRATION from the README), or adjust any verdict first (option 2)?

## Rafa:

`docs/internal/` is also gitignored so no noise, I use this for internal use docs

(1) table approved
about `.loom/workflow.yml`, if it is not used anywhere we could delete it also

go

## AI:

## Done — `docs/` triage executed (two commits)

**Commit 1 — `docs: update user guides…`** (5 files):
- `USER_GUIDE.md` — reordered `req` after design in the loop *and* the stage table; reframed "req born first" → "authored after design"; flat example filenames (`idea.md`/`design.md`).
- `EXTENSION_USER_GUIDE.md`, `CLI_USER_GUIDE.md` — `req` in the loop one-liner; flat example filename; dropped the stale `loom finalize <temp-id>` "permanent ID" wording (ULID model — no temp→permanent).
- `ARCHITECTURE.md` — see the flag below.
- `README.md` — linked `ARCHITECTURE` + `AI_INTEGRATION` in the References table (they were orphaned). `AI_INTEGRATION` needed no content edit — it was already current.

**Commit 2 — `chore: remove stale/dead docs + unused workflow.yml`** (7 removals):
- Deleted `WORKFLOW_YML.md`, `EFFECTS.md`, `COLLABORATION.md`, `CONFIGURATION.md`, `TROUBLESHOOTING.md`, `DOCUMENTATION_GUIDE.md`. All cross-links were *among these six* — no kept doc or README pointed at them, so no dangling links.
- Deleted **`.loom/workflow.yml`** — confirmed **zero references in `packages/`** (nothing loads it; `loom install`/`init` don't create it). It was a git-tracked leftover.

## ⚠️ Flag for your review — I removed two `ARCHITECTURE.md` sections
Since `workflow.yml`/`run_command` is dead, I cut `ARCHITECTURE.md`'s **§8 Security model** and **§9 Extension points** — both described *only* that unbuilt customization layer (custom doc types via `workflow.yml`, the `run_command` effect "disabled by default", `allowShellCommands`, secret filtering). Leaving them would have `ARCHITECTURE` describing features that don't exist. Note: there's still an **active `workflow-run-command` thread** (priority 200) in the roadmap — so if you *do* intend to ship `run_command` + `workflow.yml` someday, that security model is real design that just isn't implemented yet, and I've now removed its doc. Two clean options: (a) leave it removed and re-document when it ships, or (b) I restore §8/§9 but reframed as *"planned, not yet implemented."* I went with (a) — say the word for (b).

That closes the `docs/` sweep. `docs/internal/` untouched (gitignored, yours).

## Rafa:

`workflow-run-command` thread is too complex for an app with no users, so I archived it, agree?

i think this `thread` `loom/core-engine/plan-blockedby-id-normalization/idea.md` should be next to implement to have an stable final loom version, agree?

then we could do-release 1.13.0, agree?

## AI:

Agree on all three — with reasoning, not a rubber-stamp.

### 1. Archiving `workflow-run-command` — yes, strongly
It's an unbuilt, *high-complexity* feature (shell execution + a security sandbox: `allowShellCommands`, cwd restriction, secret filtering) whose entire justification is end-user customization you have **zero users** asking for. Building a code-execution surface for nobody is the worst effort-to-risk trade in the backlog. Archiving (not deleting) keeps the design if validation ever pulls it back. This also **closes my ARCHITECTURE flag**: with the thread archived, leaving §8/§9 removed (option a) is now unambiguously correct — don't restore them.

> Small follow-on: `vision-reference.md` and `workflow-reference.md` still mention `.loom/workflow.yml` as *"planned / eventual customization."* With the idea now shelved, those are mild aspirational overstatements. I'd leave vision abstract as you decided, but I can soften both to "possible future" or cut them — your call, not blocking a release.

### 2. `plan-blockedby-id-normalization` next — yes
I read the idea. It's a genuine latent **correctness** bug, not polish: `loom_create_plan` persists `blockedBy` ordinals (`["1","2"]`) verbatim, while `loom_update_step` resolves the same values to stable step-id slugs. So a plan born in one `create` call has a *fragile* dependency graph that silently mis-points the moment a step is inserted/removed/reordered — the exact thing slug-ids exist to prevent. It bit you live authoring `roadmap-release-version-plan-001` (ten follow-up `update_step` calls to fix). For a "stable final version," a correctness bug in the **most-used write path** is precisely the right last fix — and it hits Chord Flow too, so it's real-user-facing.

Two notes: it's currently **only an idea (draft)** — no design/plan yet — so "implement" = a quick design → plan → do-step. It's small (reuse/extract one ordinal→id resolver so create + update converge). The one open question — out-of-range ordinal at create: **error vs pass-through** — I lean **error** (it can only be a mistake), matching the idea. That's a 30-second design call.

### 3. `do-release` after — yes, with the version caveat
Sequence I'd follow: land the normalization fix → `build-all` + `test-all` green (this release also carries today's doc alignment + the entity-CRUD flat-layout work) → then release. On **1.13.0** specifically: I can't launch `/do-release` (you trigger it), and it pins the exact version from `RELEASING.md` + the git log since the last tag, under lockstep. 1.13.0 (minor) fits a features-and-fixes release, but let the command confirm the number rather than hard-coding it here.

**Next:** on your `go` I'll start the `plan-blockedby-id-normalization` thread — generate the design (settling the error-vs-passthrough question), then a plan — and stop for approval before implementing. Want me to kick that off?

## Rafa:

1. `vision-reference.md` and `workflow-reference.md` still mention `.loom/workflow.yml`: cut them
2. I do not understand well, do you mean do release 1.13.0 now and before `plan-blockedby-id-normalization` and then other release? I lean do release when `plan-blockedby-id-normalization` is shipped, tell me what is your opinion
3. yes

## AI:

### 1. `workflow.yml` mentions — cut ✅
Removed the whole *"Customization (future)"* section from `workflow-reference.md` and the "teams can shape the loop (`.loom/workflow.yml` planned)" bullet from `vision-reference.md`. (Uncommitted for now — I'll fold them into the next commit unless you want them landed separately.)

### 2. Release timing — we agree, I just phrased it badly
**One release, after `plan-blockedby-id-normalization` ships.** Not two, and not now. My "land the fix → release" was a single release that also carries everything already on `main` since the last tag (the entity-CRUD flat-layout work + today's doc alignment + this fix). No reason to cut a release before the fix — that'd just mean releasing twice. So: finish the fix → `build-all` + `test-all` green → then `/do-release`. Your lean is exactly right.

### 3. Design generated — `design.md` in the thread (review before I plan)

📄 `plan-blockedby-id-normalization/design.md` — created (draft).

I grounded it in the code. The load-bearing finding: **there is no shared write-time ordinal→id resolver today** — `buildStructuredSteps` stores `blockedBy` verbatim, and `isStepBlocked` only tolerates ordinals at *read* time (which is what hides the bug). So the fix introduces one. Two decisions I made in the design that shape the API/tests — confirm these and I'll generate the plan:

- **Out-of-range ordinal → error** (throw at write time), not silent pass-through. It can only be a mistake.
- **One core helper `resolveBlockedByIds(entries, orderedStepIds)`, shared by create *and* the add/update-step reducers** — so numeric `blockedBy` is normalized identically everywhere and there's no second codepath (what the idea asked for). Non-numeric slugs / `pl_…` plan-ids pass through; result deduped; self-block rejected.

I also scoped **out** a migration of *already-stored* ordinals in existing plans (new writes are clean; the one plan that hit this was hand-fixed) — flag if you'd rather include it.

**STOP — design decision.** Confirm the two calls above (or adjust), and I'll generate the plan, then stop again before implementing.