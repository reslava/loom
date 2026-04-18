---
type: design
id: ai-integration-design
title: "AI Integration & Handshake Protocol — REslava Loom"
status: active
created: 2026-04-11
updated: 2026-04-14
version: 3
tags: [ai, integration, protocol, loom]
parent_id: core-engine-design
child_ids: [ai-integration-chat-titles-design, ai-integration-token-optimization-design]
requires_load: []
target_release: "0.3.0"
actual_release: null
---

# AI Integration & Handshake Protocol — REslava Loom

## Goal

Define how REslava Loom interacts with Large Language Models (LLMs). It specifies the **native AI client**, **context injection strategy**, **dual interaction modes** (Chat vs. Action), and the **human approval flow** that ensures safe, predictable AI collaboration.

## Context

The workflow system treats AI as a collaborator, not an autonomous agent. The AI:

- Reads **persistent Markdown documents** instead of relying on chat memory.
- Participates in a **free-form conversation log** (`## User:` / `## AI:`) for exploration and reasoning.
- Proposes **structured actions** only when explicitly requested or when a workflow state change is appropriate.
- **Waits for human approval** before any state change occurs.

This document defines the native AI client built into the VS Code extension, ensuring **zero dependency** on external chat tools like Continue or Cursor.

# CHAT

## Rafa:
We need a native AI client in the extension. It should support two modes: Chat Mode for free-form conversation, and Action Mode for structured event proposals with approval. Also, we should document how context is assembled and how token usage is managed.

## AI:
Agreed. The native AI client is the cornerstone of the integrated experience. Let's define the architecture and interaction flows.

### 1. Architecture Overview

The VS Code extension includes a **native AI client** that directly calls LLM provider APIs. No external chat tool is required.

```
┌─────────────────────────────────────────────────────────────┐
│                      VS Code Extension                       │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │   UI Commands   │  │         Native AI Client         │  │
│  │ loom ai respond │─▶│  - Prompt assembly               │  │
│  │ loom ai propose │  │  - API call (DeepSeek/OpenAI)    │  │
│  │ loom summarise  │  │  - Response parsing              │  │
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

### 2. Interaction Modes

#### 2.1 Chat Mode (Default)

**Purpose:** Brainstorming, clarifying requirements, exploring options.

**Invocation:** `loom ai respond` command (or toolbar button).

**Behavior:**
- Extension reads current document (usually `design.md`).
- Assembles context: thread state, full conversation log, `requires_load` documents.
- Sends prompt to configured LLM.
- Appends AI response to document as a new `## AI:` block.
- No state change occurs.

#### 2.2 Action Mode (Explicit)

**Purpose:** Committing a decision to workflow state.

**Invocation:** `loom ai propose` command.

**Behavior:**
- Extension assembles context plus allowed events list from `.loom/workflow.yml`.
- LLM responds with JSON proposal.
- Extension displays diff preview of proposed frontmatter changes.
- User approves → event fired → effects executed.
- User rejects → nothing changes.

### 3. AI Handshake Protocol (Action Mode)

The LLM is instructed to respond with a strict JSON object:

```json
{
  "proposed_action": "REFINE_DESIGN",
  "reasoning": "Explanation shown in approval dialog.",
  "target_document_id": "payment-system-design",
  "requires_approval": true,
  "next_step_description": "Optional hint."
}
```

**Special actions:**
- `REQUEST_CLARIFICATION`: LLM asks a question instead of proposing an event.
- `NO_ACTION`: User query doesn't require a state change.

### 4. Context Injection

The native client builds a system prompt containing:

| Priority | Source |
|----------|--------|
| 1 | Thread derived state (status, phase) |
| 2 | Full `design.md` (or `-ctx.md` if large) |
| 3 | Active plan steps |
| 4 | `requires_load` documents |
| 5 | Allowed events (Action Mode only) |

### 5. Token Tracking & Context Management

The native client **accumulates token usage** per session (in-memory). This enables:
- Session budget display in status bar.
- Auto-trigger context summarization when `design.md` exceeds threshold.
- (Future) Per-thread cost tracking.

Token counting uses local estimation (e.g., `gpt-tokenizer`) for prompt size and exact API `usage` fields for actual consumption.

### 6. Coexistence with External Chat Tools

Users may still use external chat tools (Continue, Cursor, web ChatGPT). The system:

- **Does not block or discourage this.**
- Provides `loom import-chat` to paste external responses into `design.md` with proper formatting.
- Clearly communicates that token tracking and context features **only apply to native AI usage**.

### 7. Provider Configuration

Users configure their AI provider in VS Code settings:

```json
{
  "reslava-loom.ai.provider": "deepseek",
  "reslava-loom.ai.apiKey": "sk-...",
  "reslava-loom.ai.model": "deepseek-chat",
  "reslava-loom.ai.baseUrl": "https://api.deepseek.com/v1"
}
```

Supported providers: DeepSeek, OpenAI, Anthropic (via OpenAI-compatible proxy), Ollama (local).

### 8. Commands Summary

| Command | Mode | Description |
|---------|------|-------------|
| `loom ai respond` | Chat | Get AI response and append to document. |
| `loom ai propose` | Action | Request JSON event proposal; show diff approval. |
| `loom summarise-context` | Utility | Force generation of `-ctx.md`. |
| `loom import-chat` | Utility | Import external chat content into document. |

## Decision

Adopt the native AI client architecture with dual interaction modes. Integrate token tracking and context summarization. Defer multi-provider support until core engine is stable, but design for extensibility.

## Next Steps

- Implement `NativeAIClient` class in extension.
- Add `loom ai respond` and `loom ai propose` commands.
- Integrate token accumulator and status bar display.
