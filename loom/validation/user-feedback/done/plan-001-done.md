---
type: done
id: pl_01KWQ8V15DG5Q7GDWTV856F5Q6-done
title: Done — In-tool user feedback — v1
status: done
created: 2026-07-04
version: 8
tags: []
parent_id: pl_01KWQ8V15DG5Q7GDWTV856F5Q6
requires_load: []
---
# Done — In-tool user feedback — v1

## Step 1 — Add pure URL builder + FeedbackContext/snapshot types in core

Created `packages/core/src/feedback.ts` — pure, no IO. Exports:
- `FeedbackSnapshot` (counts-only, non-PII: loomVersion, platform, weaveCount, threadCount, donePlanCount, currentRelease)
- `FeedbackContext` ({ repo, snapshot, url }) — **simplified** from the design's `{ repo, version, os, snapshot, url }`: version/os already live inside `snapshot` (loomVersion/platform), so top-level duplicates were dropped to keep one source of truth.
- `formatFeedbackEnvironment(snapshot)` — renders the `environment` field body (one fact/line).
- `buildFeedbackUrl({ repo, snapshot })` — returns the prefilled issue-form URL via `URLSearchParams` (`template=feedback.yml` + encoded `environment`), or `null` when `repo` is null so callers can show a "set feedback.repo" message instead of a broken link.
- `FEEDBACK_TEMPLATE_FILE = 'feedback.yml'` constant, shared with the install scaffolder (step 6).

Exported all from `packages/core/src/index.ts` under a new "Feedback" section.

## Step 2 — Resolve target repo: config override → git origin remote → null

Created `packages/fs/src/feedbackRepo.ts` (IO layer — `child_process.execSync`):
- `parseGitHubRepo(remoteUrl)` — pure; parses https / `git@` / `ssh://` GitHub remotes to `owner/name`, strips `.git`, returns null otherwise.
- `resolveFeedbackRepo({ override?, cwd? })` — override → `git remote get-url origin` (parsed) → null. No hardcoded `reslava/loom` fallback (the Loom repo's own remote covers the self-case; a foreign repo with no remote yields null so the caller prompts for config).
Exported both + `ResolveFeedbackRepoOptions` from `packages/fs/src/index.ts`. IO lives in fs per the core-purity boundary.

## Step 3 — Use-case assembling repo + version + os + usage snapshot + url

Created `packages/app/src/getFeedbackContext.ts` — `(input, deps) => FeedbackContext` orchestration:
- Input: `{ loomVersion, repoOverride?, cwd? }`. Deps: `{ getState: () => Promise<LoomState>, resolveFeedbackRepo, platform }` (getState as a caller-bound thunk; `platform` injected for testability).
- Derives snapshot counts from an already-built `LoomState`: `weaveCount` = weaves.length, `threadCount` = Σ threads, `donePlanCount` = Σ done plans, `currentRelease` = `buildRoadmap(state).currentRelease` (reuses the existing derived-roadmap answer, no new logic).
- Resolves repo via injected `resolveFeedbackRepo`, then returns `{ repo, snapshot, url }` with url from core `buildFeedbackUrl`.
Exported from `packages/app/src/index.ts`. `loomVersion` is passed in (not read here) so each delivery layer reports its own lockstep version — the CLI already has `pkg.version` at hand.

## Step 4 — Read-only MCP resource wrapping getFeedbackContext

Created `packages/mcp/src/resources/feedbackContext.ts` — `handleFeedbackContextResource(root)` builds the fs-wired `getState` thunk, injects `resolveFeedbackRepo` + `os.platform`, and reports `loomVersion` from the mcp package's own `package.json` (lockstep = truthful, replacing the kind of hardcoded string that already drifted in `server.ts` at `1.1.0`). Returns the `FeedbackContext` JSON.
Wired into `packages/mcp/src/server.ts`: imported the handler, added `loom://feedback-context` to `CONCRETE_RESOURCES`, and added the `uri === 'loom://feedback-context'` branch to the ReadResource handler. Read-only resource (not a tool), consumed by the extension.

## Step 5 — CLI command: get context, open browser to url (or print)

Created `packages/cli/src/commands/feedback.ts` and registered `loom feedback` in `packages/cli/src/index.ts`.
- Calls `getFeedbackContext` directly (cli → app is allowed), wired with the fs `getState`/`resolveFeedbackRepo` deps + `os.platform`, `loomVersion` from the cli `pkg.version`.
- Flags: `--repo owner/name` (override) and `--print` (emit URL only).
- Opens the browser via a **dependency-free** `openUrl` helper (`start`/`open`/`xdg-open` by platform) rather than adding an `open` dependency — the URL is always printed first, so open is best-effort.
- When no repo resolves (`ctx.url === null`), prints a clear "pass --repo or add an origin remote" message and exits 1.
- Prints the repo + snapshot summary so the CLI user sees exactly what the prefill carries before it opens.

## Step 6 — loom install writes .github/ISSUE_TEMPLATE/feedback.yml if absent

`packages/app/src/installWorkspace.ts`: added a `FEEDBACK_ISSUE_FORM` GitHub issue-form constant (fields `what_doing`, `what_worked`, `environment`) and a Step 8 that writes `.github/ISSUE_TEMPLATE/feedback.yml` **only if absent** (never overwritten, even on `--force`, so user customizations survive — same policy as `CLAUDE-LOCAL.md`). Filename comes from the core `FEEDBACK_TEMPLATE_FILE` constant (imported), keeping it in sync with `buildFeedbackUrl`'s `template=` param; the `environment` field `id` is commented as needing to match core's prefill key. Added `feedbackTemplateWritten` to `InstallWorkspaceResult` and surfaced it in `packages/cli/src/commands/install.ts` output. Omitted `labels:` from the form to avoid render failures in repos lacking a `feedback` label.

## Step 7 — Send Feedback command, status-bar item, feedback.repo setting

Created `packages/vscode/src/commands/sendFeedback.ts` — reads `loom://feedback-context` via `getMCP().readResource`, opens `ctx.url` with `vscode.env.openExternal`. When `url` is null, shows a warning with an "Open Settings" action pointing at `reslava-loom.feedback.repo`. The `reslava-loom.feedback.repo` setting is passed to the resource as `?repo=<encoded>` so URL building stays server-side (no core/app import in the extension — dependency rule respected).
- `packages/vscode/src/extension.ts`: registered `loom.sendFeedback`; added an always-visible status-bar item `$(feedback) Feedback` (priority 89, next to MCP) bound to the command.
- `packages/vscode/package.json`: added the `loom.sendFeedback` command contribution (title "Send Feedback", `$(feedback)` icon) and the `reslava-loom.feedback.repo` string setting (blank = auto-detect from git origin).
- Amended the resource/`server.ts` from step 4 to accept the optional `?repo=` override (`new URL(uri).searchParams`), and matched `startsWith('loom://feedback-context?')` in the router.
- Fixed the dangling `blockedBy` on this step (was `mcp-loomfeedback-context-resource` from a create-time slug mismatch → `mcp-loom-feedback-context-resource`) via `loom_update_step`, so the plan's dependency graph is honest.

## Step 8 — Cover URL builder, repo resolution, snapshot shape; wire into test-all

Created `tests/user-feedback.test.ts` (standalone ts-node, imports built dist, custom `assert`) and wired a `run_test` line into `scripts/test-all.sh`. Coverage:
- `buildFeedbackUrl` — null repo → null; resolved repo → correct base + `template=feedback.yml` + encoded `environment`; snapshot counts encoded; `formatFeedbackEnvironment` human-readable.
- `parseGitHubRepo` — https/`.git`/scp-ssh/`ssh://` → `owner/name`; non-GitHub → null.
- `resolveFeedbackRepo` — override wins + trimmed; no override + non-git dir → null.
- `getFeedbackContext` — snapshot counts from an injected LoomState, `currentRelease` via buildRoadmap, and a **non-PII key allowlist assertion** (snapshot keys are exactly the six count/version fields); unresolved repo → null repo + null url.

Verified: `./scripts/build-all.sh` clean; full `./scripts/test-all.sh` = all pass incl. this test + the core/vscode import guards + install-workspace. Drove the real CLI: `loom feedback --print` resolved `reslava/loom` from the git remote with a live snapshot (11 weaves / 109 threads / 99 done plans / v1.15.0) and a correctly-encoded URL; `--repo reslava/chord-flow` confirmed the override/reuse branch.
