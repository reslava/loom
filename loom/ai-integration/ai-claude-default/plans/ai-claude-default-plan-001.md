---
type: plan
id: pl_01KRTM2Z2BQWKE3YQFXCH1SFSR
title: Add Claude as default AI provider
status: done
created: "2026-05-17T00:00:00.000Z"
updated: 2026-05-17
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
---

| | |
|---|---|
| **Created** | 2026-05-17 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

# Goal

Make Claude/Anthropic the default AI provider in the VS Code extension instead of DeepSeek. Requires no new dependencies (raw fetch pattern). VS Code settings allow provider override to openai or deepseek.
---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create packages/vscode/src/ai/anthropicClient.ts — implement AnthropicClient class using raw fetch against https://api.anthropic.com/v1/messages endpoint, extract system message to top-level field, return first content text | — | — |
| ✅ | 2 | Update packages/vscode/src/ai/makeAIClient.ts — add anthropic to PROVIDER_DEFAULTS with claude-haiku-4-5-20251001 as default, change default provider from deepseek to anthropic, add conditional to return AnthropicClient for anthropic provider | — | — |
| ✅ | 3 | Update packages/vscode/package.json — add anthropic to reslava-loom.ai.provider enum, set default to anthropic, update description to mention Claude | — | — |
| ✅ | 4 | Build and verify — run npm run package in packages/vscode, test with ANTHROPIC_API_KEY env var set, confirm Chat Reply calls Claude not DeepSeek | — | — |
---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
