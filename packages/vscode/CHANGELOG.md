# Loom VS Code Extension — Changelog

## [1.26.0] - 2026-07-15

### Added
- **Set Dependencies… on a thread.** Right-click a thread node (in the roadmap or the tree) → **Set Dependencies…** to wire its `depends_on` edges from a multi-select quick-pick, pre-checked with the thread's current dependencies. Confirming writes the new edge set; a dependency that would form a cycle is refused with a clear message and the graph is left untouched.

### Changed
- **Clicking a roadmap thread opens its live chat.** A roadmap thread node now opens its latest still-open chat first (falling back to design → idea → thread manifest), so a click resumes the conversation instead of always landing on the spec.

### Fixed
- **Set Dependencies… now appears in the roadmap view.** The menu item was only showing on tree-view thread nodes; it now also shows on roadmap thread nodes.

## [1.25.0] - 2026-07-14

### Added
- **A global Context node with Refresh.** The tree now surfaces your project's single `loom/ctx.md` under a **Context** node with a **Refresh** action and a "refreshed {date}" recency line — the first time ctx is visible and refreshable from the extension. Refresh seeds a project-agnostic pillar template on a fresh doc and preserves your existing sections on an existing one; a no-AI "seed skeleton" path fills only the headings + authoring hints.

### Changed
- **Context is global-only.** The tree no longer renders per-weave / per-thread ctx sections — Loom keeps one `loom/ctx.md` per project (the thread parent chain already carries the rest), so the Context node shows exactly that one doc.

## [1.24.0] - 2026-07-13

### Added
- **A Reports view in the tree.** A new **Reports** node (cross-weave, sibling to Refs, plus a per-weave Reports subsection) lists the generated report docs synthesized from your document graph. A **Generate Report** action (command palette + the Reports node button, and a **Generate Weave Report** right-click on a weave that pre-fills the weave filter) launches a Claude agent that drives the report prompt and saves the result. Report files open read-only — they are immutable snapshots.

### Fixed
- **Empty Reports / Refs / Context nodes now always render.** Those nodes were hidden when they had no children, but the action that creates the first report / reference / ctx lives on the node itself — so in a fresh workspace it was unreachable. Each empty node now shows a click-to-generate placeholder.

## [1.23.0] - 2026-07-11

### Changed
- **One "Create" verb for the doc buttons.** The doc-create commands were misnamed `weave*` even though they create empty docs (they don't AI-generate): **Weave Idea/Design/Plan** are now **New Idea/Design/Plan**, matching the existing **New Weave**, and the extension adopts **Create** as its single doc-create label verb across the menus, welcome view, and walkthrough. Behavior is unchanged.
- **A "Set Status: Done/Active" menu.** Document status changes now go through the guarded `loom_set_status` verb. The old **Mark Done** / finalize command is removed in favor of the explicit Set Status menu.

## [1.22.0] - 2026-07-10

### Notes
- No extension-specific change this release; lockstep 1.22.0 bump with the monorepo. The changes are CLI/MCP/contract-facing: `loom install` now safely no-ops on a Loom source repo or fork (`"selfHosting": true` in `.loom/settings.json`), and the `*Slug` naming sweep reaches the read/query surfaces (`loom://state?weaveSlug=`, `loom://diagnostics`, `loom_get_stale_plans` keys). The bundled `.loom/CLAUDE.md` template gains the "resolve a pointed-at doc through its slug-path" rule, which the extension's activation self-heal brings current in your project.

## [1.21.2] - 2026-07-09

### Fixed
- **The bundled server resolves the workspace root itself.** The extension's server — and any AI agent it launches — no longer depends on a `${workspaceFolder}` value in `.mcp.json` (a VS Code editor variable a plain terminal agent can't expand). It now finds the project root by walking up to the nearest `.loom/`, so it works from any launch directory. Opening a project silently heals a stale `${workspaceFolder}` `LOOM_ROOT` out of `.mcp.json`.

## [1.21.1] - 2026-07-09

### Fixed
- **Initialize writes a portable `.mcp.json`.** The generated MCP config now uses the `${workspaceFolder}` placeholder for `LOOM_ROOT` instead of a hard-coded absolute path, so a committed `.mcp.json` works for every collaborator and even when the agent is launched from a subdirectory.

## [1.21.0] - 2026-07-09

### Added
- **AI actions now run the extension's own bundled Loom server.** When you click Generate / Refine / Do-Step / Chat Reply, the launched Claude agent is bound to the *same bundled server the extension uses* (via `--strict-mcp-config`), so the agent is always the exact version you have installed — never a separate global `loom` that could drift out of sync. Any other MCP servers in your `.mcp.json` stay available to the agent.
- **Self-updating setup.** Opening a project after updating the extension silently brings your `.loom/CLAUDE.md` session rules and `.mcp.json` version pin current — no manual re-install — while leaving your own files (`CLAUDE-LOCAL.md`, `ctx.md`, settings) untouched.
- **One-click MCP-config migration.** If your `.mcp.json` still uses the old `command: "loom"` global-CLI form, the extension offers to update it to the bundled/pinned form.

### Changed
- **No global `loom` needed for the AI either.** The agent Loom launches no longer depends on anything on your PATH — completing the "1-click, no CLI" promise for the AI path, not just the extension's own actions.

## [1.20.0] - 2026-07-08

### Notes
- No functional change to the extension this release. Lockstep 1.20.0 bump with the CLI and the rest of the monorepo, whose changes are CLI/MCP-facing: `loom://catalog` now covers the whole agent surface (tools + resources + prompts), a consistent `*Ulid`/`*Slug` naming scheme across the API, and stricter `blockedBy` validation.

## [1.19.0] - 2026-07-07

### Added
- **1-click install — no CLI, no Node, no terminal.** The Loom engine is now bundled inside the extension and runs on VS Code's own runtime, so installing the extension is the entire setup: open a folder and click **Initialize Loom**. The old "install the `@reslava/loom` CLI first" requirement is gone.
- **Start with an example.** The empty Loom panel offers a one-click **Start with an example** that seeds a tiny, clearly-labelled `example` weave → thread → idea → plan so you can see the shape at once. Opt-in; delete it whenever.
- **AI status bar + guided setup.** A status-bar item shows your AI path (Claude Code ✓ / API key / not set up), and AI actions funnel you to set one up instead of failing silently.
- **"What's New" notice** shown once to returning users, pointing out that setup is now 1-click.

### Changed
- **AI agents need no global install.** Initializing writes `.mcp.json` with a pinned `npx` command, so Claude Code / Cursor fetch the exact server on demand.
- **In-process Initialize** with real progress + errors (no terminal), and the onboarding prompt now re-checks per remaining setup step.
- **Rewritten walkthrough** (now in its own files), Marketplace listing, and README around the 1-click flow and the three ways to run Loom.

### Fixed
- **A correct install no longer shows as "CLI not found".** The extension no longer probes for a global `loom` on PATH (captured at launch), which used to make a freshly-installed CLI look missing until a full restart.

### Removed
- Dead install-helper commands orphaned by the new onboarding.

## [1.18.0] - 2026-07-06

### Fixed
- **Opt-in telemetry now covers AI actions launched from the extension.** Generate / Refine / Promote / Do-Step open a Claude agent that runs its own Loom server process, which the `Telemetry: On` toggle never reached — so with telemetry enabled, the core workflow events still went unrecorded. The toggle's consent now propagates into that launched agent (tagged as the `extension` surface), so opting in captures the full loop. Off by default and content-free, as before.

### Notes
- Lockstep 1.18.0 bump with the CLI and the rest of the monorepo — adds the `chat_created` telemetry event. Also refreshes the Marketplace README with a feedback CTA.

## [1.17.0] - 2026-07-05

### Added
- **Telemetry status-bar toggle.** A `Telemetry: On/Off` status-bar item — one click to enable or disable opt-in usage telemetry (first enable confirms exactly what's sent). The discoverable path to the setting, and a one-click kill switch.

### Changed
- **Send Feedback always targets the Loom project.** Removed the `reslava-loom.feedback.repo` setting — feedback no longer redirects to the current repo.
- **New chats get a numbered default title.** A default-named chat is now titled `{thread} Chat NNN` (matching its filename) instead of a title shared by every chat in the thread.

## [1.16.0] - 2026-07-05

### Added
- **Send Feedback.** A new status-bar button (and command) opens a prefilled GitHub issue carrying only your Loom version, OS, and a non-PII usage snapshot (counts) that you edit before sending — no backend, no silent send. Feedback goes to the Loom project by default; `reslava-loom.feedback.repo` can redirect it elsewhere.
- **Opt-in usage telemetry.** A new `reslava-loom.telemetry.enabled` setting (default **false**) plus a one-time, dismissible disclosure. When enabled, the extension tags its usage as the `extension` surface; events are anonymous and content-free — never your documents, titles, or paths — and nothing is sent until you opt in.

### Notes
- Lockstep 1.16.0 bump with the CLI and the rest of the monorepo, which adds the portable `packages/telemetry` core and the `loom feedback` command.

## [1.15.0] - 2026-07-04

### Fixed
- **Creating a chat, req, or rename from inside a thread now targets the right thread.** New Chat / Create Req / Rename invoked from a row *inside* a thread (the Chats section, a document, an existing chat) lost the thread's identity — a new chat was misfiled at the weave root (an invalid location the tree can't even show), and Req/Rename falsely reported "no thread.md manifest". The tree now carries the thread's ULID down to every descendant node, so all of these resolve to the correct thread.

### Notes
- Lockstep 1.15.0 bump with the CLI and the rest of the monorepo — the API contract refactor: unambiguous, canonical-ULID `loom_*` tool naming (`weave_slug` / `thread_ulid` / `plan_ulid` / …), explicit thread creation that never fabricates a duplicate, and the two tool renames `loom_rename` → `loom_retitle` and `loom_rename_doc_file` → `loom_rename_reference_file`.

## [1.14.0] - 2026-07-03

### Fixed
- **Roadmap priority drag-and-drop works again.** A tree-move drop handler (added for dragging threads between weaves) shadowed the roadmap priority-reorder path, so dragging to reorder by priority in roadmap mode silently did nothing. Both handlers now key off the same `roadmapEnabled` flag that decides the on-screen layout.

### Notes
- Lockstep 1.14.0 bump with the CLI and the rest of the monorepo, which adds the `loom_quick_ship` one-call done-plan recorder and fixes a `blockedBy` numeric-ordinal drop plus a non-atomic thread archive/move on Windows.

## [1.13.0] - 2026-07-02

### Added
- **Rename and move weaves & threads from the tree.** F2 now renames by node kind — a document's title vs. a weave/thread **folder** (previously F2 on a folder wrongly prompted "Document ID to rename"). Drag a thread onto another weave to move the whole thread, and references gain a "Rename File" action for their filename slug.

### Changed
- **Archiving is thread/weave-atomic and delete is archive-first.** The Archive action operates on whole thread/weave folders (references archive individually); archived items expose only Restore / Delete; the destructive tree action archives by default, with a separate confirmed permanent delete.

### Fixed
- **A numeric-looking document title no longer breaks the tree.** A title such as `123` was coerced to a number and produced an "invalid tree item" that hid the document; titles now round-trip as strings.

### Notes
- Lockstep 1.13.0 bump with the CLI and the rest of the monorepo — flat document filenames + `loom migrate-layout`, the weave/thread rename & move surface, thread/weave-atomic archiving, the plan `blockedBy` step-id fix, and cheaper session start.

## [1.12.0] - 2026-06-30

### Changed
- **The tree's staleness ⚠ now reflects the unified, directional staleness model.** The badge, the *Stale* filter, and per-doc markers read the staleness set computed by the server instead of the extension recomputing it locally — so they always match `loom stale`. The summary badge count is now axis-agnostic (it includes stale `req` docs), and staleness is directional and version-based (a doc is flagged only when an upstream parent it was built against has changed — an idea is never flagged because its design moved).

## [1.11.0] - 2026-06-26

### Notes
- No functional change to the extension this release. Lockstep 1.11.0 bump with the CLI and the rest of the monorepo (which adds the user-owned `CLAUDE-LOCAL.md` install surface and a `loom_close_plan` verbatim-done-doc fix in the core/MCP write path).

## [1.10.2] - 2026-06-22

### Notes
- No functional change to the extension this release. Lockstep 1.10.2 bump with the CLI and the rest of the monorepo (which carries a chat-append seam fix in the core/MCP write path).

## [1.10.1] - 2026-06-21

### Changed
- **Roadmap History lists the unversioned bucket first.** When History is grouped by release, done-but-unstamped plans (the freshest work) now sort ahead of the latest release, matching `loom roadmap --group-by-release`.

### Documentation
- The README now shows the Threads + Context graph and the derived Roadmap — for both Loom and [ChordFlow](https://github.com/reslava/chord-flow) — as clickable screenshots.

### Notes
- Lockstep 1.10.1 bump with the CLI and the rest of the monorepo.

## [1.10.0] - 2026-06-17

### Added
- **Roadmap History groups by release.** The History band labels the current release (`current vX.Y.Z`) and shows each shipped plan's version. A new `$(tag)` toolbar button opens a Release / Thread / Date grouping picker (replacing the old by-thread toggle); grouping defaults to release, newest version first, with unversioned plans last.

### Changed
- Release grouping in the weave tree now reads each plan's `actual_release` (the new single source of truth) instead of the removed design-level release fields.

### Notes
- Lockstep 1.10.0 bump with the CLI and the rest of the monorepo.

## [1.9.2] - 2026-06-16

### Fixed
- **Creating a thread always writes its `thread.md` manifest.** Previously the extension created the
  thread folder with raw `fs` and skipped the manifest, leaving the thread without a roadmap
  identity. All extension mutations (create thread/weave, delete, archive, restore, validate, add
  requires_load) now go through the Loom MCP client instead of reaching into `fs`/`app`.

### Notes
- Lockstep 1.9.2 bump with the CLI and the rest of the monorepo.

## [1.9.1] - 2026-06-16

### Fixed
- **Roadmap History orders shipped plans correctly.** The History band rendered shipped plans in the
  wrong order when their done-doc dates mixed bare-date and full-ISO formats. Fixed in the shared
  `loom://roadmap` read-model (canonical date handling in `core`) — no extension-side change beyond
  picking up the corrected order.

### Notes
- Lockstep 1.9.1 bump with the CLI and the rest of the monorepo.

## [1.9.0] - 2026-06-15

### Changed
- **Roadmap view: one Roadmap band instead of separate Future/Present bands.** The Threads tree's
  roadmap mode now shows a single **Roadmap** node — present + future threads in one
  dependency-then-priority order, each row carrying its status icon and, when blocked, what it's
  blocked on — plus **History**. Drag-to-reorder now spans the whole forward backlog, so you can
  place a pending blocker right next to the active thread waiting on it; a drop that would violate a
  hard `depends_on` edge is still refused. Renders on the merged `loom://roadmap` read-model — no
  extension-side derivation.

### Notes
- Lockstep 1.9.0 bump with the CLI and the rest of the monorepo.

## [1.8.0] - 2026-06-14

### Added
- **Roadmap view.** A new **Show Roadmap** toolbar toggle re-lays the Threads tree into three
  derived bands — **Future** (pending/blocked threads in dependency-then-priority order, each
  showing what it is **blocked on**, across weaves), **Present** (active/implementing), and
  **History** (shipped plans, newest first). A pure renderer over the `loom://roadmap` read-model —
  no hand-authored roadmap list anywhere.
  - In roadmap mode the **status filter folds** to **all / roadmap / history**.
  - The **History** band has an opt-in **Group History by Thread** toggle (default flat, newest-first).
  - **Drag-to-reorder** a Future/Present thread within its band writes soft `priority` (via
    `loom_set_priority`); a drop that would place a thread before one it `depends_on` is refused —
    the hard dependency graph is inviolable.

### Notes
- Lockstep 1.8.0 bump with the CLI and the rest of the monorepo. The roadmap's engine — the
  `thread.md` doc type, the pure `buildRoadmap` read-model, `loom://roadmap`, the thread write tools
  (`loom_create_thread` / `loom_set_priority` / `loom_set_thread_deps`), `loom migrate`, and the
  `loom roadmap` CLI — ships in core/fs/app/mcp/cli; the extension is the human surface over it.

## [1.7.0] - 2026-06-13

### Changed
- The req node's **Refine Requirements** action is now **Amend Requirements** (`loom.amendReq`),
  calling the renamed `loom_amend_req` tool. Its launched-agent prompt now instructs append-only
  editing of the requirements spec: keep every existing `IN`/`EX`/`C` handle verbatim, add new
  scope only as fresh handles, and retire an obsolete requirement by marking it `~dropped` rather
  than deleting it (the tool refuses any renumber/delete). The rest of the 1.7.0 work — the
  `diffReqHandles` integrity guard and the dropped-status model — is in core/app/mcp.

## [1.6.0] - 2026-06-11

### Notes
- No functional extension changes this release. Lockstep 1.6.0 bump with the CLI and the
  rest of the monorepo — the 1.6.0 work is the Context Dispatcher: `loom_do_step` and the
  `loom://context` resource now dedupe injection against a caller-declared `{id@version}`
  ledger (`context: "skip"` / `alreadyLoaded`), and `loom_complete_step` / `loom_append_done`
  stop echoing the full plan back, all in core/app/mcp. Surfacing the ledger in the
  extension UI is a deliberate follow-up, not part of this release.

## [1.5.0] - 2026-06-11

### Notes
- No functional extension changes this release. Lockstep 1.5.0 bump with the CLI and the
  rest of the monorepo — the 1.5.0 work is the new agent-facing plan-step CRUD tools
  (`loom_add_step` / `loom_remove_step`) plus the id-keyed per-step detail sections that
  make reorder/add/remove preserve detail prose, all in core/app/mcp.

## [1.4.0] - 2026-06-11

### Notes
- No functional extension changes this release. Lockstep 1.4.0 bump with the CLI and the
  rest of the monorepo — the 1.4.0 work is the new agent-facing MCP tools (`loom_patch_doc`,
  `loom_update_step` / `loom_reorder_steps`, `loom_read_chat_tail`) plus the CLAUDE.md
  two-surface drift guard, all in core/app/mcp.

## [1.3.0] - 2026-06-09

### Changed
- The tree and step-picker views now read the new **frontmatter-native plan steps** and
  per-step `status` (🔳/🔄/✅/❌). No user-facing workflow change.

### Notes
- Lockstep 1.3.0 bump with the CLI and the rest of the monorepo. The 1.3.0 work
  (plan steps as the frontmatter source of truth + `loom migrate-plan-steps`) is in
  core/app/mcp/cli; the extension consumes it.

## [1.2.1] - 2026-06-08

### Fixed
- **New chat now uses the names from `.loom/settings.json`.** Creating a chat applies the
  configured `user.name` / `ai.model` headers — it previously always fell back to `User:` /
  `AI:` because of a settings-path bug in the shared resolver.

### Notes
- Lockstep 1.2.1 bump with the CLI and the rest of the monorepo.

## [1.2.0] - 2026-06-08

### Notes
- No functional extension changes this release. Lockstep 1.2.0 bump with the CLI and
  the rest of the monorepo — the 1.2.0 work is CLI-only (terminal-reachable MCP surface
  commands).

## [1.1.0] - 2026-06-08

### Added
- **AI Reply on `refs/` chats.** Chats under `refs/` now show the **AI Reply** action,
  same as thread and weave chats (previously only `chat`-context chats had it).

### Changed
- **Requirements-aware plan creation.** *Promote to Plan* now reads the thread's `req.md`
  and authors the `Satisfies` column as it creates the plan, so newly created plans carry
  requirement citations — previously only *Refine Plan* backfilled them.
- **No double type-suffix.** Creating an idea from a title containing the word "idea" no
  longer yields a `…-idea-idea.md` thread/file.

### Notes
- Lockstep 1.1.0 bump with the CLI and the rest of the monorepo.

---

## [1.0.0] - 2026-06-06

### Added
- **Requirements in the tree.** Each thread now shows a `req` node with
  **Generate / Refine / Finalize** buttons and a locked-state badge, plus a per-thread
  scope-coverage indicator. The plan step picker shows the `satisfies` requirement ids a
  step covers.

### Changed
- Synchronized 1.0.0 version bump with the CLI and the rest of the monorepo (lockstep —
  all packages share one version).

---

## [0.9.2] - 2026-06-04

### Documentation
- **Marketplace listing README refreshed.** Added a canonical tagline and
  cross-links (GitHub · npm · Marketplace), and corrected the `.mcp.json` setup
  text to note that `loom install` writes the file for you.

_No functional extension changes in this release — behaviour is identical to 0.9.1._

---

## [0.9.1] - 2026-06-04

### Fixed
- **README images now render on the Open VSX listing.** The logo and workflow
  demo GIF use absolute image URLs; Open VSX does not rewrite relative paths, so
  they previously showed as broken images.

---

## [0.9.0] - 2026-06-04

### Fixed
- **Finalize preserves the permanent ID.** Finalizing a document from the
  extension no longer re-mints its permanent ULID.
- **Generate/Promote create docs in a single call.** The launch prompts behind
  the Generate and Promote buttons now produce a doc with real content in one
  step, instead of creating an empty doc and writing into it a second time.

---

## [0.8.0] - 2026-06-02

### Changed
- Synchronized version bump with the CLI and release-automation work (monorepo lockstep — all packages share one version).
- Added the `repository` field to the extension manifest (packaging metadata; required for npm OIDC provenance on the sibling CLI package).

_No functional extension changes in this release — behaviour is identical to 0.7.0._

---

## [0.7.0] - 2026-06-01

### Added
- **Unified context pipeline** — a single assembled context bundle (global/weave ctx + parent chain + `requires_load`) is now loaded per doc/thread in one read.
- **Loom user guides** — new end-user documentation, with refreshed READMEs.

### Changed
- **Weave-level ctx auto-load** activated; thread-level ctx dropped (the parent chain already loads idea/design/plan in full).
- **Ctx generation consolidated** — the three separate ctx generators are now one tool (`loom_refresh_ctx`).

### Fixed
- Context sidebar rendering.
- Plan-table truncation in generated/refined plans.

---

## [0.6.5] - 2026-05-24

### Added
- **Tree auto-reveal** — newly created weaves, threads, and docs are automatically revealed and selected in the Threads tree view

### Changed
- **Frontmatter title sync** — `title` in frontmatter is the single source of truth; the body `# Heading` is kept in sync on create and refine
- **Cross-shell prompt delivery** — prompts are written to a tmpfile and read via shell command substitution, eliminating quoting failures for prompts with special characters, newlines, or quotes
- Terminal is now always fresh per invocation (prevents sending text into a running Claude process)
- Removed `--dangerously-skip-permissions` from `claude` invocations

### Fixed
- `promoteToPlan`: steps now passed in `loom_create_plan` args; fix `targetThreadId` → `threadId` arg name
- Rename: scan scope too broad (now correctly scoped)
- Ctx prompt body H1 generation

---

## [0.6.1] - 2026-05-20

### Changed
- Extension README patch for marketplace display (panel name corrections)

---

## [0.6.0] - 2026-05-19

### Added
- **Claude Code CLI as primary AI path** — all extension buttons open a `Loom AI` terminal and run `claude "<prompt>"` when the CLI is detected on PATH; no API key required with a Claude Pro subscription

### Changed
- API key / sampling path is now the fallback (used only when Claude Code CLI is not installed)

---

## [0.5.0] - 2026-05-14

### Added
- **MCP client architecture** — extension now routes all AI operations through the Loom MCP server via sampling. No separate API key needed in VS Code settings; billing flows through your AI agent (Claude Code, Cursor).
- **Empty-workspace welcome view** — friendly onboarding shown when no `loom/` workspace exists; includes *Initialize Workspace* button.
- **MCP reconnect command** (`loom.reconnectMcp`) — restore the MCP connection without reloading VS Code. Status-bar indicator reflects real connection state.
- **Promote to Reference** — promote any chat or doc to a `*-reference.md` in `loom/refs/`.
- **Thread-create from node** — create a new thread directly from a weave node in the tree.
- **Chat custom names** — chats show a custom title in the tree view.
- **Status filter** — filter the tree by status (active, implementing, draft, done, archived).
- **Sort archive / sort reference** — archive and reference nodes sorted by modification time.
- **Dynamic tree title** — reflects current workspace and filter state.

### Changed
- All AI toolbar buttons (`Weave Idea`, `Weave Design`, `Weave Plan`, `Chat Reply`, `Summarise`, `Refine`, `Do Step`, etc.) now go through MCP sampling — no direct `app` imports remain in the extension.
- `packages/vscode` vsix is now 370 KB (down from ~774 MB) — fixed by moving bundled deps to `devDependencies` and tightening `.vscodeignore`.

### Fixed
- `weaveCreate` / `threadCreate` path bug: files were written to `weaves/` instead of `loom/`.
- Selection context wiring: `loom.selectedWeaveId` now set when any descendant doc is clicked, not just weave nodes.
