---
type: plan
id: pl_01KT21BZMDKRMC6FP9RXKRFD1T
title: Build the release-pipeline workflow spine
status: done
created: 2026-06-01
updated: 2026-06-01
version: 2
design_version: 4
tags: []
parent_id: de_01KT20ZZ6ZYW01G09F4WDXMT88
requires_load: []
target_version: 0.1.0
actual_release: 0.7.0
steps:
  - id: scaffold
    order: 1
    status: done
    description: "Scaffold .github/workflows/release.yml with the release-only trigger (on: push: tags ['v*.*.*']) and the `guard` job: parse the tag into X.Y.Z, assert the user-facing package.json versions (root, packages/cli, packages/vscode) already equal the tag (fail-fast on a mistagged push), and expose the version as a job output for downstream jobs."
    files_touched: ["`.github/workflows/release.yml`"]
    blocked_by: []
    satisfies: []
  - id: add-the-merged-job-needs-guard
    order: 2
    status: done
    description: "Add the merged `build-test` job (needs: guard): runs ./scripts/build-all.sh then ./scripts/test-all.sh on one runner, then packs the npm tarball (npm pack on packages/cli) and the .vsix (vsce package on packages/vscode) and uploads both as workflow artifacts so publish jobs ship the exact tested bytes. Also fix tests/workspace-utils.ts to use os.tmpdir() instead of the hardcoded `j:/temp/loom` so test-all.sh runs cleanly on a Linux runner."
    files_touched: ["`.github/workflows/release.yml`", "`tests/workspace-utils.ts`"]
    blocked_by: []
    satisfies: []
  - id: add-the-three-publish-job-skeletons
    order: 3
    status: done
    description: "Add the three publish job skeletons — publish-npm, publish-vsce, publish-ovsx — each needs: build-test, downloads the artifacts, wires its secret (NPM_TOKEN / VSCE_PAT / OVSX_TOKEN), and includes the skip-if-already-published idempotency guard structure. Leave the actual publish + version-exists-query command bodies as clearly-marked integration points owned by the `publishing` thread; this step delivers the orchestration, ordering, artifact wiring, and secret plumbing only."
    files_touched: ["`.github/workflows/release.yml`"]
    blocked_by: []
    satisfies: []
  - id: add-the-job-strict-needs-on
    order: 4
    status: done
    description: "Add the `release` job: strict needs on all three publish jobs, permissions contents: write, extract the `## [X.Y.Z]` section from CHANGELOG.md (fail the job if no section matches the tag version), and create the GitHub release for the tag with that section as the body."
    files_touched: ["`.github/workflows/release.yml`"]
    blocked_by: []
    satisfies: []
  - id: author-releasing
    order: 5
    status: done
    description: "Author RELEASING.md (the trust-based pre-tag checklist: bump, review 3 READMEs, write CHANGELOG section, local build+test green, tag+push) and seed CHANGELOG.md in Keep-a-Changelog format with a section for the current version, so the `release` job's extraction has a real target."
    files_touched: ["`RELEASING.md`", "`CHANGELOG.md`"]
    blocked_by: []
    satisfies: []
---
# Build the release-pipeline workflow spine

## Goal

Implement the tag-driven GitHub Actions spine from release-pipeline-design: a release-only workflow (guard → build-test → fan-out publish jobs → release), the RELEASING.md pre-tag checklist, and a seeded CHANGELOG.md. Scope is the spine only — publish-command bodies and the version-source bump are contracts fulfilled by the `publishing` and `versioning` sibling threads. Each publish job is built as a skip-if-already-published skeleton so re-running the same tag is the first-line partial-failure recovery.

**Order correction (chat-001):** the test suite imports `packages/*/dist/`, so build must precede test. Build+test are therefore one `build-test` job (mirrors local flow; tested-bytes == shipped-bytes).
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Scaffold .github/workflows/release.yml with the release-only trigger (on: push: tags ['v*.*.*']) and the `guard` job: parse the tag into X.Y.Z, assert the user-facing package.json versions (root, packages/cli, packages/vscode) already equal the tag (fail-fast on a mistagged push), and expose the version as a job output for downstream jobs. | `.github/workflows/release.yml` | — | — |
| ✅ | 2 | Add the merged `build-test` job (needs: guard): runs ./scripts/build-all.sh then ./scripts/test-all.sh on one runner, then packs the npm tarball (npm pack on packages/cli) and the .vsix (vsce package on packages/vscode) and uploads both as workflow artifacts so publish jobs ship the exact tested bytes. Also fix tests/workspace-utils.ts to use os.tmpdir() instead of the hardcoded `j:/temp/loom` so test-all.sh runs cleanly on a Linux runner. | `.github/workflows/release.yml`, `tests/workspace-utils.ts` | — | — |
| ✅ | 3 | Add the three publish job skeletons — publish-npm, publish-vsce, publish-ovsx — each needs: build-test, downloads the artifacts, wires its secret (NPM_TOKEN / VSCE_PAT / OVSX_TOKEN), and includes the skip-if-already-published idempotency guard structure. Leave the actual publish + version-exists-query command bodies as clearly-marked integration points owned by the `publishing` thread; this step delivers the orchestration, ordering, artifact wiring, and secret plumbing only. | `.github/workflows/release.yml` | — | — |
| ✅ | 4 | Add the `release` job: strict needs on all three publish jobs, permissions contents: write, extract the `## [X.Y.Z]` section from CHANGELOG.md (fail the job if no section matches the tag version), and create the GitHub release for the tag with that section as the body. | `.github/workflows/release.yml` | — | — |
| ✅ | 5 | Author RELEASING.md (the trust-based pre-tag checklist: bump, review 3 READMEs, write CHANGELOG section, local build+test green, tag+push) and seed CHANGELOG.md in Keep-a-Changelog format with a section for the current version, so the `release` job's extraction has a real target. | `RELEASING.md`, `CHANGELOG.md` | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
