# Changelog

All notable changes to Loom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.3.1]: https://github.com/reslava/loom/releases/tag/v0.3.1
[0.3.0]: https://github.com/reslava/loom/releases/tag/v0.3.0
[0.2.0]: https://github.com/reslava/loom/releases/tag/v0.2.0
[0.1.0]: https://github.com/reslava/loom/releases/tag/v0.1.0
