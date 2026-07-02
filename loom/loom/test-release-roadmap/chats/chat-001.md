---
type: chat
id: ch_01KVAG7WHY1PVT9DVDQFTJ0QXC
title: test-release-roadmap Chat
status: done
created: 2026-06-17
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 13
---
# test-release-roadmap Chat

## Rafa:

### Testing by dogfooding

we are going to launch a new release
we will test:
- new skill `.claude/commands/do-release.md`
- skill will call to `loom record-release X.Y.Z` and we will see if history unversioned history threads are marked with the version bumped

### Currently

- roadmap current version 1.9.2 is OK
- roadmap history unversioned group shows the 2 threads already done and no commited yet OK

### Question 

Why skill is in `.claude/commands/` instead of `.claude/skills/`? any consecuence? is the same?

### v1.10.0

All ready?

## AI:

### `.claude/commands/` vs `.claude/skills/`

They are **two different mechanisms** that happen to converge at the slash-command layer — for `do-release` the `commands/` home is the correct choice, not an accident.

**What each one is:**

| | `.claude/commands/do-release.md` | `.claude/skills/do-release/SKILL.md` |
|---|---|---|
| Shape | a **single `.md` prompt file** | a **folder** (`SKILL.md` + optional bundled scripts/refs) |
| Invocation | **user-invoked** explicitly — you type `/do-release` | **model-invoked** — Claude auto-decides to use it when the `description` matches the conversation |
| Frontmatter | `description`, `argument-hint`, `allowed-tools`, `model` | requires `name` + `description` |
| Arguments | `$ARGUMENTS` / `$1` (we use `$ARGUMENTS` for `X.Y.Z`) | no positional-arg convention |
| Extras | none — just a prompt | progressive disclosure, can ship executable code + reference files |

**Is it the same?** At the *invocation* layer, nearly — current Claude Code surfaces custom slash commands through the same Skill interface, which is why `do-release` shows up in the session's "available skills" list even though it lives in `commands/`. So you get an invocable `/do-release` either way.

**The consequence that actually matters here** is *auto-invocation*: a skill's `description` makes Claude eligible to **start it on its own** when the chat smells like a release. For a release runbook that is exactly what you do **not** want — a release must be a deliberate `/do-release 1.10.0`, never something the model kicks off because the word "release" came up. A single-file slash command is deliberate-only, supports the version argument, and needs no folder because it just calls the existing `scripts/*.sh`. Moving it to `skills/` would add folder structure for zero benefit and introduce auto-invoke risk.

**Verdict:** `commands/do-release.md` is the right home. No change needed.

### v1.10.0 — not quite "all ready", but nothing is missing

The **code is in and committed**; what remains is precisely the work `/do-release` performs. State right now:

- Root `package.json`: **1.9.2**. Last tag: **v1.9.2**.
- User-facing commits since v1.9.2 (the rest are `chore: roadmap`, correctly dropped):
  1. `0bbf0aa` feat: record release version on plans + derive `current_release`
  2. `42ffe73` feat(vscode): surface release versions in the roadmap history view
- These are **new features**, so **1.10.0 (minor)** is the right call — note the `/do-release` default would propose the next *patch* (1.9.3), so you must pass `1.10.0` explicitly.

**Not yet done (this is what the runbook does, steps 2–3):**
- Root `CHANGELOG.md` `## [Unreleased]` is **empty** — needs the two Added/Changed entries.
- `packages/vscode/CHANGELOG.md` has **no `[1.10.0]` section** — must be hand-added (the bump script never rolls this one; the release guard requires it).

**Heads-up on the working tree:** this very dogfooding test is uncommitted — `M …/test-release-roadmap-chat-001.md` and the untracked `loom/loom/test-release-roadmap/` folder. `git commit -am "release: v1.10.0"` would sweep these into the release commit. Decide first whether the test thread should be committed (and as what — probably a separate commit, or excluded) so it doesn't ride along in the release.

So: **say `/do-release 1.10.0`** when you're ready — it'll draft both changelogs and STOP for your review before bumping/building/tagging. Before that, just tell me how you want to handle the test-thread files in the working tree.

## Rafa:

I do not like `/do-release` default would propose the next *patch*, I consider better propose, show and ask for next **minor**, 
user always need to write the version, never assumed.
If there is no way to propose and ask when no argument given, then show hint, force the param if is ommitted. what you think?

When we finish this chat I will commit it, give me a title
Then I will run /do-release 1.10.0

## AI:

Agree with your instinct, with one sharpening.

**You're right that an assumed version is the bug.** A release is irreversible and outward-facing — the model should never type the number for you. So drop the "default to next patch" behavior entirely.

**But I'd push back on "propose next *minor*".** Hardcoding *minor* is the same class of mistake as hardcoding *patch* — just a different wrong guess. The bump type is **content-dependent**, and only you know it: a bugfix-only release really is a patch (1.9.2→1.9.3), this one is a minor (features), a breaking change is a major. If the runbook says "propose minor," the next time you ship a pure bugfix it'll nudge you toward the wrong bump. So: don't bake a bump *type* into the default either.

**What I'd actually do — propose nothing, show everything, require the param:**

When `/do-release` is run with no argument, step 1 becomes:
1. Read current `package.json` version.
2. Do **not** pick a version. Show the current version and the three candidates as a *hint* — `patch → 1.9.3 · minor → 1.10.0 · major → 2.0.0` — with a one-line "which applies depends on what shipped".
3. **STOP** and require the user to re-run `/do-release X.Y.Z`. Never proceed on a guess.

This gives you the best of both: it *proposes* (shows the computed options so you don't do mental math) but never *assumes* (won't move without you typing the number). It's strictly better than "default minor" because it's correct for patch/minor/major releases alike.

Can a slash command "ask and wait" with no arg? Yes — the prompt fires, but the model's *first action* is the STOP above. That's already how the runbook gates work. So "force the param" and "propose + ask" collapse into the same implementation: show hint → STOP → require explicit `X.Y.Z`. I'd also update the `argument-hint` to read like it's required, not optional.

This is a one-block edit to `.claude/commands/do-release.md` (it's outside the Loom gate, so a normal edit) — intro line + step 1 + the frontmatter hint. **Want me to make that change now?** It won't affect *this* release since you're passing `1.10.0` explicitly.

---

**Chat / test-thread commit title:**

```
chore: add test-release-roadmap dogfood thread for v1.10.0
```

(Keep it separate from the `release: v1.10.0` commit — it's a test artifact, not a release change.)

## Rafa:

Yes, make that change, It is what I was trying to say, maybe I did not explain myself well.

Also we could add to the command:
before doing anything, if there are `thread.md` files commit then as `chore: roadmap` before the release, agree?

## AI:

Good — and yes, you explained it fine, I was just naming the trap so the runbook can't fall into it.

On the pre-release `thread.md` commit: **agree on the intent, with one guardrail** so it doesn't violate your own roadmap-commit-scope rule.

The point of the pre-commit is to keep the eventual `release: vX.Y.Z` commit clean — otherwise `git commit -am` sweeps stray roadmap reflows into the release. So a pre-flight step before "determine version" makes sense. But "commit *any* `thread.md`" is too broad, because not all `thread.md` changes are roadmap chores:

- **Modified, tracked `thread.md` with a roadmap-only diff** (just `priority` / `depends_on` changed) → yes, auto-commit as `chore: roadmap`. This is the reflow case, and it's exactly what should be separated out.
- **New / untracked `thread.md`** (a brand-new thread) → **do NOT** auto-commit as `chore: roadmap`. Per your own rule, a new thread's manifest belongs with *its feature commit*, not a roadmap chore. Auto-sweeping it here would mislabel it and orphan it from its idea/design/plan.
- **`thread.md` with a non-roadmap diff** → also don't auto-commit; STOP and report.

So the precise step is: *if there are modified tracked `thread.md` files whose diff touches only `priority`/`depends_on`, commit just those as `chore: roadmap` before the release. If there are new/untracked `thread.md` files or non-roadmap `thread.md` diffs, STOP and report them — don't fold them into the release commit and don't mislabel them.*

Note this also catches **this very test** — the untracked `loom/loom/test-release-roadmap/` (which includes a new `thread.md`) would hit the STOP-and-report branch, not get auto-committed. Which is correct: it's the `chore: add test-release-roadmap dogfood thread` commit you'll make by hand.

If you're good with that guardrail, I'll make **both** edits to `.claude/commands/do-release.md` in one pass:
1. No-arg → show current + patch/minor/major candidates → STOP, require explicit `X.Y.Z` (+ `argument-hint` reworded as required).
2. New pre-flight step: commit roadmap-only `thread.md` diffs as `chore: roadmap`; STOP-and-report new/untracked or non-roadmap `thread.md`.

Confirm and I'll apply both.

## AI:

Both edits are in `.claude/commands/do-release.md`:

1. **Version required, never assumed** — `argument-hint` reworded as `<X.Y.Z>` (required); intro now says "required and never assumed"; the "default to next patch" line is gone. New **pre-flight A**: no-arg → show current + `patch · minor · major` candidates with the "which one depends on what shipped" note → **STOP** and require an explicit re-run. Step 1 is now just "Confirm version" (sanity-check the supplied one).

2. **Roadmap pre-commit guardrail** — new **pre-flight B**: modified tracked `thread.md` with a `priority`/`depends_on`-only diff → auto-commit as `chore: roadmap`; new/untracked or non-roadmap `thread.md` → **STOP and report**, don't fold into the release commit. So when you run `/do-release 1.10.0`, pre-flight B will stop on the untracked `test-release-roadmap/` and tell you to commit it by hand (as `chore: add test-release-roadmap dogfood thread for v1.10.0`) before proceeding — exactly the flow we agreed.

Note these command edits to `.claude/commands/do-release.md` are themselves uncommitted right now. Decide whether they ride in your test-thread commit or get their own (`chore: require explicit version + roadmap pre-commit in do-release`) — I'd keep them separate from the dogfood thread.

Ready for you to commit and run `/do-release 1.10.0` whenever.

## AI:

**Finding — `do-release.md` can't be committed normally: `.claude/` is gitignored** (`.gitignore:69`). The only tracked file under it is `.claude/settings.local.json`, which was force-added. So `git add .claude/commands/do-release.md` silently does nothing.

Two ways forward — your call:
- **Force-add just this file** — `git add -f .claude/commands/do-release.md`. Mirrors how `settings.local.json` is already tracked; keeps the rest of `.claude/` (local settings, hooks, secrets) ignored. Cleanest if it's only the release runbook you want versioned.
- **Un-ignore `.claude/commands/`** as a category — add `!.claude/commands/` to `.gitignore` so every command file is tracked going forward. Better if you expect more shared slash commands.

I'd go with **force-add** for now — narrow, reversible, no policy change. Tell me which and I'll make that commit (`chore: require explicit version + roadmap pre-commit in do-release`).

Committing the test thread now regardless, as agreed.

## AI:

That one is a **leftover from the previous session, already-resolved** — not part of this dogfood. The diff is just the chat record of the step-4-done reply: `last_ai_block 2 → 4` plus an appended `## AI:` block noting "Step 4 ✅ — plan done, committed `42ffe73`". The *code* shipped in `42ffe73`, but the chat-doc append recording it was never committed, so it's sitting dirty.

It's a chat log catch-up — not roadmap metadata, not a release change, not related to do-release. Clean move is a standalone commit so it doesn't bleed into the release commit:

```
chore: log step-4-done reply in vscode-roadmap-release chat
```

Want me to commit it now? After that the working tree is clean except the gitignored `do-release.md` (still pending your force-add vs un-ignore call).

## AI:

Done — three clean commits:
- `f4aaa75` chore: add test-release-roadmap dogfood thread for v1.10.0
- `e9f18a9` chore: log step-4-done reply in vscode-roadmap-release chat
- `22e3919` chore: require explicit version + roadmap pre-commit in do-release (force-added; `.claude/` stays ignored otherwise)

Working tree is clean except this chat doc (my appends since `f4aaa75` — will fold into a later commit). Ready for `/do-release 1.10.0` whenever you are.

## AI:

### Dogfood result — v1.10.0 shipped, test passed ✅

`/do-release 1.10.0` ran end to end on the new runbook:
- **Pre-flight A** (version required) — `1.10.0` supplied, proceeded; minor bump confirmed against two `feat` commits since v1.9.2.
- **Pre-flight B** (roadmap pre-commit) — no dirty `thread.md`; only this chat was dirty, committed separately (`c0aefff`) as agreed.
- Bump (7 packages) → build green → full suite **green** (incl. 17 MCP integration tests) → `loom record-release 1.10.0` → `release: v1.10.0` (`a352c90`) → annotated tag → push.
- CI: `guard → build-test → publish(npm·vsce·ovsx) → release` all **success**.

**Live:** npm `@reslava/loom@1.10.0`, VS Code Marketplace + Open VSX `loom-vscode 1.10.0`, GitHub release v1.10.0.

**The hypothesis you set at the top of this chat held:** `record-release` stamped the 2 done plans that were in the *unversioned* history group, and they now show under `[v1.10.0]`; `loom roadmap` derives `current release: v1.10.0`. So the unversioned-history-threads → version-bumped flow works.

One observed gap (not a blocker): `record-release` printed a batch of pre-existing `Broken parent_id` warnings and an invalid-frontmatter skip on `loom/refs/superseeded/...` — stale data from older docs, surfaced because record-release builds the link index. Worth a separate cleanup thread if you want the roadmap output quiet.

## Rafa:

Could you do the cleanup manually? no hook active and authorized
Also need a small fix:
vscode extension roadmao history when grouped by release shows `unversioned` at the bottom, could you change this to show `unversioned` at top of history? I think no need a thread for this small fix, agree?

## AI:

### Small fix — agreed, no thread needed

`unversioned` at the **top** is right, and it actually makes the extension **consistent with the CLI**: `loom roadmap --group-by-release` already lists unversioned first (it iterates in date order, newest-first, and unstamped done plans are the newest). Only the extension explicitly forces `unversioned last` (`treeProvider.ts:436` `if (!a) return 1`). One-comparator flip + comment — no thread. (Needs build-all + Reload Window to see it.)

### Cleanup plan

**Note on method:** there's no `loom_*` tool that sets `parent_id`, so per your "no hook / authorized" these are direct frontmatter edits.

**6 broken `parent_id` — 1 repoint, 5 null:**
| doc | current parent_id | fix | why |
|---|---|---|---|
| `showing-docs-loaded-plan-001` | `showing-docs-loaded-design` (slug) | → `de_01KQYDFDD9VDV3GBT0DBVH15RE` | live design exists; repoint to its ULID |
| `loom-install-design` | `vscode-extension` (weave slug) | → `null` | no idea in the thread to parent under |
| `workflow-app-version-design` | `de_…F4QG72…HZ4` | → `null` | parent is **archived** (`.archive/workflow/`) |
| `workflow-run-command-design` | `de_…F4QG72…HZ4` | → `null` | same archived parent |
| `workflow-feature-model-design` | `de_…F4QG72…HZ4` | → `null` | same archived parent |
| `mvp-plan-to-publish-chat` | `vscode-extension-fixes-tweaks-chat.md` (filename) | → `null` | target doesn't exist |

**The superseeded ref — needs your call (destructive option):** `loom/refs/superseeded/workspace-directory-structure-reference.md` is a frontmatter-less **old copy** of the still-live `loom/refs/workspace-directory-structure-reference.md`. The folder also has a stray `thread.md` from today's migrate, so it surfaces as the junk `refs/superseeded` roadmap thread. Options:
- **Delete `loom/refs/superseeded/`** — removes the dead duplicate, the stray thread (cleans the roadmap), and the index warning in one go. My recommendation (the live version supersedes it; clean/no-legacy).
- **Archive it** to `loom/.archive/refs/superseeded/` — same effect on warnings/roadmap but keeps the dead copy.
- **Add `type: reference` frontmatter** — silences only the warning, keeps the duplicate + junk thread.

I'll do the extension fix + the 6 `parent_id` fixes now. **Tell me delete / archive / keep for `superseeded/`.**

## AI:

### Done — both items

**Cleanup:** all 6 broken `parent_id` fixed (1 repoint, 5 nulled), and `loom/refs/superseeded/` deleted (dead duplicate + stray `thread.md`). `loom roadmap` now runs **clean — zero link-index warnings**, and the junk `refs/superseeded` roadmap thread is gone.

**Extension fix:** `treeProvider.ts` now sorts the unversioned bucket **first** in release-grouped history; comment updated; root `CHANGELOG.md` `[Unreleased]` notes it. Build green (you'll need a Reload Window to see it live).

**Proposed commits (3, kept scope-clean):**
1. `fix(vscode): order unversioned bucket first in roadmap history` — `treeProvider.ts` + `CHANGELOG.md`
2. `fix(loom): repair broken parent_id links + drop superseeded ref` — the 6 doc edits + the 2 `superseeded/` deletions
3. `chore: dogfood chat — cleanup + history fix` — this chat

One leftover I noticed but left alone (not flagged by record-release, out of scope): `workflow-feature-model-design` still has a stale `requires_load: [references/workspace-directory-structure-reference.md]` (old `references/` path). Say the word and I'll fix it into commit 2.

Want me to make the 3 commits?