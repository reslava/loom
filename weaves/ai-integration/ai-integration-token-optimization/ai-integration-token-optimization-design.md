---
type: design
id: ai-integration-token-optimization-design
title: "Token Optimization & Cost Management Strategy"
status: active
created: 2026-04-14
version: 1
tags: [ai, tokens, cost, optimization, context]
parent_id: token-awareness-idea
child_ids: []
requires_load: [ai-integration-design]
target_release: "0.3.0"
actual_release: null
---

# Token Optimization & Cost Management Strategy

## Goal

Define a comprehensive strategy to minimize token consumption while preserving the rich, stateful context that REslava Loom provides. This ensures the system remains economically sustainable for users and delivers a compelling cost‑benefit ratio compared to ephemeral chat interfaces.

## Context

REslava Loom front‑loads token usage by injecting structured documents into the AI prompt. Without careful optimization, this could lead to higher per‑request costs than a simple chat window. Users will abandon the system if they perceive it as wasteful.

This document defines the mechanisms that make Loom **net token negative** over the lifetime of a thread:
- Intelligent context assembly
- Automatic and manual summarization
- Cheap‑model fallbacks for utility tasks
- User visibility and control

# CHAT

## Rafa:
I'm worried about token costs. If Loom uses too many tokens, users will quit. We need a plan to optimize this.

## AI:
This is the economic reality of AI‑powered tools. Let's design a layered optimization strategy that makes Loom not just powerful, but efficient.

### 1. Token Estimation & Measurement

Before optimizing, we must measure. The system will use `gpt-tokenizer` (cl100k_base, compatible with DeepSeek) to estimate token counts **before** sending requests.

| Metric | Source | Purpose |
|--------|--------|---------|
| `prompt_tokens` | Local estimation | Pre‑flight budget check, threshold warnings. |
| `completion_tokens` | API response `usage` | Actual consumption tracking. |
| `total_tokens` | API response `usage` | Session and per‑thread accumulation. |

**VS Code Status Bar:**
```
🧵 Loom: payment-system | 📊 2.4k / 8k tokens
```

Clicking the status bar item opens a detailed breakdown.

---

### 2. Intelligent Context Assembly

The AI client builds prompts using a **cost‑aware priority queue**.

| Priority | Source | Condition |
|----------|--------|-----------|
| 1 | Thread derived state | Always included (minimal tokens). |
| 2 | Current document (`design.md` or `plan.md`) | Always included, but subject to truncation if over budget. |
| 3 | `-ctx.md` (summary) | Used **instead of** full `design.md` if: (a) summary exists, (b) summary is fresh, (c) `design.md` exceeds threshold. |
| 4 | `requires_load` documents | Included **only if** budget permits after priorities 1–3. User can override with `--full-context` flag. |
| 5 | Allowed events list (Action Mode only) | Minimal; always included. |

**Truncation Strategy:**
If the assembled prompt exceeds `reslava-loom.ai.maxContextTokens`, the system:
1. Truncates `design.md` to the most recent `N` conversation blocks (keeping the first block for continuity).
2. Drops `requires_load` documents in reverse priority order.
3. Warns the user: "Context truncated to fit token budget. Run `loom ai respond --full-context` to force full context."

---

### 3. Context Summarization (`-ctx.md`)

This is the primary cost‑saving mechanism for long‑lived threads.

#### 3.1 Trigger Conditions

| Trigger | Action |
|---------|--------|
| `design.md` character count exceeds `reslava-loom.ai.designSummaryThreshold` (default: 20,000). | Auto‑generate summary on next file save (debounced). |
| Manual command: `loom summarise-context <thread-id>` | Force regeneration. |
| `REFINE_DESIGN` event | Invalidate existing summary (stale flag). |

#### 3.2 Summary Content

The generated `-ctx.md` contains a **high‑signal extract**:

```markdown
---
type: ctx
id: payment-system-ctx
source_version: 3
generated: 2026-04-14T10:00:00Z
---

# Design Context Summary

## Problem Statement
(Extracted from `## Goal` and `## Context`)

## Key Decisions Made
- 2026-04-12: Chose PostgreSQL over SQLite for concurrency.
- 2026-04-13: Adopted JWT with refresh tokens for auth.

## Open Questions
- How to handle token revocation?

## Active Plans
- payment-system-plan-001 (status: implementing)
```

#### 3.3 Cheap Model for Summarization

Generating the summary itself consumes tokens. To minimize this cost, the system can use a **cheaper model** or **local model**:

| Model | Use Case | Cost |
|-------|----------|------|
| `deepseek-chat` | Default summarization. | Low |
| `deepseek-chat` with `max_tokens=500` | Enforce concise output. | Very low |
| Local Ollama (DeepSeek 7B) | Offline, zero‑cost summarization. | Free |

**Configuration:**
```json
{
  "reslava-loom.ai.summarizationModel": "deepseek-chat",
  "reslava-loom.ai.summarizationMaxTokens": 500
}
```

---

### 4. Action Mode vs. Chat Mode Token Profiles

| Mode | Typical Prompt Size | Optimization |
|------|---------------------|--------------|
| **Chat Mode** | Full context (up to budget). | Subject to truncation and summary fallback. |
| **Action Mode** | Minimal: thread state + allowed events + recent conversation (last 3 turns). | Excludes `requires_load` by default. Drastically smaller. |

Action Mode is designed for structured proposals, not open‑ended conversation. This separation inherently saves tokens.

---

### 5. User Visibility & Control

Users must understand and control token usage.

| Feature | Description |
|---------|-------------|
| `loom status --tokens` | Show token usage per thread (lifetime) and per session. |
| `reslava-loom.ai.maxContextTokens` setting | User‑defined budget cap. |
| `loom ai respond --minimal` | Skip `requires_load` and use summary even if below threshold. |
| `loom ai respond --full-context` | Force full `design.md` and all `requires_load` docs (overrides budget warning). |
| Budget Alert | VS Code notification when session tokens exceed 80% of user‑defined limit. |

---

### 6. Token Cost Comparison: Loom vs. Traditional Chat

| Scenario | Traditional Chat | REslava Loom (Optimized) |
|----------|------------------|--------------------------|
| First session, new thread | ~500 tokens | ~1,200 tokens (reads `design.md`). |
| Second session, next day | ~800 tokens (re‑explaining context). | ~600 tokens (reads `-ctx.md` summary). |
| Decision change (refine design) | ~1,500 tokens (explaining ripple effects). | ~400 tokens (Action Mode proposal + approval). |
| **Total over 10 sessions** | ~12,000 tokens | ~6,000 tokens |

Loom is **net token negative** for any non‑trivial thread.

---

### 7. Implementation Plan Integration

These optimizations will be implemented incrementally:

| Phase | Feature |
|-------|---------|
| Phase 1 (Core CLI) | Token estimation with `gpt-tokenizer`. Basic context assembly with truncation. |
| Phase 2 (AI Client) | `-ctx.md` generation with cheap model. Summary fallback in Chat Mode. |
| Phase 3 (VS Code) | Status bar token display, budget alerts, `--minimal` / `--full-context` flags. |

---

### 8. Open Questions

- Should we cache token counts per document to avoid re‑tokenizing on every request? **Yes.** Invalidate cache when file changes.
- Should we support user‑provided summarization prompts? **Post‑MVP.** Power users may want to customize the summary format.

## Decision

Adopt the layered token optimization strategy as described. Implement in phases alongside the core AI client. Make token visibility a first‑class feature to build user trust.

## Next Steps

- Add `gpt-tokenizer` as a dependency.
- Implement `TokenCounter` service in `packages/core`.
- Update `AI_INTEGRATION.md` to reflect cost‑aware context assembly.