---
type: plan
id: pl_01KWWAFG293Q0SAADYBKFBMAXV
title: telemetry Plan
status: done
created: 2026-07-06
updated: 2026-07-06
version: 1
design_version: 3
tags: []
parent_id: de_01KWQM19SYX6Q3GNNJ17PT07YF
requires_load: []
target_version: 0.1.0
steps:
  - id: added-a-loom-install-id-env
    order: 1
    status: done
    description: Added a LOOM_INSTALL_ID env override to getOrCreateInstallId so a maintainer can pin the distinct_id (e.g. loom-dev) and cohort-exclude their own installs without hard-disabling telemetry.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: added-a-keyless-build-warning-at
    order: 2
    status: done
    description: "Added a keyless-build warning at the MCP host layer (buildServerTelemetry/buildCliTelemetry): when LOOM_TELEMETRY is on but no PostHog key is baked, emit one stderr line instead of silently running Noop."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: fixed-the-primary-ai-path-blind
    order: 3
    status: done
    description: "Fixed the primary AI-path blind spot: launchClaude now injects telemetry consent + surface (getTelemetryEnv) into the launched Claude agent's terminal, so its separate loom mcp emits generate/refine/do-step events the extension toggle previously never reached."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: added-the-chat-created-first-class
    order: 4
    status: done
    description: Added the chat_created first-class event (mapped from loom_create_chat only, not appends) to instrument the loop's entry surface, and updated the telemetry design event table + funnel.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: added-a-posthog-key-present-absent
    order: 5
    status: done
    description: "Added a '🔑 PostHog key: present/absent' line to build-all.sh so key-less local builds are visible at every build."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: made-the-telemetry-test-suite-hermetic
    order: 6
    status: done
    description: Made the telemetry test suite hermetic against the runner's LOOM_* environment (explicit env in the install-id construction test).
    files_touched: []
    blocked_by: []
    satisfies: []
---
# telemetry Plan

## Goal

Quick-ship record of 6 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Added a LOOM_INSTALL_ID env override to getOrCreateInstallId so a maintainer can pin the distinct_id (e.g. loom-dev) and cohort-exclude their own installs without hard-disabling telemetry. | — | — | — |
| ✅ | 2 | Added a keyless-build warning at the MCP host layer (buildServerTelemetry/buildCliTelemetry): when LOOM_TELEMETRY is on but no PostHog key is baked, emit one stderr line instead of silently running Noop. | — | — | — |
| ✅ | 3 | Fixed the primary AI-path blind spot: launchClaude now injects telemetry consent + surface (getTelemetryEnv) into the launched Claude agent's terminal, so its separate loom mcp emits generate/refine/do-step events the extension toggle previously never reached. | — | — | — |
| ✅ | 4 | Added the chat_created first-class event (mapped from loom_create_chat only, not appends) to instrument the loop's entry surface, and updated the telemetry design event table + funnel. | — | — | — |
| ✅ | 5 | Added a '🔑 PostHog key: present/absent' line to build-all.sh so key-less local builds are visible at every build. | — | — | — |
| ✅ | 6 | Made the telemetry test suite hermetic against the runner's LOOM_* environment (explicit env in the install-id construction test). | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
