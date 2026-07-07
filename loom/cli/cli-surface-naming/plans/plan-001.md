---
type: plan
id: pl_01KWZ7GTH7CXCB430AVD8ACKNT
title: Align the CLI surface to the Slug/Ulid API contract
status: done
created: 2026-07-07
updated: 2026-07-07
version: 1
design_version: 2
tags: []
parent_id: de_01KWZ7AN6458PW3DW3G8EE5WR0
requires_load: []
target_version: 0.1.0
steps:
  - id: cli-internal-call-site-rename
    order: 1
    status: done
    description: Rename CLI internal call sites so no slug flows through a *Id/*Ulid-named variable — a weave folder is weaveSlug end to end.
    files_touched: [packages/cli/src/commands/refine.ts, packages/cli/src/commands/design.ts, packages/cli/src/commands/plan.ts, packages/cli/src/commands/status.ts, packages/cli/src/commands/validate.ts]
    blocked_by: []
    satisfies: []
  - id: cli-user-facing-args-slug-first
    order: 2
    status: done
    description: "Make user-facing CLI args slug-first with a clean break: drop -id label suffixes, name entity args for the entity, remove old names outright (no aliases)."
    files_touched: [packages/cli/src/index.ts, packages/cli/README.md]
    blocked_by: []
    satisfies: []
  - id: next-ts-edge-resolution-slug-stem
    order: 3
    status: done
    description: next.ts resolves its friendly [plan] arg to a pl_ ULID at the CLI edge (generalize resolveActivePlanId into resolvePlanUlid via getState), then calls do-next-step with a strict planUlid.
    files_touched: [packages/cli/src/commands/next.ts]
    blocked_by: []
    satisfies: []
  - id: tighten-do-next-step-to-strict
    order: 4
    status: done
    description: "Tighten the do-next-step prompt: replace the tolerant resolveDocIdOrThrow with a strict pl_-ULID guard, matching the write tools. Closes the mcp-read-surface-naming deferred item."
    files_touched: [packages/mcp/src/prompts/doNextStep.ts, packages/mcp/src/tools/planUlid.ts]
    blocked_by: [next-ts-edge-resolution-slug-stem]
    satisfies: []
  - id: mcp-context-resource-slug-path-form
    order: 5
    status: done
    description: "Verify/extend the slug-path human-pointable form of the context resource (loom://context/{weaveSlug}/{threadSlug}/{docSlug}); fill only the gap left by mcp-read-surface-naming, do not duplicate."
    files_touched: [packages/mcp/src/resources/context.ts, packages/mcp/src/server.ts]
    blocked_by: []
    satisfies: []
  - id: document-the-surface-naming-convention
    order: 6
    status: done
    description: "Persist the surface convention: add a Surfaces-and-their-consumers section to api-naming-reference.md, a compact always-present summary to loom/ctx.md §3, and sweep the CLAUDE.md API short-form if the surface nuance is needed."
    files_touched: [loom/refs/api-naming-reference.md, loom/ctx.md, CLAUDE.md, packages/app/src/installWorkspace.ts]
    blocked_by: []
    satisfies: []
  - id: tests-full-build-test
    order: 7
    status: done
    description: Add/adjust tests (CLI arg parsing + do-next-step strict-ULID rejection) and run build-all + test-all green.
    files_touched: [tests/commands.test.ts, packages/mcp/tests/integration.test.ts, scripts/test-all.sh]
    blocked_by: []
    satisfies: []
---
# Align the CLI surface to the Slug/Ulid API contract

## Goal

Bring the CLI (packages/cli) into the agreed surface/naming model: CLI is slug/human-first with friendly identifiers resolved to a ULID at the CLI edge; the MCP agent surface (write tools + do-next-step prompt) is strict ULID; MCP context/read resources are slug-path human-pointable. Renames are a clean break — old arg/flag names are removed, not aliased. The thread also closes the deferred do-next-step tolerant-resolver tightening and persists the surface convention in api-naming-reference.md + loom/ctx.md so it is always present.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Rename CLI internal call sites so no slug flows through a *Id/*Ulid-named variable — a weave folder is weaveSlug end to end. | packages/cli/src/commands/refine.ts, packages/cli/src/commands/design.ts, packages/cli/src/commands/plan.ts, packages/cli/src/commands/status.ts, packages/cli/src/commands/validate.ts | — | — |
| ✅ | 2 | Make user-facing CLI args slug-first with a clean break: drop -id label suffixes, name entity args for the entity, remove old names outright (no aliases). | packages/cli/src/index.ts, packages/cli/README.md | — | — |
| ✅ | 3 | next.ts resolves its friendly [plan] arg to a pl_ ULID at the CLI edge (generalize resolveActivePlanId into resolvePlanUlid via getState), then calls do-next-step with a strict planUlid. | packages/cli/src/commands/next.ts | — | — |
| ✅ | 4 | Tighten the do-next-step prompt: replace the tolerant resolveDocIdOrThrow with a strict pl_-ULID guard, matching the write tools. Closes the mcp-read-surface-naming deferred item. | packages/mcp/src/prompts/doNextStep.ts, packages/mcp/src/tools/planUlid.ts | next-ts-edge-resolution-slug-stem | — |
| ✅ | 5 | Verify/extend the slug-path human-pointable form of the context resource (loom://context/{weaveSlug}/{threadSlug}/{docSlug}); fill only the gap left by mcp-read-surface-naming, do not duplicate. | packages/mcp/src/resources/context.ts, packages/mcp/src/server.ts | — | — |
| ✅ | 6 | Persist the surface convention: add a Surfaces-and-their-consumers section to api-naming-reference.md, a compact always-present summary to loom/ctx.md §3, and sweep the CLAUDE.md API short-form if the surface nuance is needed. | loom/refs/api-naming-reference.md, loom/ctx.md, CLAUDE.md, packages/app/src/installWorkspace.ts | — | — |
| ✅ | 7 | Add/adjust tests (CLI arg parsing + do-next-step strict-ULID rejection) and run build-all + test-all green. | tests/commands.test.ts, packages/mcp/tests/integration.test.ts, scripts/test-all.sh | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:cli-internal-call-site-rename -->
### Step 1 — CLI internal call-site rename

Audit every command for `runEvent(weaveId, …)` and similar; rename the local + its source to `weaveSlug`. Any `docId`/`planId` local that actually carries a slug/stem becomes `*Slug`, or is resolved to a `*Ulid` at the point of resolution. Pure internal correctness — no user-visible change here.

<!-- step:cli-user-facing-args-slug-first -->
### Step 2 — CLI user-facing args — slug-first, clean break

Weave-scoped commands (status/validate/design/plan/refine-design, --weave) take a weave slug — drop `-id` from labels. Entity-addressed commands (next/start-plan/complete-step/context, --thread) name the arg for the entity ([plan], [doc], <thread>), never *-id or *-ulid at the human boundary. Old names are removed, not aliased (decided: clean break). Update the CLI README usage examples in lockstep.

<!-- step:tighten-do-next-step-to-strict -->
### Step 4 — Tighten do-next-step to strict ULID

The prompt can only go strict once its callers supply a ULID — step 3 makes next.ts resolve at the edge, so this is safe now. Reuse the requirePlanUlid guard (or its shared predicate) rather than duplicating the pl_ check.
