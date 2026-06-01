---
type: idea
id: id_01KT1ZQN9P0J3JNFPRPPMSXVP3
title: Automate Loom release pipeline
status: done
created: "2026-06-01T00:00:00.000Z"
updated: 2026-06-01
version: 3
tags: []
parent_id: null
requires_load: []
---
# Automate Loom release pipeline

## What

A GitHub Actions release pipeline for the Loom monorepo that ships both publishable
artifacts — the CLI (`@reslava/loom` → npm) and the VS Code extension (`.vsix` →
VS Code Marketplace + Open VSX) — from a single trigger, plus a GitHub release.

This is **project infra for shipping Loom itself**, not a user-visible Loom feature.
The manual steps it removes are the maintainer's: hand-bumping versions, running
`npm publish` / `vsce publish` by hand, tagging, and writing release notes.

## Why it matters

Today a release is a manual, error-prone sequence: bump versions in the right files,
rebuild, publish two artifacts to three registries, tag, and write a release. Any
missed step ships a broken or inconsistent release (the stale `0.2.0` `--version`
string was exactly this class of drift). Automating it makes releases one action,
repeatable, and recorded.

## Locked decisions

These were settled in conversation and are not open for re-litigation in design:

1. **Trigger model: tag-driven.** The maintainer bumps the version + changelog
   locally and pushes a `vX.Y.Z` tag. CI reacts to the tag: test → build → publish →
   GitHub release. CI never pushes to `main` and never owns the version bump.
2. **Versioning: one synchronized version.** CLI and extension always share the same
   version number. A single bump moves both; the pushed tag is the single source of
   truth that both artifacts read.
3. **Scope split: 3 threads** under weave `release-automation`:
   - `release-pipeline` (this thread) — the GitHub Actions workflow spine.
   - `versioning` — the synchronized-bump mechanism (one command bumps every
     `package.json` + anywhere else the version lives) and the tag convention.
   - `publishing` — the publish jobs for npm + Marketplace + Open VSX, and the
     GitHub release.

## Explicit non-goal: READMEs are not auto-updated

CI does **not** generate or edit READMEs (root, extension, CLI). README content is
human/AI work. Instead, reviewing/updating the three READMEs is a **pre-tag gate** —
a remembered checklist step the maintainer (and the AI assisting the release) must
complete *before* pushing the version tag. The pipeline must surface this reminder
so it is not forgotten; the exact mechanism (a `RELEASING.md` checklist, a
pre-tag script that prompts, or both) is a design question for `release-pipeline`.
The CLI README already carries no hardcoded version (it reads `package.json`), which
removes one source of drift.

## Success criteria

- Maintainer runs one bump command, reviews the READMEs (pre-tag gate), and pushes a
  single `vX.Y.Z` tag.
- CI then, with no further manual commands:
  - runs the full test suite and fails the release if anything is red;
  - builds all packages via the canonical build;
  - publishes `@reslava/loom` to npm at the tag version;
  - publishes the `.vsix` to VS Code Marketplace and Open VSX at the same version;
  - creates a GitHub release for the tag with notes.
- `loom --version` and the extension's reported version both equal the tag.
- A failed test or build aborts the release before anything is published (no
  half-published version).

## Open questions for design

- Pre-tag README gate: checklist doc vs script-with-prompt vs both, and how CI
  verifies it happened (or whether it's trust-based).
- Release notes source: hand-written `CHANGELOG.md`, auto-generated from commits, or
  GitHub's auto-notes.
- Open VSX: publish there in v1 or Marketplace-only first.
- Secrets surface (handled in `publishing`): `NPM_TOKEN`, `VSCE_PAT`, `OVSX_TOKEN`,
  `GITHUB_TOKEN`.
- Partial-failure handling: if npm succeeds but vsix publish fails, how do we recover
  given the version is already consumed on npm (immutable)?
