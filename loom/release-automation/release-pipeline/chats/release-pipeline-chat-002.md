---
type: chat
id: ch_01KV9651NS8KDT0ATEWG63GWAF
title: v1.9.2
status: done
created: 2026-06-16
updated: 2026-06-16
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 13
---
# v1.9.2

## Rafa:

current is v1.9.1
i think last threads done was refactor and fixes
so next release should be v1.9.2, agree?

note: you could use roadmap history to check last threas done

prepare everything for release, CHANGELOG, etc
commit, push, tag, push

## AI:

Agreed — **v1.9.2** (patch). Current `package.json` is `1.9.1`, and everything since the `v1.9.1` tag is fixes + refactors, no new user feature → patch is correct.

## What's in v1.9.2 (commits since `v1.9.1`)

| Commit | Thread | Release-worthy? |
|---|---|---|
| `df470ba` harden `loom_create_plan` against malformed agent calls | create-plan-hardening | ✅ Fixed (user-facing) |
| `f9399d9` route all extension mutations through MCP + guard | vscode-mcp-refactor | ✅ Added + Fixed (thread.md bug) |
| `d8c9c68` move ConfigRegistry IO into fs + core-purity guard | core-purity | ⚙️ internal note |
| `bc8f879` correct mcp dependency rule; add layer-imports idea | refs | ❌ docs only |
| `bfc05a3` roadmap priority reflow | — | ❌ chore only |

The `[Unreleased]` section is empty, so I'll write these into it before bumping (the bump rolls `[Unreleased]` → `[1.9.2]`).

## Proposed root `CHANGELOG.md` notes (this becomes the GitHub release body verbatim)

**### Added**
- **New MCP lifecycle tools** — `loom_create_weave`, `loom_delete` (a doc, or a whole thread/weave folder), a folder-aware `loom_archive`, `loom_restore`, a `loom_validate` query tool, and a `loom://refs` resource. These let every host mutate weave/doc structure through the `mcp → app` chain instead of touching the filesystem directly.

**### Fixed**
- **Creating a thread no longer skips its `thread.md` manifest.** The VS Code extension created the thread folder with raw `fs` and never wrote the manifest, so the new thread had no roadmap identity. Thread creation (and delete / archive / restore) now route through MCP/app use-cases, which always write `thread.md`.
- **`loom_create_plan` no longer silently corrupts a plan on a malformed agent call.** A malformed tool call could land the raw wire blob in `goal` while `steps` arrived `undefined`; the plan was saved with `steps: []` and the wire markers serialized into the body — and still returned success, hiding the corruption. `weavePlan` now rejects wire-marker leakage in `goal`/`title` and validates `steps` (parses a stringified array, rejects non-arrays and steps missing a description, never degrades a non-empty input to `[]`) at the app boundary, so CLI/MCP/extension all inherit the guard.

**### Changed**
- **`core` is now 100% IO-free.** `ConfigRegistry` (which read/wrote `~/.loom/config.yaml`) moved out of `core` into the `fs` layer, restoring the "core is pure, no IO" contract; a new `core-no-fs-imports` guard test fails the build on any IO import under `core`. No user-facing behavior change.

## Proposed `packages/vscode/CHANGELOG.md` section (Marketplace/Open VSX notes)

**### Fixed**
- **Creating a thread always writes its `thread.md` manifest.** Previously the extension created the thread folder with raw `fs` and skipped the manifest, leaving the thread without a roadmap identity. All extension mutations (create thread/weave, delete, archive, restore, validate, add requires_load) now go through the Loom MCP client instead of reaching into `fs`/`app`.

**### Notes**
- Lockstep 1.9.2 bump with the CLI and the rest of the monorepo.

## Release sequence I'll run on your `go`

1. Write both CHANGELOG sections above (root `[Unreleased]`, and a dated `[1.9.2]` in the vscode changelog — the vscode one isn't rolled by the bump script).
2. `bash scripts/bump-version.sh 1.9.2` — bumps all 7 `package.json`s, rolls root `[Unreleased]` → `[1.9.2]`.
3. `bash scripts/build-all.sh && bash scripts/test-all.sh` — must be green or I stop.
4. `git commit -am "release: v1.9.2"` (includes the two pending chat edits unless you want them separate).
5. `git tag -a v1.9.2 -m "v1.9.2"` — **annotated**, so `--follow-tags` actually pushes it (the lightweight-tag gotcha that's silently skipped a tag before).
6. `git push --follow-tags` — pushes `main` + the tag; the tag is what fires the publish workflow.

Two checks before I start:
- **Release notes** above — good as the public GitHub release body, or want anything cut/reworded? (The core-purity "Changed" line is internal — I can drop it if you'd rather keep the changelog strictly user-facing.)
- **Commit scope** — fold the two pending chat edits (`core-purity-chat-001`, `create-plan-hardening-chat-001`) into the release commit, or commit them separately first?

STOP — waiting for `go`.

## AI:

Done — **v1.9.2** shipped. All steps ran clean:

- **CHANGELOG** — root `[Unreleased]` written, then rolled to `[1.9.2]` by the bump; `packages/vscode/CHANGELOG.md` got its dated `[1.9.2]` section by hand (the bump doesn't roll that one).
- **Bump** — all 7 `package.json`s → 1.9.2, verified by the script's own guard.
- **Build + test** — both green; full suite incl. MCP integration (17 passed, 0 failed).
- **Commit** — `513c850 release: v1.9.2`, with the two pending chat edits (`core-purity-chat-001`, `create-plan-hardening-chat-001`) folded in.
- **Tag** — annotated `v1.9.2 -m "v1.9.2"`, so `git push --follow-tags` actually pushed it (the lightweight-tag-silently-stays-local gotcha avoided).
- **Push** — `df470ba..513c850 main` + `[new tag] v1.9.2` pushed.

The tag fired the release workflow — run `27650877068` is queued (`guard → build-test → publish npm·vsce·ovsx → GitHub release`). Once green it publishes to npm, Marketplace, and Open VSX and cuts the GitHub release from the `[1.9.2]` CHANGELOG section. Say the word and I'll monitor it to completion.

## Rafa:

Release action fails

- publish-vsce

Publish to VSCode Marketplace

Run set -euo pipefail

Publishing 'reslava.loom-vscode v1.9.2'...

Error: write ECONNRESET

Error: Process completed with exit code 1.

## AI:

Release run hit a partial failure — handled. Job breakdown for run `27650877068`:

- ✓ `guard`, `build-test`
- ✓ `publish-npm` → **npm live at 1.9.2**
- ✓ `publish-ovsx` → **Open VSX live at 1.9.2**
- ✗ `publish-vsce` → transient `write ECONNRESET` mid-upload. Its "skip if already on Marketplace" check ran *before* the drop, so the Marketplace does **not** have 1.9.2 yet.
- `release` (GitHub release) → didn't run; it `needs` all three publish jobs.

**Root cause: transient network drop to the VS Code Marketplace, not a content/version problem.** This is exactly the partial-failure case the pipeline is designed for — every publish job is skip-if-already-published, so re-running the same tag is the first-line recovery (idea §Locked decision 5, RELEASING.md).

Action taken: `gh run rerun 27650877068 --failed` — re-runs `publish-vsce` (npm/ovsx no-op since they're already published) and then `release` once vsce goes green. No version bump, no re-tag — the consumed npm/ovsx 1.9.2 are untouched. Monitoring it now; if vsce fails a second consecutive time I'll stop and dig into whether it's more than a flake.

## AI:

Resolved — the re-run cleared the flake. Final state of run `27650877068`, all green:

- ✓ `guard`, `build-test`
- ✓ `publish-npm`, `publish-ovsx` (no-op'd — already published 1.9.2)
- ✓ `publish-vsce` in 19s — **Marketplace now live at 1.9.2**
- ✓ `release` — GitHub release **v1.9.2** published (not draft, not prerelease).

**v1.9.2 is fully shipped to all three registries (npm · Marketplace · Open VSX) + GitHub release.** The single re-run was enough; no re-tag or version bump needed, exactly as the idempotent-recovery design intends. ECONNRESET was a one-off network drop, not a recurring issue.

## Rafa:

I want we decide best context for next release.

When you started this session and read the chat, you wrote:
```
The state output is huge (1.9MB). Let me get the release-relevant facts
  another way: the roadmap history of recently-done threads and the current
  version.
```
This thread has too much context info for the simple task of shipping a new release

Did you find reading roadmap history useful? I think it is missing version, so you end reading git history from last tag

RELEASING.md doc is a kind of task list for releasig, but I think you even read it

So what context do you suggest when next release come?

Ask you directly in terminal: do release v.X.X.X

## AI:

Good question, and you're right that this session loaded the wrong shape of context. Honest post-mortem of what was actually **load-bearing** vs. **noise** for "ship v1.9.2":

**Load-bearing (what I actually used):**
- `package.json` version → the authoritative current version. One read.
- `git log v1.9.1..HEAD` *with full commit bodies* → the real source for the CHANGELOG prose. This was the spine of the task.
- `RELEASING.md` → the actual task list: pre-tag checklist, bump script, the annotated-tag gotcha, the idempotent-rerun recovery (which is exactly what saved the ECONNRESET). Yes, I read it — it carried the whole procedure.
- `bump-version.sh` → to know it rolls the *root* CHANGELOG but not the vscode one. (RELEASING.md already says this, so this read was semi-redundant.)

**Noise (loaded, not needed to run a release):**
- `loom://state` (1.9MB) — useless here, I abandoned it.
- The release-pipeline **thread bundle** (idea + design + plan, ~8.4k tokens). Interesting, but it's the context for *changing the pipeline*, not *running* it. The design doc's partial-failure reasoning was nice background for the ECONNRESET, but RELEASING.md's "If a publish partially fails" section says the same thing operationally.

**Your three sub-questions, directly:**
1. **Was roadmap history useful?** Marginally. It confirmed "last threads were refactor + fixes" matched reality — a sanity check. But it was *not* load-bearing: it has no version and no per-change detail, so I still had to go to `git log` for both the scope and the notes.
2. **Missing version → I fell to git history.** Correct, and that's a genuine gap: roadmap history keys shipped plans by *date*, not by *release*. It can't answer "what shipped since v1.9.1" — only "what shipped recently."
3. **RELEASING.md is the task list.** Exactly — it's the right primary doc and it's nearly self-sufficient.

**So, the key insight:** running a release ≠ working on the release-pipeline thread. The thread (idea/design/plan) is for *evolving the pipeline*; running a release is an **operational runbook task** whose correct, minimal context is:
> `RELEASING.md` + root `package.json` version + `git log <lastTag>..HEAD`

— and explicitly **not** the thread bundle or `loom://state`.

**The durable fix — two options, not mutually exclusive:**

**A. Encode "do release" as a defined task (skill/slash command).** A `do-release` skill whose body *is* the runbook and which loads exactly those three things. Then "do release vX.Y.Z" in the terminal triggers a task with a pinned, tiny context footprint — no re-deriving "what do I need" each time, no 1.9MB detour. This is the Loom-native answer: a recurring task with a known small context, pinned. Cheap, high payoff, my recommendation as the primary.

**B. Give roadmap history a version (`actual_release`).** Make "what shipped since v1.9.1" a Loom query instead of git archaeology — closes the gap you spotted. But note: even with this, I'd still want `git log` for the *changelog prose* (commit bodies carry the "why"). So B helps *pick the version + sanity-check scope*, not *write the notes*. Worth a thread, but lower urgency than A, and git log already works.

My recommendation: **do A now** (it makes every future release cheap and correct), and file **B as an idea** for when roadmap-as-source-of-truth matters more. I wouldn't load the pipeline thread for a release ever again.

Want me to draft the `do-release` skill (option A)? That's a design decision on your side — say the word and I'll spec it before writing anything.

## Rafa:

Draft `do-release`
Create a thread to give roadmap history a version (`actual_release`)

## AI:

Both done.

**A — `do-release` command drafted** → `.claude/commands/do-release.md` (already live — it shows up as `/do-release`). It takes the version as an argument (`/do-release 1.9.3`, or omit → next patch) and encodes exactly the lesson from this session:
- **Pins the minimal context**: `RELEASING.md` + root `package.json` version + `git log <lastTag>..HEAD` — and explicitly says **do not** load `loom://state` or the `release-pipeline` thread bundle.
- Walks the full runbook: gather changes → draft both changelogs (root + the hand-written vscode one) → **STOP for review** (notes are published verbatim) → bump → build-before-test → annotated tag → `push --follow-tags` → monitor → `gh run rerun --failed` for transient partial failures, with the two-consecutive-failures stop built in.

Give it a dry read when you have a moment; tweak wording to taste since it's the thing future-me will follow blindly.

**B — thread created**: `core-engine/roadmap-release-version` with its idea (`id_01KV98KZVJFEMZBCHMZEEH8ZGZ`, status draft, thread.md auto-scaffolded). Key finding I folded in: **`actual_release` already exists** as a frontmatter field on designs — it's just always `null` and never surfaced. So B is *wiring an existing field through* (populate at release time, expose in `buildRoadmap`/`loom roadmap`/`loom://roadmap`), not inventing one. I kept it honest that this won't replace `git log` for changelog *prose* — it makes the roadmap answer *which version shipped what*, so `do-release` can cross-check Loom against git instead of git being the sole source. Open questions (who stamps it, plan vs design, backfill) are parked for design.

Nice loop closure: A and B reinforce each other — the `do-release` runbook is the natural place that would *write* `actual_release`, which then makes the next `do-release`'s "what changed" step a Loom query instead of git archaeology.