---
type: design
id: de_01KWQ8SBCKE1TMAK1FQP8J7WGR
title: In-tool user feedback — turn silent usage into signal
status: done
created: 2026-07-04
version: 1
idea_version: 1
tags: []
parent_id: id_01KWP9G257MPBBMMK95Y4XPD9K
requires_load: []
---
# In-tool user feedback — turn silent usage into signal

## Overview

One-click, opt-in feedback from *inside* Loom that opens a **prefilled GitHub issue**, carrying only lightweight, non-PII context: Loom version, OS, and a voluntary usage snapshot. The mechanism is repo-agnostic — the same command works in any workspace where Loom is installed, because the target repo is resolved, not hardcoded. Three entry points: a VS Code command, a status-bar item, and a `loom feedback` CLI command.

Nothing is ever sent silently. Every path ends at a prefilled URL the user reviews and submits themselves.

## Decisions (locked in chat-001)

1. **Channel** — prefilled GitHub issue *form* (`.github/ISSUE_TEMPLATE/feedback.yml`). No backend, reaches the repo owner, free.
2. **Target-repo resolution** — resolve, don't hardcode: **config override → git `origin` remote autodetect**. This is the reuse hinge — the identical command lands feedback in `reslava/loom` here and `reslava/chord-flow` there, with zero per-repo code.
3. **Prefill payload** — version + OS + a **voluntary usage snapshot** (counts only, from the state summary). The snapshot is what separates "someone installed" from "someone completed the loop."
4. **Placement** — command palette + status-bar item (extension) and `loom feedback` (CLI). No forced toast in v1.
5. **Scaffolding** — `loom install` writes the issue-form template if absent, so reuse in another repo is still one command.
6. **Deferred to phase 2** — the win-moment inline prompt (fuzziest, nag-risk; not needed to start collecting signal).

## Architecture

Follows the dependency rule `cli / vscode / mcp → app → core + fs`. The work splits cleanly by layer:

### core — pure URL assembly
`buildFeedbackUrl(params: { repo, version, os, snapshot }): string`
Pure function. Builds the GitHub issue-form URL, URL-encoding a prefilled `environment` field (GitHub issue forms prefill textarea fields by field id via `?<field_id>=<value>`). No IO. Lives in `packages/core`.

### fs — repo resolution (IO)
`resolveFeedbackRepo(deps): string | null`
Resolution order:
1. Explicit config override (`reslava-loom.feedback.repo`, `"owner/name"`).
2. Parse the workspace git `origin` remote (`git remote get-url origin`, normalize ssh/https → `owner/name`).
3. `null` if neither resolves → callers surface a friendly "set `feedback.repo`" message rather than guessing.

No hardcoded `reslava/loom` fallback — in the Loom repo the git remote already resolves to it, so autodetect covers the self-case without special-casing.

### app — the use-case
`getFeedbackContext(input, deps): FeedbackContext`
Orchestrates: calls `resolveFeedbackRepo` (fs), reads Loom version (package version) + `os.platform()`, derives the usage snapshot from the existing state summary (`getState` → the same shape as `loom://state?shape=summary`), and returns `{ repo, version, os, snapshot, url }` (url via core `buildFeedbackUrl`). One use-case, `(input, deps) => result`, no CLI/UI logic.

**Usage snapshot (non-PII, counts only):**
`{ loomVersion, platform, weaveCount, threadCount, donePlanCount, currentRelease }`
No paths, no titles, no doc content, no repo name in the body beyond what the user already sees. Derived entirely from the summary counts.

### mcp — agent/extension surface
Expose the context as a read-only **resource** `loom://feedback-context` (wraps `getFeedbackContext`). The extension is a thin MCP client — it reads the resource, gets the assembled `url`, and opens it. Read-only fits a resource better than a tool.

### cli — `loom feedback`
Thin: calls `app.getFeedbackContext`, then opens the browser (`open`) to `url`, or prints the URL if headless. Matters because CLI/agent users never touch the extension — and that's the primary dogfooding surface in chord-flow/nuget.

### vscode — command + status-bar
- Command `reslava-loom.sendFeedback` ("Loom: Send Feedback") in the palette.
- Status-bar item: `$(feedback) Feedback`, always visible, zero-nag, runs the command.
- Both read `loom://feedback-context` via the MCP client and `vscode.env.openExternal(url)`.
- Setting `reslava-loom.feedback.repo` (string) feeds the override branch of resolution.

## Issue-form template

`.github/ISSUE_TEMPLATE/feedback.yml` — a GitHub issue *form* (not a classic markdown template) so fields are structured and prefillable:

- **What were you doing?** (textarea)
- **What worked / what didn't?** (textarea)
- **Environment** (textarea) — prefilled from the snapshot via the URL; user can trim it.

Structured fields beat a blank issue: they lower writer's block and raise response quality. `loom install` scaffolds this file when missing.

## Reuse story (why this generalizes to chord-flow / nuget)

The only project-specific artifact is the `.github` template, and `loom install` writes it. Everything else — core URL builder, fs repo resolver, app use-case, CLI command, extension command — ships inside Loom and is repo-agnostic. Installing Loom in another repo gets the full feedback path for free, targeting that repo's own issues via git-remote autodetect. That is the "reuse some parts" the idea asks for, achieved by *not* hardcoding rather than by copying code.

## Scope guard

Inherits the idea's guard: opt-in only, no silent send, no PII, no background telemetry (that's the sibling `telemetry` thread). The win-moment prompt is out of v1.

## Open / deferred

- Win-moment prompt (after first `done` plan) — phase 2, only if v1 shows the channel is used.
- Snapshot could later mirror exactly what `telemetry` sends, so the two threads share one snapshot builder — worth watching, not building yet.
