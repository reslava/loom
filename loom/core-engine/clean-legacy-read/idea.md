---
type: idea
id: id_01KWFV92KHVWBRJH6S8ZBBACBH
title: Clean legacy-read — drop dual-read + rename weave.looseFibers
status: draft
created: 2026-07-01
version: 1
tags: []
parent_id: null
requires_load: []
---
# Clean legacy-read — drop dual-read + rename weave.looseFibers

## What

Once repos are migrated to the canonical filenames (see the `layout-migration` thread), remove the **dual-read** scaffolding (transition strategy A from entities-crud) and fix the `weave.looseFibers` terminology collision.

## Trigger (settled decision)

Loom has **no users / no external feedback yet**, so removing dual-read is **not a breaking change** for anyone. Therefore: after `migrate-layout` has run on our repos (this repo + Chord Flow) and a short settling period confirms all-green, just **delete** dual-read — no auto-migrate-on-upgrade, no permanent back-compat needed. If real users appear before then, revisit (ship migrate-on-upgrade first).

## Dual-read sites to remove (the map for future-me)

Writers already emit only the new names; these **readers** carry the legacy tolerance to strip:

- fs `loadThread`: idea/design lookup tries `idea.md` then `{thread}-idea.md` (+ the constraint-warning filters via `isIdeaFile`/`isDesignFile`).
- fs `docPathInThread`: fallback is already flat — verify nothing else regressed.
- app `req.ts`, `weavePlan.ts` (`parentDesignVersion`/`parentIdeaVersion`), `weaveDesign.ts`, `promoteToIdea/Design.ts`: dual-read parent lookups (`idea.md` then `{thread}-idea.md`).
- mcp `appendDone.ts` + app `closePlan.ts`: done-doc dual-read (the legacy `{planId}-done.md` fallback).
- core `docNaming.ts`: the recognisers (`isPlanFile`/`isChatFile`/`isIdeaFile`/`isDesignFile`, `planOrdinalFromFile`, `chatOrdinalFromFile`, `nextOrdinal`) match **both** the legacy `{thread}`-prefixed names and the new flat names via suffix-anchored regexes — tighten to new-only once migrated.

## Terminology rename

Rename the `weave.looseFibers` field → `weaveRootDocs` (its actual meaning: docs at weave root), across core/fs/app/vscode. A **loose fiber** is a graph position (no parent, no children), **not** a location — the field name conflated the two. Note: with weave-only-threads, weave-root docs shouldn't be created going forward, so decide whether to keep the field (for legacy reads), rename it, or remove it entirely.

## Success

- No code path reads a legacy `{thread}`-prefixed filename.
- The `looseFibers` field is renamed (or removed) with no lingering references.
- build + `test-all` green.