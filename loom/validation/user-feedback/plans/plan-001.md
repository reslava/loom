---
type: plan
id: pl_01KWQ8V15DG5Q7GDWTV856F5Q6
title: In-tool user feedback — v1
status: done
created: 2026-07-04
updated: 2026-07-04
version: 1
design_version: 1
tags: []
parent_id: de_01KWQ8SBCKE1TMAK1FQP8J7WGR
requires_load: []
target_version: 0.1.0
steps:
  - id: core-buildfeedbackurl
    order: 1
    status: done
    description: Add pure URL builder + FeedbackContext/snapshot types in core
    files_touched: [packages/core/src/feedback.ts, packages/core/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: fs-resolvefeedbackrepo
    order: 2
    status: done
    description: "Resolve target repo: config override → git origin remote → null"
    files_touched: [packages/fs/src/feedbackRepo.ts, packages/fs/src/index.ts]
    blocked_by: [core-buildfeedbackurl]
    satisfies: []
  - id: app-getfeedbackcontext
    order: 3
    status: done
    description: Use-case assembling repo + version + os + usage snapshot + url
    files_touched: [packages/app/src/getFeedbackContext.ts, packages/app/src/index.ts]
    blocked_by: [fs-resolvefeedbackrepo]
    satisfies: []
  - id: mcp-loom-feedback-context-resource
    order: 4
    status: done
    description: Read-only MCP resource wrapping getFeedbackContext
    files_touched: [packages/mcp/src/resources/feedbackContext.ts, packages/mcp/src/server.ts]
    blocked_by: [app-getfeedbackcontext]
    satisfies: []
  - id: cli-loom-feedback
    order: 5
    status: done
    description: "CLI command: get context, open browser to url (or print)"
    files_touched: [packages/cli/src/commands/feedback.ts, packages/cli/src/index.ts]
    blocked_by: [app-getfeedbackcontext]
    satisfies: []
  - id: install-scaffold-issue-form-template
    order: 6
    status: done
    description: loom install writes .github/ISSUE_TEMPLATE/feedback.yml if absent
    files_touched: [packages/app/src/installWorkspace.ts]
    blocked_by: [core-buildfeedbackurl]
    satisfies: []
  - id: vscode-command-status-bar-setting
    order: 7
    status: done
    description: Send Feedback command, status-bar item, feedback.repo setting
    files_touched: [packages/vscode/src/commands/sendFeedback.ts, packages/vscode/src/extension.ts, packages/vscode/package.json]
    blocked_by: [mcp-loom-feedback-context-resource]
    satisfies: []
  - id: tests
    order: 8
    status: done
    description: Cover URL builder, repo resolution, snapshot shape; wire into test-all
    files_touched: [tests/user-feedback.test.ts, scripts/test-all.sh]
    blocked_by: [app-getfeedbackcontext]
    satisfies: []
---
# In-tool user feedback — v1

## Goal

Ship a repo-agnostic, opt-in feedback path from inside Loom. Build bottom-up along the dependency rule (core → fs → app → mcp/cli/vscode): a pure URL builder, a git-remote + config repo resolver, an app use-case that assembles version + OS + a non-PII usage snapshot, then three thin entry points (MCP resource, `loom feedback` CLI, VS Code command + status-bar item) plus a scaffolded GitHub issue-form template so the same mechanism installs into any repo. No silent send, no PII, no backend. Win-moment prompt is deferred to phase 2.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add pure URL builder + FeedbackContext/snapshot types in core | packages/core/src/feedback.ts, packages/core/src/index.ts | — | — |
| ✅ | 2 | Resolve target repo: config override → git origin remote → null | packages/fs/src/feedbackRepo.ts, packages/fs/src/index.ts | core-buildfeedbackurl | — |
| ✅ | 3 | Use-case assembling repo + version + os + usage snapshot + url | packages/app/src/getFeedbackContext.ts, packages/app/src/index.ts | fs-resolvefeedbackrepo | — |
| ✅ | 4 | Read-only MCP resource wrapping getFeedbackContext | packages/mcp/src/resources/feedbackContext.ts, packages/mcp/src/server.ts | app-getfeedbackcontext | — |
| ✅ | 5 | CLI command: get context, open browser to url (or print) | packages/cli/src/commands/feedback.ts, packages/cli/src/index.ts | app-getfeedbackcontext | — |
| ✅ | 6 | loom install writes .github/ISSUE_TEMPLATE/feedback.yml if absent | packages/app/src/installWorkspace.ts | core-buildfeedbackurl | — |
| ✅ | 7 | Send Feedback command, status-bar item, feedback.repo setting | packages/vscode/src/commands/sendFeedback.ts, packages/vscode/src/extension.ts, packages/vscode/package.json | mcp-loom-feedback-context-resource | — |
| ✅ | 8 | Cover URL builder, repo resolution, snapshot shape; wire into test-all | tests/user-feedback.test.ts, scripts/test-all.sh | app-getfeedbackcontext | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:core-buildfeedbackurl -->
### Step 1 — core: buildFeedbackUrl

Pure function buildFeedbackUrl({ repo, version, os, snapshot }): string — assemble the GitHub issue-form URL (.../issues/new?template=feedback.yml&title=...&environment=<encoded>), URL-encoding the prefilled `environment` field. Define FeedbackContext and FeedbackSnapshot types here. No IO, no side effects.

<!-- step:fs-resolvefeedbackrepo -->
### Step 2 — fs: resolveFeedbackRepo

resolveFeedbackRepo(deps): string | null. Order: (1) explicit config override 'owner/name'; (2) parse `git remote get-url origin`, normalizing ssh (git@github.com:owner/name.git) and https forms to 'owner/name'; (3) null. No hardcoded reslava/loom fallback — the Loom repo's own remote covers the self-case.

<!-- step:app-getfeedbackcontext -->
### Step 3 — app: getFeedbackContext

getFeedbackContext(input, deps): FeedbackContext. Calls resolveFeedbackRepo (fs), reads Loom package version + os.platform(), derives the snapshot { loomVersion, platform, weaveCount, threadCount, donePlanCount, currentRelease } from the state summary (getState), and returns { repo, version, os, snapshot, url } with url from core buildFeedbackUrl. Counts only — no paths, titles, or doc content.

<!-- step:mcp-loom-feedback-context-resource -->
### Step 4 — mcp: loom://feedback-context resource

Expose loom://feedback-context returning the assembled FeedbackContext (incl. url) as JSON. Read-only → resource, not a tool. The extension consumes this.

<!-- step:cli-loom-feedback -->
### Step 5 — cli: loom feedback

`loom feedback` → app.getFeedbackContext → open the browser to url (open pkg), or print the url when headless / --print. Thin delivery layer only.

<!-- step:install-scaffold-issue-form-template -->
### Step 6 — install: scaffold issue-form template

Add the GitHub issue-form template (fields: What were you doing / What worked-what didn't / Environment textarea prefilled via URL) and have loom install scaffold it when missing. Makes reuse in another repo a one-command install.

<!-- step:vscode-command-status-bar-setting -->
### Step 7 — vscode: command + status-bar + setting

Register command reslava-loom.sendFeedback ('Loom: Send Feedback'), a status-bar item ($(feedback) Feedback, zero-nag), and the reslava-loom.feedback.repo setting. Command reads loom://feedback-context via the MCP client and vscode.env.openExternal(url). No direct app import.

<!-- step:tests -->
### Step 8 — tests

Standalone ts-node test importing built dist: buildFeedbackUrl encoding, resolveFeedbackRepo ssh/https/override/null cases, getFeedbackContext snapshot shape (counts only, no PII). Add a run_test line to scripts/test-all.sh.
