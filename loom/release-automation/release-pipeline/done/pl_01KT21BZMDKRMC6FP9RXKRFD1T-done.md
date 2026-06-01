---
type: done
id: pl_01KT21BZMDKRMC6FP9RXKRFD1T-done
title: Done — Build the release-pipeline workflow spine
status: done
created: "2026-06-01T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KT21BZMDKRMC6FP9RXKRFD1T
requires_load: []
---
# Done — Build the release-pipeline workflow spine

## Step 1 — Scaffold .github/workflows/release.yml with the release-only trigger (on: push: tags ['v*.*.*']) and the `guard` job: parse the tag into X.Y.Z, assert the user-facing package.json versions (root, packages/cli, packages/vscode) already equal the tag (fail-fast on a mistagged push), and expose the version as a job output for downstream jobs.

Created `.github/workflows/release.yml` with the release-only trigger `on: push: tags: ['v*.*.*']` and top-level `permissions: contents: read`. Added the `guard` job: parses `${GITHUB_REF_NAME}` → `VERSION` (strips the `v`), then loops over `package.json`, `packages/cli/package.json`, `packages/vscode/package.json` reading each `.version` via `node -p` and fails (with `::error file=...::`) on any mismatch. Exposes `version` as a job output for downstream jobs. Note recorded in the design: the canonical version-source list is owned by `versioning`; the guard checks the three user-facing files and extends later.

## Step 2 — Add the merged `build-test` job (needs: guard): runs ./scripts/build-all.sh then ./scripts/test-all.sh on one runner, then packs the npm tarball (npm pack on packages/cli) and the .vsix (vsce package on packages/vscode) and uploads both as workflow artifacts so publish jobs ship the exact tested bytes. Also fix tests/workspace-utils.ts to use os.tmpdir() instead of the hardcoded `j:/temp/loom` so test-all.sh runs cleanly on a Linux runner.

Added the merged `build-test` job (`needs: guard`): `actions/checkout@v4`, `actions/setup-node@v4` (node 20), `npm ci` (lockfile present), `bash scripts/build-all.sh` then `bash scripts/test-all.sh` on one runner (scripts invoked via `bash` to avoid exec-bit issues). Tail packs the npm tarball (`npm pack --pack-destination $GITHUB_WORKSPACE/artifacts` in `packages/cli`) and the `.vsix` (`vsce package --no-dependencies --out .../loom-vscode-<version>.vsix` in `packages/vscode`), then `actions/upload-artifact@v4` (`if-no-files-found: error`). This realizes the build-before-test order correction — the exact `dist/` tested is what gets packed.

Also fixed `tests/workspace-utils.ts`: added `import * as os from 'os'` and changed `WORKSPACE_ROOT` from the hardcoded `'j:/temp/loom'` to `path.join(os.tmpdir(), 'loom-test-workspace')`, so `test-all.sh` runs cleanly on a Linux runner instead of scribbling a `j:/` tree into the working dir.

## Step 3 — Add the three publish job skeletons — publish-npm, publish-vsce, publish-ovsx — each needs: build-test, downloads the artifacts, wires its secret (NPM_TOKEN / VSCE_PAT / OVSX_TOKEN), and includes the skip-if-already-published idempotency guard structure. Leave the actual publish + version-exists-query command bodies as clearly-marked integration points owned by the `publishing` thread; this step delivers the orchestration, ordering, artifact wiring, and secret plumbing only.

Added the three publish job skeletons — `publish-npm`, `publish-vsce`, `publish-ovsx` — each `needs: [guard, build-test]`, `setup-node@v4`, and `actions/download-artifact@v4` (name `release-artifacts`). Each has a two-step idempotency structure: a `check` step that sets `skip=true|false`, and a publish step gated on `if: steps.check.outputs.skip == 'false'` with the matching secret wired as env (`NODE_AUTH_TOKEN`←`NPM_TOKEN` with `registry-url`; `VSCE_PAT`; `OVSX_TOKEN`).

The **npm version-exists check is implemented** (`npm view @reslava/loom@$VERSION version`) since it's stable spine-level. The vsce/ovsx checks and **all three publish command bodies** are left as explicit `>>> INTEGRATION POINT — owned by \`publishing\` thread <<<` blocks that `echo TODO… && exit 1`. The `exit 1` is deliberate: until `publishing` fills them, a tag push passes guard+build-test and then fails loudly at publish — nothing is published and no GitHub release is cut (honest, no false "shipped" state). This step delivered orchestration, ordering, artifact wiring, secret plumbing, and idempotency structure only — not the publish commands.

## Step 4 — Add the `release` job: strict needs on all three publish jobs, permissions contents: write, extract the `## [X.Y.Z]` section from CHANGELOG.md (fail the job if no section matches the tag version), and create the GitHub release for the tag with that section as the body.

Added the `release` job: `needs: [guard, publish-npm, publish-vsce, publish-ovsx]` (strict — all three publish jobs must succeed) and job-level `permissions: contents: write`. Step 1 extracts the CHANGELOG section for the tag version and **fails the job if it's empty** (`::error::No CHANGELOG.md section found…`), implementing the one machine-enforced pre-tag check. Step 2 runs `gh release create "$GITHUB_REF_NAME" --title … --notes …` with `GH_TOKEN`←`GITHUB_TOKEN`.

**Bug caught during verification:** the first extraction used a dynamic awk regex `"^## \\[" ver "\\]"`, which awk interprets as a character class `[X.Y.Z]` (emitting escape-sequence warnings) — so it matched nothing and the real 0.7.0 section came back empty (the gate "passed" only because everything was empty). Root cause: regex metacharacters in a dynamic awk pattern. Fixed by switching to literal `index()` matching: `index($0, "## ["VERSION"]") == 1` to find the header and `index($0, "## [") == 1` to stop at the next section. Re-verified with the real CHANGELOG: 0.7.0 notes extract correctly, and a bogus 9.9.9 yields empty → release fails closed.

## Step 5 — Author RELEASING.md (the trust-based pre-tag checklist: bump, review 3 READMEs, write CHANGELOG section, local build+test green, tag+push) and seed CHANGELOG.md in Keep-a-Changelog format with a section for the current version, so the `release` job's extraction has a real target.

Authored `RELEASING.md` (new) — the trust-based pre-tag checklist (bump via `versioning`; review the 3 READMEs; write the CHANGELOG section; local `build-all && test-all` green; commit/tag/push), plus a secrets table and the partial-failure recovery (re-run same tag first, patch roll-forward as fallback) and a "known risks" note that the publish bodies are `publishing`-owned integration points.

`CHANGELOG.md` already existed (real history back to 0.1.0, but stopped at 0.5.0). **Did not overwrite it** — inserted `## [Unreleased]` and a `## [0.7.0] - 2026-06-01` section (Added/Changed/Fixed, drawn from the recent commits: user guides + READMEs, context sidebar, unified `loom_refresh_ctx`, esbuild-bundled CLI) in the existing Keep-a-Changelog style, added a one-line note that the section is extracted as release notes, and added `[Unreleased]`/`[0.7.0]`/`[0.5.0]` link refs at the bottom. Removed the trailing `---` between the new block and `## [0.5.0]` so extracted notes don't carry a stray horizontal rule.

Verified end-to-end locally (no CI run available): `release.yml` parses as valid YAML (jobs guard, build-test, publish-npm, publish-vsce, publish-ovsx, release; release.needs = all three publishers), and the exact `release`-job awk extracts the 0.7.0 notes correctly while failing closed on a missing version.
