---
type: reference
id: rf_01KR3K003KHHTV0DKV71GX6FAG
title: Plan Steps Table and BlockedBy Format
status: active
created: "2026-05-08T00:00:00.000Z"
updated: 2026-05-08
version: 2
tags: []
parent_id: null
requires_load: []
slug: plan-steps-table-and-blockedby-format
description: Canonical format for plan Steps tables and BlockedBy column entries. Load this when creating or editing plans.
---
# Plan Steps Table and BlockedBy Format

Canonical reference for the Steps table format used in all Loom plan documents.
Load this via `requires_load` when creating or editing plans.

---

## Steps table structure

```markdown
# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Description of step | file.ts | — |
| 🔳 | 2 | Description of step | — | 1 |
| 🔳 | 3 | Description of step | — | 1, 2 |
```

**Column rules:**

| Column | Required | Notes |
|---|---|---|
| Done | Yes | `✅` done · `🔳` pending · `🔄` in progress · `❌` cancelled |
| # | Yes | 1-based integer, sequential |
| Step | Yes | One-line description — full detail belongs in the `## Step N` section below |
| Files touched | Yes | Comma-separated paths, or `—` if unknown at planning time |
| Blocked by | Yes | See BlockedBy format below, or `—` if none |

---

## BlockedBy canonical format

The Blocked by cell is a comma-separated list of blocker tokens. Each token is one of:

| Token | Meaning | Example |
|---|---|---|
| `N` | Step N of **this** plan | `3` |
| `N, M` | Steps N and M of this plan | `3, 4` |
| `{plan-id}` | Entire other plan (all steps) | `vscode-mcp-refactor-plan-001` |
| `{plan-id} N` | Step N of another plan | `vscode-mcp-refactor-plan-001 3` |
| `{plan-id} N, {plan-id} M` | Steps N and M of another plan | `vscode-mcp-refactor-plan-001 3, vscode-mcp-refactor-plan-001 4` |

**Rules:**
- Use bare integers (`3`) for same-plan dependencies — not `Step 3` or `Steps 3`.
- For multiple same-plan steps, use a comma list: `3, 4` — not `3-4` (range syntax is not supported).
- For cross-plan step references, always qualify with the plan ID: `{plan-id} N`. A bare integer always refers to this plan.
- Use `—` (em dash) when a step has no blockers.

---

## Step detail sections

After the Steps table, each step may have a detail section:

```markdown
## Step N — {same description as table row}

Detailed implementation spec, design notes, or constraints for this step.
Leave as `<!-- Detailed spec. -->` placeholder at planning time.
```

**Cleanup:** once a plan is fully implemented, stub sections containing only
`<!-- Detailed spec. -->` can be removed by running:

```bash
npx ts-node --project tests/tsconfig.json scripts/cleanup-plan-stubs.ts --dry-run
npx ts-node --project tests/tsconfig.json scripts/cleanup-plan-stubs.ts
```

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |