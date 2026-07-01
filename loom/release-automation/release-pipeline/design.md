---
type: design
id: de_01KT20ZZ6ZYW01G09F4WDXMT88
title: Release pipeline — the tag-driven GitHub Actions spine
status: done
created: 2026-06-01
updated: 2026-06-01
version: 4
idea_version: 3
tags: []
parent_id: id_01KT1ZQN9P0J3JNFPRPPMSXVP3
requires_load: []
---
# Release pipeline — the tag-driven GitHub Actions spine

**Vision frame.** This is project infra for shipping Loom itself, not a user-visible Loom feature. The manual steps it removes are the maintainer's: hand-running `npm publish` / `vsce publish` / `ovsx publish`, tagging, and assembling a GitHub release. The locked trigger model (idea §Locked decisions) is **tag-driven**: the maintainer bumps + writes the changelog locally and pushes `vX.Y.Z`; CI reacts. CI never pushes to `main` and never owns the version.

**Thread boundary.** This thread is the **workflow spine** — the `.github/workflows/release.yml` job graph, gating, ordering, and recovery semantics. Two siblings own pieces this spine *invokes*:
- `versioning` — the one-command synchronized bump (`package.json` × N + anywhere else the version lives) and the tag convention. The spine *consumes* the tag; it does not bump.
- `publishing` — the actual publish steps (npm, Marketplace, Open VSX) and the GitHub release creation. The spine *orchestrates* these as jobs but the publish-command detail lives there.

Where the line is fuzzy, this doc states the **contract** (inputs/outputs between jobs) and defers the implementation to the sibling.

---

## Decisions resolved (chat-001, 2026-06-01)

All five open questions from the idea are settled. Locked here:

1. **Pre-tag README gate → `RELEASING.md` checklist, trust-based.** No script, no CI verification. A script can confirm a README *changed*, never that it's *correct* — pure friction. The CLI README already reads its version from `package.json`, so the highest-drift item is already automated away.
2. **Release notes → hand-written `CHANGELOG.md`** (*Keep a Changelog* format). CI extracts the `## [X.Y.Z]` section for the pushed tag and uses it verbatim as the GitHub release body. No commit-derived notes.
3. **Open VSX → in v1.** Publish to both VS Code Marketplace and Open VSX from the first release. Open VSX is what VS Code forks (Cursor, VSCodium, Windsurf, Gitpod, code-server) install from — Loom's audience overlaps it heavily.
4. **Secrets → understood.** `NPM_TOKEN`, `VSCE_PAT`, `OVSX_TOKEN` are repo secrets set by hand; `GITHUB_TOKEN` is auto-provided (declare `permissions: contents: write`).
5. **Partial failure → idempotent re-run first, patch roll-forward as fallback.** Each publish job is skip-if-already-published. A partial failure is recovered by re-running the *same tag's* workflow (already-published artifacts no-op). Only when npm *content* itself is wrong do we roll forward to a new **patch** version. Never reuse a consumed version (npm is immutable).

---

## §1 — Workflow trigger and the job graph

**Trigger:** `on: push: tags: ['v*.*.*']`. Nothing else publishes. (A separate CI workflow on PRs/`main` runs tests for normal development — out of scope here; this file is release-only.)

**Job graph (fail-closed, fan-out publish):**

```
                       ┌─────────────┐
   push vX.Y.Z ───────▶│  guard       │  parse tag → version; assert
                       │             │  package.json versions == tag
                       └──────┬──────┘
                              ▼
                       ┌──────────────────────────┐
                       │  build-test               │  ./scripts/build-all.sh
                       │                          │  → ./scripts/test-all.sh
                       │                          │  → pack tarball + .vsix
                       │                          │  → upload artifacts
                       └──────────┬───────────────┘
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
        ┌──────────┐       ┌──────────┐        ┌──────────┐
        │ publish- │       │ publish- │        │ publish- │   each: skip-if-
        │ npm      │       │ vsce     │        │ ovsx     │   already-published
        └────┬─────┘       └────┬─────┘        └────┬─────┘
             └───────────────────┼───────────────────┘
                                 ▼
                          ┌─────────────┐
                          │ release      │  extract CHANGELOG section →
                          │             │  create GitHub release for tag
                          └─────────────┘
```

**Build before test — and merged into one job (decided chat-001, 2026-06-01).** The test suite imports compiled output from `packages/*/dist/` (e.g. `tests/workspace-workflow.test.ts` → `../packages/fs/dist/index.js`); `test-all.sh` runs ts-node over those files and does **not** build first. So build must precede test. We collapse both into a single `build-test` job rather than passing `dist/` between runners because:
- it mirrors exactly how the maintainer builds+tests locally (one machine, build-all then test-all);
- the **exact `dist/` that tests validate is the same `dist/` that gets packed and published** — tested-bytes == shipped-bytes, by construction, with no artifact reshuffle;
- fewer runners, no inter-job `dist/` artifact to keep in sync.

The job's tail packs the two publishable artifacts (npm tarball via `npm pack` on `packages/cli`, `.vsix` via `vsce package` on `packages/vscode`) and uploads them so the publish jobs ship those exact files.

**Why the rest of the shape:**
- **`guard` first, cheap, fail-fast.** Parses `vX.Y.Z` → `X.Y.Z` and asserts the user-facing `package.json` versions (root, `packages/cli`, `packages/vscode`) already equal the tag — catching a mistagged push *before* spending CI minutes. The canonical list of version-source files is owned by `versioning`; the guard checks the three that surface to users and extends when `versioning` finalizes the list.
- **`build-test` gates all publishing.** A red test or failed build aborts before *anything* is published — the idea's "no half-published version" criterion. Build uses the canonical `./scripts/build-all.sh` (CLAUDE.md: never per-package `tsc`).
- **Publish jobs fan out in parallel, each independently idempotent.** One marketplace being slow/down doesn't serialize the others, and any subset can be re-run.
- **`release` last, strict `needs` on all three publish jobs.** The GitHub release is the "this shipped" record; it is created only after *all three* artifacts are out, so a release tag never reflects a partially-consistent state. Given idempotent re-runs, a flaky Open VSX just means re-running the tag — the release then appears on the fully-green run.

---

## §2 — Idempotency contract (how skip-if-published works)

Each publish job, before pushing, asks the registry "does this exact version already exist?" and no-ops if so:

- **npm:** `npm view @reslava/loom@X.Y.Z version` — non-empty ⇒ already published ⇒ skip.
- **Marketplace / Open VSX:** query the published version via `vsce show` / `ovsx get` (or the registry API) for the extension id ⇒ if `X.Y.Z` present, skip.

This makes **re-running the same tag's workflow** the first-line recovery for any partial failure: the job that already succeeded skips, the one that failed retries. No version is consumed for a transient hiccup. The implementation of each check lives in `publishing`; the spine's contract is only *"every publish job MUST be safe to run twice."*

**Roll-forward fallback** (npm content itself wrong): bump to the next **patch** (`X.Y.Z` → `X.Y.(Z+1)`), re-tag, push. Both artifacts publish at the new version; the orphaned npm version is left as-is (free, harmless). This path is rare and deliberately manual — no automation reuses or unpublishes a version.

---

## §3 — Release notes (CHANGELOG extraction)

`CHANGELOG.md` at repo root, *Keep a Changelog* format, one `## [X.Y.Z] - YYYY-MM-DD` section per release. The maintainer writes the new section as part of the pre-tag gate (§4). The `release` job:

1. Extracts the section matching the tag version (awk/sed between the `## [X.Y.Z]` header and the next `## [`).
2. **Fails the job if no matching section exists** — a release with empty/wrong notes is a release bug, so this is a hard gate, *not* trust-based. Unlike README correctness, section-existence is machine-checkable: it either exists for this version or it doesn't.
3. Passes the extracted text as the GitHub release body.

This is the one place CI *does* enforce a pre-tag authoring step, justified because existence-of-section is verifiable where README-correctness is not.

---

## §4 — Pre-tag gate: `RELEASING.md`

A human checklist at repo root, run by the maintainer (and the AI assisting) **before** `git tag`. Trust-based; CI does not verify it. Contents (spine owns the doc; items reference sibling mechanisms):

- [ ] Run the synchronized bump command (`versioning`) — all `package.json` now equal the new version.
- [ ] Review all three READMEs (root, CLI, extension) for accuracy at the new version.
- [ ] Write the `## [X.Y.Z]` section in `CHANGELOG.md`.
- [ ] Build + test locally green (`./scripts/build-all.sh && ./scripts/test-all.sh`).
- [ ] Commit, then `git tag vX.Y.Z && git push --tags`.

The only machine-enforced subset is: `guard` re-checks the version match, and `release` re-checks the CHANGELOG section exists. Everything else (README quality) is judgment and stays human.

---

## §5 — Secrets

Stored at **Settings → Secrets and variables → Actions**, injected as env at runtime, masked in logs. Referenced as `${{ secrets.NAME }}`.

| Secret | Used by | Setup |
|--------|---------|-------|
| `NPM_TOKEN` | `publish-npm` | npm automation token, `@reslava` scope. Manual. |
| `VSCE_PAT` | `publish-vsce` | Azure DevOps PAT, Marketplace-publish scope. Manual. |
| `OVSX_TOKEN` | `publish-ovsx` | Open VSX access token. Manual. |
| `GITHUB_TOKEN` | `release` | Auto-provided. Needs `permissions: contents: write`. |

Token-handling detail (least-privilege scopes, rotation) belongs to `publishing`; the spine only declares which job reads which secret.

---

## §6 — What this design does NOT cover (sibling handoffs)

- **The bump command and version-source enumeration** → `versioning`. Spine assumes a tag whose version already matches the user-facing `package.json`s; `guard` enforces it but does not create it.
- **Exact publish commands, extension packaging flags, marketplace metadata, token scopes** → `publishing`. Spine defines the *jobs and their idempotency/ordering contract*, not the command bodies.
- **Normal-development CI** (tests on PR/`main`) — separate workflow, not part of the release spine.

---

## Decisions log

- **2026-06-01 (chat-001):** All five idea open-questions resolved — see "Decisions resolved" above. README gate trust-based checklist; CHANGELOG hand-written + CI-extracted; Open VSX in v1; secrets understood; partial-failure = idempotent re-run then patch roll-forward.
- **2026-06-01 (design):** Job graph = guard → build-test → fan-out(publish-npm/vsce/ovsx) → release. `release` has strict `needs` on all three publish jobs; CHANGELOG-section existence is the one CI-enforced pre-tag check.
- **2026-06-01 (impl correction, chat-001):** Original `guard → test → build` order was wrong — the test suite imports `packages/*/dist/`, so build must precede test. Resolved by **merging build+test into one `build-test` job** (option 1), which also guarantees tested-bytes == shipped-bytes. Plan step 2 updated to match. Separately, the hardcoded `j:/temp/loom` test root (`tests/workspace-utils.ts:6`) is being fixed to `os.tmpdir()` so the suite runs cleanly on a Linux runner (test-infra, done alongside but conceptually `core-engine`/test territory).
