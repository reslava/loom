# Changelog

All notable changes to Loom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> The `## [X.Y.Z]` section for a tag is extracted verbatim by the release
> workflow as that version's GitHub release notes — write it for a human reader.

## [Unreleased]

## [1.1.0] - 2026-06-08

Discovery and onboarding polish from dogfooding Loom on a second project: the MCP
tool surface is now self-describing, plan creation carries requirement citations
end-to-end, and `loom install` seeds the Claude Code config it expects.

### Added
- **`loom://catalog` resource.** A grouped, one-line-per-tool index of the whole
  `loom_*` MCP surface, generated from the live tool registry so it can never drift.
  MCP tool schemas are deferred by the host (the agent sees only names until it
  fetches each), so both CLAUDE.md surfaces now tell the agent to read `loom://catalog`
  first and go straight to `ToolSearch select:<exact name>` — removing the discovery
  search (not the one-time schema fetch, which the catalog header states plainly).
- **`loom install` seeds `.claude/settings.local.json`.** An empty `attribution`
  block (no commit/PR co-author trailers) and `enabledMcpjsonServers: ["loom"]`
  (pre-approves the project-scoped MCP server, no first-open prompt), merged into any
  existing file so user permissions survive.

### Changed
- **Requirements-aware plan creation.** The *promote-to-plan* launch prompt now reads
  the thread's `req.md` and authors a full `Satisfies` column as it creates the plan —
  previously only *refine* backfilled it, so freshly created plans came back with an
  empty column.

### Fixed
- **`loom_generate_plan` dropped its generated steps**, producing empty plans on the
  sampling-fallback path; the generated steps (with their `satisfies` citations) are
  now written into the plan body.
- **AI Reply on `refs/` chats.** The `loom.chatReply` command was gated to `chat`
  context only, so chats under `refs/` (`chat-refs`) never showed the action; now both do.
- **Double type-suffix in filenames.** A title containing the type word produced
  `…-reference-reference.md` (and similar for ideas); a new `stripTrailingTypeWord`
  guard strips the trailing type word before the suffix is appended.

## [1.0.0] - 2026-06-06

First stable release. Loom's loop — chat → requirements → idea → design → plan → done,
with the AI's working context routed by the document graph — is complete across all
surfaces (CLI, MCP server, VS Code extension), and the requirements model that closes
the loop has been dogfooded on Loom itself across two threads.

### Added
- **Requirements model (`req` doc-type).** A per-thread, locked, always-loaded
  authoritative scope spec — `✅ Included` / `❌ Excluded` / `⛓ Constraints`, each item
  carrying a stable `IN`/`EX`/`C` id. Born first in the chain
  (`chat → req → idea → design → plan → done`) and injected into every downstream action
  before the parent chain, so user-stated scope survives every promotion. Wired across
  core (`ReqDoc`, pure `parseReq`), fs (`loadThread` reads `req.md`), app (context
  injection + create/refine/finalize use-cases), MCP (`loom_create_req` /
  `loom_refine_req` / `loom_finalize_req` / `loom_generate_req` / `loom_verify_req`), and
  the VS Code extension (req tree node + Generate / Refine / Finalize buttons + locked
  badge).
- **Scope verification.** Plan steps carry a `satisfies: [IN1,…]` citation; a pure,
  deterministic structural check (every Included id has ≥1 covering step; no step cites an
  Excluded id) runs always, with an AI semantic backstop. Surfaced as a per-thread
  coverage badge and the `loom_verify_req` tool. Prevention-first: the planner cites
  requirements as it generates.
- **`req_version` staleness.** Downstream idea / design / plan record the requirements
  version they were built against; re-locking a `req` marks them stale via the existing
  staleness machinery.

### Changed
- **Requirements-aware refine.** The refine launch prompts now cite the thread's `req`
  (the plan's `Satisfies` column), so a refined plan keeps its requirement coverage
  instead of silently dropping it.
- **Single-AI architecture documented and enforced.** Loom requires exactly one AI
  provider, never two: the primary path launches a Claude Code CLI agent that writes via
  content tools (no API key); the fallback path uses MCP sampling + an API key. Documented
  in both CLAUDE.md surfaces and the architecture / AI-integration references, and enforced
  in the extension launch prompts.
- **README.** Added a dogfooding note naming the two requirements threads, a "Loom builds
  Loom" section, and a first-person "An AI's view of Loom" section; reference and user docs
  reconciled as views into the canonical refs.

### Fixed
- **Plan table-wipe guard.** A migration path could silently empty a plan's Steps table;
  the write path now refuses to overwrite a populated steps table with an empty one.
- **Recovered nine migration-wiped plans.** The earlier ULID and directory-structure
  migrations had silently emptied the Steps tables of nine completed plans; each was
  restored verbatim from its last pre-wipe commit.

## [0.9.2] - 2026-06-04

### Documentation
- **README overhaul across all three surfaces (repo, npm, Marketplace).** The
  workflow demo GIF is now the hero image at the top of the main README; the CLI
  and extension READMEs gained a shared canonical tagline and cross-links
  (GitHub · npm · Marketplace); the CLI README gained the guide links and demo GIF
  it was missing; and the `.mcp.json` setup guidance was corrected everywhere to
  state that `loom install` writes the file for you, dropping the stale
  "create it by hand" instructions. The main README also dropped the all-green
  Status table and tightened the Problem and Architecture sections.

## [0.9.1] - 2026-06-04

### Fixed
- **Extension README images render on Open VSX.** The logo and workflow demo GIF
  now use absolute `raw.githubusercontent.com` URLs instead of relative paths.
  Open VSX (unlike the VS Code Marketplace) does not rewrite relative image
  paths, so both images were broken on the Open VSX listing.
- **GitHub release step no longer breaks on backticks in the changelog.** The
  release notes are now passed to `gh release create` via an env var and
  `--notes-file` instead of being inlined into the shell, which had let
  backticks in the notes execute as commands and fail the release job.

## [0.9.0] - 2026-06-04

### Fixed
- **Permanent IDs survive rename and finalize.** Renaming or finalizing a
  document no longer re-mints its permanent ULID — the identity assigned at
  creation is now preserved for the life of the doc, so links and history stay
  intact across both operations.
- **Single-call document creation.** The `loom_create_*` tools and the
  extension's generate/promote launch prompts now create a doc in one call with
  real content, instead of creating an empty doc and following up with a second
  write. This removes a spurious double-write and the false "step completed"
  behavior it could trigger.

### Changed
- **Release guard now checks both changelogs.** The `guard` job fails before any
  publish unless *both* the root `CHANGELOG.md` and the extension's
  `packages/vscode/CHANGELOG.md` carry a section for the tag being released.

### Docs
- Rewrote the ID-lifecycle reference around the ULID model (permanent id vs.
  human-readable slug).
- New CLI README and an embedded workflow demo GIF in the root and extension
  READMEs.

## [0.8.0] - 2026-06-02

### Added
- **Automated release pipeline** — a tag-driven `release` workflow: push a
  `vX.Y.Z` tag and CI runs `guard → build-test → publish (npm · VS Code
  Marketplace · Open VSX) → GitHub release`. Every publish job is
  skip-if-already-published, so re-running a tag safely retries only what
  failed. A `dry_run` manual trigger exercises the whole pipeline without
  publishing. New `RELEASING.md` runbook documents setup and the release flow.
- **Agent doc-tooling DX (MCP)** — create-with-body on doc-creation tools,
  id/path transparency in tool results, and suggest-on-miss when a doc lookup
  finds no match.

### Fixed
- CLI `--version` now reads from `package.json` instead of a hardcoded string,
  so it always reports the installed version. Added a CLI README.

## [0.7.0] - 2026-06-01

### Added
- **Loom user guides** and refreshed root / CLI / extension READMEs.
- **Context sidebar** — see and toggle exactly what context the AI receives,
  with per-doc and total token counts, fed by the unified context pipeline.

### Changed
- **Unified context pipeline** — the three separate ctx generators consolidated
  into one `loom_refresh_ctx`. Weave-level ctx auto-load activated; per-thread
  ctx dropped (the parent chain loads idea/design/plan in full).
- Stopped tracking `.loom/context-prefs.json` (local sidebar overrides).

### Fixed
- CLI is now bundled with esbuild so the published `@reslava/loom` package runs
  standalone (fixes the prior unrunnable publish).

## [0.5.0] - 2026-05-14

### Added
- **MCP server** (`packages/mcp`) — full agent surface via Model Context Protocol: resources (`loom://state`, `loom://thread-context`, `loom://plan`, `loom://requires-load`, `loom://diagnostics`, `loom://summary`, `loom://link-index`), tools (`loom_create_*`, `loom_complete_step`, `loom_do_step`, `loom_promote`, `loom_append_to_chat`, `loom_rename`, `loom_archive`, `loom_update_doc`, `loom_get_stale_docs`, `loom_refresh_ctx`, and more), prompts (`do-next-step`, `continue-thread`, `validate-state`, `weave-idea/design/plan`), and sampling support for VS Code AI buttons.
- **`loom install`** — single command to bootstrap Loom in any project: creates `.loom/` config dir, `CLAUDE.md` AI session contract, `.mcp.json` MCP server config, and `loom/ctx.md` global context stub.
- **VS Code extension — MCP client** (`packages/vscode`) — extension now routes all AI operations through the Loom MCP server (sampling) instead of calling `app` directly. Single billing, no separate API key needed in VS Code settings.
- **Numbered chat docs** — chats now use `*-chat-NNN.md` naming with zero-padded sequence numbers. AI session rules updated to recognize both `-chat.md` and `-chat-NNN.md` patterns.
- **Promote to Reference** — new command to promote any chat or doc to a `*-reference.md` doc in `loom/refs/`.
- **Thread-create from node** — create a new thread directly from any weave node in the tree view.
- **Chat custom names** — `loom_create_chat` accepts a custom title; shown in the tree view.
- **Empty-workspace welcome view** — `viewsWelcome` shown when no `loom/` dir exists or it's empty; includes an *Initialize Workspace* button.
- **MCP reconnect command** — `loom.reconnectMcp` restores the MCP connection without reloading VS Code; reflected in the status-bar indicator.
- **`loom://thread-context` resource** — bundles idea + design + active plan + ctx for a thread in a single MCP read; primary agent entry point.
- **`resources/templates/list` MCP handler** — `ListResourceTemplatesRequestSchema` registered separately from concrete resources; fixes `-32601 Method not found` on Continue.dev and other strict MCP hosts.
- **`loom_do_step` / `loom_append_done`** — MCP tools for the full implement-step loop with done-doc recording.
- **`loom_get_stale_docs` / `loom_get_stale_plans`** — surface stale docs and plans across the workspace.
- **`loom_refresh_ctx`** — regenerate ctx summary via MCP sampling.
- **`loom_search_docs` / `loom_find_doc`** — full-text and ID-based doc search via MCP.
- **Status filter** — tree view filter by status (active, implementing, draft, done, archived).
- **Sort archive / sort reference** — archive and reference nodes sorted by modification time.
- **Dynamic title** — tree view title reflects the current workspace and filter state.
- **Getting started guide** — `loom/refs/getting-started.md` one-pager for new users.

### Changed
- VS Code extension architecture: `vscode → mcp → app → core + fs` (previously `vscode → app → core + fs`). Extension has zero direct `app` imports.
- All `file:` workspace dependencies moved from `dependencies` to `devDependencies` in `packages/vscode/package.json` — esbuild bundles them, so they are build-time only. Fixes 773 MB vsix bloat from vsce following file: symlinks in npm workspaces.
- `.vscodeignore` tightened: excludes monorepo siblings, `.claude/`, and all `dist/**` except `dist/extension.js`.
- `loom/refs/vision-reference.md` rewritten to lead with the outside-user perspective.
- `loom/refs/architecture-reference.md` — chat doc location table updated to include weave-level chats.
- `packages/app/src/installWorkspace.ts` CLAUDE.md template cleaned up for outside-user readability.
- `loom-reference.md` renamed → `loom-reference.md` (implementation contract for contributors).
- Version aligned across all packages to `0.5.0`.

### Fixed
- `packages/vscode` vsix packaging now clean (no warnings, 370 KB) when run with `npm run package`.
- `CLAUDE.md` chat-doc recognition pattern updated to cover `*-chat-NNN.md` filenames (previously only matched `-chat.md`).

---

## [0.3.1] - 2026-04-25

### Added
- **Custom SVG icon set** — thread, chat, idea, design, plan, group, filter, archive icons throughout the VS Code tree view and toolbar.
- **Status icons** — animated `weave-implementing`, `thread-implementing`, `plan-implementing` SVGs; `status-done` SVG for all doc types in done state.
- **Toolbar SVG icons** — 10 toolbar commands in `package.json` updated from Codicon strings to custom SVG path objects.

### Fixed
- Chat-type docs appearing as loose fibers were showing the design icon instead of the chat icon (missing `'chat'` case in `getDocumentIcon`).

### Changed
- `context.svg` renamed to `ctx.svg` to align with the `Icons.ctx` key.
- `_archive/superseeded/` renamed to `_archive/superseded/` (typo fix).
- Weave-level chat files migrated into thread `chats/` subdirs to match the thread-based layout.

---

## [0.3.0] - 2026-04-24

### Added
- **Weave/Thread graph model** — first-class `Thread` entity with `idea`, `design`, `plans/`, `done/`, and `ai-chats/` subdirs under `weaves/{weave}/{thread}/`.
- **Thread-aware CLI** — `--thread` flag on `loom status`; thread layout in status output.
- **Thread-aware app layer** — all use-cases updated; `loadThread`, `saveThread`, `listThreadDirs` in `fs`.
- **Thread tree nodes** in VS Code extension — thread nodes with status icons, thread-aware commands.
- **Thread-aware integration tests** — multi-thread workspace seeders and full workflow tests.
- **Migration script** — `scripts/migrate-to-threads.ts` (with `--dry-run`) to migrate flat-layout repos.
- **`workspace-workflow` test** — end-to-end workspace workflow integration test.

### Changed
- `weaves/` directory migrated from flat layout to thread-based layout (`weaves/{weave}/{thread}/`).
- `buildLinkIndex` now receives `threadId`; called once per `getState` and passed down (no N+1 scans).
- `getState()` is the single query entry-point — no direct file traversal from the extension.

---

## [0.2.0] - 2026-04-22

### Added
- **Done doc type** — `DoneDoc` entity, `closePlan` use-case, tree view integration, `summarise` integration.
- **Full AI command palette** — `chatNew`, `chatReply`, `promoteToIdea`, `promoteToDesign`, `promoteToPlan`, `refineIdea`, `refineDesign`, `refinePlan`, `doStep`.
- **Anchor-free thread model** — threads no longer require an anchor design; graph-based relationships via `parent_id` / `child_ids`.
- **Unified icon system** — Codicon fallbacks with SVG overrides via `EXT_URI`; initial SVG icon set for activity bar tree view.
- **VS Code toolbar buttons** — weave actions and grouping controls in the view title bar.
- **`weaveIdea` command** — create idea docs directly from the VS Code extension.
- **ViewState grouping** — group threads by status, type, or flat list.
- **Core test suite** — 8-step plan covering entities, reducers, link index, and validation.
- **VS Code extension tests** — tree provider unit tests.

### Changed
- `role` field removed from design docs — `primary`/`supporting` distinction dropped.
- `threads/` directory renamed to `weaves/`.
- `loom init` creates a local mono-loom; global multi-loom moved to `loom init-multi`.
- Filesystem layer refactored to explicit `loomRoot` parameter across all repositories.

### Fixed
- `weaveDesign` inline button incorrectly shown on idea nodes — removed.
- ESM/CJS conflict in VS Code extension tests resolved.
- `seedDoneDoc` test helper no longer mutates plan status.

---

## [0.1.0] - 2026-04-19

### Added
- **Mono‑loom and Multi‑loom Workspaces**  
  `loom init` creates a local `.loom/` directory. `loom init-multi` sets up a global workspace at `~/looms/default`. Commands `list`, `current`, `switch`, `setup` for multi‑loom management.
- **Document Creation**  
  `loom weave idea|design|plan` with automatic ID generation (temporary → permanent). Auto‑finalization of ideas and designs for a frictionless happy path.
- **Workflow Commands**  
  `refine-design`, `start-plan`, `complete-step`, `finalize`, `rename` with automatic reference updating.
- **State Inspection**  
  `loom status` with rich filtering (`--filter status=active`), sorting (`--sort id:asc`), verbose mode, and JSON output.
- **Validation**  
  `loom validate` powered by a structured link index. Detects broken `parent_id`, dangling `child_ids`, stale plans, and invalid step blockers.
- **Context Summarization**  
  `loom summarise-context` generates `-ctx.md` summaries from design documents.
- **Blocker Resolution**  
  `isStepBlocked` and `findNextStep` utilities in `core`. CLI status shows exactly which steps are blocked and suggests the next action.
- **Canonical Frontmatter Serializer**  
  Deterministic YAML output with stable key order and inline arrays. Eliminates dependency on external YAML libraries for writing.
- **Clean Architecture**  
  Separation into `core` (pure domain), `app` (orchestration), `fs` (infrastructure), and `cli` (delivery). All CLI commands are thin wrappers over `app` use‑cases.
- **Comprehensive Test Suite**  
  Integration tests for multi‑loom, commands, ID management, and the full weave workflow.
- **Barrel Exports**  
  Unified public APIs for `core`, `app`, and `fs` layers.

### Changed
- **Prioritize Mono‑Loom Detection**  
  `getActiveLoomRoot()` now checks for a local `.loom/` directory before falling back to the global registry.
- **Refactored Domain Model**  
  Extracted `BaseDoc`, `IdeaDoc`, `DesignDoc`, `PlanDoc`, `CtxDoc`, `Thread`, and `LoomState` into dedicated entity modules.
- **Centralized Validation**  
  Validation rules moved to `core/validation.ts` and consumed by both CLI and `loadThread`.

### Fixed
- **Cross‑Plan Blocker Logic**  
  `isStepBlocked` no longer incorrectly marks steps as blocked when the blocking plan exists.
- **Plan ID Collision**  
  `generatePlanId` regex corrected to match document IDs without `.md` extension.
- **N+1 Link Index Builds**  
  `getState` now builds the index once and passes it to `loadThread`, eliminating redundant scans.
- **`_path` Serialization Leak**  
  All document persistence now routes through `saveDoc`, ensuring internal fields are never written to frontmatter.
- **Registry Cleanup**  
  `ConfigRegistry.cleanup()` removes stale entries when `loom init-multi --force` is run.

### Deprecated
- **`loom init` (old behavior)**  
  The previous `loom init` that created a global multi‑loom is now `loom init-multi`. The default `loom init` creates a local mono‑loom.

### Removed
- **Obsolete `types.ts`**  
  The monolithic type file has been deleted; all types are now imported from their canonical entity/event modules.
- **Physical Template Files**  
  `.loom/templates/` replaced by body generators in `core/bodyGenerators/`.

[Unreleased]: https://github.com/reslava/loom/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/reslava/loom/releases/tag/v1.0.0
[0.9.2]: https://github.com/reslava/loom/releases/tag/v0.9.2
[0.9.1]: https://github.com/reslava/loom/releases/tag/v0.9.1
[0.9.0]: https://github.com/reslava/loom/releases/tag/v0.9.0
[0.8.0]: https://github.com/reslava/loom/releases/tag/v0.8.0
[0.7.0]: https://github.com/reslava/loom/releases/tag/v0.7.0
[0.5.0]: https://github.com/reslava/loom/releases/tag/v0.5.0
[0.3.1]: https://github.com/reslava/loom/releases/tag/v0.3.1
[0.3.0]: https://github.com/reslava/loom/releases/tag/v0.3.0
[0.2.0]: https://github.com/reslava/loom/releases/tag/v0.2.0
[0.1.0]: https://github.com/reslava/loom/releases/tag/v0.1.0
