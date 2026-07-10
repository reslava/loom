---
type: done
id: pl_01KX6WP3PCBVT9X2BCM40M5JPN-done
title: Done — CLI ⇄ MCP ⇄ Extension status-verb parity
status: done
created: 2026-07-10
version: 2
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

## Step 5 — Unify the CLI create surface: introduce a `loom create <type>` namespace mirroring loom_create_* for ALL types (idea, design, plan, chat, reference, req, weave, thread), and RETIRE `loom weave`. Create commands must NEVER implicitly mint a thread — idea/design/plan/req/chat require an existing thread (resolve slug→ULID, error if missing); `loom create thread` is the explicit thread creator. Also fix the wrong MCP loom_create_idea description ("optionally in a specific thread" — an idea is created only in a specific thread, one per thread) and audit sibling create descriptions.

Unified the CLI create surface to a `loom create <type>` namespace mirroring `loom_create_*`, thread-first (no implicit thread creation), and retired `loom weave`.\n\n- **`packages/cli/src/commands/create.ts`** (new) — 8 handlers: `thread, idea, design, plan, req, chat, reference, weave`. A private `requireThreadUlid(weave, threadRef)` resolves an EXISTING thread (slug or th_ ULID) via `resolveThreadUlid`; on miss it throws `Thread '…' not found. Create it first: loom create thread …` — never auto-creates. `create thread` is the sole explicit creator; `create chat` supports `--refs` for a refs chat; each handler reuses the existing app use-case (weaveIdea/weaveDesign/weavePlan/createThread/chatNew/createReq/createWeave/createReference).\n- **`packages/cli/src/index.ts`** — replaced the `loom weave` group with the `loom create` group (positional `<weave> <thread>` mirrors the MCP thread-first contract; human-first args).\n- **Retired** `packages/cli/src/commands/{weaveIdea,weaveDesign,weavePlan}.ts` and `packages/cli/src/threadArg.ts` (its `ensureThreadUlid` was the auto-create seam — gone).\n- **`packages/app/src/createReference.ts`** (new) — extracted the reference-writing logic out of the MCP tool so CLI + MCP share one implementation (byte-identical files); exported from app index. `packages/mcp/src/tools/createReference.ts` now delegates to it.\n- **`packages/mcp/src/tools/createIdea.ts`** — fixed the wrong description (\"in a weave (optionally in a specific thread)\" → \"in a specific thread — one idea per thread; requires th_ ULID; never mints a thread\") and tightened `thread_ulid` to required in the handler. Audited siblings: create_design/plan/req already read thread-first; no other divergence.\n\nVerified on the built CLI: `loom create -h` lists all 8; `loom weave` is gone; end-to-end `create weave → create thread (mints th_ ULID) → create idea` writes idea.md + thread.md; `create idea` into a missing thread errors with the create-thread hint (no mutation); `create reference` writes via the shared use-case. All scratch artifacts removed, git clean. build-all green.
