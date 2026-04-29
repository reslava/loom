---
type: design
id: vscode-mcp-refactor-design
title: "VS Code Extension MCP Refactor Design"
status: draft
created: 2026-04-27
version: 1
tags: [vscode, mcp, architecture, design]
parent_id: vscode-mcp-refactor-idea
child_ids: [vscode-mcp-refactor-plan-001]
requires_load: [mcp-reference, loom-architecture]
role: primary
target_release: "0.5.0"
actual_release: null
---

# VS Code Extension MCP Refactor Design

## Architecture Overview

```
┌─────────────────────────────────┐
│   VS Code Extension UI          │
│  (tree, buttons, panels)        │
└──────────┬──────────────────────┘
           │
     ┌─────▼─────┐
     │ MCP Client│  ← Simple wrapper
     │ (stdio)   │
     └─────┬─────┘
           │
     ┌─────▼──────────────────┐
     │   MCP Server (loom)    │  ← Single interface
     │  (resources, tools)    │
     └─────┬──────────────────┘
           │
     ┌─────▼──────────┐
     │  app + fs      │  ← State, repos, reducers
     │  (core logic)  │
     └────────────────┘
```

## Key Changes

1. **Remove app imports:** Extension no longer imports from `packages/app/`
2. **Add MCP client wrapper:** New `mcp-client.ts` for simple fetch/stdio communication
3. **Tree view reads MCP state:** Uses `loom://state` resource instead of `getState()`
4. **Commands use MCP:** Buttons and actions call `loom_*` tools or prompts instead of app use-cases
5. **No domain logic in extension:** All validation, state consistency, reducer logic stays in app/MCP

## Concrete file structure (after refactor)

```
packages/vscode/src/
├── extension.ts           ← Activation, commands, watchers (no change)
├── mcp-client.ts          ← NEW: stdio MCP client wrapper
├── tree/
│   └── treeProvider.ts    ← Updated: use getMCP().readResource('loom://state')
├── commands/
│   ├── weaveIdea.ts       ← Updated: call getMCP().callPrompt('weave-idea', ...)
│   ├── weaveDesign.ts     ← Updated: call getMCP().callPrompt('weave-design', ...)
│   ├── weavePlan.ts       ← Updated: call getMCP().callPrompt('weave-plan', ...)
│   ├── doNextStep.ts      ← NEW: call getMCP().callPrompt('do-next-step', ...)
│   ├── continueThread.ts  ← NEW: call getMCP().callPrompt('continue-thread', ...)
│   └── ...
└── test/                  ← Existing tests (update to mock MCP)
```

## MCP Client Interface (simple)

```typescript
interface MCPClient {
  readResource(uri: string): Promise<string>;
  callTool(name: string, args: Record<string, any>): Promise<any>;
  callPrompt(name: string, args: Record<string, any>): Promise<string>;
}
```

Usage example:
```typescript
// In tree provider
const state = await getMCP().readResource('loom://state');

// In command
const result = await getMCP().callPrompt('weave-idea', {
  weaveId: 'my-weave',
  title: 'My new idea'
});
```

## Test Plan (after implementation)

- Code compiles without app imports ✓
- Tree view loads and displays state ✓
- Each button calls the correct MCP prompt ✓
- End-to-end: click button → MCP prompt runs → result displayed ✓

(We'll defer actual VS Code Extension Host testing to a later test plan.)
