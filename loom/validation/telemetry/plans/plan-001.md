---
type: plan
id: pl_01KWQM2PMZPSSG5YKTF13WV1NJ
title: Opt-in usage telemetry — implementation
status: done
created: 2026-07-04
updated: 2026-07-04
version: 1
design_version: 1
tags: []
parent_id: de_01KWQM19SYX6Q3GNNJ17PT07YF
requires_load: []
target_version: 0.1.0
steps:
  - id: scaffold-packages-telemetry
    order: 1
    status: done
    description: Create the packages/telemetry package (lockstep version, tsconfig, index exports). Define the TelemetryClient interface { track, flush } and NoopTelemetry (all no-ops). Leaf infra package — imports nothing from app/core/fs.
    files_touched: [packages/telemetry/package.json, packages/telemetry/tsconfig.json, packages/telemetry/src/index.ts, packages/telemetry/src/types.ts, packages/telemetry/src/noop.ts]
    blocked_by: []
    satisfies: []
  - id: consent-identity-core
    order: 2
    status: done
    description: Implement consent resolution (opt-in setting/env/flag → NoopTelemetry unless explicitly enabled), the user-global install_id store (random UUID created only on opt-in), per-process session_id, and common-prop assembly (loom_version, surface, os, is_ci).
    files_touched: [packages/telemetry/src/consent.ts, packages/telemetry/src/identity.ts, packages/telemetry/src/props.ts]
    blocked_by: [scaffold-packages-telemetry]
    satisfies: []
  - id: posthog-transport
    order: 3
    status: done
    description: "Implement PostHogTelemetry: minimal fetch to the PostHog EU /capture endpoint, batching, fire-and-forget with silent failure and a short timeout (never block or throw into a workflow action). Consent-gated at construction."
    files_touched: [packages/telemetry/src/posthog.ts]
    blocked_by: [scaffold-packages-telemetry, consent-identity-core]
    satisfies: []
  - id: loom-event-taxonomy-layer
    order: 4
    status: done
    description: Add the Loom-specific event vocabulary (the fixed 9 events) as typed helpers next to app that map domain events to track() calls with allowlisted enum/number/bool props only — no free-form content can reach the client through this layer.
    files_touched: [packages/app/src/telemetry/events.ts]
    blocked_by: [scaffold-packages-telemetry]
    satisfies: []
  - id: inject-telemetry-into-app-deps-emit
    order: 5
    status: done
    description: "Instrument the dispatcher seam (B): wrap the MCP CallToolRequestSchema handler and the CLI command dispatch so every tool/command call emits command_invoked, maps known tool/command names to loop events (createIdea→doc_generated{idea}, startPlan→plan_started, completeStep→step_completed, closePlan→plan_done, refine*→doc_refined, etc.) via a tool→event table, and emits error{operation,error_class} on throw. The step-4 app taxonomy is the emitter; dispatchers are the call site. Core stays pure."
    files_touched: [packages/mcp/src/server.ts, packages/mcp/src/telemetryDispatch.ts, packages/cli/src/index.ts]
    blocked_by: [loom-event-taxonomy-layer, consent-identity-core]
    satisfies: []
  - id: wire-concrete-client-at-delivery-entry
    order: 6
    status: done
    description: "Construct the concrete client at each composition root via createTelemetry(config) with the right surface tag and thread it into the dispatcher: MCP server start (surface=agent), CLI start (surface=cli), VS Code extension host (surface=extension). Emit workspace_activated/session_started at start, and flush() on shutdown. NoopTelemetry when disabled."
    files_touched: [packages/mcp/src/index.ts, packages/mcp/src/server.ts, packages/cli/src/index.ts, packages/vscode/src/extension.ts]
    blocked_by: [posthog-transport, inject-telemetry-into-app-deps-emit]
    satisfies: []
  - id: consent-ux-kill-switch
    order: 7
    status: done
    description: "Extension: reslava-loom.telemetry.enabled setting (default false) + one-time first-activation disclosure. CLI/agent: LOOM_TELEMETRY env (+ flag) + one-time first-run notice. Documented off switch. install_id generated only on enable."
    files_touched: [packages/vscode/package.json, packages/vscode/src/telemetryConsent.ts, packages/cli/src/index.ts]
    blocked_by: [wire-concrete-client-at-delivery-entry]
    satisfies: []
  - id: tests
    order: 8
    status: done
    description: "Add tests/telemetry.test.ts (ts-node/dist style): Noop when disabled, consent gating, payload contains only allowlisted content-free props (no titles/paths/slugs), and correct domain-event → track mapping. Register it in scripts/test-all.sh."
    files_touched: [tests/telemetry.test.ts, scripts/test-all.sh]
    blocked_by: [inject-telemetry-into-app-deps-emit, posthog-transport]
    satisfies: []
  - id: docs-doc-sync-sweep
    order: 9
    status: done
    description: "README telemetry section: exact event list, opt-in instructions, kill switch, and the no-content/no-PII guarantee. Doc-sync (package-layers row): add packages/telemetry to architecture-reference, implementation-contract-reference, and the ctx.md layer line. Flag to Rafa whether the CLAUDE.md + LOOM_CLAUDE_MD dependency-rule line should also gain telemetry (shared-rule edit — not touching both surfaces without a nod)."
    files_touched: [README.md, loom/refs/architecture-reference.md, loom/refs/implementation-contract-reference.md, loom/ctx.md]
    blocked_by: [wire-concrete-client-at-delivery-entry]
    satisfies: []
---
# Opt-in usage telemetry — implementation

## Goal

Ship content-free, opt-in usage telemetry for Loom via a new portable `packages/telemetry` infra package injected into the `app` use-case layer (the single choke point all surfaces converge on), sending a fixed 9-event loop taxonomy to PostHog (EU) only after explicit consent. Delivers the funnel + retention + error-clustering signal to answer "is the loop used, where do people stall, do they return" while keeping `core` pure, guaranteeing no PII/content leaves the machine, and keeping the transport/consent/identity core reusable in chord-flow.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create the packages/telemetry package (lockstep version, tsconfig, index exports). Define the TelemetryClient interface { track, flush } and NoopTelemetry (all no-ops). Leaf infra package — imports nothing from app/core/fs. | packages/telemetry/package.json, packages/telemetry/tsconfig.json, packages/telemetry/src/index.ts, packages/telemetry/src/types.ts, packages/telemetry/src/noop.ts | — | — |
| ✅ | 2 | Implement consent resolution (opt-in setting/env/flag → NoopTelemetry unless explicitly enabled), the user-global install_id store (random UUID created only on opt-in), per-process session_id, and common-prop assembly (loom_version, surface, os, is_ci). | packages/telemetry/src/consent.ts, packages/telemetry/src/identity.ts, packages/telemetry/src/props.ts | scaffold-packages-telemetry | — |
| ✅ | 3 | Implement PostHogTelemetry: minimal fetch to the PostHog EU /capture endpoint, batching, fire-and-forget with silent failure and a short timeout (never block or throw into a workflow action). Consent-gated at construction. | packages/telemetry/src/posthog.ts | scaffold-packages-telemetry, consent-identity-core | — |
| ✅ | 4 | Add the Loom-specific event vocabulary (the fixed 9 events) as typed helpers next to app that map domain events to track() calls with allowlisted enum/number/bool props only — no free-form content can reach the client through this layer. | packages/app/src/telemetry/events.ts | scaffold-packages-telemetry | — |
| ✅ | 5 | Instrument the dispatcher seam (B): wrap the MCP CallToolRequestSchema handler and the CLI command dispatch so every tool/command call emits command_invoked, maps known tool/command names to loop events (createIdea→doc_generated{idea}, startPlan→plan_started, completeStep→step_completed, closePlan→plan_done, refine*→doc_refined, etc.) via a tool→event table, and emits error{operation,error_class} on throw. The step-4 app taxonomy is the emitter; dispatchers are the call site. Core stays pure. | packages/mcp/src/server.ts, packages/mcp/src/telemetryDispatch.ts, packages/cli/src/index.ts | loom-event-taxonomy-layer, consent-identity-core | — |
| ✅ | 6 | Construct the concrete client at each composition root via createTelemetry(config) with the right surface tag and thread it into the dispatcher: MCP server start (surface=agent), CLI start (surface=cli), VS Code extension host (surface=extension). Emit workspace_activated/session_started at start, and flush() on shutdown. NoopTelemetry when disabled. | packages/mcp/src/index.ts, packages/mcp/src/server.ts, packages/cli/src/index.ts, packages/vscode/src/extension.ts | posthog-transport, inject-telemetry-into-app-deps-emit | — |
| ✅ | 7 | Extension: reslava-loom.telemetry.enabled setting (default false) + one-time first-activation disclosure. CLI/agent: LOOM_TELEMETRY env (+ flag) + one-time first-run notice. Documented off switch. install_id generated only on enable. | packages/vscode/package.json, packages/vscode/src/telemetryConsent.ts, packages/cli/src/index.ts | wire-concrete-client-at-delivery-entry | — |
| ✅ | 8 | Add tests/telemetry.test.ts (ts-node/dist style): Noop when disabled, consent gating, payload contains only allowlisted content-free props (no titles/paths/slugs), and correct domain-event → track mapping. Register it in scripts/test-all.sh. | tests/telemetry.test.ts, scripts/test-all.sh | inject-telemetry-into-app-deps-emit, posthog-transport | — |
| ✅ | 9 | README telemetry section: exact event list, opt-in instructions, kill switch, and the no-content/no-PII guarantee. Doc-sync (package-layers row): add packages/telemetry to architecture-reference, implementation-contract-reference, and the ctx.md layer line. Flag to Rafa whether the CLAUDE.md + LOOM_CLAUDE_MD dependency-rule line should also gain telemetry (shared-rule edit — not touching both surfaces without a nod). | README.md, loom/refs/architecture-reference.md, loom/refs/implementation-contract-reference.md, loom/ctx.md | wire-concrete-client-at-delivery-entry | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
