# Changelog

All notable changes to Loom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> The `## [X.Y.Z]` section for a tag is extracted verbatim by the release
> workflow as that version's GitHub release notes — write it for a human reader.

## [Unreleased]

## [1.24.0] - 2026-07-13

### Added
- **Doc-graph reports — analytical reports from your project's *reasoning*, not just its code.** A new `loom report <kind>` command (plus a `report` MCP prompt and a `loom_create_report` tool) synthesizes a report from a filtered slice of the Loom document graph — chats, ideas, designs, plans, done-notes, roadmap. Because it reads the reasoning layer, it can answer what a codebase-only tool structurally cannot: *why* a decision was taken, which alternatives lost, where implementation drifted from design. Kinds: `project-overview`, `decisions`, `architecture`, `designs`, `ideas`, `plans`, `dones`, `drift-audit`, `security`, `release-notes`. The server deterministically selects a **token-budgeted** slice — filter with `--weave` / `--thread` / `--since` / `--until`, tiered degradation with a selectable `--sort recency|oldest`, or `--full` to send the whole slice — and the agent synthesizes it in the real loop (never captive sampling). Reports persist as versioned `report` docs (`rp_` ULID) under `loom/reports/`, cite every source doc, and surface in the VS Code tree under a dedicated **Reports** node with a Generate Report action. `loom report <kind> --run` launches a headless Claude agent to generate and save end-to-end. See the [reports reference](loom/refs/reports-reference.md).
- **`load` / `read` / `reply` slang split — pay for a thread's context once.** Pointed context is now a heavy-once `load` (the full thread bundle, which sets the active thread) plus cheap doc-only `read` / `reply`, so a doc in an already-loaded thread costs just that doc instead of re-bundling the whole thread on every pointed read. Adds `?scope=doc` on `loom://context/...` and `loom context <path> --scope doc` on the CLI (tri-surface parity). Reading a chat that has an unanswered turn now flows straight into `reply`.

### Changed
- **`loom_quick_ship` takes an optional `title`.** Quick-shipped plans previously inherited a generic `{thread} Plan` title, giving roadmap history non-descriptive entries. A passed `title` now lands on the plan; omitting it keeps the existing fallback.

### Fixed
- **VS Code tree: empty Reports / Refs / Context nodes always render.** Each of those nodes was hidden when it had no children — but the action that creates the first report / reference / ctx lives *on that node*, a chicken-and-egg empty state (hit on a fresh Chord Flow workspace). The nodes now always render with a click-to-generate placeholder; per-weave / per-thread subsections stay data-driven so the tree gains no clutter.

## [1.23.0] - 2026-07-11

### Added
- **A unified `loom create <type>` command.** One thread-first namespace replaces the old `loom weave idea|design|plan`, mirroring `loom_create_*` across all eight doc types — `loom create thread|idea|design|plan|req|chat|reference|weave`. It never creates a thread implicitly: `idea`/`design`/`plan`/`req`/`chat` resolve an *existing* thread and error with a "create it first" hint on a miss, and `loom create thread` is the sole explicit thread creator.
- **The extension-free "Pure agent" way is now complete — full tree management from the terminal.** Nine new slug/human-first CLI commands close the gap where a doc op had an MCP tool and an extension button but no terminal twin: `archive`, `restore`, `delete` (TTY-guarded, `--yes` to bypass), `move-thread`, `set-priority`, `set-thread-deps`, `close-plan`, `quick-ship`, and `promote --body-file`. The whole document graph is now manageable without the VS Code extension.
- **`loom set-status <doc> <status>` — one guarded verb for document status.** A single command (mirroring the new `loom_set_status` tool) handles free label transitions; guarded ones (a plan going to `implementing`/`done`, a req to `locked`) delegate to their owning tool instead of being silently allowed.
- **Loom slang — a canonical set of User→AI verbs.** A documented vocabulary that maps deterministically to one action so you never spell out the tool: `read {path}`, `reply`, `do quick`, `do step {N}`, `do steps {N,M}`/`{N-Z}`, `do plan`, `docs done`, and the quick-fix pair `code quick` (implements a source change, runs build+test+verify, then records) / `write quick` (docs-only change, records with no build/test). See [`loom-slang-reference.md`](loom/refs/loom-slang-reference.md).
- **"Ways to Use Loom" guide** ([`docs/WAYS-TO-USE-LOOM.md`](docs/WAYS-TO-USE-LOOM.md)) — the canonical map of how to run Loom: two users, the control-surface × AI-session-model matrix, and four named recipes (Guided, Power terminal, Pure agent, Automation).

### Changed
- **One verb model end to end: create / generate / promote.** `create` = an empty doc, `generate` = AI-authored, `promote` = a linked transform. The `weave{Idea,Design,Plan}` use-cases were renamed to `create*`, the `weave-*` authoring prompts to `generate-*` (mirroring `loom_generate_*`), and the extension adopted **Create** as its single doc-create label verb. Pure naming; no behavior change, no aliases.
- **`loom rename` now retitles a doc, and `rename` is a namespace.** `loom rename <doc> <title>` actually retitled, so it is now `loom retitle` (mirroring `loom_retitle`); `loom rename` names a namespace mirroring `loom_rename_*` — `loom rename thread|weave|reference`.
- **Status changes flow through one path.** `loom_update_doc` no longer accepts a `status` field (body + `requires_load` only), and the extension gains a **Set Status: Done/Active** menu. The redundant pre-ULID `loom finalize` command and `loom_finalize_doc` use-case are retired (`loom_finalize_req` is kept).

### Fixed
- **Chats can be marked done again.** `done` was dropped as a valid chat status in an earlier refactor; the regression is restored so chats are mark-done-able as before.
- **A plan can no longer be marked done behind `close_plan`'s back.** Because `loom_update_doc` accepted a raw `status`, a plan could be flipped to `done` bypassing `loom_close_plan`. Removing `status` from `loom_update_doc` closes that latent bypass — the plan→done transition now goes only through its guarded tool.

## [1.22.0] - 2026-07-10

### Added
- **`loom install` is a safe no-op on a Loom source repo or fork.** A repo that hosts Loom's own recursive workflow — this repository, or a fork of it — carries a bespoke `CLAUDE.md` and must never be overwritten with the generic downstream `.loom/CLAUDE.md` template. Setting `"selfHosting": true` in `.loom/settings.json` now makes every `loom install` entry point (the CLI, the `loom_install` MCP tool, and the extension's activation refresh) skip installation entirely and report `self-hosting repo — skipped`. The guard sits *above* the `--force` branch, so even a forced install can't clobber a self-hosting repo's contract.

### Changed
- **Consistent `*Slug` naming now reaches the read/query surfaces.** Completing the `*Ulid`/`*Slug` sweep begun in 1.20.0, every slug-carrying parameter and output key on the consumer surfaces is now `*Slug`: the `loom://state?weaveSlug=` filter (was `?weaveId=`), and the `weaveSlug` / `threadSlug` keys in `loom://diagnostics` and `loom_get_stale_plans` output (were `weaveId` / `threadId`). Agents or scripts that read those surfaces should switch to the new names — the values and behavior are unchanged, only the names.
- **Installed session contract: resolve a pointed-at doc through its slug-path.** The `.loom/CLAUDE.md` template gains a rule that when you point your AI agent at a Loom doc or thread by name or path, it resolves it through the slug-path context resource (`loom://context/{weaveSlug}/{threadSlug}/{docSlug}`) instead of deriving the ULID by hand — loading the context and resolving the slug→ULID become a single read. Your project picks it up on the next `loom install` or the extension's activation self-heal.

## [1.21.2] - 2026-07-09

### Fixed
- **`.mcp.json` no longer breaks standalone terminal agents.** 1.21.1 set `LOOM_ROOT` to `${workspaceFolder}`, but that is a VS Code *editor* variable — a plain `claude` CLI session (or Cursor, or any non-VS-Code MCP host) can't expand it, so it arrived literally and every `loom_*` tool failed to resolve paths (with a `/mcp` "Missing environment variables: workspaceFolder" warning). The server now resolves its own workspace root by walking up from the launch directory to the nearest `.loom/`, and `loom install` writes **no** `LOOM_ROOT` at all — so a committed `.mcp.json` is portable *and* works whether the agent starts at the project root or a subdirectory. An existing `${…}` placeholder is silently healed out of `.mcp.json` on the next `loom install`, and a subdirectory launch prints a one-line note showing the resolved root.

## [1.21.1] - 2026-07-09

### Fixed
- **`loom install` writes a portable `.mcp.json`.** The generated MCP config now sets `LOOM_ROOT` to the `${workspaceFolder}` placeholder instead of a resolved absolute path, so a committed `.mcp.json` is machine-agnostic — it works for every collaborator, and even when the agent is launched from a subdirectory — rather than hard-coding the path of whoever ran `loom install`. Claude Code and the VS Code MCP-host family expand it to the project root. Existing configs pick it up on `loom install --force` or the `command:"loom"` → `npx` migration.

## [1.21.0] - 2026-07-09

### Added
- **Your AI agent now always runs the exact Loom you have installed.** When the VS Code extension launches an AI action, the agent is bound directly to the extension's *bundled* server (via `--strict-mcp-config`), so it can't fall out of sync with the extension or run a stale global `loom`. Any other MCP servers you've configured stay available to the agent.
- **Loom keeps itself in sync.** Opening a project after an extension update silently refreshes your Loom-owned files — the `.loom/CLAUDE.md` session contract and the `.mcp.json` version pin — with no "did I re-run install?" ritual, and without touching your own files (`CLAUDE-LOCAL.md`, `ctx.md`, settings).
- **One-click migration off the legacy CLI config.** If your `.mcp.json` still points at a global `command: "loom"` server (the pre-1.19 form), the extension offers to update it to the pinned `npx` form; `loom install --migrate-mcp-command` does the same from the terminal.

### Changed
- **The global `loom` CLI is retired as a dependency — 1-click, always-current, zero-config.** There is now one server codebase and two delivery vehicles — the extension bundle (VS Code) and a pinned `npx @reslava/loom@<version>` (terminal / Cursor / CI) — and **zero persistent global installs**. The `@reslava/loom` npm package still ships; `npm i -g` is now optional, never required, and never the MCP-server form. READMEs, the CLI guide, and the architecture reference were swept to match.
- **The `.mcp.json` version pin self-heals.** On activation the pinned `npx` version is bumped to the installed version — only for the canonical pinned shape; any custom or local-path config is left untouched.

### Fixed
- **`loom install` is idempotent.** A byte-identical `.loom/CLAUDE.md` is no longer rewritten on every install — it neither dirties your git tree nor reports a phantom "written" — and `--force` reports only what actually changed.

## [1.20.0] - 2026-07-08

### Added
- **`loom://catalog` now maps the whole agent surface — tools, resources, *and* prompts.** The catalog used to list only `loom_*` tools; it now groups all three, with a `?kind=tools|resources|prompts` filter and a matching `loom catalog [kind]` CLI command. All three `loom://context` forms (by doc ULID, by thread slug-path `context/thread/{weaveSlug}/{threadSlug}`, and by doc slug-path `context/{weaveSlug}/{threadSlug}/{docSlug}`) are now advertised as first-class resource templates — the two slug-path forms were served but hidden from every MCP client until now.

### Changed
- **One consistent, model-legible naming scheme across the entire API.** Every reference parameter now says what it takes: a ULID reference is `*Ulid` and a folder/slug reference is `*Slug` — the ambiguous `*Id` suffix is gone. Which form a surface speaks follows its consumer: the **CLI is slug/human-first** (friendly plan and doc refs resolve to a ULID at the edge), the **MCP write tools and workflow prompts are strict ULID**, and the **MCP read/context resources are slug-path human-pointable** (e.g. `loom://context/{weaveSlug}/{threadSlug}/{docSlug}`). Resource-URI placeholders and prompt argument names were renamed to match, and the workflow prompt bodies rewritten to the current tool contract.
- **`loom resources` list folded into `loom catalog resources`.** `loom resources read <uri>` stays as the generic resource reader.

### Fixed
- **Unknown `blockedBy` step references are rejected instead of silently stored.** A `blockedBy` entry that wasn't a valid ordinal, a known step id, or a plan id used to be persisted as a dangling edge that quietly never blocked anything. It now throws, naming the bad value and listing the valid step ids and the ordinal form. The `create_plan` / `add_step` / `update_step` schema descriptions were tightened so agents use ordinals or real step slugs instead of inventing `s1`-style ids.

## [1.19.0] - 2026-07-07

### Added
- **Install the extension — that's the whole setup. No CLI, no Node, no terminal.** The Loom engine (its MCP server) is now bundled inside the VS Code extension and runs on VS Code's own runtime, so installing the extension gives you a working workspace in one click. The old "install the global CLI first" step is gone — four setup gates collapse to one. *(The `@reslava/loom` CLI still ships for the terminal, CI, and non-VS-Code agents; it's simply no longer a prerequisite for the extension.)*
- **Start with an example.** An empty Loom panel now offers a one-click **Start with an example** that seeds a tiny, clearly-labelled `example` weave → thread → idea → plan, so you see the whole shape at once instead of staring at an empty tree. Opt-in only (never seeded on install); delete it whenever.
- **Guided AI setup + an AI status indicator.** A new status-bar item shows your AI path at a glance (Claude Code ✓ / API key / not set up), and AI actions now funnel you to set one up instead of silently failing when neither Claude Code nor an API key is present.
- **In-process workspace initialization.** Initializing a workspace now runs inside the extension with real progress and error reporting, instead of shelling out to a terminal.

### Changed
- **AI agents connect with no global install.** `loom install` now writes `.mcp.json` with a pinned `npx -y @reslava/loom@<version> mcp` command, so Claude Code / Cursor / any MCP host fetches the exact server version on demand — no `npm i -g` required.
- **Listing, READMEs, walkthrough, and Getting Started rewritten** around the 1-click flow and the three delivery surfaces (bundled extension · npx agent · global CLI), with a new "Delivery surfaces & audiences" diagram in the architecture reference and new Marketplace keywords (`mcp`, `ai-agent`, `claude-code`, `workflow-automation`).
- **Quieter opt-in telemetry.** `loom_validate` — which the extension fires constantly from diagnostics/refresh — no longer emits a `command_invoked` event; it was ~99% noise and carried no workflow meaning. Telemetry remains off by default and content-free.

### Fixed
- **A correct setup no longer reads as "not found".** The extension used to run a global `loom` it located on PATH (captured at launch), so a freshly-installed CLI kept looking missing until a full VS Code restart. The bundled server removes that probe entirely — the single most common "I installed it and it still says it's not there" failure.
- **Onboarding no longer goes silent after one prompt.** The setup notification used to fire once and never return; it now re-checks per remaining step, so finishing one part surfaces the next.

### Removed
- Dead install-helper commands (`loom.install.openCliTerminal`, `loom.install.openAiSettings`) and the unused CLI-detection probe, all orphaned by the zero-install onboarding.

## [1.18.0] - 2026-07-06

### Added
- **`chat_created` telemetry event.** Opt-in telemetry now records when a chat — the entry point of the Loom loop — is *created* (creation only; never replies or any message content), so the usage funnel begins at "opened the thinking surface" rather than at the first generated doc. Anonymous and content-free as ever.

### Fixed
- **Opt-in telemetry now covers AI actions, not just the extension itself.** Generating, refining, or implementing from the extension launches a Claude agent that runs its *own* Loom server process — which the telemetry opt-in never reached, so the most important workflow events (generate / refine / do-step) went unrecorded even with telemetry turned on. Consent now propagates to that agent (tagged as the `extension` surface), so opting in captures the whole loop. Telemetry remains off by default and content-free.

### Changed
- **READMEs invite feedback above the fold.** A short "feedback appreciated" line now sits near the top of the root and Marketplace READMEs, pointing at the in-tool **Send Feedback** button / `loom feedback`.

## [1.17.0] - 2026-07-05

### Added
- **One-click telemetry toggle in the VS Code status bar.** A `Telemetry: On/Off` item makes opt-in usage telemetry discoverable and one click to enable or disable — no digging through Settings. Turning it on shows a one-line confirmation of exactly what's sent (never your documents, titles, or paths); turning it off is a single click. Still off by default.

### Changed
- **Feedback always goes to the Loom project.** Removed the `reslava-loom.feedback.repo` setting and the `loom feedback --repo` flag — feedback about Loom belongs with the maintainer, never scattered into each user's own repo. Reusing the mechanism in another tool is a one-line code change.
- **Default chat titles are numbered.** A chat left with its default name is now titled `{thread} Chat NNN` — matching its `chat-NNN.md` filename — instead of a bare `{thread} Chat` shared by every chat in the thread, so sibling chats are distinguishable at a glance. An explicit title still overrides.

## [1.16.0] - 2026-07-05

### Added
- **In-tool user feedback — turn silent installs into signal.** A one-click **Send Feedback** button in the VS Code extension and a new `loom feedback` command open a *prefilled* GitHub issue carrying only your Loom version, OS, and a non-PII usage snapshot (document / plan counts) that you review and edit before it's ever sent. No backend, no silent send, no PII. Feedback always reaches the Loom project regardless of which project you're in, so it lands where it can be acted on; `reslava-loom.feedback.repo` / `loom feedback --repo` can redirect it elsewhere (for a fork or reuse of the mechanism).
- **Opt-in, content-free usage telemetry.** Loom can now report a small, fixed set of workflow events — activation, session start, doc generated / refined, plan started, step completed, plan done, errors, and command invoked — so it's possible to see whether the core loop is actually used and where people stall. It is **off by default** and sends nothing until you explicitly opt in (`reslava-loom.telemetry.enabled` in the extension; `LOOM_TELEMETRY=1` for the CLI / agent). Events are anonymous and content-free *by construction*: a random install id only — never document content, titles, paths, or weave/thread names. A one-time disclosure and a documented kill switch ship with it, and the README lists exactly what is and isn't collected.

## [1.15.0] - 2026-07-04

### Added
- **`loom resolve-ulid` / `loom resolve-path` — translate between a thread's slug and its ULID.** `loom resolve-ulid <weave> <slug>` returns a thread's stable `th_` ULID; `loom resolve-path <weave> <ulid>` returns its folder slug + absolute path. Create commands (`loom idea`, …) now also accept a thread **slug or ULID**, so you can address a thread by its human name and let Loom resolve it.

### Changed
- **Unambiguous, canonical-ULID naming across the whole `loom_*` API.** Every tool parameter now names exactly what it holds: a ULID reference is always `*_ulid` (`thread_ulid`, `plan_ulid`, `doc_ulid`, `source_ulid`, `chat_ulid`) and a folder name is always `*_slug` (`weave_slug`, `thread_slug`), snake_case at the MCP boundary (camelCase inside the app). Every entity is addressed by its stable ULID except a weave, which stays slug-addressed. This removes a class of latent data-corruption bug where an `*Id` parameter silently accepted a folder name. Plan-step tools are now strict `plan_ulid`-only (the old "ULID or filename stem" dual-accept is gone), and two tools were renamed for honesty: **`loom_rename` → `loom_retitle`** (it only ever changed a title) and **`loom_rename_doc_file` → `loom_rename_reference_file`** (it only acts on references). Agents read the live tool schema each session, so this is transparent to them — only hand-written scripts that call the tools by old parameter/tool names need updating.
- **Thread creation is explicit.** A document-create references an *existing* thread by its ULID and never scaffolds a new one as a side effect (the extension's create buttons still compose "new thread + first doc" behind one click).

### Fixed
- **Passing a thread's ULID to a doc-create no longer fabricates a duplicate thread.** The originating dogfooding bug: `loom_create_idea` given a real thread's `th_` ULID created a *second* folder literally named by the ULID and orphaned the new document there. Creates now resolve the ULID to the real thread through one shared resolver, or **error** on an unresolvable reference — they never invent a thread.
- **Chats created from inside a thread no longer land at the weave root.** In the extension, New Chat (and Req / Rename) fired from a row *inside* a thread — the Chats section, a document, an existing chat — dropped the thread identity and wrote the chat to an invalid, tree-invisible `loom/{weave}/chats/` location (while Req/Rename falsely reported "no thread.md manifest"). The tree now carries the thread's ULID to every descendant node, and a chat is only ever created in one of its two valid homes — `{weave}/{thread}/chats` or `refs/chats` — erroring instead of writing an orphan.

### Upgrading
- **No document or on-disk migration is required** — existing `loom/` projects load unchanged. If you have **scripts or MCP calls that name `loom_*` parameters by hand**, update them to the new names (`weaveId` → `weave_slug`, `threadId` → `thread_ulid`, plan handles → `plan_ulid`, …) and rename any `loom_rename` / `loom_rename_doc_file` calls to `loom_retitle` / `loom_rename_reference_file`. AI agents that read the live tool schema need no changes.

## [1.14.0] - 2026-07-03

### Added
- **`loom_quick_ship` — record already-done work in one call.** A new MCP tool that mints exactly one *done* plan for a fast fix or feature, so the work leaves a versioned-history entry (roadmap history + an `actual_release` key) without the full create → start → complete → close ceremony. It takes a `description` (one string, or an array where each entry becomes a done step) and targets an existing thread or mints a new one; it never touches an existing plan and never runs inference.

### Fixed
- **`blockedBy` no longer silently drops a numeric step ordinal.** `loom_create_plan` coerced any non-string `blockedBy` entry to empty and skipped it, so a JSON number like `[1]` vanished instead of resolving to the target step's id. Integer ordinals now resolve exactly like their string form (`"1"`), and a genuinely malformed entry (float, `NaN`, `null`, object) throws loudly instead of being lost.
- **Archiving, restoring, and moving a thread can no longer leave the source behind.** On Windows, `loom_archive` (and restore / thread rename & move) could fall back to copy-then-remove and, if the removal failed on an open file handle, leave a silent duplicate. Folder moves now go through one atomic-or-rollback helper: either the whole tree moves or nothing changes, with an actionable "file open/locked, no changes kept" error — never a half-move.
- **Roadmap drag-and-drop priority reorder works again in the VS Code extension.** A tree-move MIME check added for thread drag-and-drop shadowed the roadmap priority-reorder path, so reordering by priority in roadmap mode silently did nothing. Both drop handlers now key off the same `roadmapEnabled` flag that decides the on-screen layout.

## [1.13.0] - 2026-07-02

### Added
- **Flat, human-readable document filenames.** Loom documents are now named by type — `idea.md`, `design.md`, `plans/plan-NNN.md`, `done/plan-NNN-done.md`, `chats/chat-NNN.md` (references keep their `{slug}.md`) — instead of thread-slug-prefixed names. Identity lives in the frontmatter ULID, so renaming a weave or thread folder rewrites no document content. A new **`loom migrate-layout`** command flattens an existing repo to the scheme — rename-only, `--dry-run`-capable, idempotent, and collision-safe (unique per-thread ordinals + an audit log when legacy names clash).
- **Rename and move weaves & threads.** New MCP tools and VS Code actions treat weaves and threads as the folders they are: `loom_rename_weave`, `loom_rename_thread`, `loom_move_thread` (a thread moves whole between weaves — its stable `th_` id and `depends_on` edges travel with it), plus `loom_rename_doc_file` for a reference's filename slug. In the extension, **F2** renames by node kind (document title vs. weave/thread folder), with drag-and-drop (thread → weave) and archive-first delete.
- **Cheaper session start.** A new lightweight project map — `loom://state?shape=summary` — replaces reading the full state graph just to learn what's active (this repo: 2.04 MB → 16.8 KB). `loom status` renders the same map.

### Changed
- **Archiving is thread/weave-atomic.** Archive / restore / delete now act on a whole thread (or weave) folder — a thread is an indivisible chain, not a bag of docs — which fixes the sub-thread archive bugs (mirrored partial paths, leftover empty folders, restore failures) by construction. References (which have no thread) remain the one exception and archive individually. Cross-thread `move-doc` was removed; to relocate work, move the whole thread.

### Fixed
- **Plan step `blockedBy` is stored as a stable step id, not a positional ordinal.** `loom_create_plan` (and the add/update-step paths) used to persist a numeric `blockedBy` (`["1","2"]`) verbatim, so a plan's dependency graph silently mis-pointed the moment a step was inserted, removed, or reordered. Every write path now resolves an ordinal to the target step's slug id through one shared helper (out-of-range → error; existing slug ids and cross-plan plan-ids pass through unchanged).
- **`migrate-layout` never overwrites colliding legacy names.** When several legacy plan/done docs in a thread each carried ordinal `001`, the rename now assigns each a unique thread-local ordinal (distinct ordinals and gaps preserved) and writes a full audit log, instead of collapsing them onto one file.
- **Frontmatter titles that look like scalars round-trip as strings.** A title such as `123` was coerced to a number and crashed the VS Code tree ("invalid tree item"), hiding the document; the serializer now quotes any title YAML would otherwise coerce (numbers, `true`/`false`, `null`).
- **Archive lifecycle polish** — archived items expose only Restore / Delete, restore and delete resolve correctly from `loom/.archive/`, and reference file-rename uses the canonical `{slug}-reference.md` suffix.

### Upgrading
- Run **`loom migrate-layout`** once per project to flatten existing documents to the new filename scheme (rename-only; use `--dry-run` to preview). Loom reads both the old and new names, so this is safe to defer — but new documents are written with the flat names immediately.

## [1.12.0] - 2026-06-30

### Added
- **`loom stale --all`.** `loom stale` now defaults to the *actionable* set (stale docs that aren't done/cancelled) — matching the VS Code tree — and `--all` adds the done/historical docs.
- **`loom backfill-design-versions` and `loom backfill-staleness-baselines`** — one-time, idempotent, `--dry-run`-capable migrations that repair staleness baselines on existing docs. Run them once per project after upgrading (see *Upgrading* below).
- **A canonical staleness spec, [`loom/refs/staleness-reference.md`](loom/refs/staleness-reference.md)** — the dependency graph, the version baselines, and the single rule — linked from all three READMEs.

### Changed
- **Staleness detection is now one trustworthy rule.** A doc is stale when an upstream dependency it was built against has been revised since — and *only* then. It is **directional** (downstream only: an idea is never "stale" because its design changed) and **version-based** (no fragile `updated`-date comparisons), applied along `idea → design → req → plan`. `loom stale`, the `loom_get_stale_docs` MCP tool, and the VS Code tree now all read **one** predicate, so they can never disagree — the extension no longer computes staleness on its own.
- **`req` now depends on the design, not the idea.** A requirements doc is authored after a complete design, so it parents to the design and is flagged stale when the design moves (previously this edge pointed the wrong way and a design change left the req silently un-stale).
- **Marking a doc done no longer cascades false staleness.** `version` (and `updated`) change only on a real content edit; a status-only transition (finalize, mark done) is lifecycle, not a spec change, so it leaves child docs untouched.

### Fixed
- **Plans were born "stale" project-wide.** `loom_create_plan` stamped a constant `design_version: 1` and `promote → plan` omitted the baseline entirely, so `loom stale` / `loom_get_stale_plans` false-positived across the whole project (while promoted plans were never flagged at all). Create, promote, and refine now stamp / re-baseline the parent design's live version.

### Upgrading
- Run **`loom backfill-design-versions`** (repairs plan baselines) and **`loom backfill-staleness-baselines`** (stamps design/req baselines, repoints req parents) once in each project. Both are idempotent and support `--dry-run`.

## [1.11.0] - 2026-06-26

### Added
- **`loom install` now gives every project a user-owned `CLAUDE-LOCAL.md`.** Re-running `loom install` to pick up a newer Loom contract used to overwrite `.loom/CLAUDE.md` and destroy any project-local AI rules kept there. Install now creates a separate root `CLAUDE-LOCAL.md` — once, if absent, and **never overwritten, not even with `--force`** — and makes the root `CLAUDE.md` import both `@.loom/CLAUDE.md` (Loom-owned, regenerated every install) and `@CLAUDE-LOCAL.md` (yours). Put your project-specific AI rules in `CLAUDE-LOCAL.md` and they now survive every contract upgrade. The installed contract template gained a "File ownership" section spelling this out.
- **`loom_append_done` accepts a batch `steps` array** to author a whole done doc in one call (step-ordered upsert, atomic fail-loud on an unknown step). The single `{ stepNumber, notes }` form is unchanged.

### Fixed
- **`loom_close_plan` no longer writes a stub done doc.** It had been delegating the done-doc body to an AI client that returned a fixed `TODO` placeholder whenever no API key was set — i.e. in every Claude Code session — silently writing a stub and marking the plan done regardless of the notes you passed. It now writes your notes verbatim (or appends a `## Closing notes` section to an existing per-step done doc) and fails loudly when there is nothing to write, instead of stubbing.

## [1.10.2] - 2026-06-22

### Fixed
- **Chat replies no longer drift apart.** Repeated `loom_append_to_chat` calls were leaving a widening blank-line gap before each `## AI:` / `## Rafa:` header. The append seam is now normalized to exactly one blank line above and below the header, with both write paths (MCP append and app chat-reply) routed through a single shared core helper.

## [1.10.1] - 2026-06-21

### Changed
- **Roadmap History (grouped by release) lists the unversioned bucket first** in the VS Code extension — done-but-unstamped plans are the freshest work, ahead of the latest release, matching how `loom roadmap --group-by-release` already orders them.

### Documentation
- **The READMEs now show the panel in action.** The main and VS Code Marketplace READMEs carry clickable screenshots of the Threads + Context graph and the derived Roadmap — for both Loom itself and [ChordFlow](https://github.com/reslava/chord-flow), a real project built with Loom.

## [1.10.0] - 2026-06-17

### Added
- **Release tracking on the roadmap.** `loom record-release X.Y.Z` stamps the version each done plan shipped in (`actual_release`), and Loom derives the project's `current_release` (the highest shipped version) — surfaced in the CLI (`loom roadmap`, with a release column and `--group-by-release`), the `loom://roadmap` read-model, and a new `loom_record_release` MCP tool. `loom backfill-releases` seeds historical plans from past git tags.
- **Roadmap History groups by release in the VS Code extension.** The History band labels the current release (`current vX.Y.Z`) and tags each shipped plan with the version it shipped in. A new `$(tag)` toolbar button opens a Release / Thread / Date grouping picker (replacing the old by-thread toggle) and defaults to grouping by release, newest version first.

### Changed
- **A plan's `actual_release` is now the single source of truth for what shipped when.** The old `target_release` field and the design-level `actual_release` were removed, and `loom_update_doc` no longer accepts `target_release`; existing plans were backfilled from git tags.

## [1.9.2] - 2026-06-16

### Added
- **New MCP lifecycle tools** — `loom_create_weave`, `loom_delete` (a doc, or a whole thread/weave folder), a folder-aware `loom_archive`, `loom_restore`, a `loom_validate` query tool, and a `loom://refs` resource. These let every host mutate weave/doc structure through the `mcp → app` chain instead of touching the filesystem directly.

### Fixed
- **Creating a thread no longer skips its `thread.md` manifest.** The VS Code extension created the thread folder with raw `fs` and never wrote the manifest, so the new thread had no roadmap identity. Thread creation (and delete / archive / restore) now route through MCP/app use-cases, which always write `thread.md`.
- **`loom_create_plan` no longer silently corrupts a plan on a malformed agent call.** A malformed tool call could land the raw wire blob in `goal` while `steps` arrived `undefined`; the plan was saved with `steps: []` and the wire markers serialized into the body — and still returned success, hiding the corruption. `weavePlan` now rejects wire-marker leakage in `goal`/`title` and validates `steps` (parses a stringified array, rejects non-arrays and steps missing a description, never degrades a non-empty input to `[]`) at the app boundary, so CLI/MCP/extension all inherit the guard.

### Changed
- **`core` is now 100% IO-free.** `ConfigRegistry` (which read/wrote `~/.loom/config.yaml`) moved out of `core` into the `fs` layer, restoring the "core is pure, no IO" contract; a new `core-no-fs-imports` guard test fails the build on any IO import under `core`. No user-facing behavior change.

## [1.9.1] - 2026-06-16

### Fixed
- **Roadmap History no longer mis-orders shipped plans.** History sorted by a raw *string* comparison of frontmatter dates, which is wrong whenever formats are mixed — `"2026-06-16"` sorts *before* `"2026-06-16T00:00:00.000Z"` (the shorter prefix wins), so a plan whose done-doc carried a bare date could land in the wrong slot or sink to the bottom. The root cause ran deeper: `gray-matter` parses an unquoted `created: 2026-06-09` back as a JS `Date`, which the serializer then re-emitted as a full-ISO timestamp — so a doc *drifted* date-only → full-ISO simply by being loaded and re-saved, which is what mixed the formats in the first place. Both are now fixed: all date production, comparison, and serialization flow through one `core/dates.ts` seam (tolerant epoch comparison, canonical `YYYY-MM-DD` on write), and dates are coerced to canonical strings at the load boundary, closing the drift. The same fragile string-compare in staleness detection and document sorting is fixed by the same change.

### Changed
- **Frontmatter dates self-heal to canonical `YYYY-MM-DD` on save.** Any doc carrying a full-ISO `created`/`updated` (from the load→save drift above) is rewritten to a bare date the next time it is saved — a non-breaking normalization, but a visible diff in your repo. `loom migrate` now also runs a `normalize-dates` pass (idempotent, `--dry-run`) that canonicalizes every doc's dates in one go; it's optional cleanup, since comparison is tolerant of mixed formats regardless.

## [1.9.0] - 2026-06-15

### Changed
- **Roadmap: Present and Future merged into one drag-orderable band.** The active/pending split is a derived *status overlay*, not an ordering boundary — yet the roadmap rendered it as two separate bands, inventing a drag barrier absent from the data (there is one soft `priority` per thread and one topological+priority order). You couldn't, for instance, drag a pending thread that blocks an active thread's next phase to sit next to it. Now `buildRoadmap` exposes one canonical `roadmap[]` (present+future in a single topo+priority order, status carried per-node); `loom roadmap` prints one **Roadmap** band + **History**, and the VS Code roadmap is a single **Roadmap** tree node whose drag-reorder spans the whole forward backlog — the hard `depends_on` pre-check still refuses any drop that would place a thread before a dependency. **Resource-shape note:** `loom://roadmap` no longer returns `future`/`present`; it returns one ordered `roadmap` array (each node carries its `status`).

### Fixed
- **No more doubled `## AI:` header in chat replies.** `loom_append_to_chat` writes the role header itself, but neither its tool description nor the extension's chat-reply launch prompt said so — so an agent would sometimes add its own `## AI:` line and produce a duplicate. The tool description, its `body` parameter description, and the chat-reply launch prompt now all state that the body must be the reply text only (the tool adds the role header).

## [1.8.0] - 2026-06-14

### Added
- **Derived cross-weave Roadmap — the project's forward view, computed not authored.** Loom's "state is derived" promise held *within* a thread but broke at the project level: there was no view of where the whole project stands, so the gap got filled by a hand-maintained roadmap markdown — the exact "hand-written active-work pointer" anti-pattern Loom tells the AI not to trust. This release closes it with one pure read-model, `buildRoadmap(state)` in `core`, surfaced through every layer:
  - **`thread.md` — a new authored-only doc type.** One flat manifest per thread (following the `req.md` precedent), holding only a stable `th_` ULID identity, a soft `priority`, and hard `depends_on` edges. **No `status` field** — status is always derived, never stored. `depends_on` references other threads by ULID (never folder path), so it resolves **cross-weave** and survives renames/moves.
  - **The headline signal — cross-weave `blocked on`.** For any thread, the roadmap shows whether it is waiting on another unfinished thread *across weave boundaries* — the one fact a human can't compute by hand. Plus topological-then-`priority` ordering, done-plan history (keyed on completed plans' dated done-docs, newest first), and cycle / dangling-dep / missing-manifest diagnostics that report rather than crash.
  - **`loom roadmap` CLI** — a three-band ASCII renderer (future / present / history), with `--group-by-thread` to group the shipped history by thread.
  - **`loom migrate`** — backfills `thread.md` for every existing thread (fresh `th_` ULID), idempotent and `--dry-run` capable, shipped in the `loom` binary so every downstream install gets the same backfill on upgrade.
  - **`loom://roadmap` MCP resource** + roadmap diagnostics folded into `loom://diagnostics` / `validate-state`. Validated write tools `loom_create_thread`, `loom_set_priority`, `loom_set_thread_deps` (refuse cycles / unknown targets / self-deps at write time); the first `loom_create_*` into a new thread auto-scaffolds its `thread.md`, making "every thread has a manifest" an invariant.
  - **VS Code Roadmap view.** A toolbar toggle re-lays the Threads tree into Future / Present / History bands (each blocked node showing what it's blocked on); the status filter folds to **all / roadmap / history**; the History band has an opt-in **group-by-thread** toggle; and drag-to-reorder within a band writes soft `priority` — refusing any drop that would violate a hard `depends_on` edge. The dependency graph is inviolable; `priority` only orders the slack it leaves free.

### Fixed
- **`loom roadmap` (and any state-backed CLI resource read) no longer hangs on exit.** The `loom://roadmap` / `loom://state` handlers start a recursive `fs.watch` via `initStateCache`; the in-process MCP client closed its transports but not the watcher, so the Node event loop stayed alive and the command never exited. Added `closeStateCache()`, called on client close — the long-running `loom mcp` keeps its watcher, while the CLI now exits cleanly. Latent for every state-backed CLI resource read, not just roadmap.

## [1.7.0] - 2026-06-13

### Changed
- **`loom_refine_req` → `loom_amend_req`, now append-only on requirement handles.** A thread's `req` is cumulative across its plans: when a second plan adds scope you append fresh handles (`IN7`, `IN8`, …). The old refine path re-extracted the whole body and could renumber or drop existing `IN`/`EX`/`C` handles — silently breaking the `satisfies` citations plan steps point at (an existing handle is a primary key, not a line number). `loom_amend_req` enforces referential integrity via a pure core guard (`diffReqHandles`): **every handle present before the edit must still be present after it.** Renumbering or deleting a handle is refused (returned as a clean `{ ok: false, error }` finding naming the dropped id); appends and status changes are allowed. The rename is intentionally breaking — no `loom_refine_req` alias.

### Added
- **Dropped-status for requirements (`~dropped`).** Retire an obsolete Included item without breaking the citations that resolve to it: mark its line `` - `IN3` ~dropped superseded by IN7 `` instead of deleting it. A `dropped` item (`ReqItemStatus = 'active' | 'dropped'`, parsed and stripped by `parseReq`) is exempt from coverage — it never shows as "uncovered" — yet its handle still resolves, so old `satisfies` citations are never flagged as unknown. A still-needed-but-uncovered Included item surfaces as uncovered as before (deferral tracking is free). The structural coverage check (`checkReqCoverage`) already aggregates steps across all plans in the thread.
- **VS Code:** the req node's *Refine Requirements* action is now *Amend Requirements* (`loom.amendReq`); its launched-agent prompt instructs append-only editing (keep existing handles verbatim, append new ones, retire via `~dropped`).
- **`loom_update_step` can now cite a `done` step (and a `done` plan).** A **citation-only** patch — `satisfies` and nothing else — is allowed on completed work; any other field on a done step, and any edit to a cancelled step, stays rejected. Rationale: `satisfies` is traceability metadata ("what this work served"), not the immutable record of "what was done", so annotating it later doesn't rewrite history. This closes the hole where a requirement added or clarified mid-thread (via `loom_amend_req` + re-lock) could never be cited on the steps that already satisfied it, leaving permanently uncoverable handles in `loom_verify_req`.

## [1.6.0] - 2026-06-11

### Added
- **Context Dispatcher — context injection now dedupes against what the agent already holds.** `loom_do_step` re-sent the entire thread bundle (~6–7k tokens: global ctx + vision + workflow + idea + design + active plan) on *every* call; across a 5-step session that was ~25k tokens of verbatim repeat, and `loom_complete_step` / `loom_append_done` echoed the whole plan doc back each time. The agent now declares the `{id, version}` context it already holds and the server returns only the delta. Two controls on `loom_do_step`: `context: "skip"` (coarse — "I hold the whole thread", suppresses the bundle) and `alreadyLoaded: [{ id, version }]` (precise, per-doc); the brief reports the assumed-present set in `contextManifest`. The `loom://context` resource takes the same ledger via `?loaded=id@version,…`. Built on a stateless, pure assembler (model C, client-declared ledger) — the dedupe unit is `{id@version}`, so a refine (version bump) or a fresh session always re-injects (no silent under-load). `loom_complete_step` / `loom_append_done` now return a compact reference + the changed step instead of echoing the full plan body.

### Fixed
- **`loom_append_to_chat` no longer defaults an omitted `role` to a user turn.** `role` is now optional and defaults to `'ai'` (the overwhelming caller); a present-but-invalid role throws instead of being silently guessed. Previously an omitted role could mis-attribute an AI reply to the human.

### Notes
- The agent protocol (the `alreadyLoaded` / `context: "skip"` params and the rule to declare your loaded `{id@version}` set) is documented in both CLAUDE.md surfaces under the new `context-ledger` shared rule. Extension UI to *display* the ledger is intentionally out of scope — a follow-up for when a consumer needs the display hook.

## [1.5.0] - 2026-06-11

### Added
- **`loom_add_step` / `loom_remove_step` — complete plan-step CRUD without recreating the plan.** `loom_add_step` inserts a new step (append by default, or `before`/`after` an existing step id), mints a fresh stable slug id, and recomputes order; `loom_remove_step` deletes a pending step, strips any `blockedBy` references to it from the surviving steps (no dangling blocker) and reports which were re-threaded. Together with 1.4.0's `loom_update_step` / `loom_reorder_steps`, the step surface is now full CRUD. Done/cancelled steps stay immutable history (both tools reject them; a new step can't be inserted before the leading done block), consistent with `update_step` / `reorder`. A wholesale approach change is still a new plan (archive + `loom_create_plan`) — `loom_update_whole_plan` is intentionally not built.

### Fixed
- **Per-step detail prose now survives restructuring (latent 1.4.0 bug).** A plan body's `### Step N — {title}` detail sections were keyed by the order number `N`, and `title`/`detail` aren't in frontmatter — so `loom_reorder_steps` (and any add/remove) kept the `## Steps` table correct but left the detail headings/prose pointing at the wrong or a removed step. Detail sections are now anchored by a hidden `<!-- step:{id} -->` marker and re-keyed by stable id on every save: reorder reflows them, add stubs one, remove prunes the orphan, and the visible `Step N` number is re-rendered from current order. Authored prose stays body-owned and editable in place. This retroactively fixes `loom_reorder_steps`'s detail drift.

## [1.4.0] - 2026-06-11

### Added
- **`loom_patch_doc` — surgical body-prose edits.** Find-and-replace (`old_string` → `new_string`, optional `replace_all`) on a doc's body, so a one-line change no longer means re-supplying the whole body through `loom_update_doc`. Frontmatter is never matched; on a plan, the generated `## Steps` table is refused (use the step tools below) while the rest of the body stays editable.
- **`loom_update_step` / `loom_reorder_steps` — amend plans without recreating them.** `loom_update_step` amends a pending step's `description` / `files` / `blockedBy` / `satisfies`; `loom_reorder_steps` reorders steps (permutation-checked, `blockedBy` survives via stable ids). Done/cancelled steps are immutable history — both tools reject touching them, and reorder keeps completed steps pinned as the leading block.
- **`loom_read_chat_tail` + chat read-cursor — cheaper chat replies.** Returns only the turns since the AI last replied, instead of re-reading the whole chat. A `last_ai_block` cursor in chat frontmatter is auto-advanced by `loom_append_to_chat`; `read_chat_tail` falls back to on-the-fly detection for chats without the cursor. Block detection keys on the configured `ai.model` header, never a hardcoded `## AI:`.
- **`target_release` on `loom_update_doc`.** A design's `target_release` is now settable through MCP (previously the one design frontmatter field with no write path).
- **CLAUDE.md two-surface drift guard.** Rules shared between the root contract and the installed `LOOM_CLAUDE_MD` template are tagged with `<!-- rule:id -->` markers in both; `test-all` (`tests/claude-md-sync.test.ts`) asserts the rule-id sets match and that a set of verbatim invariants (visibility prefixes, core tool names, stop-rule hallmarks) appear in both — so a rule changed in one surface and forgotten in the other fails the suite instead of drifting silently. Per-surface wording is still free to differ.

### Fixed
- **`loom_archive` description** now accurately states it mirrors the doc's path under the single top-level `loom/.archive/` tree (the old "same level" wording was wrong; the behavior was already correct).

## [1.3.0] - 2026-06-09

### Changed
- **Plan steps now live in YAML frontmatter — the single source of truth.** Previously a
  plan's steps existed only as a Markdown table in the body, which the engine re-parsed on
  every read. A non-canonical or malformed table silently produced a *zero-step* plan
  (breaking `do-next-step` / `complete_step` with no error). Now the structured `steps`
  live in frontmatter and the `## Steps` table is a **generated view** — so steps can't be
  lost to a parsing quirk, and the table is always canonical.
- **`loom_create_plan` is structured-only.** Pass `goal` (prose) + a `steps` array of
  objects (`{ description, title?, files?, blockedBy?, satisfies?, detail? }`) — **never** a
  hand-formatted table. Loom owns the table and synthesizes each step's stable id. Plans no
  longer accept a `content` body (idea/design/reference still do). This makes a
  malformed/stepless plan **structurally impossible to create**.
- **Per-step `status` and stable step ids.** Each step carries a `status` enum
  (`pending` / `in_progress` / `done` / `cancelled`, rendered as 🔳/🔄/✅/❌) instead of a
  bare done flag, and a stable `id` that `blocked_by` references — dependencies now survive
  reordering. (Legacy `Step N` / integer blockers are still resolved.)
- **One canonical plan-body serializer** replaces the three former generators (fixing a
  latent 5-column vs 6-column table drift), and the frontmatter YAML serializer now
  correctly quotes step fields containing special characters (commas, colons, brackets,
  backticks).

### Added
- **`loom migrate-plan-steps [plan-id] [--dry-run]`** — upgrade existing (pre-1.3.0) plans
  from body-table steps to frontmatter-native steps. Idempotent, and **never destructive**:
  a plan whose table can't be parsed is reported `unparseable` and left untouched.

## [1.2.1] - 2026-06-08

### Fixed
- **New chats now honour `.loom/settings.json`.** The shared author-name resolver
  (`getUserName` / `getAiName`) read `settings.json` from the workspace root instead of
  `.loom/settings.json`, so the configured `user.name` / `ai.model` were never found —
  every chat fell back to `User:` / `AI:`. Fixed the path; this corrects new chats, AI
  replies, do-step transcripts, and weave-design seeds across the CLI, the extension, and
  the MCP server.

### Changed
- **`loom://catalog` is now a mandatory session-start load.** The installed `.loom/CLAUDE.md`
  contract makes reading `loom://catalog` an unconditional session-start step, so the
  `loom_*` tool index is in context *before* any tool is needed — replacing the reactive
  "before ToolSearch" rule that agents skipped at the one moment it mattered.

## [1.2.0] - 2026-06-08

### Added
- **The MCP surface is reachable from a plain terminal.** New thin CLI commands run
  the MCP handshake in-process and print the result — no MCP host, no hand-typed
  JSON-RPC:
  - `loom catalog` — the grouped index of every `loom_*` tool (`loom://catalog`).
  - `loom resources` / `loom resources read <uri>` — list MCP resources, or read any
    one by uri (e.g. `loom://summary`, `loom://context/<id>`).
  - `loom context <docId> [--mode <m>]` — the assembled context bundle for a doc, or a
    thread via the `thread/<weave>/<thread>` form.
  - `loom next [plan-id]` — the next incomplete step + context for a plan (defaults to
    the active plan).
  - `loom search <query> [--type] [--weave]`, `loom stale`, `loom blocked` — query docs,
    list stale docs, and list blocked plan steps from the terminal.
- **In-process MCP client (`packages/cli/src/mcpClient.ts`).** The CLI instantiates the
  Loom MCP server over the SDK's in-memory transport and runs the
  `initialize → initialized` handshake internally — one process, no stdio framing, no
  `LOOM_ROOT` juggling.

### Changed
- **One source of truth for search / stale / blocked.** The `loom_search_docs`,
  `loom_get_stale_docs`, and `loom_get_blocked_steps` MCP tools now delegate to new
  shared `app` use-cases (`searchDocs`, `getStaleDocs`, `getBlockedSteps`) that the new
  CLI commands also call — the logic moved out of the MCP tools into `app`, so the two
  delivery surfaces can't drift.

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

[Unreleased]: https://github.com/reslava/loom/compare/v1.24.0...HEAD
[1.24.0]: https://github.com/reslava/loom/releases/tag/v1.24.0
[1.23.0]: https://github.com/reslava/loom/releases/tag/v1.23.0
[1.22.0]: https://github.com/reslava/loom/releases/tag/v1.22.0
[1.21.2]: https://github.com/reslava/loom/releases/tag/v1.21.2
[1.21.1]: https://github.com/reslava/loom/releases/tag/v1.21.1
[1.21.0]: https://github.com/reslava/loom/releases/tag/v1.21.0
[1.20.0]: https://github.com/reslava/loom/releases/tag/v1.20.0
[1.19.0]: https://github.com/reslava/loom/releases/tag/v1.19.0
[1.18.0]: https://github.com/reslava/loom/releases/tag/v1.18.0
[1.17.0]: https://github.com/reslava/loom/releases/tag/v1.17.0
[1.16.0]: https://github.com/reslava/loom/releases/tag/v1.16.0
[1.15.0]: https://github.com/reslava/loom/releases/tag/v1.15.0
[1.14.0]: https://github.com/reslava/loom/releases/tag/v1.14.0
[1.13.0]: https://github.com/reslava/loom/releases/tag/v1.13.0
[1.12.0]: https://github.com/reslava/loom/releases/tag/v1.12.0
[1.11.0]: https://github.com/reslava/loom/releases/tag/v1.11.0
[1.10.2]: https://github.com/reslava/loom/releases/tag/v1.10.2
[1.10.1]: https://github.com/reslava/loom/releases/tag/v1.10.1
[1.10.0]: https://github.com/reslava/loom/releases/tag/v1.10.0
[1.9.2]: https://github.com/reslava/loom/releases/tag/v1.9.2
[1.9.1]: https://github.com/reslava/loom/releases/tag/v1.9.1
[1.9.0]: https://github.com/reslava/loom/releases/tag/v1.9.0
[1.8.0]: https://github.com/reslava/loom/releases/tag/v1.8.0
[1.6.0]: https://github.com/reslava/loom/releases/tag/v1.6.0
[1.5.0]: https://github.com/reslava/loom/releases/tag/v1.5.0
[1.4.0]: https://github.com/reslava/loom/releases/tag/v1.4.0
[1.3.0]: https://github.com/reslava/loom/releases/tag/v1.3.0
[1.2.1]: https://github.com/reslava/loom/releases/tag/v1.2.1
[1.2.0]: https://github.com/reslava/loom/releases/tag/v1.2.0
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
