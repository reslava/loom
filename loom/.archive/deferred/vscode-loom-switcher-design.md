---
type: design
id: vscode-loom-switcher-design
title: "VS Code Loom Switcher — Project Hub Design"
status: draft
created: 2026-04-18
version: 1
tags: [vscode, ux, multi-loom, design]
parent_id: vscode-extension-design
child_ids: []
requires_load: [vscode-extension-design]
---

# VS Code Loom Switcher — Project Hub Design

## Goal

Enhance the VS Code extension with a **loom switcher** that transforms it into a project hub. Users can view all registered looms, switch contexts, and open the corresponding workspace folders directly from the status bar.

## Context

Loom supports both mono‑loom (project‑local) and multi‑loom (global registry) modes. The CLI provides `loom list` and `loom switch` to manage global looms. The VS Code extension currently operates only in mono‑loom mode. This design brings the multi‑loom capability into the IDE in a seamless, visual way.

## User Experience

### Status Bar Item

- **Label:** `🧵 <loom-name>` (e.g., `🧵 default`, `🧵 (local)`)
- **Tooltip:** "Switch Loom"
- **Click:** Opens a QuickPick with all registered looms.

### QuickPick

- **Title:** "Switch Loom"
- **Items:** List of looms from `app/listLooms`.
  - Active loom marked with `★`.
  - Missing looms shown with `[missing]` and a warning icon.
- **Actions on selection:**
  - If the selected loom is the current one, do nothing.
  - Otherwise, call `app/switchLoom` to update the global active loom.
  - Then open the folder using `vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false })`.

### Additional Commands

| Command | Description |
| :--- | :--- |
| `loom.registerCurrentProject` | Adds the current workspace folder to the global registry (if it contains a `.loom/` directory). |
| `loom.unregisterLoom` | Removes a loom from the registry (with confirmation). |

## Technical Design

### Integration with `app` Layer

The extension already depends on the `app` layer. The switcher will use:

- `listLooms` — to populate the QuickPick.
- `switchLoom` — to update the active loom in the global registry.

### Status Bar Registration

```typescript
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
statusBarItem.command = 'loom.switchLoom';
statusBarItem.text = `🧵 ${loomName}`;
statusBarItem.show();
```

### Opening the Workspace

```typescript
const uri = vscode.Uri.file(loomPath);
await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
```

### Handling Missing Paths

If a loom's path no longer exists, the QuickPick shows `[missing]`. Selecting it displays an error and offers to run `loom cleanup` (or a future `unregister` command).

## Interaction with Mono‑Loom Mode

- When the extension activates in a mono‑loom project (no global registry entry), the status bar shows `🧵 (local)`.
- The switcher still works—it lists all registered looms and can navigate away from the current project.
- This provides a consistent experience regardless of how the user entered the project.

## Open Questions

- Should we automatically refresh the status bar when the active loom changes via the CLI? (File watcher on `~/.loom/config.yaml` could trigger an update.)
- Should the switcher be available in the Command Palette as `Loom: Switch Loom`? (Yes, for accessibility.)

## Next Steps

- Implement after `vscode-extension-plan-004` (core extension) is complete.
- Create `vscode-loom-switcher-plan-001.md` for execution.
