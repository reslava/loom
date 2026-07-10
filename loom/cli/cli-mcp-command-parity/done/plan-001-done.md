---
type: done
id: pl_01KX6WP3PCBVT9X2BCM40M5JPN-done
title: Done — CLI ⇄ MCP ⇄ Extension status-verb parity
status: done
created: 2026-07-10
version: 1
tags: []
parent_id: pl_01KX6WP3PCBVT9X2BCM40M5JPN
requires_load: []
---
# Done — CLI ⇄ MCP ⇄ Extension status-verb parity

## Step 1 — Add a guarded set-status use-case + MCP tool loom_set_status(doc_ulid, status): performs free label transitions (idea/design/reference draft↔active↔done; plan draft↔active) and refuses guarded ones (plan→implementing/done, req→locked) with an error naming the right tool.

Added the guarded single status verb.
- `packages/core/src/setStatus.ts` — pure `decideSetStatus(docType, targetStatus)` → `allow` | `delegate{tool,reason}` | `reject{reason}`. Free label transitions for idea/design/ctx/reference (and plan draft↔active) are allowed; the three guarded transitions delegate (plan→implementing ⇒ loom_start_plan, plan→done ⇒ loom_close_plan, req→locked ⇒ loom_finalize_req); statuses invalid for a type are rejected. Exported from core index.
- `packages/app/src/setStatus.ts` — `setStatus({docUlid,status}, deps)`: resolves the doc, calls the core decision, throws on delegate/reject, else flips status with NO version/`updated` bump (lifecycle, not spec — staleness-safe), idempotent no-op when already at target. Exported from app index.
- `packages/mcp/src/tools/setStatus.ts` — `loom_set_status(doc_ulid, status)`, ULID-strict, resolve-on-miss at the boundary. Registered in server.ts `doc` group.

## Step 2 — Remove the status parameter from loom_update_doc (app use-case + MCP tool) so it only edits body + requires_load; grep-audit every caller that set status via update_doc and migrate it to loom_set_status.

Trimmed status out of `loom_update_doc` so it owns body + requires_load only.
- `packages/mcp/src/tools/updateDoc.ts` — removed the `status` schema property, the `newStatus` read, the status spread, and updated the description + the "at least one of" guard (now content|requires_load, with a pointer to loom_set_status).
- Caller audit: grep confirmed the only in-repo caller passing `status` to loom_update_doc is the extension `markStatus.ts` (migrated in step 6); no app/mcp/cli caller relied on it. This closes the latent bug where update_doc({status:'done'}) could mark a plan done bypassing loom_close_plan.

## Step 3 — Delete the loom_finalize_doc MCP tool and its finalize app use-case (redundant with set_status). Keep loom_finalize_req — that is scope-lock, not status labeling.

Retired the redundant finalize path.
- Deleted `packages/mcp/src/tools/finalizeDoc.ts` and `packages/app/src/finalize.ts`; removed the app-index `finalize` export and the server.ts import + `doc`-group registration of finalizeDoc.
- `loom_finalize_req` deliberately kept — it's scope-lock, not status labeling. The extension's finalize.ts/menu still reference loom_finalize_doc and are removed in step 6 (they compile now since it's only a callTool string).

## Step 4 — Add CLI 'loom set-status <slug> <status>' (resolves slug→ULID at the edge, maps to the set-status use-case). Remove CLI 'finalize'. Purge stale help text — no 'generate permanent ID', slug-addressed not ID.

CLI parity: set-status in, finalize out.
- `packages/cli/src/commands/setStatus.ts` — `loom set-status <doc> <status>`; resolves the human ref (slug/stem/ULID) → canonical id via resolveDocIdOrThrow at the CLI edge, then the guarded use-case.
- Deleted `packages/cli/src/commands/finalize.ts`; in `index.ts` replaced the `finalize <draft>` command (stale "generate its permanent ID" help) with the `set-status` command + import.
- Verified via built CLI: plan→done refused (points to loom_close_plan), invalid status rejected with the valid list, allow+idempotent no-op writes nothing, `loom finalize` now 'unknown command'. build-all green across all packages.
