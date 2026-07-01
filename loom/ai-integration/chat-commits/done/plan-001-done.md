---
type: done
id: pl_01KWD7ZP5HDN3PRTPJ36VSD87V-done
title: Done — Commit-last rule for both CLAUDE.md surfaces
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: pl_01KWD7ZP5HDN3PRTPJ36VSD87V
requires_load: []
---
# Done — Commit-last rule for both CLAUDE.md surfaces

## Step 1 — Add a shared `rule:commit-last` section to both CLAUDE.md surfaces (reply-before-commit, commit as last action, no hash in reply), with matching `<!-- rule:commit-last -->` markers; verify via the claude-md-sync test and build-all.

Added a shared `rule:commit-last` section to both CLAUDE.md surfaces:

- **`CLAUDE.md`** (root, recursive contract) — full version: reply lands before the commit, commit is the last action of the turn, never reference the commit hash in the reply, plus the honest note that the next turn legitimately re-dirties the doc.
- **`packages/app/src/installWorkspace.ts`** (`LOOM_CLAUDE_MD` template) — same rule, terser generic voice for downstream `loom install`.

Both carry matching `<!-- rule:commit-last -->` markers, so the change is parity-enforced.

Verified:
- `tests/claude-md-sync.test.ts` → ✅ 15 shared rule ids match across both surfaces (was 14), all 12 invariant tokens present.
- `./scripts/build-all.sh` → ✅ clean, so the template edit is compiled into dist (what `loom install` writes).
