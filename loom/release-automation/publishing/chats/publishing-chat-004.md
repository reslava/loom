---
type: chat
id: ch_01KT9XA8J0CRT3WR2X9SMJKYJ3
title: v0.9.2
status: active
created: 2026-06-04
version: 1
tags: []
parent_id: null
requires_load: []
---
# v0.9.2

## Rafa:

After all README updates, you consider is worthg to release a patch 0.9.2 to publish them?

## AI:

Yes — and the reason is specific, not just "ship the docs."

The three READMEs live in **three different storefronts, and only one of them is already updated**:

- **Main `README.md`** → GitHub repo page. **Already live** — the push updated it instantly. No release needed for this one.
- **`packages/cli/README.md`** → the **npmjs.com package page**. This only refreshes when a new version is **published to npm**. Right now npm still shows the old CLI README (no tagline, no GIF, no guide links).
- **`packages/vscode/README.md`** → the **VS Code Marketplace listing**. The Marketplace renders the README bundled in the `.vsix`, and it **only updates on a new publish** — you can't even republish the same version number. So the Marketplace still shows the old extension README (manual `.mcp.json`, no cross-links).

So the npm page and the Marketplace listing — **the two actual storefronts a prospective user sees first** — are stale until you cut a release. That's the whole case: these are the front doors to Loom, you just improved them, and you're at the stage where first impressions are the cheapest validation lever you have. Leaving the better copy un-shipped means the improvement helps no one outside the repo.

**Is a patch the right level?** Yes. It's docs-only, no behavior change → `0.9.2` is exactly right semver-wise. The pipeline already works (v0.9.0, v0.9.1 cut cleanly), the publish jobs are idempotent, and republishing the same code under a new version is harmless. The version bump is the *mechanism* that pushes the new READMEs to npm + Marketplace — there's no other way to refresh those listings.

**One honest caveat:** purists dislike cutting a release for docs-only changes, and it does burn a version number on all three registries. But for a project whose Marketplace/npm pages are its storefront, "the listing is wrong" is a real product bug, and a patch is the correct fix.

**My recommendation:** cut `0.9.2`. If you want, I can do the docs-only release prep — synchronized version bump (the `versioning` thread's job), a CHANGELOG entry ("docs: README overhaul — hero demo, unified tagline + cross-links, corrected `.mcp.json` guidance"), and tag — then you trigger the pipeline. Want me to stage that?

## AI:

`0.9.2` release prep staged — everything done except the final commit + tag + push (which is what actually triggers the publish, so I stopped there for your go).

**What I did, per the `RELEASING.md` pre-tag checklist:**
1. **Root `CHANGELOG.md`** — added a `### Documentation` entry under `[Unreleased]` describing the README overhaul (this becomes the GitHub release body).
2. **`packages/vscode/CHANGELOG.md`** — added a dated `## [0.9.2]` section (the guard job requires it; noted "no functional extension changes").
3. **`bash scripts/bump-version.sh 0.9.2`** — bumped all 7 `package.json`s and rolled the root CHANGELOG `[Unreleased]` → `[0.9.2] - 2026-06-04`. Guard-mirror check passed (all 7 match).
4. **Build + tests green** — `build-all.sh` ✅, `test-all.sh` ✅ (multi-loom, commands, id-management, workspace-workflow, MCP integration all pass).

**Staged changes:** `CHANGELOG.md`, `package-lock.json`, `package.json` + all 6 `packages/*/package.json`, `packages/vscode/CHANGELOG.md`.

**To cut the release, run:**
```bash
git commit -am "release: v0.9.2"
git tag v0.9.2
git push --follow-tags
```
The tag push triggers `guard → build-test → publish (npm · vsce · ovsx) → GitHub release`. Once it's live, the npm page and Marketplace listing pick up the new READMEs.

**Two notes before you pull the trigger:**
- The README changes themselves are already on `main` (commit `5ad3b3a`) — the release just publishes them to the registries.
- The two new chat docs from this session (`global-chat-002.md`, `publishing-chat-004.md`) are untracked and **not** part of the release commit. Want them committed separately as project memory, or left as-is?

Say `go` and I'll run the commit + tag + push.