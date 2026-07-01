---
type: done
id: pl_01KWEHB46B8AKB9WNRZCFYZ4RV-done
title: Done — Loom entities CRUD
status: done
created: 2026-07-01
version: 1
tags: []
parent_id: pl_01KWEHB46B8AKB9WNRZCFYZ4RV
requires_load: []
---
# Done — Loom entities CRUD

## Step 1 — Add a canonical doc-filename derivation module + per-thread ordinal allocator (gaps allowed, by created order) and unify ALL filename-derivation sites onto it — docPathInThread's fallback switch AND the per-type MCP create tools, which currently disagree — producing idea.md, design.md, plan-NNN.md, plan-NNN-done.md, chat-NNN.md; req/thread/reference unchanged.

Added the canonical filename module and routed the write + read sites onto it (transition strategy A: dual-read; new-scheme writes, legacy-tolerant reads).

**New module — `packages/core/src/docNaming.ts`** (pure logic, so core not fs — deviation from the plan's stated path, since core's own generators and fs both consume it):
- Writers: `planFileName(n)`→`plan-NNN.md`, `doneFileName(n)`→`plan-NNN-done.md`, `chatFileName(n)`→`chat-NNN.md`, `singletonFileName('idea'|'design'|…)`→`idea.md`/`design.md`; `nextOrdinal(files, 'plan'|'chat')` (max+1, gaps preserved, recognises legacy names via suffix-anchored regex).
- Dual-read recognisers: `isPlanFile`/`isDoneFile`/`isChatFile`/`isIdeaFile`/`isDesignFile`, plus `planOrdinalFromFile`/`chatOrdinalFromFile`. Exported from core index.

**Write sites rewired to new-scheme names:** `weaveIdea` (idea.md), `weaveDesign` (design.md), `weavePlan` (plan-NNN.md via nextOrdinal), `chatNew` (chat-NNN.md), `promoteToIdea/Design/Plan`, `closePlan` + `appendDone` (done → plan-NNN-done.md derived from the plan's filename ordinal; done doc *id* stays `{planId}-done`, only the filename humanises). fs `docPathInThread` fallback: idea/design → flat.

**Read sites made dual-read (canonical first, legacy second):** `loadThread` (idea/design lookup + constraint-warning filters via isIdeaFile/isDesignFile), `weaveDesign`/`req`/`parentDesignVersion`/`parentIdeaVersion` parent lookups, `backfillStalenessBaselines` (uses design `_path`). Plans/dones/chats already dual-read because `loadMdFiles` filters by frontmatter `type`, not filename.

**Verification:** `build-all` green; full `test-all` green. Fixed test expectations that asserted the legacy done filename to the new `plan-NNN-done.md` (`close-plan`, `append-done`, `workspace-workflow`); the seeded-legacy-done cases pass unchanged, proving dual-read works. The MCP integration test reads live-style state over this repo's still-legacy-named docs and passes — dual-read confirmed end-to-end.

Not done here (later steps): migratePlanSteps' `/-plan-\d+/` matcher still assumes a prefix (historical migration, effectively dead); weave-root loose-doc creation paths untouched (Step 3 retires them); `loom migrate-layout` (Step 2) not yet built.
