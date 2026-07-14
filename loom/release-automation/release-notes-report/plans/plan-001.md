---
type: plan
id: pl_01KXFJ01ZE65N7Q69H1PFGQ0H6
title: Wire do-release to draft its changelog from the graph
status: done
created: 2026-07-14
updated: 2026-07-14
version: 1
design_version: 7
tags: []
parent_id: de_01KXFHE7S0WFCYHE0ADS6A3QDW
requires_load: []
target_version: 0.1.0
actual_release: 1.25.0
steps:
  - id: harden-release-notes-framing-a-c
    order: 1
    status: done
    description: Extend the `release-notes` report kind's promptFraming to sub-structure each version group (including the release==null "Unreleased" bucket) as Added / Changed / Fixed, in a user-benefit voice, grouped by theme, with a short Highlights lead. Keep docTypes empty (roadmap-passthrough) so the passthrough contract holds. Update the report-selection test to assert the framing carries the A/C/F + Highlights structure and that release-notes docTypes stays empty.
    files_touched: [packages/core/src/reportKinds.ts, tests/report-selection.test.ts]
    blocked_by: []
    satisfies: []
  - id: rewire-this-repo-do-release-to
    order: 2
    status: done
    description: "Replace do-release's git-log-hand-sort drafting (steps 2-3) with a graph draft: invoke the release-notes report inline (in-session) over the Unreleased set (roadmap history where actual_release==null) for the skeleton, then — by default — hydrate each Unreleased plan's done-doc body inline (bounded per-release set) and have the live agent curate title+done-body into user-facing A/C/F prose with a Highlights lead; a titles-only fallback flag gives a fast low-token draft. Write the result under CHANGELOG.md `## [Unreleased]`. Update the 'Context to load' section so git log is the coverage net, not the changelog source. Keep the human-review STOP, the by-hand packages/vscode/CHANGELOG.md section, and the bump/tag/push/record-release tail unchanged."
    files_touched: [.claude/commands/do-release.md, RELEASING.md]
    blocked_by: [harden-release-notes-framing-a-c]
    satisfies: []
  - id: add-git-log-coverage-net-stale
    order: 3
    status: done
    description: "In the do-release draft phase, after the graph draft, diff `git log <lastTag>..HEAD` against the unreleased done-plan set and surface user-facing commits with no covering done plan as a 'Not covered by a done plan' appendix for the human to fold in or dismiss. Add the stale-leak guardrail: warn on any unversioned done whose done-doc date predates the previous tag (a prior release that failed to stamp)."
    files_touched: [.claude/commands/do-release.md]
    blocked_by: [rewire-this-repo-do-release-to]
    satisfies: []
  - id: mirror-the-wiring-into-chord-flow
    order: 4
    status: done
    description: Apply the same graph-draft + git-log-net + guardrail wiring to Chord Flow's parallel do-release runbook so a real Loom-user repo drives the feature. The skill edit is independent; note in the skill that the A/C/F framing only renders once Chord Flow upgrades to a loom version carrying the hardened release-notes kind (step 1, after release).
    files_touched: ["J:/src/chord-flow/.claude/commands/do-release.md"]
    blocked_by: [add-git-log-coverage-net-stale]
    satisfies: []
  - id: build-test-and-dry-run-the
    order: 5
    status: done
    description: "Run ./scripts/build-all.sh then ./scripts/test-all.sh (build before test — the suite imports dist). Then dry-run the do-release draft phase against the CURRENT unreleased set (no bump/tag): confirm the release-notes report renders an A/C/F draft plus the coverage appendix, and that the output is valid CHANGELOG-compatible markdown for the GitHub release body. Report the rendered draft for review."
    files_touched: [scripts/build-all.sh, scripts/test-all.sh]
    blocked_by: [harden-release-notes-framing-a-c, rewire-this-repo-do-release-to, add-git-log-coverage-net-stale, mirror-the-wiring-into-chord-flow]
    satisfies: []
---
# Wire do-release to draft its changelog from the graph

## Goal

Make `do-release` draft its Added/Changed/Fixed changelog from the Loom doc graph — the unversioned done plans (roadmap history where `actual_release == null`) — instead of hand-reading `git log`, with git log kept only as a coverage net. Reuse the existing roadmap-passthrough `release-notes` report kind (no new kind): harden its framing to sub-structure each version group as Added/Changed/Fixed, then rewire both this repo's and Chord Flow's `do-release` runbooks to invoke it inline at draft time. The existing human-review STOP and the bump/tag/push/record-release tail are unchanged. The feature dogfoods on the tool itself and on a real Loom-user repo (Chord Flow).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Extend the `release-notes` report kind's promptFraming to sub-structure each version group (including the release==null "Unreleased" bucket) as Added / Changed / Fixed, in a user-benefit voice, grouped by theme, with a short Highlights lead. Keep docTypes empty (roadmap-passthrough) so the passthrough contract holds. Update the report-selection test to assert the framing carries the A/C/F + Highlights structure and that release-notes docTypes stays empty. | packages/core/src/reportKinds.ts, tests/report-selection.test.ts | — | — |
| ✅ | 2 | Replace do-release's git-log-hand-sort drafting (steps 2-3) with a graph draft: invoke the release-notes report inline (in-session) over the Unreleased set (roadmap history where actual_release==null) for the skeleton, then — by default — hydrate each Unreleased plan's done-doc body inline (bounded per-release set) and have the live agent curate title+done-body into user-facing A/C/F prose with a Highlights lead; a titles-only fallback flag gives a fast low-token draft. Write the result under CHANGELOG.md `## [Unreleased]`. Update the 'Context to load' section so git log is the coverage net, not the changelog source. Keep the human-review STOP, the by-hand packages/vscode/CHANGELOG.md section, and the bump/tag/push/record-release tail unchanged. | .claude/commands/do-release.md, RELEASING.md | harden-release-notes-framing-a-c | — |
| ✅ | 3 | In the do-release draft phase, after the graph draft, diff `git log <lastTag>..HEAD` against the unreleased done-plan set and surface user-facing commits with no covering done plan as a 'Not covered by a done plan' appendix for the human to fold in or dismiss. Add the stale-leak guardrail: warn on any unversioned done whose done-doc date predates the previous tag (a prior release that failed to stamp). | .claude/commands/do-release.md | rewire-this-repo-do-release-to | — |
| ✅ | 4 | Apply the same graph-draft + git-log-net + guardrail wiring to Chord Flow's parallel do-release runbook so a real Loom-user repo drives the feature. The skill edit is independent; note in the skill that the A/C/F framing only renders once Chord Flow upgrades to a loom version carrying the hardened release-notes kind (step 1, after release). | J:/src/chord-flow/.claude/commands/do-release.md | add-git-log-coverage-net-stale | — |
| ✅ | 5 | Run ./scripts/build-all.sh then ./scripts/test-all.sh (build before test — the suite imports dist). Then dry-run the do-release draft phase against the CURRENT unreleased set (no bump/tag): confirm the release-notes report renders an A/C/F draft plus the coverage appendix, and that the output is valid CHANGELOG-compatible markdown for the GitHub release body. Report the rendered draft for review. | scripts/build-all.sh, scripts/test-all.sh | harden-release-notes-framing-a-c, rewire-this-repo-do-release-to, add-git-log-coverage-net-stale, mirror-the-wiring-into-chord-flow | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
