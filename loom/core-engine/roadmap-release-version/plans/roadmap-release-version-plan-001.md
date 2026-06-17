---
type: plan
id: pl_01KVA8BZCDDJKMWMCB6YQQ3Z25
title: Wire actual_release through plans, the read-model, and the release pipeline
status: done
created: 2026-06-17
updated: 2026-06-17
version: 1
design_version: 1
tags: []
parent_id: de_01KVA7ABHNH0MC2FZSS1PPT4J7
requires_load: []
target_version: 0.1.0
actual_release: 1.10.0
steps:
  - id: core-entities
    order: 1
    status: done
    description: "Schema changes in core: add `actual_release?: string | null` to PlanDoc; remove `target_release` and `actual_release` from DesignDoc; update the `serializeFrontmatter` key order (add `actual_release` under plan-specific, remove the two design-specific release keys)."
    files_touched: [packages/core/src/entities/plan.ts, packages/core/src/entities/design.ts, packages/core/src/frontmatterUtils.ts]
    blocked_by: []
    satisfies: []
  - id: semver-util
    order: 2
    status: done
    description: "New pure `versionUtils.ts` in core: parse `\"X.Y.Z\"`, compare two versions, and max over a list. No `semver` dependency, no IO. Export from the core index. Reused by current_release derivation and history ordering."
    files_touched: [packages/core/src/versionUtils.ts, packages/core/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: roadmap-readmodel
    order: 3
    status: done
    description: "buildRoadmap: history nodes gain a `release` field (from the done plan's `actual_release`); derive `current_release` = max(actual_release) over history using versionUtils (derive-only, empty history → none)."
    files_touched: [packages/core/src/derived.ts]
    blocked_by: [core-entities, semver-util]
    satisfies: []
  - id: record-release-usecase
    order: 4
    status: done
    description: "app `recordRelease(input, deps)` use-case. Default (live) mode: stamp every done plan whose `actual_release == null` with the given version. Backfill mode: assign each done plan by its done-date to the version whose (prevDate, date] range covers it, from a supplied `{version → date}` map; orchestrate by replaying per version in chronological order. Only ever stamps null plans (idempotent, no-op on re-run); an explicit `overwrite` flag is the deliberate correction path. Persist via runEvent. Core never reads git."
    files_touched: [packages/app/src/recordRelease.ts, packages/app/src/index.ts]
    blocked_by: [core-entities, semver-util]
    satisfies: []
  - id: record-release-tool
    order: 5
    status: done
    description: New `loom_record_release` MCP tool wrapping the recordRelease use-case (live + backfill + overwrite args); register it in the tool registry/catalog.
    files_touched: [packages/mcp/src/tools/recordRelease.ts, packages/mcp/src/tools/index.ts]
    blocked_by: [record-release-usecase]
    satisfies: []
  - id: remove-target-release-updatedoc
    order: 6
    status: done
    description: Remove the `target_release` param, its design-only guard, and its description text from `loom_update_doc`; update integration tests that reference `target_release`.
    files_touched: [packages/mcp/src/tools/updateDoc.ts, packages/mcp/tests/integration.test.ts]
    blocked_by: [core-entities]
    satisfies: []
  - id: roadmap-resource
    order: 7
    status: done
    description: "loom://roadmap resource: history nodes carry `release`; the resource exposes the derived `current_release`."
    files_touched: [packages/mcp/src/resources/roadmap.ts]
    blocked_by: [roadmap-readmodel]
    satisfies: []
  - id: cli-roadmap-backfill
    order: 8
    status: done
    description: "`loom roadmap` History labels/groups shipped items by release version; add a `loom backfill-releases` command — a thin wrapper that builds the `{version → date}` map on the caller side (e.g. from git tags) and feeds it into the backfill path. Not part of `loom migrate`."
    files_touched: [packages/cli/src/commands/roadmap.ts, packages/cli/src/commands/backfillReleases.ts, packages/cli/src/index.ts]
    blocked_by: [roadmap-readmodel, record-release-usecase]
    satisfies: []
  - id: vscode-tree
    order: 9
    status: done
    description: Drop the `target_release` display from the vscode roadmap/tree provider.
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [core-entities]
    satisfies: []
  - id: do-release-step
    order: 10
    status: done
    description: "Add a step to the do-release skill: after tagging vX.Y.Z, call `loom_record_release(version)` so Loom's record is written from the pipeline and can cross-check git."
    files_touched: [.claude/commands/do-release.md]
    blocked_by: [record-release-tool]
    satisfies: []
  - id: tests
    order: 11
    status: done
    description: "Unit tests: versionUtils (parse/compare/max); recordRelease (live sweep-unstamped, backfill date-range assignment, idempotent re-run no-op, overwrite opt-in); roadmap read-model surfacing `release` + `current_release`. Run ./scripts/build-all.sh + ./scripts/test-all.sh green."
    files_touched: [tests/version-utils.test.ts, tests/record-release.test.ts, tests/roadmap-release.test.ts]
    blocked_by: [semver-util, roadmap-readmodel, record-release-usecase]
    satisfies: []
  - id: backfill-loom-history
    order: 12
    status: done
    description: "Execute the full backfill against Loom's real history: build the version/date map from git tags, run `loom backfill-releases`, and verify `current_release` and `loom roadmap` / `loom://roadmap` show the correct shipped versions."
    files_touched: [loom/core-engine/roadmap-release-version/]
    blocked_by: [cli-roadmap-backfill, tests]
    satisfies: []
---
# Wire actual_release through plans, the read-model, and the release pipeline

## Goal

Record the release version on shipped plans and surface it through Loom's roadmap, while removing the speculative/lossy fields it replaces. Adds `actual_release` to PlanDoc (the single authoritative carrier), drops `target_release` and design-level `actual_release` from the entities/serializer/update tool/tree, adds a pure semver util plus `current_release` derivation and per-item release in the roadmap read-model, and introduces `loom_record_release` (live: sweep unstamped done plans; backfill: date-ranged assignment from a pipeline-supplied `{version → date}` map) called by the project's release pipeline. Loom never reads package.json/git; the pipeline pushes version facts in. Ends by backfilling Loom's own full release history. The quick-ship 1-step-plan affordance is out of scope (sibling thread).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Schema changes in core: add `actual_release?: string \| null` to PlanDoc; remove `target_release` and `actual_release` from DesignDoc; update the `serializeFrontmatter` key order (add `actual_release` under plan-specific, remove the two design-specific release keys). | packages/core/src/entities/plan.ts, packages/core/src/entities/design.ts, packages/core/src/frontmatterUtils.ts | — | — |
| ✅ | 2 | New pure `versionUtils.ts` in core: parse `"X.Y.Z"`, compare two versions, and max over a list. No `semver` dependency, no IO. Export from the core index. Reused by current_release derivation and history ordering. | packages/core/src/versionUtils.ts, packages/core/src/index.ts | — | — |
| ✅ | 3 | buildRoadmap: history nodes gain a `release` field (from the done plan's `actual_release`); derive `current_release` = max(actual_release) over history using versionUtils (derive-only, empty history → none). | packages/core/src/derived.ts | core-entities, semver-util | — |
| ✅ | 4 | app `recordRelease(input, deps)` use-case. Default (live) mode: stamp every done plan whose `actual_release == null` with the given version. Backfill mode: assign each done plan by its done-date to the version whose (prevDate, date] range covers it, from a supplied `{version → date}` map; orchestrate by replaying per version in chronological order. Only ever stamps null plans (idempotent, no-op on re-run); an explicit `overwrite` flag is the deliberate correction path. Persist via runEvent. Core never reads git. | packages/app/src/recordRelease.ts, packages/app/src/index.ts | core-entities, semver-util | — |
| ✅ | 5 | New `loom_record_release` MCP tool wrapping the recordRelease use-case (live + backfill + overwrite args); register it in the tool registry/catalog. | packages/mcp/src/tools/recordRelease.ts, packages/mcp/src/tools/index.ts | record-release-usecase | — |
| ✅ | 6 | Remove the `target_release` param, its design-only guard, and its description text from `loom_update_doc`; update integration tests that reference `target_release`. | packages/mcp/src/tools/updateDoc.ts, packages/mcp/tests/integration.test.ts | core-entities | — |
| ✅ | 7 | loom://roadmap resource: history nodes carry `release`; the resource exposes the derived `current_release`. | packages/mcp/src/resources/roadmap.ts | roadmap-readmodel | — |
| ✅ | 8 | `loom roadmap` History labels/groups shipped items by release version; add a `loom backfill-releases` command — a thin wrapper that builds the `{version → date}` map on the caller side (e.g. from git tags) and feeds it into the backfill path. Not part of `loom migrate`. | packages/cli/src/commands/roadmap.ts, packages/cli/src/commands/backfillReleases.ts, packages/cli/src/index.ts | roadmap-readmodel, record-release-usecase | — |
| ✅ | 9 | Drop the `target_release` display from the vscode roadmap/tree provider. | packages/vscode/src/tree/treeProvider.ts | core-entities | — |
| ✅ | 10 | Add a step to the do-release skill: after tagging vX.Y.Z, call `loom_record_release(version)` so Loom's record is written from the pipeline and can cross-check git. | .claude/commands/do-release.md | record-release-tool | — |
| ✅ | 11 | Unit tests: versionUtils (parse/compare/max); recordRelease (live sweep-unstamped, backfill date-range assignment, idempotent re-run no-op, overwrite opt-in); roadmap read-model surfacing `release` + `current_release`. Run ./scripts/build-all.sh + ./scripts/test-all.sh green. | tests/version-utils.test.ts, tests/record-release.test.ts, tests/roadmap-release.test.ts | semver-util, roadmap-readmodel, record-release-usecase | — |
| ✅ | 12 | Execute the full backfill against Loom's real history: build the version/date map from git tags, run `loom backfill-releases`, and verify `current_release` and `loom roadmap` / `loom://roadmap` show the correct shipped versions. | loom/core-engine/roadmap-release-version/ | cli-roadmap-backfill, tests | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
