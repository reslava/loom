---
type: design
id: ai-integration-strategy-design
title: "AI Integration & Handshake Protocol"
status: draft
created: 2026-04-11
updated: 2026-04-12
version: 2.0.0
tags: [ai, integration, protocol]
parent_id: workflow-design-v2
child_ids: [docs/AI_INTEGRATION.md]
requires_load: []
---

# AI Integration & Handshake Protocol

This document defines how the workflow system interacts with Large Language Models (LLMs). It specifies the **native AI client**, **context injection strategy**, **dual interaction modes** (Chat vs. Action), and the **human approval flow**.

## Goal

Provide a seamless, AI-agnostic integration that:
- Works with any OpenAI-compatible LLM provider (DeepSeek, OpenAI, local models).
- Maintains **zero dependency** on external chat extensions (Continue, Cursor, etc.).
- Keeps conversation history **inside workflow documents** (`design.md`).
- Enables structured state changes via an **approval handshake**.

## Document Writing Convention

All workflow documents follow a consistent voice:

- **First person** in conversation blocks (`## User:` and `## AI:`). These are direct dialogue between the human and the AI.
- **Third person** in all other sections (Goal, Context, Architecture, etc.). This maintains objectivity and readability.

This convention ensures that the conversation log feels natural while the surrounding documentation remains professional.

## Architecture Overview

The VS Code extension includes a **native AI client** that directly calls LLM provider APIs. No external chat tool is required.

```
┌─────────────────────────────────────────────────────────────┐
│                      VS Code Extension                       │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │   UI Commands   │  │         Native AI Client         │  │
│  │ wf ai respond   │─▶│  - Prompt assembly               │  │
│  │ wf ai propose   │  │  - API call (DeepSeek/OpenAI)    │  │
│  │ wf summarise    │  │  - Response parsing              │  │
│  └─────────────────┘  │  - Token accumulation            │  │
│                       └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   LLM Provider API  │
                    │ (DeepSeek, OpenAI,  │
                    │  local Ollama, etc.)│
                    └─────────────────────┘
```

## Interaction Modes

### Chat Mode (Default)

**Purpose:** Brainstorming, clarifying requirements, exploring options.

**Invocation:** `wf ai respond` command (or toolbar button).

**Behavior:**
1. Extension reads current document (usually `design.md`).
2. Assembles context: feature state, full conversation log, `requires_load` documents.
3. Sends prompt to configured LLM.
4. Appends AI response to document as a new `## AI:` block.
5. No state change occurs.

### Action Mode (Explicit)

**Purpose:** Committing a decision to workflow state.

**Invocation:** `wf ai propose` command.

**Behavior:**
1. Extension assembles context plus allowed events list from `workflow.yml`.
2. LLM responds with JSON proposal.
3. Extension displays diff preview of proposed frontmatter changes.
4. User approves → event fired → effects executed.
5. User rejects → nothing changes.

## AI Handshake Protocol (Action Mode)

The LLM is instructed to respond with a strict JSON object:

```json
{
  "proposed_action": "REFINE_DESIGN",
  "reasoning": "Explanation shown in approval dialog.",
  "target_document_id": "design-payment",
  "requires_approval": true,
  "next_step_description": "Optional hint."
}
```

**Special actions:**
- `REQUEST_CLARIFICATION`: LLM asks a question instead of proposing an event.
- `NO_ACTION`: User query doesn't require a state change.

## Context Injection

The native client builds a system prompt containing:

| Priority | Source |
|----------|--------|
| 1 | Feature derived state (status, phase) |
| 2 | Full `design.md` (or `design-ctx.md` if large) |
| 3 | Active plan steps |
| 4 | `requires_load` documents |
| 5 | Allowed events (Action Mode only) |

## Token Tracking & Context Management

The native client **accumulates token usage** per session (in-memory). This enables:
- Session budget display in status bar.
- Auto-trigger context summarization when `design.md` exceeds threshold.
- (Future) Per-feature cost tracking.

Token counting uses local estimation (e.g., `gpt-tokenizer`) for prompt size and exact API `usage` fields for actual consumption.

## Coexistence with External Chat Tools

Users may still use external chat tools (Continue, Cursor, web ChatGPT). The system:

- **Does not block or discourage this.**
- Provides `wf import-chat` to paste external responses into `design.md` with proper formatting.
- Clearly communicates that token tracking and context features **only apply to native AI usage**.

This respects user freedom while offering a superior integrated experience.

## Provider Configuration

Users configure their AI provider in VS Code settings:

```json
{
  "workflow.ai.provider": "deepseek",
  "workflow.ai.apiKey": "sk-...",
  "workflow.ai.model": "deepseek-chat",
  "workflow.ai.baseUrl": "https://api.deepseek.com/v1"
}
```

Supported providers: DeepSeek, OpenAI, Anthropic (via OpenAI-compatible proxy), Ollama (local).

## Commands Summary

| Command | Mode | Description |
|---------|------|-------------|
| `wf ai respond` | Chat | Get AI response and append to document. |
| `wf ai propose` | Action | Request JSON event proposal; show diff approval. |
| `wf summarise-context` | Utility | Force generation of `design-ctx.md`. |
| `wf import-chat` | Utility | Import external chat content into document. |

## Next Steps

- Implement native AI client in extension.
- Design diff approval webview.
- Add token accumulator and status bar display.