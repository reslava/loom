---
type: plan
id: mvp-plan-to-publish-plan
title: MVP — Plan to publish
status: implementing
created: "2026-05-02T00:00:00.000Z"
updated: 2026-05-03
version: 4
design_version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
target_version: 0.1.0
---

# MVP — Plan to publish

## Goal

Reach a publishable MVP: a Loom that **any user can install in their own codebase** and use the full `chat → generate → implement` loop without our hand-holding.

Organized as 7 phases:

- **Phase 0** — Stabilize: every toolbar and inline button works on every node type it claims to.
- **Phase 1** — `loom install` template parity (greenfield workspace yields a working setup).
- **Phase 2** — AI commands wired through MCP sampling (no more stubs).
- **Phase 3** — Empty-workspace UX (first-run is obvious).
- **Phase 4** — Marketplace publish blockers cleared.
- **Phase 5** — Docs sweep aimed at outside users (Loom-on-someone-else's-codebase).
- **Phase 6** — Bump to `0.5.0`, publish vsix + npm.

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | **Phase 0** — Audit every toolbar button: `weaveCreate`, `threadCreate`, `chatNew`, `weaveIdea`, `weaveDesign`, `weavePlan`, `setGrouping`, `setStatusFilter`, `setTextFilter`, `generateGlobalCtx`, `toggleArchived`, `refresh`, `reconnectMcp`. Verify each invokes its handler, mutates state correctly, and refreshes the tree | `packages/vscode/src/commands/*` | — |
| ✅ | 2 | **Phase 0** — Audit every inline (item-context) button: `weaveIdea`, `weaveDesign`, `weavePlan`, `summarise`, `finalize`, `refineDesign`, `startPlan`, `doStep`, `completeStep`, `validate`, `chatReply`, `promoteToIdea`, `promoteToDesign`, `promoteToPlan`, `refineIdea`, `refinePlan`, `closePlan`, `rename`, `archive`, `delete`. Verify the `when` clause shows them on the right node types and the handler receives the node | `packages/vscode/package.json`, `packages/vscode/src/commands/*` | — |
| ✅ | 3 | **Phase 0** — Fix `weaveCreate` / `threadCreate` path bug (wrote to `weaves/` instead of `loom/`). Confirm fix lands in vsix; smoke-test creating an empty weave and an empty thread end-to-end | `packages/vscode/src/commands/weaveCreate.ts`, `packages/vscode/src/commands/threadCreate.ts` | — |
| ✅ | 4 | **Phase 0** — Repair selection→context wiring so `loom.selectedWeaveId` is set when a weave OR any descendant doc is clicked (currently driven only by `node.weaveId`; verify it's set for thread-level and doc-level selections too) | `packages/vscode/src/extension.ts` | — |
| ✅ | 5 | **Phase 0** — Root-cause + fix anything found in steps 1–4. One bug = one row appended below this step | (varies) | 1, 2, 3, 4 |
| ✅ | 6 | **Phase 1** — Run `loom install` in an empty test directory. Confirm it creates `.loom/`, `CLAUDE.md`, `loom-ctx.md`, `.mcp.json` (or equivalent), and the `loom/` weave dir. Record gaps | `packages/cli/src/commands/install.ts`, `packages/app/src/installWorkspace.ts` | — |
| ✅ | 7 | **Phase 1** — Verify the installed `.mcp.json` template uses `${workspaceFolder}` for `LOOM_ROOT` and points to the correct `loom mcp` command. Confirm the new workspace can spawn the MCP server | `packages/app/src/installWorkspace.ts` (templates) | 6 |
| ✅ | 8 | **Phase 1** — Verify the installed `CLAUDE.md` template includes session-start protocol, MCP visibility rules, stop rules — i.e. parity with this repo's `CLAUDE.md`. Update template if drift detected | `packages/app/src/installWorkspace.ts` (templates) | 6 |
| ✅ | 9 | **Phase 1** — End-to-end smoke: in the test dir, open Claude Code, run a chat, ask for an idea generation, confirm `loom_generate_idea` works through MCP. Document any setup step a real user has to do that isn't automated | (test only) | 7, 8 |
| ✅ | 10 | **Phase 2** — `loom.generateGlobalCtx` is currently a stub. Wire it through MCP sampling: call MCP on the loom root, write `loom-ctx.md` | `packages/vscode/src/extension.ts`, `packages/mcp/src/tools/*` (new tool if needed) | — |
| ✅ | 11 | **Phase 2** — `loom.refineDesign` — verify the existing implementation actually calls `loom_generate_design` (refinement mode) via MCP sampling. Fix if it bypasses MCP | `packages/vscode/src/commands/refine.ts` | — |
| ✅ | 12 | **Phase 2** — `loom.refineIdea` and `loom.refinePlan` — same audit as step 11; ensure both go through MCP sampling and update versions/staleness correctly | `packages/vscode/src/commands/refineIdea.ts`, `packages/vscode/src/commands/refinePlan.ts` | — |
| ✅ | 13 | **Phase 2** — `loom.summarise` — generates a ctx doc; confirm it routes through MCP sampling and writes via `loom_create_doc` | `packages/vscode/src/commands/summarise.ts` | — |
| ✅ | 14 | **Phase 2** — `loom.chatReply` — confirm AI reply is appended into the chat doc via MCP `loom_append_to_chat`, not direct file edit | `packages/vscode/src/commands/chatReply.ts` | — |
| ✅ | 15 | **Phase 2** — Verify all `loom.promoteTo*` commands (idea/design/plan) route through MCP `loom_promote` (or equivalent) | `packages/vscode/src/commands/promoteTo*.ts` | — |
| 🔳 | 16 | **Phase 3** — Empty-workspace tree state: when no `loom/` dir exists OR it's empty, replace "No weaves found" with a friendlier welcome view (`viewsWelcome`) — title, sentence, and a button that runs `loom.weaveCreate` | `packages/vscode/package.json` (viewsWelcome), `packages/vscode/src/tree/treeProvider.ts` | — |
| 🔳 | 17 | **Phase 3** — Walkthrough polish: verify each step's completion event fires (`cliDetected`, `workspaceInitialized`, `aiConfigured`, `hasWeaves`). Step 4 ("Create your first weave") should auto-complete when first weave dir exists | `packages/vscode/src/extension.ts` | — |
| 🔳 | 18 | **Phase 3** — First-run notification: confirm `showSetupNotification` fires once per workspace and the actions actually work end-to-end | `packages/vscode/src/extension.ts` | — |
| 🔳 | 19 | **Phase 3** — Status-bar MCP indicator: ensure `mcpStatusBar` reflects real connection state, not just config presence; click action should run `loom.reconnectMcp` | `packages/vscode/src/extension.ts` | — |
| 🔳 | 20 | **Phase 4** — `vsce package` warnings: run packaging, fix every warning (missing repo, missing license header, oversized images, etc.) until output is clean | `packages/vscode/package.json`, `packages/vscode/.vscodeignore` | — |
| 🔳 | 21 | **Phase 4** — README rewrite for marketplace: short pitch, animated GIF/screenshot of the tree + chat → generate → implement loop, install instructions, link to docs | `packages/vscode/README.md`, `packages/vscode/media/screenshots/` | — |
| 🔳 | 22 | **Phase 4** — Icon assets: confirm `media/loom.png` is at marketplace-required sizes (128×128 minimum) and `media/loom-icon.svg` renders correctly in the activity bar at all themes | `packages/vscode/media/` | — |
| 🔳 | 23 | **Phase 4** — Strip dev-only `console.log` / `console.error` calls from `packages/vscode/src/**` except the `🧵` activation log and genuine error reporting | `packages/vscode/src/**` | — |
| 🔳 | 24 | **Phase 4** — Publisher account: confirm `reslava` publisher exists on the VS Code marketplace; create PAT for `vsce publish` | (external — Azure DevOps) | — |
| 🔳 | 25 | **Phase 4** — License headers and `LICENSE` file present in every published package (`vscode`, `cli`, `mcp`) | `packages/vscode/LICENSE`, `packages/cli/LICENSE`, `packages/mcp/LICENSE` | — |
| 🔳 | 26 | **Phase 4** — Add `resources/templates/list` handler to MCP server; move templated URIs (`loom://docs/{id}`, `loom://thread-context/{...}`, `loom://plan/{id}`, `loom://requires-load/{id}`) out of `resources/list` into the new handler. Fixes `-32601 Method not found` on Continue.dev and any other MCP host that calls `templates/list` | `packages/mcp/src/server.ts` | — |
| 🔳 | 27 | **Phase 5** — Rewrite `loom/refs/loom.md` and `loom/refs/vision.md` to lead with the outside-user perspective. The "Loom-on-Loom" recursion should be a footnote, not the headline | `loom/refs/loom.md`, `loom/refs/vision.md` | — |
| 🔳 | 28 | **Phase 5** — Create `loom/refs/getting-started.md`: one-page "install Loom in your repo, write your first chat, generate your first idea". Linked from the marketplace README | `loom/refs/getting-started.md` (new) | 21 |
| 🔳 | 29 | **Phase 5** — Verify `loom/refs/architecture-reference.md` matches current code (post-MCP refactor); update any stale diagrams or layer descriptions | `loom/refs/architecture-reference.md` | — |
| 🔳 | 30 | **Phase 5** — Verify `loom/refs/workflow.md` matches the current button names and command IDs (post-rename from `new` to `weave`). Fix any drift | `loom/refs/workflow.md` | — |
| 🔳 | 31 | **Phase 5** — `CLAUDE.md` template (the one shipped by `loom install`) — pass it through a fresh-eyes review; it's the first thing every outside user's AI agent sees | `packages/app/src/installWorkspace.ts` (template), `loom/CLAUDE.md` | — |
| 🔳 | 32 | **Phase 6** — Bump versions: `core`, `fs`, `app`, `cli`, `mcp`, `vscode`, root → all `0.5.0`. Add explicit `version: "0.5.0"` to `core/package.json` and `fs/package.json` (currently missing) | `packages/*/package.json`, `package.json` | — |
| 🔳 | 33 | **Phase 6** — Write `CHANGELOG.md` for `0.5.0`: MCP refactor, global chats/ctx/refs, status-filter rework, dynamic title, reconnect command, install template, etc. | `CHANGELOG.md`, `packages/vscode/CHANGELOG.md` | 32 |
| 🔳 | 34 | **Phase 6** — Final build: `./scripts/build-all.sh` + `./scripts/test-all.sh` — both must pass clean | (CI) | 32 |
| 🔳 | 35 | **Phase 6** — Package vsix: `npx vsce package` in `packages/vscode/` produces `loom-vscode-0.5.0.vsix` with no warnings | `packages/vscode/` | 20, 34 |
| 🔳 | 36 | **Phase 6** — Publish vsix: `npx vsce publish` (or upload via marketplace UI). Verify install from marketplace works in a clean VS Code instance | (external) | 24, 35 |
| 🔳 | 37 | **Phase 6** — Publish CLI to npm: `npm publish` for `@reslava/loom` (cli package). Verify `npm install -g @reslava/loom` then `loom --version` reports 0.5.0 | `packages/cli/`, `packages/mcp/` | 34 |
| 🔳 | 38 | **Phase 6** — Tag release in git: `v0.5.0`, push tag. Optionally a GitHub Release with changelog body | (git) | 36, 37 |
## Notes

- Phase 0 must complete before phases 2–3, since AI commands and walkthrough rely on a stable button set.
- Phase 1 (install) and Phase 5 (docs) can run in parallel.
- Phase 4 (marketplace blockers) and Phase 6 (publish) gate the release; everything else feeds into them.
- Steps may be reordered or split as bugs surface during Phase 0.
