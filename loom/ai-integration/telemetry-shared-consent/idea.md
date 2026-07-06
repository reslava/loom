---
type: idea
id: id_01KWWAGGYK9FKACZSA1YW1J2A0
title: Resolve telemetry consent from a shared source (remove per-process env-plumbing)
status: draft
created: 2026-07-06
version: 1
tags: []
parent_id: null
requires_load: []
---
# Resolve telemetry consent from a shared source (remove per-process env-plumbing)

> **Tracking only — not scheduled.** Captured so the cleaner architecture isn't lost. Do it only when non-extension MCP hosts (Cursor, Continue, …) become a real surface. Until then the shipped `launchClaude` env-injection fix is right-sized.

## Problem

Telemetry consent is **process-scoped and carried in environment variables**, but Loom runs **multiple `loom mcp` processes at once** (the VS Code extension's own server *and* the Claude Code agent's server spawned from `.mcp.json`, plus any CLI invocation). The MCP `CallTool` dispatcher seam is a single *code* choke point, but each process builds its own telemetry client from its own env and resolves consent independently — a single code meeting point is **not** a single runtime meeting point, because `app`/the MCP server is a per-process library, not a shared service.

The v1.18.0 fix propagates consent into the launched agent's terminal (`launchClaude` → `getTelemetryEnv()`). That works, but it is **per-launch-site env-plumbing**: every current and future process that runs Loom work must be handed the consent env, and any host we don't control (Cursor, Continue, a bare `claude` the user starts) never gets it. The **key** doesn't have this problem — it's baked into the binary, so it's present in every process automatically. Consent should reach parity.

## What we'd build

Resolve consent (and surface/opt-in state) from a **shared source every `loom` process reads on its own**, instead of plumbing it through env per launch:

- Persist an opt-in flag in the **user-global config dir** — the same place `install_id` already lives (`telemetry.json` via `getOrCreateInstallId`). One writer, many readers.
- The extension's *Telemetry: On/Off* toggle (and a `loom telemetry on|off` CLI command) **writes** the flag; **every** `loom mcp` — the extension's, the agent's, one spawned by Cursor/Continue/any MCP host — **reads** it at startup. Zero env propagation.
- Keep `LOOM_TELEMETRY` as an **override** for CI / power users / ephemeral opt-out (env wins over file), preserving the documented CLI switch and the opt-in-only guarantee.

## Why it matters

It makes the shipped consent toggle mean what users think it means on **every** surface, not just the extension's own server — matching the vision ("works with Claude Code, Cursor, or any MCP-capable agent"). It also retires the env-plumbing as a standing footgun: a new AI entry point can't silently ship blind because someone forgot to pass the consent env.

## Not this (scope guard)

- **Not** changing what is collected, the key mechanism, or the opt-in-default-off policy. Consent stays opt-in; this only changes *where a process reads the opt-in from*.
- **Not** a shared *sink* daemon — no new process. Just a shared *config file*, read independently by each existing process.
- **Not** urgent: with the extension as effectively the only AI surface today and ~zero non-extension users, the `launchClaude` fix already closes the observed gap. This earns its keep only when a second host is real.

## Open questions

- **Precedence:** env override vs file — confirm env-wins (opt-out must always be immediate) and how an explicit `LOOM_TELEMETRY=0` interacts with a file that says `on`.
- **Write surface:** does the CLI grow a `loom telemetry on|off` command, or only the extension writes the file? (A file no CLI can toggle is awkward for pure-CLI users.)
- **Migration:** the flag co-locating with `install_id` in `telemetry.json` — one file, or a separate `consent` file for clarity.
- **Consent freshness:** a long-lived `loom mcp` reads the flag at startup — is a mid-session toggle expected to take effect without a respawn?

## Success criteria

- Flipping consent once (extension toggle or CLI) governs telemetry on **every** `loom mcp` process — extension, agent, and any third-party MCP host — with no per-launch env wiring.
- `LOOM_TELEMETRY` still works as an override.
- The `launchClaude` env-injection becomes redundant and can be removed (net simplification, not another layer).
