---
type: reference
id: app-query-use-cases-reference
title: "Application Layer Query Use‑Cases Reference"
status: active
created: 2026-04-18
version: 1
tags: [app, query, cli, vscode, reference]
requires_load: []
---

# Application Layer Query Use‑Cases Reference

This document catalogs the planned query use‑cases for the `app` layer. These use‑cases provide read‑only access to Loom's state and are designed to be consumed identically by both the CLI and the VS Code extension.

All use‑cases follow the dependency injection pattern established in the `app` layer.

## 1. Thread Queries

### `listThreads`

**Purpose:** Return a summary of all threads in the active loom.

**Input:**
```typescript
interface ListThreadsInput {
    filter?: {
        status?: ThreadStatus[];
        phase?: ThreadPhase[];
    };
}