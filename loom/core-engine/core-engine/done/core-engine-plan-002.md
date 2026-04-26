---
type: plan
id: core-engine-plan-002
title: "Filesystem Integration — Markdown Load and Save"
status: done
created: 2026-04-10
updated: 2026-04-14
version: 1
design_version: 3
tags: [loom, core, filesystem, markdown, io]
parent_id: core-engine-design
target_version: "0.2.0"
requires_load: [core-engine-design]
---

# Plan — Filesystem Integration (Markdown Load/Save)

| | |
|---|---|
| **Created** | 2026-04-10 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `core-engine-design.md` (v3) |
| **Target version** | 0.2.0 |

---

# Goal

Connect the core Loom engine to the filesystem using Markdown files as the database.

This includes:
- loading documents from disk
- parsing frontmatter
- saving updated documents with atomic writes
- robust error handling for common filesystem failures
- mapping folder structure to the Thread model

This step transforms the system from in‑memory logic into a persistent, real‑world workflow engine.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Setup filesystem utilities (with robust loom resolution) | `packages/fs/src/utils.ts` | — |
| ✅ | 2 | Implement `loadDoc` (Markdown + frontmatter + validation) | `packages/fs/src/load.ts` | Step 1 |
| ✅ | 3 | Implement `saveDoc` (atomic Markdown writer) | `packages/fs/src/save.ts` | Step 1 |
| ✅ | 4 | Implement `loadThread` | `packages/fs/src/loadThread.ts` | Steps 2, 3 |
| ✅ | 5 | Implement `saveThread` | `packages/fs/src/saveThread.ts` | Steps 2, 3 |
| ✅ | 6 | Integrate with core engine (`runEvent`) | `packages/fs/src/runEvent.ts` | Steps 4, 5 |
| ✅ | 7 | Test with real thread folder | `looms/test/threads/example/` | All |

---

## Step 1 — Setup Filesystem Utilities (with Robust Loom Resolution)

**File:** `packages/fs/src/utils.ts`

Define helpers for path resolution, directory operations, and—most critically—the `getActiveLoomRoot()` function that correctly resolves the active Loom workspace in both mono‑loom and multi‑loom modes.

```typescript
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as yaml from 'yaml';

/**
 * Resolves the absolute path to the currently active Loom workspace root.
 *
 * Resolution order:
 * 1. Check if a global registry exists at ~/.loom/config.yaml.
 *    If yes, and it has an active_loom, and that path exists → return it.
 * 2. Walk up from the current working directory, looking for a .loom/ directory.
 *    If found, return the directory containing .loom/.
 * 3. If neither is found, throw a clear error with remediation steps.
 *
 * @throws {Error} If no Loom workspace can be located.
 */
export function getActiveLoomRoot(): string {
    // 1. Try global registry (multi‑loom mode)
    const registryPath = path.join(os.homedir(), '.loom', 'config.yaml');
    if (fs.existsSync(registryPath)) {
        const registryContent = fs.readFileSync(registryPath, 'utf8');
        const registry = yaml.parse(registryContent) as LoomRegistry | null;
        if (registry?.active_loom) {
            const configDir = path.dirname(registryPath);
            const activePath = path.resolve(configDir, registry.active_loom);
            if (fs.existsSync(activePath)) {
                return activePath;
            }
        }
    }

    // 2. Walk up from cwd looking for .loom/ (mono‑loom mode)
    let currentDir = process.cwd();
    while (true) {
        const loomDir = path.join(currentDir, '.loom');
        if (fs.existsSync(loomDir)) {
            return currentDir;
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached filesystem root
            break;
        }
        currentDir = parentDir;
    }

    // 3. No loom found
    throw new Error(
        'No Loom workspace found.\n\n' +
        'If you are in a project that uses Loom, ensure it has a .loom/ directory.\n' +
        'If you want to create a new Loom workspace, run:\n' +
        '  loom init\n' +
        'If you have multiple looms, ensure one is active:\n' +
        '  loom list\n' +
        '  loom switch <name>'
    );
}

export interface LoomEntry {
    name: string;
    path: string;
    created: string;
}

export interface LoomRegistry {
    active_loom: string | null;
    looms: LoomEntry[];
}

/**
 * Resolves the absolute path to a specific thread.
 */
export function resolveThreadPath(threadId: string): string {
    const loomRoot = getActiveLoomRoot();
    return path.join(loomRoot, 'threads', threadId);
}

/**
 * Ensures a directory exists, creating it recursively if necessary.
 */
export async function ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
}

/**
 * Generates the next available plan ID for a thread.
 */
export function generatePlanId(threadId: string, existingPlanIds: string[]): string {
    const prefix = `${threadId}-plan-`;
    const numbers = existingPlanIds
        .map(p => p.match(/-plan-(\d+)\.md$/)?.[1])
        .filter(Boolean)
        .map(Number);
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
}
```

**Edge Cases Handled:**

| Scenario | Behavior |
|----------|----------|
| User is in a deep subdirectory of a multi‑loom project | Global registry returns the loom root. ✅ |
| User is in a deep subdirectory of a mono‑loom project | Walks up and finds `.loom/`. ✅ |
| Global registry exists but active loom path is broken | Falls back to walking up from cwd. ✅ |
| No loom can be located | Throws a helpful error with remediation steps. ✅ |
| User has both a global registry and a local `.loom/` | Global registry takes precedence. ✅ |

---

## Step 2 — Implement `loadDoc` (Markdown + frontmatter + validation)

**File:** `packages/fs/src/load.ts`

Use `gray-matter` to parse frontmatter and content. Includes custom error classes and required field validation.

```typescript
import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { Document } from '../../core/src/types';

export class FrontmatterParseError extends Error {
  constructor(
    public filePath: string,
    public rawFrontmatter: string,
    message: string
  ) {
    super(`Invalid frontmatter in ${filePath}: ${message}`);
    this.name = 'FrontmatterParseError';
  }
}

export async function loadDoc(filePath: string): Promise<Document> {
  const content = await fs.readFile(filePath, 'utf8');
  
  let parsed;
  try {
    parsed = matter(content);
  } catch (e) {
    throw new FrontmatterParseError(filePath, '', `YAML syntax error: ${e.message}`);
  }

  // Validate required fields
  const requiredFields = ['type', 'id', 'status', 'created', 'version'];
  for (const field of requiredFields) {
    if (!parsed.data[field]) {
      throw new FrontmatterParseError(
        filePath,
        JSON.stringify(parsed.data),
        `Missing required field: ${field}`
      );
    }
  }

  const doc = {
    ...parsed.data,
    content: parsed.content,
    _path: filePath,
  } as Document;

  // Parse steps for plan documents
  if (doc.type === 'plan' && parsed.content) {
    doc.steps = parseStepsTable(parsed.content);
  }

  return doc;
}

function parseStepsTable(content: string): any[] {
  // Parse the markdown table in the Steps section
  // Return array of { order, description, done, files_touched, blockedBy }
  // (Implementation to be filled)
  return [];
}
```

**Test Note:** Run `npm install gray-matter` in `packages/fs`. After implementing, `npm run build` should compile without errors.

---

## Step 3 — Implement `saveDoc` (Atomic Markdown Writer)

**File:** `packages/fs/src/save.ts`

Serialize document back to Markdown using atomic write (temp file + rename) to prevent data corruption.

```typescript
import matter from 'gray-matter';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Document } from '../../core/src/types';

export class FileWriteError extends Error {
  constructor(public filePath: string, originalError: Error) {
    super(`Failed to write ${filePath}: ${originalError.message}`);
    this.name = 'FileWriteError';
  }
}

export class FilePermissionError extends Error {
  constructor(public filePath: string) {
    super(`Permission denied writing to ${filePath}`);
    this.name = 'FilePermissionError';
  }
}

export async function saveDoc(doc: Document, filePath: string): Promise<void> {
  const { content, _path, ...frontmatter } = doc as any;

  // Generate markdown content
  let bodyContent = content;
  if (doc.type === 'plan' && doc.steps) {
    bodyContent = generateStepsTable(doc.steps, content);
  }

  const output = matter.stringify(bodyContent, frontmatter);

  // Ensure parent directory exists
  await fs.ensureDir(path.dirname(filePath));

  // Atomic write: write to temp file, then rename
  const tempPath = path.join(
    os.tmpdir(),
    `loom-${Date.now()}-${path.basename(filePath)}.tmp`
  );

  try {
    await fs.writeFile(tempPath, output, { mode: 0o644 });
    await fs.rename(tempPath, filePath);
  } catch (e) {
    // Clean up temp file if it exists
    await fs.remove(tempPath).catch(() => {});
    
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      throw new FilePermissionError(filePath);
    }
    if (e.code === 'ENOSPC') {
      throw new FileWriteError(filePath, new Error('Disk full'));
    }
    throw new FileWriteError(filePath, e);
  }
}

function generateStepsTable(steps: any[], originalContent: string): string {
  // Replace or append steps table in content
  // (Implementation to be filled)
  return originalContent;
}
```

**Atomic Write Guarantee:** The original file is never left in a partially written state. If the rename fails, the original remains untouched. If the temp write fails, no changes occur.

---

## Step 4 — Implement `loadThread`

**File:** `packages/fs/src/loadThread.ts`

Load all documents for a given thread ID.

```typescript
import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread, Document } from '../../core/src/types';
import { loadDoc } from './load';
import { resolveThreadPath } from './utils';

export async function loadThread(threadId: string): Promise<Thread> {
  const threadPath = resolveThreadPath(threadId);
  
  const docs: Document[] = [];
  
  // Recursively find all .md files
  const files = await findMarkdownFiles(threadPath);
  
  for (const file of files) {
    try {
      const doc = await loadDoc(file);
      docs.push(doc);
    } catch (e) {
      if (e instanceof FrontmatterParseError) {
        console.warn(`Skipping ${file}: ${e.message}`);
      } else {
        throw e;
      }
    }
  }

  const design = docs.find(d => d.type === 'design' && (d as any).role === 'primary') as any;
  if (!design) {
    throw new Error(`No primary design found for thread '${threadId}'`);
  }

  const idea = docs.find(d => d.type === 'idea') as any;
  const plans = docs.filter(d => d.type === 'plan') as any[];
  const contexts = docs.filter(d => d.type === 'ctx') as any[];

  return {
    id: threadId,
    idea,
    design,
    plans,
    contexts,
    allDocs: docs,
  };
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '_archive') {
      result.push(...await findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push(fullPath);
    }
  }
  
  return result;
}
```

---

## Step 5 — Implement `saveThread`

**File:** `packages/fs/src/saveThread.ts`

Persist all documents in a thread.

```typescript
import { Thread } from '../../core/src/types';
import { saveDoc } from './save';
import { resolveThreadPath } from './utils';
import * as path from 'path';

export async function saveThread(thread: Thread): Promise<void> {
  for (const doc of thread.allDocs) {
    const filePath = (doc as any)._path;
    if (!filePath) {
      // New document — determine correct path
      const newPath = determinePathForDoc(doc, thread.id);
      await saveDoc(doc, newPath);
    } else {
      await saveDoc(doc, filePath);
    }
  }
}

function determinePathForDoc(doc: any, threadId: string): string {
  const threadPath = resolveThreadPath(threadId);
  
  switch (doc.type) {
    case 'idea':
      return path.join(threadPath, `${threadId}-idea.md`);
    case 'design':
      return path.join(threadPath, `${threadId}-design.md`);
    case 'plan':
      return path.join(threadPath, 'plans', `${doc.id}.md`);
    case 'ctx':
      return path.join(threadPath, `${threadId}-ctx.md`);
    default:
      throw new Error(`Unknown document type: ${doc.type}`);
  }
}
```

---

## Step 6 — Integrate with Core Engine (`runEvent`)

**File:** `packages/fs/src/runEvent.ts`

Create a high‑level function that loads a thread, applies an event, and saves it back to disk.

```typescript
import { WorkflowEvent, applyEvent } from '../../core/src/applyEvent';
import { loadThread } from './loadThread';
import { saveThread } from './saveThread';

export async function runEvent(threadId: string, event: WorkflowEvent): Promise<void> {
  const thread = await loadThread(threadId);
  const updatedThread = applyEvent(thread, event);
  await saveThread(updatedThread);
}
```

---

## Step 7 — Test with Real Thread Folder

Create a sample thread in the test loom:

```bash
mkdir -p ~/looms/test/threads/example/plans
cp .loom/templates/design-template.md ~/looms/test/threads/example/example-design.md
# Manually edit frontmatter to set proper id, status, etc.
```

Write a test script that:
- Loads the example thread
- Applies an event (e.g., `ACTIVATE_DESIGN`)
- Verifies the file was updated correctly
- Simulates a disk full error and confirms atomic write prevents corruption

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |