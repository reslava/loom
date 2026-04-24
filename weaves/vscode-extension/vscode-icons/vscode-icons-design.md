---
type: design
id: vscode-icons-design
title: "VS Code Unified Icon System"
status: active
created: 2026-04-20
version: 1
tags: [vscode, icons, design]
parent_id: vscode-extension-design
child_ids: [vscode-icons-plan-001]
requires_load: [vscode-extension-design]
---

# VS Code Unified Icon System

## Goal

Create a centralized, type‑safe icon management system for the Loom VS Code extension. This eliminates hardcoded icon references scattered across the codebase and provides a seamless fallback to VS Code's built‑in Codicons when custom SVG assets are not yet available.

## Design

### 1. Centralized Icon Constants (`icons.ts`)

All icon identifiers are defined in a single `Icons` constant. This is the **single source of truth** for icon names used throughout the extension.

```typescript
export const Icons = {
    loom: 'loom',
    thread: 'thread',
    idea: 'idea',
    design: 'design',
    plan: 'plan',
    ctx: 'ctx',
    actionDelete: 'actionDelete',
    actionArchive: 'actionArchive',
    actionCancel: 'actionCancel',
    actionGenerate: 'actionGenerate',
} as const;
```

### 2. Codicon Fallback Mapping

When custom SVGs are not available (or not yet created), the system falls back to VS Code's built‑in Codicons. The mapping is internal to `icons.ts`.

```typescript
const CodiconMap: Readonly<Record<keyof typeof Icons, string>> = {
    loom: 'graph',
    thread: 'project',
    idea: 'lightbulb',
    design: 'symbol-structure',
    plan: 'checklist',
    ctx: 'note',
    actionDelete: 'trash',
    actionArchive: 'archive',
    actionCancel: 'close',
    actionGenerate: 'sparkle',
};
```

### 3. Icon Resolution Function

The `icon()` function returns either a custom SVG URI or a `vscode.ThemeIcon` based on whether the base URI has been set (via `setIconBaseUri`). This design intentionally **does not** check for file existence—it assumes that if the base URI is set, the SVG files are present. This keeps the code simple and avoids synchronous filesystem checks at runtime.

```typescript
let EXT_URI: vscode.Uri | undefined;

export function setIconBaseUri(uri: vscode.Uri): void {
    EXT_URI = uri;
}

export function icon(id: keyof typeof Icons): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } {
    if (EXT_URI) {
        const uri = vscode.Uri.joinPath(EXT_URI, 'media', 'icons', `${id}.svg`);
        return { light: uri, dark: uri };
    }
    return new vscode.ThemeIcon(CodiconMap[id]);
}
```

### 4. Helper Functions

To further centralize icon logic, helper functions are provided for common use cases.

```typescript
export function getDocumentIcon(type: string): ReturnType<typeof icon> {
    switch (type) {
        case 'design': return icon(Icons.design);
        case 'idea':   return icon(Icons.idea);
        case 'plan':   return icon(Icons.plan);
        case 'ctx':    return icon(Icons.ctx);
        default:       return icon(Icons.design);
    }
}

export function getThreadIcon(status: string): ReturnType<typeof icon> {
    switch (status) {
        case 'IMPLEMENTING': return new vscode.ThemeIcon('sync~spin');
        case 'DONE':         return new vscode.ThemeIcon('pass-filled');
        case 'CANCELLED':    return new vscode.ThemeIcon('error');
        default:             return icon(Icons.thread);
    }
}

export function getPlanIcon(status: string): ReturnType<typeof icon> {
    switch (status) {
        case 'implementing': return new vscode.ThemeIcon('sync~spin');
        case 'done':         return new vscode.ThemeIcon('pass-filled');
        case 'blocked':      return new vscode.ThemeIcon('warning');
        default:             return icon(Icons.plan);
    }
}
```

### 5. Integration with the Extension

In `extension.ts`, the base URI is set during activation. The call can be commented out during development when custom SVGs are not yet ready, causing the system to automatically fall back to Codicons.

```typescript
// Initialize icon base URI for custom icons (uncomment when SVGs are ready)
// setIconBaseUri(context.extensionUri);
```

### 6. Directory Structure

```
packages/vscode/
├── media/
│   ├── icons/
│   │   ├── loom.svg
│   │   ├── thread.svg
│   │   ├── idea.svg
│   │   ├── design.svg
│   │   ├── plan.svg
│   │   ├── ctx.svg
│   │   └── ...
│   └── loom-icon.png (marketplace icon)
└── src/
    └── icons.ts
```

## Benefits

| Benefit | Description |
| :--- | :--- |
| **Single Source of Truth** | All icon identifiers live in one place. |
| **Type Safety** | `keyof typeof Icons` prevents typos. |
| **Seamless Fallback** | Works immediately with Codicons; custom SVGs can be added later without code changes. |
| **Zero Runtime Overhead** | No filesystem checks; simple URI construction. |
| **Consistent Toolbar Mapping** | The same Codicon IDs are documented for use in `package.json`. |

## Decision

Adopt this unified icon system. The implementation is complete and currently uses Codicon fallbacks. Custom SVG creation is deferred.

## Next Steps

- Create `vscode-icons-plan-001.md` for SVG asset creation.