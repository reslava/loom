---
type: done
id: pl_01KWQM2PMZPSSG5YKTF13WV1NJ-done
title: Done — Opt-in usage telemetry — implementation
status: done
created: 2026-07-04
version: 9
tags: []
parent_id: pl_01KWQM2PMZPSSG5YKTF13WV1NJ
requires_load: []
---
# Done — Opt-in usage telemetry — implementation

## Step 1 — Create the packages/telemetry package (lockstep version, tsconfig, index exports). Define the TelemetryClient interface { track, flush } and NoopTelemetry (all no-ops). Leaf infra package — imports nothing from app/core/fs.

Scaffolded `packages/telemetry` as a leaf infra package (lockstep version 1.15.0, no runtime deps — uses global `fetch` + Node builtins).

Files:
- `package.json` — `@reslava-loom/telemetry`, `tsc --build`, matches core/fs shape.
- `tsconfig.json` — composite leaf like core, plus `lib: ["ES2020","DOM"]` so the global `fetch`/`AbortController` types resolve for the transport (step 3).
- `src/types.ts` — `TelemetryClient { track, flush }`, `TelemetryProps` (scalar-only, content-free by convention), `Surface = extension|cli|agent`.
- `src/noop.ts` — `NoopTelemetry` + `noopTelemetry` singleton (the disabled default; lets app call `track()` unconditionally).
- `src/index.ts` — barrel; forward-references `consent`/`identity`/`props`/`posthog` (created in steps 2–3, present before the first build).

Package imports nothing from core/fs/app — the leaf-infra rule holds. Domain event vocabulary deliberately excluded (lives in the app taxonomy, step 4) so the core is chord-flow-reusable.

## Step 2 — Implement consent resolution (opt-in setting/env/flag → NoopTelemetry unless explicitly enabled), the user-global install_id store (random UUID created only on opt-in), per-process session_id, and common-prop assembly (loom_version, surface, os, is_ci).

Consent + identity + common-props core.

- `src/consent.ts` — `TelemetryConfig` (host passes `enabled`, `surface`, `loomVersion`, `apiKey`, optional `host`/`configDir`/`env`); `resolveConsent()` = the single opt-in gate (`enabled === true && apiKey present`, else Noop); `consentFromEnv()` interprets `LOOM_TELEMETRY` with strict opt-in semantics (only `1/true/on/yes` enable — unset is never consent). Package never reads VS Code settings; the host decides policy.
- `src/identity.ts` — `defaultConfigDir()` resolves a **user-global** store (`LOOM_CONFIG_DIR` → `%APPDATA%\loom` on Windows → `$XDG_CONFIG_HOME`/`~/.config/loom`); `getOrCreateInstallId()` reads/creates a random UUID in `telemetry.json` — no project/path/machine linkage, best-effort write with ephemeral fallback, and doc'd to be called only post-consent; `newSessionId()` per process.
- `src/props.ts` — `detectCI()` (well-known CI flags only, never values); `buildCommonProps()` returns the content-free `{ surface, loom_version, os, is_ci }` — `os` is the coarse platform string, never a hostname.

Every prop is a fixed scalar; no document content can enter here.

## Step 3 — Implement PostHogTelemetry: minimal fetch to the PostHog EU /capture endpoint, batching, fire-and-forget with silent failure and a short timeout (never block or throw into a workflow action). Consent-gated at construction.

PostHog transport in `src/posthog.ts`, and verified the whole package compiles standalone (`tsc --build` → exit 0).

- `PostHogTelemetry implements TelemetryClient` — buffers events, attaches `distinct_id` (install id) + `$session_id` + content-free common props; auto-flushes at `MAX_BATCH=20` or on a 15s **unref'd** idle timer (never keeps the process alive); `flush()` POSTs a `/batch/` payload to the EU host (`https://eu.i.posthog.com`) with a 3s `AbortController` timeout.
- **Fire-and-forget + silent-fail**: `track()` is wrapped so it can never throw; `flush()` swallows all fetch/timeout errors. A telemetry failure cannot block or slow a Loom action.
- `createTelemetry(config)` — the only constructor callers use; returns the shared `noopTelemetry` unless `resolveConsent` passes AND a key is present, so a disabled/misconfigured setup is structurally incapable of emitting.

Used `ReturnType<typeof setTimeout>` for the timer field to sidestep the DOM-vs-Node `setTimeout` return-type ambiguity (tsconfig includes both `ES2020` + `DOM` libs for global `fetch`).

## Step 4 — Add the Loom-specific event vocabulary (the fixed 9 events) as typed helpers next to app that map domain events to track() calls with allowlisted enum/number/bool props only — no free-form content can reach the client through this layer.

Loom event taxonomy at `packages/app/src/telemetry/events.ts` — app compiles clean with it (`tsc` → exit 0).

- Nine typed helpers, one per event: `trackWorkspaceActivated`, `trackSessionStarted`, `trackDocGenerated(type)`, `trackDocRefined(type)`, `trackPlanStarted`, `trackStepCompleted(hadError)`, `trackPlanDone`, `trackError(operation, errorClass)`, `trackCommandInvoked(command)`. Each takes a `TelemetryClient` and forwards only fixed enums/booleans/identifiers — the single auditable content-free choke point.
- `DocType = idea|design|req|plan|ctx`.
- Imports `TelemetryClient` from `../../../telemetry/dist` (same dist-path convention app uses for `core`/`fs`) — the domain vocabulary stays in app, the transport stays reusable.

Also wired the build: `scripts/build-all.sh` now cleans `packages/telemetry/dist` and builds telemetry after `fs`, before `app` (app depends on telemetry's dist/types).

## Step 5 — Instrument the dispatcher seam (B): wrap the MCP CallToolRequestSchema handler and the CLI command dispatch so every tool/command call emits command_invoked, maps known tool/command names to loop events (createIdea→doc_generated{idea}, startPlan→plan_started, completeStep→step_completed, closePlan→plan_done, refine*→doc_refined, etc.) via a tool→event table, and emits error{operation,error_class} on throw. The step-4 app taxonomy is the emitter; dispatchers are the call site. Core stays pure.

Dispatcher-seam instrumentation (decision B) on the MCP server — mcp compiles clean (`tsc --build` → exit 0).

- New `packages/mcp/src/telemetryDispatch.ts` — `LOOP_EVENT` table maps wire tool names → app taxonomy calls (`loom_create_idea`→`doc_generated{idea}`, `loom_generate_*`→`doc_generated`, `loom_refine_*`→`doc_refined`, `loom_start_plan`→`plan_started`, `loom_complete_step`→`step_completed`, `loom_close_plan`→`plan_done`). `emitToolSuccess()` = `command_invoked` + optional loop event; `emitToolError()` sends `{tool, error_class=err.constructor.name}` only (never the message).
- `server.ts` — `createLoomMcpServer(root, telemetry = noopTelemetry)` now takes an optional client; the `CallToolRequestSchema` handler wraps `tool.handle()` in try/catch and emits success/error. Every `loom_*` call from the agent AND the extension (both MCP clients) is now instrumented at one point.

Note: CLI-direct instrumentation (commander `preAction` hook, surface=cli) is folded into **step 6** so the hook and the constructed `cliTelemetry` client land together rather than referencing a not-yet-built client across steps. `plan_done` fires on explicit `loom_close_plan` (completing the last step does not auto-close, confirmed from a live `loom_complete_step` result), so no gap.

## Step 6 — Construct the concrete client at each composition root via createTelemetry(config) with the right surface tag and thread it into the dispatcher: MCP server start (surface=agent), CLI start (surface=cli), VS Code extension host (surface=extension). Emit workspace_activated/session_started at start, and flush() on shutdown. NoopTelemetry when disabled.

Concrete clients constructed at every composition root — mcp/cli/vscode all compile clean.

- `packages/mcp/src/telemetryConfig.ts` (new) — `buildServerTelemetry(version, env)` (surface from `LOOM_SURFACE`, default `agent`), `buildCliTelemetry(version)` (surface forced `cli`), `flushOnExit()` (SIGINT/SIGTERM/beforeExit), `startTelemetrySession()` (emits `workspace_activated`+`session_started` then registers flush). PostHog key read from `process.env.LOOM_POSTHOG_KEY` (empty ⇒ Noop).
- `packages/mcp/src/index.ts` + the CLI `loom mcp` action — build server telemetry, `startTelemetrySession`, pass client into `createLoomMcpServer(root, telemetry)`.
- `packages/cli/src/index.ts` — module-level `cliTelemetry` (surface `cli`) + `flushOnExit`; commander `preAction` hook emits `command_invoked` + a small CLI loop map (`start-plan`→plan_started, `complete-step`→step_completed, `refine-design`→doc_refined, weave `idea`/`design`/`plan`→doc_generated).
- `packages/cli/esbuild.js` — `define` inlines `process.env.LOOM_POSTHOG_KEY` into the shipped bundle at release build time (unset ⇒ '' ⇒ Noop, safe).
- `packages/vscode/src/telemetryConsent.ts` (new) + `mcp-client.ts` — the extension spawns `loom mcp` with `LOOM_SURFACE=extension` and `LOOM_TELEMETRY` from the `reslava-loom.telemetry.enabled` setting; the spawned server process is what emits, tagged `extension`. (Setting declaration + one-time disclosure = step 7.)

Surface resolution is honest: the server can't tell its MCP client apart, so the extension declares itself via env; Claude Code leaves it unset ⇒ `agent`.

## Step 7 — Extension: reslava-loom.telemetry.enabled setting (default false) + one-time first-activation disclosure. CLI/agent: LOOM_TELEMETRY env (+ flag) + one-time first-run notice. Documented off switch. install_id generated only on enable.

Consent UX + kill switch — mcp/cli/vscode all compile clean.

- `packages/vscode/package.json` — new `reslava-loom.telemetry.enabled` boolean setting, **default false**, with the content-free description. This is the kill switch (toggle off any time).
- `packages/vscode/src/telemetryConsent.ts` — `maybeShowTelemetryDisclosure(context)`: one-time (globalState-tracked), non-blocking info message with Enable / Keep off / Learn more; skips if the user already set the preference; Enable writes the setting at Global scope; Learn more opens the README anchor. Telemetry stays off unless the user picks Enable.
- `packages/vscode/src/extension.ts` — fires the disclosure once on activation (`void maybeShowTelemetryDisclosure(context)`).
- `packages/mcp/src/telemetryConfig.ts` — `maybeShowCliNotice(env)`: one-time stderr notice for the terminal/agent path (no interactive prompt there), gated by a benign marker file in the config dir (not telemetry, nothing sent); no-op once `LOOM_TELEMETRY` is set.
- `packages/cli/src/index.ts` — preAction shows the CLI notice once for interactive commands, **suppressed for `loom mcp`** so the stdio channel is never polluted.

Opt-in stays intact end to end: default off everywhere, install_id only minted on actual enable.

## Step 8 — Add tests/telemetry.test.ts (ts-node/dist style): Noop when disabled, consent gating, payload contains only allowlisted content-free props (no titles/paths/slugs), and correct domain-event → track mapping. Register it in scripts/test-all.sh.

`tests/telemetry.test.ts` — dist-importing, custom-`assert` style; runs green in isolation (exit 0), registered in `scripts/test-all.sh`.

Coverage (8 groups):
- `resolveConsent` — disabled/no-key → false, enabled+key → true.
- `consentFromEnv` — opt-in semantics (unset/`0`/`false` → off; `1`/`true`/`on` → on).
- `createTelemetry` Noop gating — disabled or key-less returns `NoopTelemetry`; track/flush never throw.
- PostHog construction + identity — enabled+key → `PostHogTelemetry`; install id file minted **only** on opt-in and stable across reads.
- `defaultConfigDir` honours `LOOM_CONFIG_DIR`.
- `buildCommonProps` — exactly `{surface,loom_version,os,is_ci}`, all scalars; `detectCI`.
- Taxonomy mapping — every helper's event name + props, asserted content-free (a `SCALAR` typeof gate over all recorded props).
- MCP dispatch map — `loom_create_idea`→command_invoked+doc_generated{idea}, complete_step→step_completed, close_plan→plan_done, unmapped→command_invoked only; **`emitToolError` sends `error_class` (constructor name) and provably never leaks the error message** (`indexOf('boom') === -1`).

Used a `Recorder` fake `TelemetryClient` to capture calls; no network — flush is asserted on empty queue only, so the suite stays hermetic/fast.

## Step 9 — README telemetry section: exact event list, opt-in instructions, kill switch, and the no-content/no-PII guarantee. Doc-sync (package-layers row): add packages/telemetry to architecture-reference, implementation-contract-reference, and the ctx.md layer line. Flag to Rafa whether the CLAUDE.md + LOOM_CLAUDE_MD dependency-rule line should also gain telemetry (shared-rule edit — not touching both surfaces without a nod).

Docs + doc-sync sweep. Full `build-all` + `test-all` green (all suites incl. the `loom mcp` subprocess integration test — dispatcher runs Noop, no network).

- **README.md** — new "Usage telemetry (opt-in, off by default)" section: exact event list, opt-in toggles (`reslava-loom.telemetry.enabled` / `LOOM_TELEMETRY=1`), kill switch, no-content/no-PII guarantee, PostHog EU. Reworded the feedback line's stale "no background telemetry" claim.
- **loom/refs/architecture-reference.md** — added `telemetry` to the layer diagram (third infra box), the `packages/` listing, and a dependency-rule bullet (leaf infra injected via deps; vocabulary in app; dispatcher-seam emission; per-surface client at delivery entries). Updated the `app` import rule to `core`, `fs`, `telemetry`.
- **loom/refs/implementation-contract-reference.md** — one-line dep diagram now `core + fs + telemetry` with a note.
- **loom/ctx.md** — patched the Stage-2 layer line (via `loom_patch_doc`, it's gated) to include `+ telemetry`.
- **CLAUDE.md + LOOM_CLAUDE_MD template** — deliberately left as-is per Rafa's decision (leaf infra like fs; not worth the shared-rule edit).
- **Package READMEs (Rafa's ask):** `packages/cli/README.md` + `packages/vscode/README.md` each got a telemetry subsection + (vscode) a Settings-table row; fixed the vscode README's contradictory "no background telemetry" line. These are the npm / Marketplace listings, so a privacy-relevant opt-in feature belongs there.
