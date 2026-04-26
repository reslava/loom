---
type: reference
id: fs-extra-esm-reference
title: "fs-extra ESM Import Behaviour in ts-node Tests"
status: active
created: 2026-04-23
version: 1
tags: [tests, ts-node, fs-extra, esm, imports]
parent_id: null
child_ids: []
requires_load: []
---

# fs-extra ESM Import Behaviour in ts-node Tests

## Rule

Use **named imports** from `fs-extra` in test files. Do not use `import * as fs from 'fs-extra'` and then pass that module object as a dependency.

```typescript
// ✅ Works
import { remove, ensureDir, outputFile, pathExists } from 'fs-extra';
import { readdir } from 'fs/promises';
import * as fsNative from 'fs';

// ❌ Breaks — methods like readdir, readFile, existsSync not exposed via namespace
import * as fs from 'fs-extra';
const deps = { fs }; // then deps.fs.readdir — not a function at runtime
```

## Why

In the ts-node ESM namespace (`import * as fs from 'fs-extra'`), only `fs-extra`'s own named exports are exposed. Methods that `fs-extra` inherits from the built-in `fs` module (`readdir`, `readFile`, `readFileSync`, `existsSync`, `writeFile`) are **not re-exported as named exports** and therefore appear as `undefined` on the namespace object.

When you call `fs.readdir(path)` inside a wrapper arrow function, the call succeeds at module-level inspection (`typeof fs.readdir === 'function'` returns true in isolation) but fails at runtime when the function is invoked from inside a compiled dist module. The compiled dist module uses `require('fs-extra')` (CJS), which gets the full module object — but the test's ESM namespace is a different binding.

Discovered during `core-tests-plan-001` implementation when `doStep.test.ts` and `summarise.test.ts` both hit `TypeError: deps.fs.readdir is not a function` and `deps.fs.existsSync is not a function`.

## Pattern to use in new test files

```typescript
import { remove, ensureDir, outputFile, pathExists } from 'fs-extra';
import { readdir, readFile, writeFile } from 'fs/promises';
import * as fsNative from 'fs'; // for sync methods: existsSync, readFileSync

// Build an explicit adapter when use-cases expect a deps.fs object
const fsDeps = {
    ensureDir,
    readdir,
    pathExists,
    remove,
    existsSync: fsNative.existsSync,
    readFile: (p: string, enc: string) => readFile(p, enc as any),
    writeFile: (p: string, content: string) => writeFile(p, content),
} as any;
```

For file reads in assertions, always use `fsNative.readFileSync(path, 'utf8')` directly — never `fs.readFile` from the namespace.
