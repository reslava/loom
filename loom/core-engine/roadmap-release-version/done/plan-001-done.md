---
type: done
id: pl_01KVA8BZCDDJKMWMCB6YQQ3Z25-done
title: Done — Wire actual_release through plans, the read-model, and the release pipeline
status: done
created: 2026-06-17
version: 12
tags: []
parent_id: pl_01KVA8BZCDDJKMWMCB6YQQ3Z25
requires_load: []
---
# Done — Wire actual_release through plans, the read-model, and the release pipeline

## Step 1 — Schema changes in core: add `actual_release?: string | null` to PlanDoc; remove `target_release` and `actual_release` from DesignDoc; update the `serializeFrontmatter` key order (add `actual_release` under plan-specific, remove the two design-specific release keys).

Schema changes in core:
- `packages/core/src/entities/plan.ts`: added `actual_release?: string | null` to `PlanDoc` (the single authoritative carrier of the shipped release).
- `packages/core/src/entities/design.ts`: removed `target_release` and `actual_release` from `DesignDoc`.
- `packages/core/src/frontmatterUtils.ts`: dropped both keys from the design-specific block of `ORDERED_KEYS`; added `actual_release` to the plan-specific block (before `steps`).

Verified the fs loader (`frontmatterLoader.ts`) spreads `...parsed.data`, so doc-level `actual_release` round-trips generically — no fs change needed. The two remaining repo references (`treeProvider.ts`, `updateDoc.ts`) are `as any` / untyped string args, so removing the typed design fields does not break compilation; they are cleaned in steps 9 and 6.

## Step 2 — New pure `versionUtils.ts` in core: parse `"X.Y.Z"`, compare two versions, and max over a list. No `semver` dependency, no IO. Export from the core index. Reused by current_release derivation and history ordering.

New pure `packages/core/src/versionUtils.ts`: `parseVersion` (tolerates a leading `v`, returns null for non-`X.Y.Z`), `compareVersions` (unparseable sorts below parseable), `maxVersion` (greatest parseable, skips null/unparseable). No `semver` dependency, no IO. Prerelease/build metadata intentionally not modelled. Exported `SemVer`, `parseVersion`, `compareVersions`, `maxVersion` from `packages/core/src/index.ts`.

## Step 3 — buildRoadmap: history nodes gain a `release` field (from the done plan's `actual_release`); derive `current_release` = max(actual_release) over history using versionUtils (derive-only, empty history → none).

`packages/core/src/derived.ts`:
- Imported `maxVersion`.
- `ShippedPlan` gained `release: string | null` (sourced from `plan.actual_release ?? null` in `buildHistory`).
- `RoadmapView` gained `currentRelease: string | null` — derived in `buildRoadmap` as `maxVersion(history.map(h => h.release))`. Derive-only, empty/unstamped history → null.

## Step 4 — app `recordRelease(input, deps)` use-case. Default (live) mode: stamp every done plan whose `actual_release == null` with the given version. Backfill mode: assign each done plan by its done-date to the version whose (prevDate, date] range covers it, from a supplied `{version → date}` map; orchestrate by replaying per version in chronological order. Only ever stamps null plans (idempotent, no-op on re-run); an explicit `overwrite` flag is the deliberate correction path. Persist via runEvent. Core never reads git.

Core event plumbing + app use-case.

Core (mechanism):
- `events/planEvents.ts`: added `{ type: 'RECORD_RELEASE'; release: string; planId?: string }` to `PlanEvent` (so it flows into `WorkflowEvent`).
- `reducers/planReducer.ts`: `RECORD_RELEASE` case — `assertStatus(['done'])`, rejects empty release, returns `{ ...doc, actual_release: release, updated }`. Pure setter; live-vs-backfill/skip policy lives in the use-case, not here.
- `applyEvent.ts`: added `RECORD_RELEASE` to the plan-event dispatch list.

App (policy) — `packages/app/src/recordRelease.ts`:
- `recordRelease({ version, overwrite? }, deps)` — live: `buildRoadmap(state).history` gives done plans (with weaveId/threadId/date/release); stamp every plan whose `release == null` (or all if `overwrite`), skip the rest as `already-stamped`. Idempotent re-run = no-op.
- `backfillReleases({ releaseDates, overwrite? }, deps)` — sorts the supplied `{version,date}` map ascending; `versionForDate` assigns each done plan to the earliest release tagged on/after its done-date (the `(prevDate, date]` window); plans after the last release skipped as `unshipped`.
- Deps are `loadState()` + `runEvent(weaveId, event)` — no git/package.json read in core or app.
- Exported both + types from `packages/app/src/index.ts`.

## Step 5 — New `loom_record_release` MCP tool wrapping the recordRelease use-case (live + backfill + overwrite args); register it in the tool registry/catalog.

`packages/mcp/src/tools/recordRelease.ts`: `loom_record_release` tool. LIVE mode (`version`) → `recordRelease`; BACKFILL mode (`releaseDates` map) → `backfillReleases`; `overwrite` passthrough; rejects passing both / neither. Wires deps `loadState` (= `getState` with fs deps) + `runEvent` (= app `runEvent` with `loadWeave`/`saveDocs`), mirroring `completeStep`/roadmap-resource wiring. Registered in `server.ts` under the `plan` group (auto-appears in `loom://catalog`).

## Step 6 — Remove the `target_release` param, its design-only guard, and its description text from `loom_update_doc`; update integration tests that reference `target_release`.

`packages/mcp/src/tools/updateDoc.ts`: removed the `target_release` input property, the `newTargetRelease` arg, the design-only guard, and its inclusion in the updated-doc spread; reworded the description and the "at least one of …" error to drop `target_release`. `packages/mcp/tests/integration.test.ts`: removed the stale `target_release`/`actual_release` lines from the `t1-design` fixture (no assertion depended on them).

## Step 7 — loom://roadmap resource: history nodes carry `release`; the resource exposes the derived `current_release`.

`loom://roadmap` (`packages/mcp/src/resources/roadmap.ts`) serializes the whole `buildRoadmap(state)` result, so it now carries `history[].release` and the top-level `currentRelease` automatically from the step-3 read-model change — no resource code change needed beyond what core provides. Verified the handler stringifies the full RoadmapView.

## Step 8 — `loom roadmap` History labels/groups shipped items by release version; add a `loom backfill-releases` command — a thin wrapper that builds the `{version → date}` map on the caller side (e.g. from git tags) and feeds it into the backfill path. Not part of `loom migrate`.

CLI:
- `commands/roadmap.ts`: header now shows `current release: vX.Y.Z` (from `r.currentRelease`); each shipped plan line carries a `[vX.Y.Z]`/`[unversioned]` tag; new `--group-by-release` mode buckets history by release version.
- `mcpClient.ts`: added `callTool(name, args)` to the in-process façade (the façade previously exposed only resource/prompt reads).
- `commands/backfillReleases.ts` (new): `loom backfill-releases` — reads git tags caller-side (`git for-each-ref … refs/tags`, `vX.Y.Z`→`{version,date}`), feeds the map to `loom_record_release` (backfill mode). `--dry-run` prints the map only; `--overwrite` restamps. Git is read in the CLI (the pipeline), never in core/app.
- `index.ts`: registered `backfill-releases` and the new roadmap `--group-by-release` flag. Explicitly NOT part of `loom migrate`.
Full `./scripts/build-all.sh` green (core, fs, app, mcp, cli, vscode).

## Step 9 — Drop the `target_release` display from the vscode roadmap/tree provider.

`packages/vscode/src/tree/treeProvider.ts`: `groupByRelease` no longer reads the removed `design.target_release`. Repointed to the new carrier — groups each plan by its `plan.actual_release`, and places the design under its thread's latest shipped release (`maxVersion` of its plans' releases) or "No Release". Imported `maxVersion` from `@reslava-loom/core/dist/versionUtils`; uses the now-typed `PlanDoc.actual_release` (no `as any`). The `release` grouping mode stays functional under the new model rather than collapsing to "No Release" for everything.

## Step 10 — Add a step to the do-release skill: after tagging vX.Y.Z, call `loom_record_release(version)` so Loom's record is written from the pipeline and can cross-check git.

Wired the release hook into the pipeline.
- Added a live CLI command `packages/cli/src/commands/recordRelease.ts` (`loom record-release <version>`) — the project-agnostic, non-Claude wire: calls `loom_record_release` in live mode, idempotent, `--overwrite` for corrections. Registered in `index.ts`. (This complements the step-8 `backfill-releases`; the plan only named the MCP tool, but a deterministic CLI command is what the runbook should invoke and what another project's pipeline would call.)
- `.claude/commands/do-release.md`: added `loom record-release X.Y.Z` to the on-`go` sequence, after build/test and before the release commit (stamps land in that commit).
- `RELEASING.md` (the authoritative checklist the runbook defers to): added the matching "Record the release in Loom" item to keep the two in sync.

## Step 11 — Unit tests: versionUtils (parse/compare/max); recordRelease (live sweep-unstamped, backfill date-range assignment, idempotent re-run no-op, overwrite opt-in); roadmap read-model surfacing `release` + `current_release`. Run ./scripts/build-all.sh + ./scripts/test-all.sh green.

Tests added + registered in `scripts/test-all.sh`:
- `tests/version-utils.test.ts` — parseVersion (X.Y.Z, leading v, rejects), compareVersions (numeric not lexical, unparseable ordering), maxVersion.
- `tests/roadmap-release.test.ts` — history nodes carry `plan.actual_release`; `currentRelease` = numeric max; no stamps → null (derive-only).
- `tests/record-release.test.ts` — live sweep-unstamped (idempotent: already-stamped skipped), live+overwrite restamp, backfill date-range assignment (input-order-independent, after-last-tag = unshipped), backfill skips already-stamped. Uses injected `loadState` + captured `runEvent`.

`./scripts/build-all.sh` + `./scripts/test-all.sh` both green (all suites incl. MCP integration + claude-md-sync). No regressions.

## Step 12 — Execute the full backfill against Loom's real history: build the version/date map from git tags, run `loom backfill-releases`, and verify `current_release` and `loom roadmap` / `loom://roadmap` show the correct shipped versions.

Full backfill executed against Loom's real history via `loom backfill-releases` (24 git tags → version/date map built caller-side; `--dry-run` previewed first).

Result: **79 done plans stamped** with `actual_release` (v0.1.0 … v1.9.1), each placed after `target_version` in frontmatter per the new key order. `loom roadmap` now prints `current release: v1.9.1` and `--group-by-release` buckets history by version; `loom://roadmap` carries `currentRelease` + `history[].release`.

Honest nuance: `current_release` derives to **v1.9.1, not v1.9.2** — v1.9.2 was a plan-less fix (`df470ba`), so it shipped no done plan and is correctly invisible to plan-keyed history. Two same-day tags (1.9.1/1.9.2 both 2026-06-16) also mean date-based backfill attributes that day's plans to the earlier tag. This is the expected behaviour of the model (history = done plans) and is exactly the gap the quick-ship sibling thread addresses; live `record-release` is per-release exact going forward.

Known residue (per the design's migration note, not a regression): 21 historical `*-design.md` files still physically carry `target_release`/`actual_release` lines. They're ignored by the `DesignDoc` type but not actively stripped (the serializer reorders, doesn't drop unknown keys). Flagged to Rafa for a strip-vs-leave decision.
