---
type: idea
id: id_01KWYWHSWQH5PMK0HNTASGBJ9K
title: Align the CLI surface to the Slug/Ulid API contract
status: draft
created: 2026-07-07
version: 1
tags: []
parent_id: null
requires_load: []
---
# Align the CLI surface to the Slug/Ulid API contract

## Problem

The CLI (`packages/cli`) is a delivery surface that speaks the API, but it was outside `api-contract-refactor`'s audit ("every `loom_*` tool and every app use-case"), so it still speaks the old `*Id`-means-slug dialect. From the audit of `packages/cli/src`:

- **User-facing command args / flags:** `status [weave-id]`, `validate [weave-id]`, `refine-design <weave-id>`, `design <weave-id>`, `plan <weave-id>`, `start-plan <plan-id>`, `complete-step <plan-id>`, `next [plan-id]`, `context <docId>`, `migrate-plan-steps [docId]`, `--thread <id>`, `--weave <id>`.
- **Internal call sites** pass slugs into `weaveId` params — e.g. `refine.ts` does `runEvent(weaveId, …)` with a slug — the same `Id`-means-slug ambiguity the refactor killed on the MCP surface.
- **Cross-surface coupling:** `next.ts` calls `getPrompt('do-next-step', { planId })`. The `core-engine/mcp-read-surface-naming` thread renames that prompt arg to `planUlid`, so the CLI must update in lockstep or `loom next` breaks.

## What we want to build

Bring the CLI into the same contract: user-facing arg/flag names and internal call sites use `*Slug` (folders) / `*Ulid` (ULID references), matching every other surface — so "loom behaviour matches all surfaces."

## The one decision that makes the CLI different from the MCP read surface

The MCP resource/prompt *placeholder* names have **no external consumers**, so a clean break is free. The **CLI is a public, user-facing surface with real users** (npm; downstream projects script against `loom <cmd>`). Renaming `--thread`, `[weave-id]`, `<plan-id>` etc. is a **breaking change to a shipped user interface**. So this thread must decide the migration path — likely accept the old names as **deprecated aliases** for one release (with a warning) rather than a hard break, unlike the MCP read surface. Decide in design.

## Depends on / relates to

- Coordinated with `core-engine/mcp-read-surface-naming` (shared prompt-arg rename; the CLI is a caller). Land together or CLI immediately after.
- Governed by the new **API-refactor scope rule** in CLAUDE.md (a refactor must sweep every surface).

## Success criteria

- No user-facing CLI arg/flag names a slug/ULID as `*-id`; folders are `*-slug`, ULID refs are `*-ulid`.
- Internal CLI call sites use `*Slug`/`*Ulid`; no slug flows through a `weaveId`-named param.
- CLI prompt/resource calls use the renamed args (e.g. `planUlid`), so nothing breaks when the MCP thread lands.
- A decided, documented migration path for the public flag rename (aliases vs hard break).