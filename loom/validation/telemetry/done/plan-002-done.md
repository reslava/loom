---
type: done
id: pl_01KWWAFG293Q0SAADYBKFBMAXV-done
title: Done — telemetry Plan
status: done
created: 2026-07-06
version: 1
tags: []
parent_id: pl_01KWWAFG293Q0SAADYBKFBMAXV
requires_load: []
---
# Done — telemetry Plan

Follow-up to the telemetry go-live: diagnosed why events stopped (local build-all relinks a key-less global loom via npm link --force; only release.yml bakes LOOM_POSTHOG_KEY) and why the extension's AI path sent nothing (the launched Claude agent runs its own loom mcp that never received the extension's consent). Root cause: consent/identity is process-scoped via env, and there are multiple loom mcp processes; the app/MCP layer is a per-process library, not a shared service. The deferred cleaner fix (shared consent source read by every process) is tracked in ai-integration/telemetry-shared-consent.
