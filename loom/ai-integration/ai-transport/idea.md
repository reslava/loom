---
type: idea
id: id_01KQYDFDD86NXZZW7N732JXVDQ
title: AI Provider Transport Abstraction (API Key vs Subscription vs Ollama)
status: done
created: "2026-04-23T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 2
tags: [ai, transport, api, subscription, ollama, deferred]
parent_id: null
requires_load: []
---

# AI Provider Transport Abstraction (API Key vs Subscription vs Ollama)

## Problem

Loom currently requires an Anthropic API key. Developers using Claude.ai subscriptions cannot use
Loom without also purchasing API credits. Developers who prefer privacy or cost control may want
to use a local model via Ollama.

## Current State

The `aiClient` interface is already an abstraction:

```typescript
interface AIClient {
    complete(messages: Message[]): Promise<string>;
}
```

Swapping the transport is a matter of providing a different adapter — the app layer does not care.

## Proposed Direction

Support multiple transports via configuration (`.loom/config.yml` or VS Code settings):

| Transport | Who it serves |
|---|---|
| Anthropic API key | Current default — developers with API access |
| OpenAI-compatible endpoint | OpenRouter, GitHub Copilot API, Azure OpenAI |
| Ollama (local) | Privacy-first users, no API cost |
| Claude.ai subscription | Requires browser extension or unofficial API — fragile, not recommended |

The VS Code settings UI would expose a `loom.aiProvider` dropdown and `loom.aiEndpoint` field.

## Why Deferred

The API key path is sufficient for MVP. Transport abstraction adds configuration surface area
before the core workflow is validated. Revisit after first external users report friction with
the API key requirement.
