---
type: done
id: pl_01KTTSTE25N3CD8A1KT2KJ3KC1-done
title: Done — CLAUDE.md two-surface sync
status: done
created: "2026-06-11T00:00:00.000Z"
version: 4
tags: []
parent_id: pl_01KTTSTE25N3CD8A1KT2KJ3KC1
requires_load: []
---
# Done — CLAUDE.md two-surface sync

## Step 1 — Tag every shared session-contract rule with a stable <!-- rule:{id} --> marker in BOTH surfaces; no wording changes, just tag.

Tagged 13 shared rules with `<!-- rule:{id} -->` markers in both surfaces (section-level granularity; refinable to per-bullet later).

ids (identical set in both files): what-loom-is, key-terminology, mcp-tools, single-ai, claude-code-config, primary-entry-points, mcp-rules, ai-session-rules, mcp-visibility, context-injection, session-start, stop-rules, collaboration-style.

- `CLAUDE.md` — 13 markers before the matching shared sections.
- `packages/app/src/installWorkspace.ts` — 13 markers inside the `LOOM_CLAUDE_MD` literal (placed by the same semantic rule even where wording/heading differs — e.g. `single-ai` is a `### ` heading in root but a `- **Single-AI…**` bullet in the template).
- Root-only sections left unmarked (Two-surfaces, Architecture, Current active work, Build/test, Document frontmatter conventions, Applied learning).

Parity verified by grep: 13 markers in each. Markers are HTML comments — invisible in rendered markdown, and they ship into downstream `.loom/CLAUDE.md` harmlessly. Zero wording change in this step.

## Step 2 — Write tests/claude-md-sync.test.ts: assert the rule-id SET matches across both surfaces, plus verbatim-invariant string locks.

Wrote `tests/claude-md-sync.test.ts` and verified it passes live (13 rule ids match, 12 invariants present, no dupes).

- Reads `CLAUDE.md` and `packages/app/src/installWorkspace.ts` (the template source, markers live inside the literal) from `process.cwd()` (repo root — test-all cd's there; standalone runs are from root per the repo's test commands).
- **Rule-set parity:** extracts `<!-- rule:id -->` markers from both, asserts the sets are equal; on drift, the failure message names exactly which ids are missing on which side and how to fix.
- **No-duplicate guard:** rejects a repeated marker within a surface (would mask drift).
- **Verbatim invariants:** asserts 12 tokens appear in both — the 3 visibility prefixes, 5 core write-path tool names, and the 4 stop-rule hallmark phrases (locks the stop-rule count + identity without comparing wording).
- Matches existing test conventions: `assert` from `./test-utils.ts`, console progress, `run().catch(... process.exit(1))`.

Uses `process.cwd()` rather than `import.meta.url`/`__dirname` to sidestep the ESM/CJS ambiguity in the ts-node setup; guarded with a clear "run from repo root" error if CLAUDE.md isn't found.

## Step 3 — Add the drift test to scripts/test-all.sh so a rule-set or invariant mismatch fails the suite.

Wired the drift test into `scripts/test-all.sh` — added `run_test tests/claude-md-sync.test.ts` (with a comment) right after the build-ctx-source test, among the pure/no-IO checks. `set -e` + the test's `process.exit(1)` on failure means any rule-set or invariant mismatch fails the suite.

## Step 4 — Rewrite the root CLAUDE.md 'Two CLAUDE.md surfaces' section to document the rule-id markers, the invariant list, and that test-all enforces parity.

Documented the convention in the root `CLAUDE.md` "Two CLAUDE.md surfaces" section: shared rules carry `<!-- rule:{id} -->` markers in both surfaces; `tests/claude-md-sync.test.ts` (via test-all) enforces rule-set parity + the verbatim-invariant tokens; per-surface wording is explicitly allowed to differ by purpose (only the rule set + invariants are locked); how to add/change/retire a shared rule.

Bonus finding + fix (caught by the new test itself): the documentation prose included literal `<!-- rule:id -->` examples, which the original marker regex captured as a phantom id "id" → the test failed on a duplicate. Real proof the guard works. Fixed durably by **line-anchoring** the marker regex (`^[ \t]*<!-- rule:id -->[ \t]*$` with /m) so only standalone-line markers count, and switched the prose examples to the `{id}` placeholder form. Re-ran: green (13 ids match, 12 invariants, no dupes).

Plan complete (4/4). Note: full `./scripts/test-all.sh` + `build-all` will run as part of mcp-new-tools plan step 6 (deferred); the sync test was verified standalone and the installWorkspace marker change is additive HTML comments (no behavior change).
