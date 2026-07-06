---
type: design
id: de_01KWQM19SYX6Q3GNNJ17PT07YF
title: Opt-in usage telemetry — design
status: done
created: 2026-07-04
updated: 2026-07-06
version: 3
idea_version: 1
tags: []
parent_id: id_01KWP9GAY7TYGS7NFKC5KFZAJ3
requires_load: []
---
# Opt-in usage telemetry — design

## Goal

Give Loom a **content-free, opt-in** view of real behaviour across its silent install base: *is the workflow loop (`chat → generate → do-step → done`) actually used, where do people stall, and do they return?* This complements the sibling `user-feedback` thread — feedback tells us *why* from the few who speak; telemetry tells us *what* across the consenting many.

Scope guard: a **small** fixed event set answering exactly those three questions. No content, no PII, no per-project identifiers, no scope creep.

## Locked decisions (from chat-001)

| Decision | Choice | Rationale |
|---|---|---|
| Provider | **PostHog** free tier, **EU** host | Native funnels + retention answer "where do people stall / do they return" with zero dashboard-building |
| Instrumentation point | **`app` use-case layer** (single choke point) | Every surface — extension→MCP→app, CLI→MCP→app, CLI→app-direct, Claude Code agent→MCP→app — converges here. One point captures all; a `surface` tag preserves per-path slicing |
| Package | new **`packages/telemetry`** | Portable transport + consent + identity core, reusable in chord-flow (mirrors how `user-feedback` was split) |
| Consent | **opt-in only**, default **off** | Trust-sensitive dev tool; non-negotiable |
| Transport | minimal `fetch` → PostHog EU `/capture`, no SDK | Lighter bundle, portable, fire-and-forget, silent-failure |
| `install_id` | random UUID, **user-global** store, generated **on opt-in** | Retention + cross-repo dedupe need one stable id per user |

## Architecture

### Dependency shape

`packages/telemetry` is a **leaf infrastructure package** injected into `app` via `deps` — the same relationship `fs` has. It never imports `app`/`core`/`fs`. `core` stays pure (no network). The dependency rule becomes `cli/vscode/mcp → app → core + fs + telemetry`.

```
delivery entry (cli / mcp server / vscode host)
  builds concrete client → injects into app deps
        │
        ▼
  app use-case  →  deps.telemetry.track(event, props)   ← no-op when disabled
        │
        ▼
  packages/telemetry
    · consent gate (opt-in check)      → NoopTelemetry when off
    · identity (install_id, session_id)
    · common props (loom_version, surface, os, is_ci)
    · transport: fetch → PostHog EU /capture (batched, fire-and-forget, silent-fail)
```

### `packages/telemetry` surface

- `interface TelemetryClient { track(event: string, props?: Record<string, string|number|boolean>): void; flush(): Promise<void> }`
- `NoopTelemetry` — the default; every method a no-op. Used whenever consent is absent or resolution fails.
- `PostHogTelemetry` — consent-gated concrete client. Owns identity, common props, batching, and the `fetch` transport.
- `resolveConsent(env)` / config resolution — reads the opt-in setting/env/flag; returns `NoopTelemetry` unless explicitly enabled.
- Identity store — read/write `install_id` in a user-global location (OS config dir), created only after opt-in.

The **transport + consent + identity core is generic**; the **Loom event vocabulary is not** and lives next to `app` (see taxonomy). This is the portable/specific split that lets chord-flow reuse the transport with its own event names + PostHog key.

### Injection at delivery entry points

The concrete client is constructed at each composition root and injected into `app` deps with the correct `surface` tag:

- CLI entry (`packages/cli`) → `surface: "cli"`
- MCP server entry (`packages/mcp`) → `surface: "agent"` (this is where Claude Code / Cursor tool calls land)
- VS Code extension host (`packages/vscode`) → `surface: "extension"`

When telemetry is disabled, each injects `NoopTelemetry`, so `app` code is unconditional (`deps.telemetry.track(...)`) with zero branching.

## Event taxonomy (fixed — the whole loop, nothing more)

**Identity:** `install_id` (post-consent), `session_id`.
**Common props on every event:** `loom_version`, `surface` (`extension|cli|agent`), `os`, `is_ci`.
**Never sent:** titles, slugs, paths, bodies, weave/thread names, any PII — only enums + counts + version.

| # | Event | Props | Answers |
|---|---|---|---|
| 1 | `workspace_activated` | — | reach/engagement denominator |
| 2 | `session_started` | — | retention anchor |
| 3 | `doc_generated` | `type: idea\|design\|req\|plan\|ctx` | generate phase |
| 4 | `doc_refined` | `type` | refine phase |
| 5 | `plan_started` | — | loop entered |
| 6 | `step_completed` | `had_error: bool` | **core loop heartbeat** |
| 7 | `plan_done` | — | **loop closure / success** |
| 8 | `error` | `operation, error_class` | where people stall (content-free) |
| 9 | `command_invoked` | `command` | coarse "which tools fire" |
| 10 | `chat_created` | — | thinking-surface entry — is the loop's front door (chat) used? Creation only, never appends (too high-volume) |

The funnel `chat_created → doc_generated → plan_started → step_completed → plan_done` + retention (`session_started` per `install_id` over time) + `error` clustering answers all three questions. `chat_created` (added post-v1) anchors the funnel at the loop's actual entry — the thinking surface — so "opened a chat but never generated" becomes a visible drop-off rather than a blind spot. Anything beyond this table is out of scope.

### Cross-process consent (post-v1 correction)

The emit point is the MCP `CallTool` dispatcher seam (decision B) — a single code choke point all `loom_*` writes funnel through. But telemetry is emitted by a **per-process** client built from that process's env, and the primary AI path runs a **second** `loom mcp` process: the extension's AI buttons launch a Claude Code agent whose own `loom mcp` (spawned from `.mcp.json`) creates the docs. The VS Code `telemetry.enabled` toggle only seeded the extension's *own* server, so agent-path loop events (generate/refine/do-step) silently dropped. Fix: `launchClaude` now injects `getTelemetryEnv()` (consent + `surface: extension`) into the launched terminal, so the UI toggle governs the work the button triggers. The lesson: a single *code* choke point is not a single *runtime* meeting point — consent/identity must reach every process that runs the app, since the app is a per-process library, not a shared service.

## Identity, privacy & consent

- **install_id**: random UUID, user-global store, generated only after opt-in. `session_id`: fresh per process.
- **Content-free by construction**: `track()` accepts only an allowlisted prop shape (enums / numbers / bools). No free-form strings from doc content ever reach it — the Loom taxonomy layer is the only caller and passes fixed enums.
- **`is_ci`** detected and sent so CI-driven runs can be filtered out.
- **Consent UX**:
  - Extension: `reslava-loom.telemetry.enabled` (default `false`) + a one-time, dismissible first-activation disclosure describing exactly what is sent and linking the README.
  - CLI / agent: `LOOM_TELEMETRY=1` env (and/or a flag) + a one-time first-run notice.
  - **Kill switch** documented in README alongside the full event list.

## Reuse (chord-flow)

`packages/telemetry` ships the transport/consent/identity core with **project key + event names injected by the host**. chord-flow depends on it, supplies its own PostHog key and its own event vocabulary. Nothing Loom-specific leaks into the package — the loop taxonomy stays in Loom's app layer.

## Doc-sync obligation

Adding an infra package that `app` depends on touches the **"Package layers / architecture"** row of the doc-sync contract. The plan includes updating `architecture-reference.md`, `implementation-contract-reference.md`, and `ctx.md`'s layer line. Whether the one-line dependency rule in `CLAUDE.md` + the `LOOM_CLAUDE_MD` template should also gain `telemetry` is flagged for Rafa — it's a shared-rule edit and I won't touch both surfaces without a nod.

## Out of scope / deferred

- PostHog dashboard + funnel configuration (console setup, not code).
- Any pre-consent "install happened" ping — deliberately excluded to keep opt-in-only honest; raw reach stays with marketplace/npm counts.
- Per-project or per-doc identifiers of any kind.
