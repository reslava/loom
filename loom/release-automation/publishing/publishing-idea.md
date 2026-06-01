---
type: idea
id: id_01KT2FN4D7V6J3TK7G07CXDJTE
title: Publish jobs — fill the spine's integration points
status: done
created: "2026-06-01T00:00:00.000Z"
updated: 2026-06-01
version: 3
tags: []
parent_id: null
requires_load: []
---
# Publish jobs — fill the spine's integration points

## What

The concrete publish logic that the `release-pipeline` spine deliberately left as
`>>> INTEGRATION POINT — owned by \`publishing\` thread <<<` stubs in
`.github/workflows/release.yml`. This thread replaces those stubs with the real
commands that ship the **already-built, already-tested** artifacts (the npm
tarball and the `.vsix`, downloaded from the spine's `release-artifacts`) to the
three registries — plus the version-exists checks that keep each job idempotent,
plus a runbook for provisioning the tokens each registry needs.

This is **project infra for shipping Loom itself**, not a user-visible feature.
The manual step it removes is the maintainer hand-running `npm publish` /
`vsce publish` / `ovsx publish` on every release.

## Scope — what this thread owns

The three publish-job bodies in `release.yml`:

1. **`publish-npm`** — publish `artifacts/reslava-loom-X.Y.Z.tgz` to npm. The
   scoped package's first publish needs `--access public`.
2. **`publish-vsce`** — (a) the existence-check query that sets `skip=true` when
   `reslava.loom-vscode@X.Y.Z` is already on the Marketplace; (b) the publish
   body that pushes the `.vsix` from `artifacts/`.
3. **`publish-ovsx`** — the same two pieces for Open VSX.
4. **Token runbook** — how to mint and register `NPM_TOKEN` (npm automation,
   `@reslava` scope), `VSCE_PAT` (Azure DevOps PAT, Marketplace-publish scope),
   and `OVSX_TOKEN` (open-vsx.org), feeding the secrets table already stubbed in
   `RELEASING.md`.

## Explicit non-scope (reconciliation with the spine)

The original `release-pipeline-idea` scoped this thread as "the publish jobs …
**and the GitHub release**." The spine implementation moved more here than that
bullet implied, so this thread is **narrower**:

- **The GitHub release job is already done** in the spine (CHANGELOG extraction +
  `gh release create`). Not this thread.
- **Job structure, ordering, `needs`, artifact download, secret env wiring, and
  the skip-if-published *control structure*** are all done in the spine. This
  thread fills only the **command + query bodies** inside those structures.
- **The synchronized version bump** is the `versioning` thread.

So: this thread is "make the three stubbed jobs actually publish, idempotently,
with documented tokens" — nothing more.

## Open questions for design

- **Production build flag (the real one).** The spine's `build-test` job runs
  `build-all.sh`, which builds the CLI with **dev** esbuild (`node esbuild.js`),
  not `--production`. So the packed tarball ships unminified. Do we want the
  release to build production artifacts? If yes, where does that live — a flag on
  `build-all.sh`, or a publish-time rebuild (which would break "tested-bytes ==
  shipped-bytes")? This needs a decision.
- **npm publish source.** Publish the packed `*.tgz` (keeps tested == shipped) vs
  `npm publish` from `packages/cli/` (re-runs `prepublishOnly`). Lean: the
  tarball, to honor the spine's artifact contract.
- **Existence-check commands.** Exact, reliable queries for "version X.Y.Z already
  published" on Marketplace (`vsce show reslava.loom-vscode`?) and Open VSX
  (`ovsx get`?), and how to parse them without false negatives.
- **First-publish bootstrapping (one-time, manual prerequisites).** Scoped npm
  package needs `--access public` on first publish; the `reslava` Marketplace
  publisher and the Open VSX namespace must exist before the first push. Document
  as prerequisites, not automated.
- **Dry-run path.** Do we want a way to exercise publishing against a throwaway
  pre-release tag before the first real release (`npm publish --dry-run`, package
  the `.vsix` without publishing)?

## Success criteria

- The three `INTEGRATION POINT` blocks in `release.yml` are replaced with real,
  idempotent publish commands; no `exit 1` stubs remain.
- Re-running the same tag's workflow skips any artifact already published.
- Token provisioning is documented well enough that a fresh clone can cut a
  release.
- A throwaway pre-release tag publishes all three artifacts (or dry-runs cleanly),
  proving the spine + publishing compose end-to-end.
