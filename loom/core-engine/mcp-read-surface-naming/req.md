---
type: req
id: rq_01KWYVS91G64TTZNF3EFPXG1AJ
title: Align the MCP read surface to the Slug/Ulid API contract — Requirements
status: locked
created: 2026-07-07
updated: 2026-07-07
version: 1
design_version: 1
tags: []
parent_id: de_01KWYVRS94S3K18HDRSVPHNE4K
requires_load: []
---
# Align the MCP read surface to the Slug/Ulid API contract — Requirements

### ✅ Included

- `IN1` Rename all MCP resource URI placeholders to the `*Slug`/`*Ulid` contract: `loom://docs/{docUlid}`, `loom://context/{docUlid}`, `loom://context/thread/{weaveSlug}/{threadSlug}`, `loom://plan/{planUlid}`, `loom://requires-load/{docUlid}`.
- `IN2` Rename prompt args to the contract across all prompts: `weaveId`/`threadId` → `weaveSlug`/`threadSlug`; `planId` → `planUlid` (ULID-or-filename resolution preserved).
- `IN3` Rewrite prompt **bodies** so their tool-call guidance matches the current tool contract (correct `weave_slug`/`thread_ulid` params; `loom_create_plan` guidance uses `goal` + structured `steps`, never a `content` Steps table).
- `IN4` Manifest enhancement: the context-bundle header carries `weave_slug` and `thread_ulid` (resolved thread address) in addition to `target=<docUlid>`, so a following thread-scoped write needs no extra lookup.
- `IN5` Slug-in: context resources accept slug addressing for human-pointable loads (verify doc form + renamed prompt args resolve slugs; thread form already does).
- `IN6` Update the doc-sync row-3 set in the same commit: `mcp-reference.md`, `CLAUDE.md`, `ctx.md`, the `LOOM_CLAUDE_MD` template.
- `IN7` Regression coverage: an MCP integration test asserting the slug thread-form returns a bundle whose manifest carries `thread_ulid`, plus a guard that no resource template / prompt arg name contains the `*Id` token.

### ❌ Excluded

- `EX1` Giving weave a ULID — weave stays `weaveSlug`-only (the documented exception, api-contract-refactor D3).
- `EX2` Any change to the write surface (`loom_*` tool params / app inputs) — already correct.
- `EX3` Building the `loom://` resource catalog — separate thread `ai-integration/loom-resource-catalog`.
- `EX4` Back-compat shims or aliases for the old placeholder names or prompt args — one clean break.

### ⛓ Constraints

- `C1` Follow `loom/refs/api-naming-reference.md` exactly: ULID reference = `*Ulid`, folder = `*Slug`, `*Id` banned as a reference suffix, weave the one slug-only exception.
- `C2` Breaking change to the MCP prompt-arg interface — every in-repo prompt caller (audit the VS Code extension) updates in the same commit; no aliases.
- `C3` Requires `build-all` **and** an MCP/session restart to take effect on a running server; ship the regression test with the change.