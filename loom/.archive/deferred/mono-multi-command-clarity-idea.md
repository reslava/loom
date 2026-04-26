---
type: idea
id: mono-multi-command-clarity-idea
title: "Clarify Mono‑Loom vs. Multi‑Loom Command Behavior"
status: deferred
created: 2026-04-18
version: 1
tags: [cli, ux, mono-loom, multi-loom, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Clarify Mono‑Loom vs. Multi‑Loom Command Behavior

## Problem
When a user is inside a mono‑loom project directory, multi‑loom management commands (`loom list`, `loom switch`) either show confusing empty results or fail silently. There is no clear distinction between the two operational modes in the CLI output.

## Idea
Enhance the CLI to detect whether the active loom is a local mono‑loom or a global multi‑loom, and tailor command output accordingly:

- `loom list` shows a special entry for the local mono‑loom.
- `loom switch` displays a helpful message explaining that switching is not applicable in mono‑loom mode.
- `loom current` explicitly states the mode.

**Example `loom list` output in mono‑loom mode:**
```
🧵 Local Loom (active)
   Path: /j/src/loom
```

**Example `loom switch` output in mono‑loom mode:**
```
❌ Cannot switch looms in a mono‑loom project.
   Run 'loom init' or 'loom setup' to create a multi‑loom workspace.
```

## Why Defer
- The current behavior is functional, if not perfectly polished.
- The VS Code extension will provide visual context that mitigates some confusion.
- This is a UX polish item, not a core workflow blocker.

## Next Step
Re‑evaluate after the VS Code extension is stable. Create `mono-multi-command-clarity-plan-001.md` when ready.

**Status: Deferred for post‑MVP consideration.**

---

### 🎯 Recommended Behavior

| Command | Executed in Mono‑Loom Directory | Expected Behavior |
| :--- | :--- | :--- |
| `loom list` | Yes | Show the current directory as the active local loom: `★ (local) /path/to/project` |
| `loom switch <name>` | Yes | Friendly error: `Cannot switch looms in a mono‑loom project. Run 'loom init' or 'loom setup' to create a multi‑loom workspace.` |
| `loom current` | Yes | Show the current mono‑loom path. |
| `loom setup` / `loom init` | Yes | Create a global loom but do **not** affect the current mono‑loom project. Warn the user if they might be confusing modes. |

### 🛠️ Implementation Sketch

We need a way for `app` use‑cases to know whether the active loom is **mono** or **multi**. This can be determined by `getActiveLoomRoot()`:

- If the active loom was found by walking up to a local `.loom/` → **mono‑loom mode**.
- If the active loom came from the global registry → **multi‑loom mode**.

We can expose this via a new function in `workspaceUtils.ts`:

```typescript
export function getLoomMode(): 'mono' | 'multi' {
    // Walk up to see if we are in a local .loom/ first
    let currentDir = process.cwd();
    while (true) {
        if (fs.existsSync(path.join(currentDir, '.loom'))) {
            return 'mono';
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;
        currentDir = parentDir;
    }
    return 'multi';
}
```

Then, in `listLooms`, `switchLoom`, and `currentLoom`, check the mode and adjust output/behavior accordingly.


