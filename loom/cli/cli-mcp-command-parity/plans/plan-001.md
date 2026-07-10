---
type: plan
id: pl_01KX6WP3PCBVT9X2BCM40M5JPN
title: CLI ⇄ MCP ⇄ Extension status-verb parity
status: implementing
created: 2026-07-10
updated: 2026-07-10
version: 1
design_version: 1
tags: []
parent_id: de_01KX6WEBR2XERVZD8M7NXS4FSG
requires_load: []
target_version: 0.1.0
steps:
  - id: guarded-loom-set-status
    order: 1
    status: done
    description: "Add a guarded set-status use-case + MCP tool loom_set_status(doc_ulid, status): performs free label transitions (idea/design/reference draft↔active↔done; plan draft↔active) and refuses guarded ones (plan→implementing/done, req→locked) with an error naming the right tool."
    files_touched: [packages/core/src, packages/app/src, packages/mcp/src]
    blocked_by: []
    satisfies: []
  - id: trim-status-out-of-loom-update
    order: 2
    status: done
    description: Remove the status parameter from loom_update_doc (app use-case + MCP tool) so it only edits body + requires_load; grep-audit every caller that set status via update_doc and migrate it to loom_set_status.
    files_touched: [packages/app/src, packages/mcp/src]
    blocked_by: [guarded-loom-set-status]
    satisfies: []
  - id: retire-loom-finalize-doc
    order: 3
    status: done
    description: Delete the loom_finalize_doc MCP tool and its finalize app use-case (redundant with set_status). Keep loom_finalize_req — that is scope-lock, not status labeling.
    files_touched: [packages/app/src, packages/mcp/src]
    blocked_by: [guarded-loom-set-status]
    satisfies: []
  - id: cli-loom-set-status-drop-finalize
    order: 4
    status: done
    description: Add CLI 'loom set-status <slug> <status>' (resolves slug→ULID at the edge, maps to the set-status use-case). Remove CLI 'finalize'. Purge stale help text — no 'generate permanent ID', slug-addressed not ID.
    files_touched: [packages/cli/src/index.ts]
    blocked_by: [guarded-loom-set-status, retire-loom-finalize-doc]
    satisfies: []
  - id: cli-create-chat-command
    order: 5
    status: pending
    description: Add a CLI command to create a chat (mirror loom_create_chat), so a Power-terminal / Pure-agent user can start the chat loop from the terminal. Lean name 'loom chat new'.
    files_touched: [packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: extension-set-status-menu
    order: 6
    status: pending
    description: "Point markStatus.ts at loom_set_status; rename commands loom.markDone/markActive → loom.setStatusDone/setStatusActive with menu labels 'Set Status: Done' / 'Set Status: Active'; remove the loom.finalize command, finalize.ts, and its menu entry."
    files_touched: [packages/vscode/src/commands/markStatus.ts, packages/vscode/src/commands/finalize.ts, packages/vscode/src/extension.ts, packages/vscode/package.json]
    blocked_by: [guarded-loom-set-status, retire-loom-finalize-doc]
    satisfies: []
  - id: four-ways-cli-availability-audit
    order: 7
    status: pending
    description: Walk the four ways in docs/WAYS-TO-USE-LOOM.md and verify each has the CLI/MCP commands it needs to run end-to-end; record any remaining gaps as follow-ups (esp. Power terminal CLI completeness).
    files_touched: [docs/WAYS-TO-USE-LOOM.md]
    blocked_by: [cli-loom-set-status-drop-finalize, cli-create-chat-command]
    satisfies: []
  - id: tri-surface-parity-contract-claude-md
    order: 8
    status: pending
    description: "Add the 'Tri-surface command parity (hard)' rule to CLAUDE.md (sibling of API-naming / API-refactor-scope), including the WAYS-TO-USE availability clause. Repo-specific — no rule: marker, not mirrored into the LOOM_CLAUDE_MD template."
    files_touched: [CLAUDE.md]
    blocked_by: []
    satisfies: []
  - id: docs-sweep
    order: 9
    status: pending
    description: "Update every surface that names the old commands: README command tables (Mark Done / Finalize → Set Status), WAYS-TO-USE-LOOM.md, docs/CLI_USER_GUIDE.md, loom/refs/mcp-reference.md, loom/refs/api-naming-reference.md; document loom set-status and create-chat."
    files_touched: [README.md, packages/cli/README.md, packages/vscode/README.md, docs/CLI_USER_GUIDE.md, loom/refs/mcp-reference.md, loom/refs/api-naming-reference.md]
    blocked_by: [cli-loom-set-status-drop-finalize, extension-set-status-menu]
    satisfies: []
  - id: tests-build
    order: 10
    status: pending
    description: "Add/adjust tests: set_status free-vs-guarded behavior (plan→done refused, points to close_plan), update_doc no longer accepts status, finalize gone. Run build-all then test-all green."
    files_touched: [tests, scripts/test-all.sh]
    blocked_by: [guarded-loom-set-status, trim-status-out-of-loom-update, retire-loom-finalize-doc, cli-loom-set-status-drop-finalize, extension-set-status-menu]
    satisfies: []
---
# CLI ⇄ MCP ⇄ Extension status-verb parity

## Goal

Consolidate document status changes onto a single guarded verb (loom_set_status) mirrored across MCP, CLI, and the extension; retire the redundant pre-ULID finalize path and the latent "Mark Done bypasses close_plan" bug that rides on loom_update_doc; close CLI parity gaps so every way advertised in docs/WAYS-TO-USE-LOOM.md is fully runnable from its surface; and codify a tri-surface command-parity contract in CLAUDE.md. Per the API-refactor scope rule this sweeps MCP tools, the CLI, the extension, and the docs in one change — no half-migration.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a guarded set-status use-case + MCP tool loom_set_status(doc_ulid, status): performs free label transitions (idea/design/reference draft↔active↔done; plan draft↔active) and refuses guarded ones (plan→implementing/done, req→locked) with an error naming the right tool. | packages/core/src, packages/app/src, packages/mcp/src | — | — |
| ✅ | 2 | Remove the status parameter from loom_update_doc (app use-case + MCP tool) so it only edits body + requires_load; grep-audit every caller that set status via update_doc and migrate it to loom_set_status. | packages/app/src, packages/mcp/src | guarded-loom-set-status | — |
| ✅ | 3 | Delete the loom_finalize_doc MCP tool and its finalize app use-case (redundant with set_status). Keep loom_finalize_req — that is scope-lock, not status labeling. | packages/app/src, packages/mcp/src | guarded-loom-set-status | — |
| ✅ | 4 | Add CLI 'loom set-status <slug> <status>' (resolves slug→ULID at the edge, maps to the set-status use-case). Remove CLI 'finalize'. Purge stale help text — no 'generate permanent ID', slug-addressed not ID. | packages/cli/src/index.ts | guarded-loom-set-status, retire-loom-finalize-doc | — |
| 🔳 | 5 | Add a CLI command to create a chat (mirror loom_create_chat), so a Power-terminal / Pure-agent user can start the chat loop from the terminal. Lean name 'loom chat new'. | packages/cli/src/index.ts | — | — |
| 🔳 | 6 | Point markStatus.ts at loom_set_status; rename commands loom.markDone/markActive → loom.setStatusDone/setStatusActive with menu labels 'Set Status: Done' / 'Set Status: Active'; remove the loom.finalize command, finalize.ts, and its menu entry. | packages/vscode/src/commands/markStatus.ts, packages/vscode/src/commands/finalize.ts, packages/vscode/src/extension.ts, packages/vscode/package.json | guarded-loom-set-status, retire-loom-finalize-doc | — |
| 🔳 | 7 | Walk the four ways in docs/WAYS-TO-USE-LOOM.md and verify each has the CLI/MCP commands it needs to run end-to-end; record any remaining gaps as follow-ups (esp. Power terminal CLI completeness). | docs/WAYS-TO-USE-LOOM.md | cli-loom-set-status-drop-finalize, cli-create-chat-command | — |
| 🔳 | 8 | Add the 'Tri-surface command parity (hard)' rule to CLAUDE.md (sibling of API-naming / API-refactor-scope), including the WAYS-TO-USE availability clause. Repo-specific — no rule: marker, not mirrored into the LOOM_CLAUDE_MD template. | CLAUDE.md | — | — |
| 🔳 | 9 | Update every surface that names the old commands: README command tables (Mark Done / Finalize → Set Status), WAYS-TO-USE-LOOM.md, docs/CLI_USER_GUIDE.md, loom/refs/mcp-reference.md, loom/refs/api-naming-reference.md; document loom set-status and create-chat. | README.md, packages/cli/README.md, packages/vscode/README.md, docs/CLI_USER_GUIDE.md, loom/refs/mcp-reference.md, loom/refs/api-naming-reference.md | cli-loom-set-status-drop-finalize, extension-set-status-menu | — |
| 🔳 | 10 | Add/adjust tests: set_status free-vs-guarded behavior (plan→done refused, points to close_plan), update_doc no longer accepts status, finalize gone. Run build-all then test-all green. | tests, scripts/test-all.sh | guarded-loom-set-status, trim-status-out-of-loom-update, retire-loom-finalize-doc, cli-loom-set-status-drop-finalize, extension-set-status-menu | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:guarded-loom-set-status -->
### Step 1 — Guarded loom_set_status

Core holds the (docType, targetStatus) → allowed|delegate(tool) decision as a pure function. App wraps it in a runEvent. MCP registers loom_set_status (ULID-strict). This is the single status path everything else migrates onto.

<!-- step:trim-status-out-of-loom-update -->
### Step 2 — Trim status out of loom_update_doc

Closes the latent bug where loom_update_doc({status:'done'}) marks a plan done with no close_plan / step check. Confirm no app or AI caller still relies on update_doc for status.
