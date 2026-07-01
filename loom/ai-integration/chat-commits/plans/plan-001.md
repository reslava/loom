---
type: plan
id: pl_01KWD7ZP5HDN3PRTPJ36VSD87V
title: Commit-last rule for both CLAUDE.md surfaces
status: done
created: 2026-06-30
updated: 2026-06-30
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: add-commit-last-rule-to-both
    order: 1
    status: done
    description: "Add a shared `rule:commit-last` section to both CLAUDE.md surfaces (reply-before-commit, commit as last action, no hash in reply), with matching `<!-- rule:commit-last -->` markers; verify via the claude-md-sync test and build-all."
    files_touched: [CLAUDE.md, packages/app/src/installWorkspace.ts]
    blocked_by: []
    satisfies: []
---
# Commit-last rule for both CLAUDE.md surfaces

## Goal

When a chat turn asks the agent to commit, the chat reply is part of the work, so it must land before the commit — otherwise appending the reply re-dirties the very doc the commit just captured, producing nonsense "doc changed again" churn whose working tree never settles. Add a shared `rule:commit-last` to both CLAUDE.md surfaces (root recursive contract + the LOOM_CLAUDE_MD install template) instructing the agent to reply first, commit last, and never reference the commit hash in the reply.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a shared `rule:commit-last` section to both CLAUDE.md surfaces (reply-before-commit, commit as last action, no hash in reply), with matching `<!-- rule:commit-last -->` markers; verify via the claude-md-sync test and build-all. | CLAUDE.md, packages/app/src/installWorkspace.ts | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
