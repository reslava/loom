---
type: done
id: pl_01KTYY898NNAD8KVNC649J54PW-done
title: Done — RDD v1.7.0 — req handle integrity, dropped status, and amend
status: done
created: "2026-06-12T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KTYY898NNAD8KVNC649J54PW
requires_load: []
---
# Done — RDD v1.7.0 — req handle integrity, dropped status, and amend

## Step 1 — **core — handle integrity + dropped status (pure).** Extend `ReqItem` with `status: 'active' | 'dropped'` (default `active`). Teach `parseReq` to read a `~dropped` marker token immediately after the handle (`- \`IN3\` ~dropped …`), set `status:'dropped'`, and strip the token from `text` (round-trip stable). Exempt dropped items from coverage: in `checkReqCoverage`, `uncovered` filters out `status==='dropped'` Included items — a dropped IN stays in `includedIds` (so citations to it still resolve, never `unknownCitations`) but no longer demands a covering step. Add pure `diffReqHandles(prev: ParsedReq, next: ParsedReq) → { deleted: string[], ok: boolean }`: every handle id present in `prev` MUST still be present in `next` (a vanished id is a delete/renumber violation); new ids are allowed appends. No IO, no AI. Unit tests: `parseReq` round-trips `~dropped`; `checkReqCoverage` exempts dropped yet still resolves its citations; `diffReqHandles` flags delete + renumber, allows append + status-flip.

**core — dropped-status model + `diffReqHandles` guard (pure).**

- `packages/core/src/entities/req.ts`: added `ReqItemStatus = 'active' | 'dropped'`; `ReqItem` gains a required `status`. `parseReq` reads an optional `~dropped` marker immediately after the handle (`- \`IN2\` ~dropped …`), sets `status:'dropped'`, and strips the marker from `text` (case-insensitive, round-trip stable). Default is `active`.
- `packages/core/src/reqCoverage.ts`: `uncovered` now filters out `status==='dropped'` Included items. A dropped item stays in `includedIds`, so leftover `satisfies` citations to it still resolve (never `unknownCitations`) — it's just exempt from the coverage requirement.
- `packages/core/src/reqDiff.ts` (new): pure `diffReqHandles(prev, next) → { deleted, added, ok }`. Single invariant — every handle in `prev` must still exist in `next`; a vanished id is a delete/renumber violation, new ids are allowed appends. A `~dropped` item still appears in `next`, so retiring is never a deletion.
- `packages/core/src/index.ts`: exports `ReqItemStatus`, `diffReqHandles`, `ReqHandleDiff`.

**Tests** (run in Step 5 after build):
- `tests/req.test.ts`: `~dropped` sets status + strips marker; default active; case-insensitive.
- `tests/req-coverage.test.ts`: dropped Included exempt from `uncovered` yet still citation-resolvable.
- `tests/req-diff.test.ts` (new, registered in `test-all.sh`): append ok; `~dropped` ok (handle survives); delete flagged; renumber flagged (old id deleted + new id added).

No other package constructs `ReqItem` literals (grep-verified), so the new required field doesn't break callers.

## Step 2 — **app — rename `refineReq` → `amendReq`, wire the guard.** Rename the use-case in `app/src/req.ts` (and its `RefineReqInput → AmendReqInput`). Before save: when `content` is supplied, `parseReq` the existing body (prev) and the incoming body (next), run `diffReqHandles`; on violation **throw** a clear error naming the offending handles (refuse renumber/delete — the escape hatch is `~dropped`, not deletion). Keep the rest of the contract intact: re-open `locked → draft`, bump `version`, stamp `updated`; a pure re-open (no `content`) skips the diff. Tests: append `IN7` → ok; delete `IN3` → throws naming `IN3`; renumber (`IN3`→`IN9` same text) → throws; mark `IN3` `~dropped` → ok; pure re-open → ok.

**app — `refineReq` → `amendReq` with the integrity guard.**

- `packages/app/src/req.ts`: renamed `RefineReqInput → AmendReqInput`, `refineReq → amendReq`. When `content` is supplied, parses prev (existing body) + next (incoming) and runs `diffReqHandles`; on `!ok` **throws** an error naming the dropped handles (`"Amend refused: requirement handles are immutable, but this body drops IN1 …"`) and points to `~dropped` as the retire path. A pure re-open (no `content`) skips the check. Re-open (`locked→draft`) + version bump + `updated` stamp preserved. Updated the doc-comment and the "already exists" message (`Use amendReq…`).
- `packages/app/src/index.ts`: barrel now exports `amendReq` / `AmendReqInput`.

**Tests** — `tests/req-usecases.test.ts`: the refine block is now an `amendReq` append (IN2) → draft v2; added a guard block (delete IN1 → throws naming IN1; renumber IN1→IN9 → throws; refused amends leave state at v2 with IN1+IN2 intact); added an end block where `~dropped` retiring IN2 is accepted (→ v3, both handles present).

Remaining callers to update: `packages/mcp` (Step 3) and `packages/vscode` (Step 4) still reference the old names — expected, fixed in those steps. The build in Step 5 is what compiles all of this.

## Step 3 — **mcp — `loom_refine_req` → `loom_amend_req`.** Rename `tools/refineReq.ts → amendReq.ts`; tool name `loom_amend_req`; call the `amendReq` use-case. Rewrite the description to state the full contract: *reconciles new/changed requirements into the thread spec under append-only rules (never renumbers or deletes a handle; supersede via `~dropped`), re-opens a locked req to draft, bumps version → downstream stale.* Surface a guard violation as a clean tool error payload (a finding, not a crash). Update the registration in `server.ts`; **delete** the old `loom_refine_req` registration — no alias (clean-no-legacy). Integration test: create req `IN1`–`IN2` → amend append `IN3` → ok; amend delete `IN1` → error naming `IN1`.

**mcp — `loom_refine_req` → `loom_amend_req`.**

- Created `packages/mcp/src/tools/amendReq.ts` (tool `loom_amend_req`) calling the `amendReq` use-case; **deleted** `tools/refineReq.ts` (no alias). Full append-only description on the tool: "refuses any body that deletes or renumbers an existing handle… retire via `~dropped`." A guard violation (the use-case throw) is caught and returned as a clean `{ ok: false, error }` finding rather than crashing the tool call.
- `server.ts`: import `amendReq`; **removed** `refineReq` from the `refine` group and added `amendReq` to the **`req`** group, co-locating the req lifecycle (`loom_amend_req` · `loom_finalize_req` · `loom_verify_req`). `createReq` stays in `create` (consistent with the other `create_*`). The `loom://catalog` is generated from `TOOLS`, so it reflects the rename automatically.
- `tools/finalizeReq.ts`: description cross-reference updated `loom_refine_req` → `loom_amend_req`.
- `tests/integration.test.ts`: tool-list assertion now requires `loom_amend_req` **and asserts `loom_refine_req` is gone**; new block (f2) on a scratch `tw/tamend` thread — append `IN3` → `version:2`; delete `IN1` → `{ ok:false, error: "…IN1…" }`.

Grep-verified no remaining `refine_req`/`refineReq` references in `packages/mcp`.

## Step 4 — **vscode — rename the req Refine action to Amend.** On the `req` tree node, rename the *Refine* command/button to *Amend* (command id, title, `package.json` contribution, icon/tooltip) and point it at `loom_amend_req` via the MCP client. Update the launch-prompt text for the action so the launched Claude agent is told to amend (append/supersede under append-only rules), not rewrite. No direct `app` imports — MCP only.

**vscode — req *Refine* action → *Amend*.**

- `packages/vscode/src/commands/req.ts`: `refineReqCommand → amendReqCommand`, calls `loom_amend_req`. The Claude-CLI **launch prompt** is rewritten for append-only (launch prompts out-rank tool descriptions): it tells the agent to READ the current req first (existing handles authoritative, keep verbatim), append new scope only as fresh continuing handles (IN7, IN8…), NEVER renumber/reuse/delete, and retire an obsolete item by inserting `~dropped` after its handle. Sampling-absent fallback re-opens to draft and opens the file for manual curation (unchanged).
- `packages/vscode/src/extension.ts`: import + `registerCommand('loom.amendReq', …)`.
- `packages/vscode/package.json`: command `loom.refineReq → loom.amendReq`, title `"Refine Requirements" → "Amend Requirements"`, both inline + edit menu contributions repointed.

Grep-verified: no `refineReq` / `loom_refine_req` references remain anywhere in `packages/vscode`. (Icon left as `$(sync)` — cosmetic, out of scope.)

## Step 5 — **build, full test green, smoke, release.** `./scripts/build-all.sh` then `./scripts/test-all.sh`. Smoke on a scratch thread: hand-write `req.md` with `IN1`–`IN3`; `loom_amend_req` to append `IN4` (ok); attempt a renumber/delete (refused, names the handle); mark `IN2` `~dropped` and assert `loom_verify_req` no longer lists `IN2` as uncovered while a step citing `IN2` still resolves (not an unknown citation). Lockstep version bump to **1.7.0** across `packages/*`; update CHANGELOG(s). Restart note: the running `loom mcp` must be restarted for the renamed tool to appear.

**build + test + 1.7.0 bump + live dogfood.**

- `./scripts/build-all.sh` green (all packages incl. vscode compiled + global CLI relinked); `./scripts/test-all.sh` green — 17/17 MCP integration (incl. new amend block + `loom_refine_req`-gone assertion), plus `req` / `req-coverage` / `req-diff` / `req-usecases`.
- Lockstep **1.7.0** across all `packages/*` + root; root `CHANGELOG.md` and `packages/vscode/CHANGELOG.md` entries added.
- **Live dogfood (Rafa, via extension):** packaged + installed the vsix, launched *Amend Requirements* → `loom_amend_req` generated correct `IN10`/`IN11`/`IN12` and re-locked. End-to-end through the real extension path works.

**Finding surfaced by the dogfood:** `loom_verify_req` now reports 4 uncovered Included — `IN1` (pre-existing: Phase-1 `plan-001` never cited it) and `IN10`/`IN11`/`IN12` (this plan implemented them, but its steps were completed *before* the handles existed). Root cause: the bootstrap inversion (plan built before the req existed) + there is currently **no way to cite a requirement on a `done` step** (`loom_update_step` is pending-only). Escalated as a design decision in chat-004 (keep done-steps immutable vs. allow `satisfies`-only amendment on done steps) — not part of this plan's scope.
