---
type: idea
id: cli-error-standardization-idea
title: "Standardize CLI Error Handling with CliError Class"
status: deferred
created: 2026-04-18
version: 1
tags: [cli, ux, error-handling, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Standardize CLI Error Handling with `CliError` Class

## Problem
Currently, CLI commands catch errors with `catch (e: any)` and print `e.message`. This works but lacks:
- **Consistent exit codes** for scripting.
- **User‑friendly messages** for known error conditions (e.g., "Loom already exists" vs. raw stack traces).
- **Separation of user errors from unexpected bugs**.

## Idea
Create a `CliError` class in `packages/cli/src/errors.ts`:

```typescript
export class CliError extends Error {
    constructor(
        message: string,
        public exitCode: number = 1,
        public friendlyMessage?: string
    ) {
        super(message);
        this.name = 'CliError';
    }
}
```

Then refactor all CLI commands to throw `CliError` for expected failures, and let the main entry point handle formatting:

```typescript
try {
    await command();
} catch (e) {
    if (e instanceof CliError) {
        console.error(chalk.red(`❌ ${e.friendlyMessage || e.message}`));
        process.exit(e.exitCode);
    }
    console.error(chalk.red(`❌ Unexpected error: ${e.message}`));
    process.exit(2);
}
```

## Why Defer
- Current error handling is functional for MVP.
- This is a polish item that improves UX but doesn't block core functionality.
- Can be implemented incrementally after the VS Code extension is stable.

## Next Step
Create `cli-error-plan-001.md` when ready.

**Status: Deferred for post‑MVP consideration.**