---
type: chat
id: ch_01KTJSF8A06E741W69J4WJ1T8C
title: cli-commands Chat
status: done
created: "2026-06-08T00:00:00.000Z"
updated: 2026-06-08
version: 2
tags: []
parent_id: null
requires_load: []
---
# cli-commands Chat

## Rafa:

prepare for release v1.2.0
Update `packages/cli/README.md`
Update `loom/refs/architecture-reference.md` with new APP, CLI, mcp capabilities
Update README, CHANGELOG, etc
commit all, push, tag main



## AI:

Surveyed the release surface before touching anything. Here's the plan — **one decision + one hard gate** before I execute.

## What ships in 1.2.0
The uncommitted work from this session: the **CLI Commands Tier 1+2** feature (`cli-commands` thread). New terminal-reachable commands over an in-process MCP client + three extracted app use-cases. `git log v1.1.0..HEAD` shows only the `loom://catalog` readme commit, so everything else is still in the working tree — this is genuinely the 1.2.0 payload.

**Version:** 1.2.0 is correct — additive CLI feature, no breaking changes, lockstep bump of all 7 `package.json`. The VS Code extension had **no functional change** this cycle (the work never touched `packages/vscode/`), but the release guard requires a `[1.2.0]` section in *both* changelogs, so its entry will explicitly say "no functional changes; synchronized version bump."

## The release is tag-driven and the tag push publishes for real
Per `RELEASING.md` + `.github/workflows/release.yml`: pushing an annotated `v1.2.0` tag triggers `guard → build-test → publish(npm · vsce · ovsx) → GitHub release`. **That publish is live and npm versions are immutable.** So I'll do everything locally and **stop before the tag/push** for your explicit go.

## Checklist I'll run (in order)
1. **`CHANGELOG.md`** — add `## [1.2.0]` (Added: the 7 new commands + the in-process MCP client; Changed: search/stale/blocked logic extracted into shared app use-cases so CLI + MCP tools have one source of truth).
2. **`packages/vscode/CHANGELOG.md`** — `## [1.2.0]` stating no functional extension changes.
3. **`packages/cli/README.md`** — new "MCP-surface & query commands" rows: `catalog`, `resources` / `resources read <uri>`, `context`, `next`, `search`, `stale`, `blocked`.
4. **Root `README.md`** — mirror the new commands where it lists the surface.
5. **`loom/refs/architecture-reference.md`** — record the new capabilities: app use-cases (`searchDocs`, `getStaleDocs`, `getBlockedSteps`), CLI `mcpClient.ts` + commands, and that the corresponding MCP tools now delegate to app (no duplicated logic). *(refs are gate-excluded — hand-edited.)*
6. **`bash scripts/bump-version.sh 1.2.0`** — bumps all 7 `package.json`, rolls `[Unreleased] → [1.2.0]`.
7. **`build-all.sh && test-all.sh`** — confirm green.
8. **`git commit -am "release: v1.2.0"`** — commit all (reversible).
9. **STOP** — show you the diff, wait for go, then `git tag -a v1.2.0 -m v1.2.0 && git push --follow-tags`.

Want me to proceed through steps 1–8 now and hold at the tag/push? Or would you rather review/adjust the changelog wording first?

## Rafa:

Do 1-8


## AI:

Steps 1–8 done — committed as `f113469 release: v1.2.0 — terminal-reachable MCP surface CLI commands`. **Stopped before the tag/push** (step 9) for your go.

**Done:**
1. `CHANGELOG.md` — `[1.2.0]` section (Added: 7 new commands + in-process MCP client; Changed: search/stale/blocked extracted to shared app use-cases).
2. `packages/vscode/CHANGELOG.md` — `[1.2.0]`: no functional extension changes.
3. `packages/cli/README.md` — new "MCP surface & queries" command table.
4. Root `README.md` — no change needed (it delegates to the refs; I updated `loom/refs/cli-commands-reference.md` instead, which is the "Every `loom` command" doc).
5. `loom/refs/architecture-reference.md` — app query use-cases, CLI in-process MCP client, and tool→app delegation noted.
6. `bash scripts/bump-version.sh 1.2.0` — all 7 `package.json` → 1.2.0, rolled `[Unreleased] → [1.2.0]`.
7. `build-all.sh` + `test-all.sh` — both green (16/16 MCP integration, Tier 1+2 commands, mcpClient unit test).
8. `git commit` — clean tree, all 7 versions = 1.2.0, both changelogs have `[1.2.0]` → guard will pass.

**⚠️ Heads-up — three pre-existing working-tree changes rode along in the commit** (they were already modified/deleted before this session, unrelated to 1.2.0):
- `M loom/core-engine/requirements-driven-development/chats/requirements-driven-development-chat-003.md`
- `D loom/test/t/chats/test-chat-001.md`
- `D loom/test/test-create-a-brief-text-file-…-idea.md`

If you want them out of the release commit, say so and I'll `git reset` + re-stage only the 1.2.0 changes before tagging. Otherwise:

**On your go I'll run** (this triggers the live publish to npm + VS Code Marketplace + Open VSX — npm is immutable):
```
git tag -a v1.2.0 -m v1.2.0
git push --follow-tags
```
Say **go** to tag + push, or tell me to drop the three unrelated changes first.


## AI:

Tagged + pushed. `main` is at `f113469` and `v1.2.0` is pushed — the **release workflow is in progress** (run `27118771241`): `guard → build-test → publish(npm · vsce · ovsx) → GitHub release`. Watching it to completion now; will report green or the first failing job.

## AI:

✅ **Release v1.2.0 shipped.** Workflow run `27118771241` completed green end-to-end:
- `guard` — version sync (7×) + both changelog sections ✓
- `build-test` — build-all + test-all + packed npm tarball & .vsix ✓
- `publish-npm` — `@reslava/loom@1.2.0` → npm ✓
- `publish-vsce` — `reslava.loom-vscode@1.2.0` → VS Code Marketplace ✓
- `publish-ovsx` — → Open VSX ✓
- `release` — GitHub release `v1.2.0` created from the CHANGELOG section ✓

Only annotations were the harmless "Node.js 20 actions deprecated" warnings (upload/download-artifact, setup-node) — nothing failed. 1.2.0 is live on all three registries.