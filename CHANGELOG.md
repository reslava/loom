# Changelog

All notable changes to Loom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/reslava/loom/releases/tag/v0.1.0
