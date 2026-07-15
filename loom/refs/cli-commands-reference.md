---
type: reference
id: rf_01KQYDFDDD6SYMCJ1Q2Z6748EK
title: cli — Commands
status: active
created: "2026-04-14T00:00:00.000Z"
version: 3
tags: [cli, commands, reference, loom, public]
requires_load: []
slug: cli-commands-reference
load: by-request
---

# Loom CLI Commands Reference

Every command in the `loom` CLI. Source of truth: `packages/cli/src/index.ts`.

> **The CLI does not run the AI.** It handles setup, inspection, and manual document CRUD. AI work happens through an MCP-capable agent (Claude Code) connected to the Loom MCP server — see the **[CLI / Claude Code User Guide](../../docs/CLI_USER_GUIDE.md)**.

---

## Workspace & initialization

### `loom install [--force]`
Install (or upgrade) Loom in the **current** workspace: creates `.loom/`, writes the Loom-owned `.loom/CLAUDE.md`, writes the MCP config, and ensures the root `CLAUDE.md` imports both `@.loom/CLAUDE.md` and `@CLAUDE-LOCAL.md` (idempotent — never duplicates). The normal per-project initializer, and safe to re-run after a CLI upgrade.

**Two CLAUDE surfaces, distinct ownership:**
- **`.loom/CLAUDE.md`** is Loom-owned — every `loom install` re-writes it to deliver contract updates. Never hand-edit it.
- **`CLAUDE-LOCAL.md`** (repo root) is user-owned — created once if absent and **never overwritten, not even with `--force`**. This is where project-local AI rules go, so re-running `loom install` to pick up a new contract never destroys them.

### `loom init [--force]`
Initialize a mono-loom workspace in the current directory.

### `loom init-multi [--force]`
Initialize the global multi-loom workspace at `~/looms/default`.

### `loom setup <name> [--path <path>] [--no-switch]`
Create a new named loom workspace. `--path` sets a custom location; `--no-switch` keeps the current active loom.

### `loom switch <name>`
Switch the active loom context.

### `loom list`
List all registered looms.

### `loom current`
Show the currently active loom.

### `loom mcp`
Start the Loom MCP server over stdio. Normally launched **by your agent** via `.mcp.json` (`"command": "npx", "args": ["-y", "@reslava/loom@<version>", "mcp"]`), not run by hand.

---

## Inspection

### `loom status [weave-id] [--verbose] [--json] [--tokens] [--filter <criteria>] [--sort <order>]`
Show derived state of weaves/threads.
- `--verbose` — include plan steps.
- `--json` — machine-readable output.
- `--filter` — e.g. `status=active,implementing` or `phase=planning`.
- `--sort` — e.g. `id:asc`, `id:desc`.

### `loom validate [weave-id] [--all] [--fix] [--verbose]`
Validate document integrity, links, and staleness. `--all` validates every weave; `--verbose` shows detailed issues. (`--fix` is not yet implemented.)

### `loom roadmap [--group-by-thread]`
Print the derived cross-weave roadmap (a thin renderer over the `loom://roadmap` resource): one **Roadmap** band (present + future threads in a single dependency + `priority` order, each row showing its status and, when blocked, what it's blocked on) and **History** (shipped plans, newest first). `--group-by-thread` groups the history under each `weave/thread`. Pure read — never mutates; a thread missing its `thread.md` surfaces as a diagnostic, not a silent write.

---

## Reports

### `loom report <kind> [--weave <slug>] [--thread <slug>] [--since <date>] [--until <date>] [--full] [--sort <recency|oldest>] [--run] [--forward] [--creativity <closed|creative>]`
Generate an analytical **report** from a deterministic, filtered slice of the doc graph (chats, ideas, designs, plans, done, roadmap) under a chosen `<kind>` — `project-overview`, `decisions`, `architecture`, `designs`, `ideas`, `plans`, `dones`, `drift-audit`, `security`, `release-notes`, and the prospective `next-work`. Most kinds are **retrospective** (what happened); `next-work` is **prospective** — it mines the graph's *open* material (parked decisions, stalled intent, blocked work, drift debt) into a ranked, cited next-work list. Reports read the *reasoning* layer a codebase-only tool can't reach. By default prints a **brief** (the selected slice + a synthesis instruction) for an AI agent to turn into a report and persist via `loom_create_report`; `--run` launches a headless Claude agent to do it end-to-end. `--full` disables the token budget; `--sort` picks the keep-full ordering when budget-degraded. `--forward` reads any retrospective kind prospectively (propose next work from its slice); `--creativity creative` widens the *solution* latitude of prospective output (still grounded in a cited signal). Reports land under `loom/reports/` (cross-weave) or `loom/{weave}/reports/` (weave-scoped) as versioned `report` docs, excluded from `loom://refs` and `requires_load`. Full kinds, parameters, and budgeting: [reports-reference.md](reports-reference.md).

---

## MCP surface & queries

Make the MCP surface reachable from a plain terminal — no MCP host required. The read
commands (`catalog`, `resources`, `context`, `next`) run the MCP handshake **in-process**
over an in-memory transport (no subprocess, no hand-typed JSON-RPC); the query commands
(`search`, `stale`, `blocked`) call the shared `app` use-cases the MCP tools also use.

### `loom catalog`
Print the grouped index of every `loom_*` MCP tool (the `loom://catalog` resource).

### `loom resources`
List the concrete MCP resources this Loom advertises (uri + title).

### `loom resources read <uri>`
Read any MCP resource by uri and print its contents (e.g. `loom://summary`, `loom://context/<id>`). Generalizes `loom catalog`.

### `loom context <docId> [--mode <mode>]`
Print the assembled context bundle for a doc. Accepts a plain doc id, or the `thread/<weave>/<thread>` form for a whole thread. `--mode` is one of `chat|idea|design|plan|implementing|refine|promote|ctx`.

### `loom next [plan-id]`
Print the next incomplete step + context for a plan (via the `do-next-step` prompt). With no argument, resolves the workspace's active plan (first `implementing`, else first `active`).

### `loom search <query> [--type <type>] [--weave <id>]`
Search docs by id/title/content (case-insensitive); prints id + type + title + snippet. `--type` filters by doc type (`idea|design|plan|ctx|chat|done`); `--weave` scopes to a weave id.

### `loom stale`
List docs that may be stale — plans behind their design version, and children whose parent was updated after them — with the reason for each.

### `loom blocked`
List blocked steps across all `implementing` plans, with the blockers for each step.

---

## Documents (manual CRUD)

### `loom create <type>` — mirrors `loom_create_*`

Thread-first: every doc lives in an **existing** thread (make it first with `loom create thread`); create commands **never** mint a thread implicitly.

- `loom create thread <weave> <slug> [--title <t>]` — create a thread (its `thread.md` + a fresh `th_` ULID). The sole, explicit thread creator.
- `loom create idea <weave> <thread> <title>` — create the idea doc in an existing thread (one idea per thread).
- `loom create design <weave> <thread> [--title <t>]` — create the design doc in an existing thread.
- `loom create plan <weave> <thread> [--title <t>] [--goal <g>]` — create a plan in an existing thread.
- `loom create req <weave> <thread> [--title <t>]` — create the req doc in an existing thread.
- `loom create chat [weave] [thread] [--title <t>] [--refs]` — create a thread chat (needs `<weave> <thread>`) or a refs chat (`--refs`).
- `loom create reference <title> [--description <d>]` — create a reference doc under `loom/refs/`.
- `loom create weave <slug>` — create an empty weave folder.

### `loom set-status <doc> <status>` — mirrors `loom_set_status`
Set a document's lifecycle status (`draft` / `active` / `done`). Guarded: a plan → implementing needs `loom start-plan`, a plan → done is *earned* by completing steps (not settable here), a req → locked needs its finalize. `<doc>` is a slug, filename stem, or ULID.

### `loom rename <old-id> <new-title>`
Rename a document and update references to it.

---

## Workflow events

### `loom refine-design <weave-id>`
Fire the `REFINE_DESIGN` event (bumps the design version, marks child plans stale).

### `loom start-plan <plan-id>`
Move a plan to `implementing`.

### `loom complete-step <plan-id> --step <n>`
Mark plan step `n` as done.

---

## Maintenance

### `loom migrate [--dry-run]`
Run registered repository migrations. The current migration, `backfill-thread-manifests`, creates a `thread.md` manifest (a fresh `th_` ULID, a title from the thread's idea/slug, default `priority`, empty `depends_on`) for every thread folder lacking one — required for the derived roadmap. **Idempotent** (skips threads that already have a manifest, safe to re-run and to ship in every release); `--dry-run` prints what it would create and touches nothing.

### `loom migrate-plan-steps [plan-id] [--dry-run]`
Migrate legacy plans (steps in the body `## Steps` table) to frontmatter-native `steps` (the v1.3.0 source of truth). Idempotent; never empties a table it can't parse (reports it as `unparseable` and leaves it untouched).

---

> These event/CRUD commands change document **state** only. The actual thinking and implementation —
> drafting idea content, designing, writing code for a step — is done through your MCP agent (§4 of the
> [CLI / Claude Code User Guide](../../docs/CLI_USER_GUIDE.md)).
