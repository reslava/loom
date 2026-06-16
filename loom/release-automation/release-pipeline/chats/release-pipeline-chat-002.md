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
last_ai_block: 1
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