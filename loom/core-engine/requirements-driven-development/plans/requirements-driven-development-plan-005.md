---
type: plan
id: pl_01KTYY898NNAD8KVNC649J54PW
title: RDD v1.7.0 — req handle integrity, dropped status, and amend
status: done
created: "2026-06-12T00:00:00.000Z"
updated: 2026-06-12
version: 1
design_version: 1
req_version: 1
tags: []
parent_id: de_01KTBA3MSAGGDWC5G55A49JN4T
requires_load: []
target_version: 0.1.0
steps:
  - id: core-dropped-status-model-diffreqhandles-guard
    order: 1
    status: done
    description: "**core — handle integrity + dropped status (pure).** Extend `ReqItem` with `status: 'active' | 'dropped'` (default `active`). Teach `parseReq` to read a `~dropped` marker token immediately after the handle (`- \\`IN3\\` ~dropped …`), set `status:'dropped'`, and strip the token from `text` (round-trip stable). Exempt dropped items from coverage: in `checkReqCoverage`, `uncovered` filters out `status==='dropped'` Included items — a dropped IN stays in `includedIds` (so citations to it still resolve, never `unknownCitations`) but no longer demands a covering step. Add pure `diffReqHandles(prev: ParsedReq, next: ParsedReq) → { deleted: string[], ok: boolean }`: every handle id present in `prev` MUST still be present in `next` (a vanished id is a delete/renumber violation); new ids are allowed appends. No IO, no AI. Unit tests: `parseReq` round-trips `~dropped`; `checkReqCoverage` exempts dropped yet still resolves its citations; `diffReqHandles` flags delete + renumber, allows append + status-flip."
    files_touched: [packages/core/src/entities/req.ts, packages/core/src/reqCoverage.ts, packages/core/src/reqDiff.ts, packages/core tests]
    blocked_by: []
    satisfies: [IN2, IN6, C2, IN10, IN11]
  - id: app-amendreq-use-case-with-the
    order: 2
    status: done
    description: "**app — rename `refineReq` → `amendReq`, wire the guard.** Rename the use-case in `app/src/req.ts` (and its `RefineReqInput → AmendReqInput`). Before save: when `content` is supplied, `parseReq` the existing body (prev) and the incoming body (next), run `diffReqHandles`; on violation **throw** a clear error naming the offending handles (refuse renumber/delete — the escape hatch is `~dropped`, not deletion). Keep the rest of the contract intact: re-open `locked → draft`, bump `version`, stamp `updated`; a pure re-open (no `content`) skips the diff. Tests: append `IN7` → ok; delete `IN3` → throws naming `IN3`; renumber (`IN3`→`IN9` same text) → throws; mark `IN3` `~dropped` → ok; pure re-open → ok."
    files_touched: [packages/app/src/req.ts, packages/app tests]
    blocked_by: []
    satisfies: [IN4, C1]
  - id: mcp-rename-tool-to-loom-amend
    order: 3
    status: done
    description: "**mcp — `loom_refine_req` → `loom_amend_req`.** Rename `tools/refineReq.ts → amendReq.ts`; tool name `loom_amend_req`; call the `amendReq` use-case. Rewrite the description to state the full contract: *reconciles new/changed requirements into the thread spec under append-only rules (never renumbers or deletes a handle; supersede via `~dropped`), re-opens a locked req to draft, bumps version → downstream stale.* Surface a guard violation as a clean tool error payload (a finding, not a crash). Update the registration in `server.ts`; **delete** the old `loom_refine_req` registration — no alias (clean-no-legacy). Integration test: create req `IN1`–`IN2` → amend append `IN3` → ok; amend delete `IN1` → error naming `IN1`."
    files_touched: [packages/mcp/src/tools/amendReq.ts, packages/mcp/src/server.ts, packages/mcp/tests/integration.test.ts]
    blocked_by: []
    satisfies: [IN4, C3, IN12]
  - id: vscode-rename-refine-button-to-amend
    order: 4
    status: done
    description: "**vscode — rename the req Refine action to Amend.** On the `req` tree node, rename the *Refine* command/button to *Amend* (command id, title, `package.json` contribution, icon/tooltip) and point it at `loom_amend_req` via the MCP client. Update the launch-prompt text for the action so the launched Claude agent is told to amend (append/supersede under append-only rules), not rewrite. No direct `app` imports — MCP only."
    files_touched: ["packages/vscode/src/commands/*", "packages/vscode/src/providers/*", packages/vscode/package.json]
    blocked_by: []
    satisfies: [IN4]
  - id: build-test-smoke-1-7-0
    order: 5
    status: done
    description: "**build, full test green, smoke, release.** `./scripts/build-all.sh` then `./scripts/test-all.sh`. Smoke on a scratch thread: hand-write `req.md` with `IN1`–`IN3`; `loom_amend_req` to append `IN4` (ok); attempt a renumber/delete (refused, names the handle); mark `IN2` `~dropped` and assert `loom_verify_req` no longer lists `IN2` as uncovered while a step citing `IN2` still resolves (not an unknown citation). Lockstep version bump to **1.7.0** across `packages/*`; update CHANGELOG(s). Restart note: the running `loom mcp` must be restarted for the renamed tool to appear."
    files_touched: [scripts/bump-version.sh outputs, CHANGELOG.md, packages/vscode/CHANGELOG.md]
    blocked_by: []
    satisfies: []
---
# RDD v1.7.0 — req handle integrity, dropped status, and amend

## Goal

Make a thread's req safe to evolve across multiple plans by enforcing **referential integrity on requirement handles** and renaming the evolve-path tool to reflect its true contract. Today `loom_refine_req` blind-saves whatever body it is handed (`app/src/req.ts`), so re-extracting requirements for a second plan can renumber or drop existing `IN/EX/C` handles — silently breaking the `satisfies` citations that plan steps point at. This plan adds: (1) a pure deterministic guard `diffReqHandles(prev, next)` that refuses any write which deletes or renumbers an existing handle (append + status-change only); (2) a minimal dropped-status model on Included items (`status: active | dropped`, authored as a `~dropped` marker) so a superseded requirement stays citation-resolvable but is exempt from coverage nagging, while a still-uncovered item surfaces naturally; and (3) renames `loom_refine_req` → `loom_amend_req` (and the `refineReq` use-case → `amendReq`) so the name advertises the append-only/reconcile contract instead of inviting free-rewrite. Cross-plan coverage aggregation is already correct (`loom_verify_req` flatMaps steps across all thread plans) so it is out of scope. Layered core → app → mcp → vscode per the dependency rule; lockstep version bump to 1.7.0. Design: requirements-driven-development-design.md §1/§3/§5; settled in chat-004 (amend over merge/append; only "dropped" needs a marker; deferred = uncovered, free).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | **core — handle integrity + dropped status (pure).** Extend `ReqItem` with `status: 'active' \| 'dropped'` (default `active`). Teach `parseReq` to read a `~dropped` marker token immediately after the handle (`- \`IN3\` ~dropped …`), set `status:'dropped'`, and strip the token from `text` (round-trip stable). Exempt dropped items from coverage: in `checkReqCoverage`, `uncovered` filters out `status==='dropped'` Included items — a dropped IN stays in `includedIds` (so citations to it still resolve, never `unknownCitations`) but no longer demands a covering step. Add pure `diffReqHandles(prev: ParsedReq, next: ParsedReq) → { deleted: string[], ok: boolean }`: every handle id present in `prev` MUST still be present in `next` (a vanished id is a delete/renumber violation); new ids are allowed appends. No IO, no AI. Unit tests: `parseReq` round-trips `~dropped`; `checkReqCoverage` exempts dropped yet still resolves its citations; `diffReqHandles` flags delete + renumber, allows append + status-flip. | packages/core/src/entities/req.ts, packages/core/src/reqCoverage.ts, packages/core/src/reqDiff.ts, packages/core tests | — | IN2, IN6, C2, IN10, IN11 |
| ✅ | 2 | **app — rename `refineReq` → `amendReq`, wire the guard.** Rename the use-case in `app/src/req.ts` (and its `RefineReqInput → AmendReqInput`). Before save: when `content` is supplied, `parseReq` the existing body (prev) and the incoming body (next), run `diffReqHandles`; on violation **throw** a clear error naming the offending handles (refuse renumber/delete — the escape hatch is `~dropped`, not deletion). Keep the rest of the contract intact: re-open `locked → draft`, bump `version`, stamp `updated`; a pure re-open (no `content`) skips the diff. Tests: append `IN7` → ok; delete `IN3` → throws naming `IN3`; renumber (`IN3`→`IN9` same text) → throws; mark `IN3` `~dropped` → ok; pure re-open → ok. | packages/app/src/req.ts, packages/app tests | — | IN4, C1 |
| ✅ | 3 | **mcp — `loom_refine_req` → `loom_amend_req`.** Rename `tools/refineReq.ts → amendReq.ts`; tool name `loom_amend_req`; call the `amendReq` use-case. Rewrite the description to state the full contract: *reconciles new/changed requirements into the thread spec under append-only rules (never renumbers or deletes a handle; supersede via `~dropped`), re-opens a locked req to draft, bumps version → downstream stale.* Surface a guard violation as a clean tool error payload (a finding, not a crash). Update the registration in `server.ts`; **delete** the old `loom_refine_req` registration — no alias (clean-no-legacy). Integration test: create req `IN1`–`IN2` → amend append `IN3` → ok; amend delete `IN1` → error naming `IN1`. | packages/mcp/src/tools/amendReq.ts, packages/mcp/src/server.ts, packages/mcp/tests/integration.test.ts | — | IN4, C3, IN12 |
| ✅ | 4 | **vscode — rename the req Refine action to Amend.** On the `req` tree node, rename the *Refine* command/button to *Amend* (command id, title, `package.json` contribution, icon/tooltip) and point it at `loom_amend_req` via the MCP client. Update the launch-prompt text for the action so the launched Claude agent is told to amend (append/supersede under append-only rules), not rewrite. No direct `app` imports — MCP only. | packages/vscode/src/commands/*, packages/vscode/src/providers/*, packages/vscode/package.json | — | IN4 |
| ✅ | 5 | **build, full test green, smoke, release.** `./scripts/build-all.sh` then `./scripts/test-all.sh`. Smoke on a scratch thread: hand-write `req.md` with `IN1`–`IN3`; `loom_amend_req` to append `IN4` (ok); attempt a renumber/delete (refused, names the handle); mark `IN2` `~dropped` and assert `loom_verify_req` no longer lists `IN2` as uncovered while a step citing `IN2` still resolves (not an unknown citation). Lockstep version bump to **1.7.0** across `packages/*`; update CHANGELOG(s). Restart note: the running `loom mcp` must be restarted for the renamed tool to appear. | scripts/bump-version.sh outputs, CHANGELOG.md, packages/vscode/CHANGELOG.md | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
