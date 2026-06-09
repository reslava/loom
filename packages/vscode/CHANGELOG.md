# Loom VS Code Extension — Changelog

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
