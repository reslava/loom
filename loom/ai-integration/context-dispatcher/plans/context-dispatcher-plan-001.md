---
type: plan
id: pl_01KTVANY3TXQ9GM48Z9XVE0XBJ
title: Context Dispatcher — plan
status: done
created: "2026-06-11T00:00:00.000Z"
updated: 2026-06-11
version: 1
design_version: 1
tags: []
parent_id: de_01KTVACXRTR1P4AB2PN7P1REXY
requires_load: []
target_version: 0.1.0
steps:
  - id: cheap-stopgap-skip-flag-trim-echo
    order: 1
    status: done
    description: "Stopgap: add a `context: \"skip\"` / `brief_only` flag to loom_do_step so the agent suppresses the repeat thread bundle when it's already loaded, and stop loom_complete_step / loom_append_done from echoing the full plan doc back (return id + the changed step/summary instead)."
    files_touched: [packages/mcp/src/tools/doStep.ts, packages/app/src/doStep.ts, packages/mcp/src/tools/completeStep.ts, packages/mcp/src/tools/appendDone.ts]
    blocked_by: []
    satisfies: []
  - id: ledger-protocol-in-assemblecontext
    order: 2
    status: done
    description: "Extend the pure assembleContext to accept `alreadyLoaded: {id, version}[]` and return `{ docs: delta, manifest }` — emit a doc only when its id is absent from alreadyLoaded OR its version differs. The dedupe unit is {docId@version}; a refine (version bump) always re-emits. Pure, no IO."
    files_touched: [packages/app/src/context/assembleContext.ts, packages/core/src/entities/context.ts]
    blocked_by: []
    satisfies: []
  - id: wire-the-dispatcher-into-the-injection
    order: 3
    status: done
    description: "Route the injection doors through the extended assembler: thread an `alreadyLoaded` (ledger) param through loom_do_step and the loom://context resource so both inject only the delta. assembleContext becomes the single injection door — no command assembles context on its own."
    files_touched: [packages/mcp/src/tools/doStep.ts, packages/app/src/doStep.ts, packages/mcp/src/resources/context.ts]
    blocked_by: [Ledger protocol in assembleContext]
    satisfies: []
  - id: tests-dedupe-no-silent-under-load
    order: 4
    status: done
    description: "Tests: the dedupe + correctness invariants. Same-session, no doc change → ~0 delta; a doc whose version bumped → re-injected; empty/new-session ledger → full bundle; manifest lists assumed-present docs. Pure assembleContext unit tests + a loom_do_step round-trip."
    files_touched: [tests/context-dispatcher.test.ts]
    blocked_by: [Ledger protocol in assembleContext, Wire the dispatcher into the injection doors]
    satisfies: []
  - id: docs-sync-build-release-1-6
    order: 5
    status: done
    description: "Docs + release: document the new agent protocol (the `alreadyLoaded`/`skip` params and the rule that the agent declares its loaded {id@version} set) in BOTH CLAUDE.md surfaces (drift test enforces parity), CHANGELOG 1.6.0 (root) + vscode lockstep note, build-all + test-all, lockstep bump to 1.6.0."
    files_touched: [CLAUDE.md, packages/app/src/installWorkspace.ts, CHANGELOG.md, packages/vscode/CHANGELOG.md]
    blocked_by: [Cheap stopgap — skip flag + trim echo-backs, Ledger protocol in assembleContext, Wire the dispatcher into the injection doors, Tests — dedupe + no-silent-under-load]
    satisfies: []
---
# Context Dispatcher — plan

## Goal

Implement the context dispatcher (model C) so context injection dedupes against what the agent already holds, plus the cheap stopgap that captures most of the savings immediately. The MCP server stays stateless: the caller declares the {id@version} set it holds and the existing pure assembler (packages/app/src/context/assembleContext.ts) returns only the delta + a manifest of what it assumed present — keyed on {id@version} so a refine (version bump) or a fresh session re-injects correctly (no silent under-load). All context-injecting doors (loom_do_step, the loom://context resource) route through that one assembler. Extension UI to surface the ledger is intentionally out of scope — a follow-up plan in the context-sidebar thread, built only when a consumer needs the display hook. Target release 1.6.0 (lockstep).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Stopgap: add a `context: "skip"` / `brief_only` flag to loom_do_step so the agent suppresses the repeat thread bundle when it's already loaded, and stop loom_complete_step / loom_append_done from echoing the full plan doc back (return id + the changed step/summary instead). | packages/mcp/src/tools/doStep.ts, packages/app/src/doStep.ts, packages/mcp/src/tools/completeStep.ts, packages/mcp/src/tools/appendDone.ts | — | — |
| ✅ | 2 | Extend the pure assembleContext to accept `alreadyLoaded: {id, version}[]` and return `{ docs: delta, manifest }` — emit a doc only when its id is absent from alreadyLoaded OR its version differs. The dedupe unit is {docId@version}; a refine (version bump) always re-emits. Pure, no IO. | packages/app/src/context/assembleContext.ts, packages/core/src/entities/context.ts | — | — |
| ✅ | 3 | Route the injection doors through the extended assembler: thread an `alreadyLoaded` (ledger) param through loom_do_step and the loom://context resource so both inject only the delta. assembleContext becomes the single injection door — no command assembles context on its own. | packages/mcp/src/tools/doStep.ts, packages/app/src/doStep.ts, packages/mcp/src/resources/context.ts | Ledger protocol in assembleContext | — |
| ✅ | 4 | Tests: the dedupe + correctness invariants. Same-session, no doc change → ~0 delta; a doc whose version bumped → re-injected; empty/new-session ledger → full bundle; manifest lists assumed-present docs. Pure assembleContext unit tests + a loom_do_step round-trip. | tests/context-dispatcher.test.ts | Ledger protocol in assembleContext, Wire the dispatcher into the injection doors | — |
| ✅ | 5 | Docs + release: document the new agent protocol (the `alreadyLoaded`/`skip` params and the rule that the agent declares its loaded {id@version} set) in BOTH CLAUDE.md surfaces (drift test enforces parity), CHANGELOG 1.6.0 (root) + vscode lockstep note, build-all + test-all, lockstep bump to 1.6.0. | CLAUDE.md, packages/app/src/installWorkspace.ts, CHANGELOG.md, packages/vscode/CHANGELOG.md | Cheap stopgap — skip flag + trim echo-backs, Ledger protocol in assembleContext, Wire the dispatcher into the injection doors, Tests — dedupe + no-silent-under-load | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:cheap-stopgap-skip-flag-trim-echo -->
### Step 1 — Cheap stopgap — skip flag + trim echo-backs

Independent of the ledger and shippable first — captures most of the token saving immediately. `skip` is the coarse control ("I already have this thread"); the precise per-doc ledger lands in steps 2–3. The complete_step/append_done responses currently return the whole plan on every call (redundant across a multi-step session) — return a reference + the delta (completed step / appended note), not the full body.

<!-- step:ledger-protocol-in-assemblecontext -->
### Step 2 — Ledger protocol in assembleContext

The heart of model C. Server stays a pure function of (request + declared-loaded-set) — no session state, multi-agent-safe for free. `manifest` lists every doc the dispatcher assumed present so the agent/log can reconcile. Keep the existing additive `context_ids` (extra docs to inject); `alreadyLoaded` is its inverse.

<!-- step:wire-the-dispatcher-into-the-injection -->
### Step 3 — Wire the dispatcher into the injection doors

Supersedes step 1's coarse `skip` with precise per-doc deltas (skip stays as the ergonomic "I have the whole thread" shortcut = declare the full ledger). Any future context-injecting tool must go through this door too.

<!-- step:tests-dedupe-no-silent-under-load -->
### Step 4 — Tests — dedupe + no-silent-under-load

The load-bearing assertion is the correctness one: a version bump MUST re-inject (proving we never silently under-load), and a fresh/empty ledger MUST yield the full bundle.

<!-- step:docs-sync-build-release-1-6 -->
### Step 5 — Docs sync, build, release 1.6.0

Push gated on Rafa, per the established release ritual (explicit tag push — the lightweight tag won't ride --follow-tags).
