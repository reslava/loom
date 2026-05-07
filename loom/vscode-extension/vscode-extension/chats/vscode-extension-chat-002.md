---
type: chat
id: ch_01KR0EWEQMBSK5HJ1D0YGJ0R0K
title: vscode-extension Toggle Archived
status: done
created: "2026-05-07T00:00:00.000Z"
updated: 2026-05-07
version: 2
tags: []
parent_id: vscode-extension
requires_load: []
---
# CHAT

## Rafa:

### TODO
Change icon for extension toolbar `Toogle Archived` button:
- Enabled: packages/vscode/media/icons/archive.svg (current)
- Disabled: codeicon lib icon Archive

## AI:

Looking at this request, here's what I understand:

**Current state:** The "Toggle Archived" button in the extension toolbar uses `packages/vscode/media/icons/archive.svg` for both enabled and disabled states (or only the enabled state is set).

**Goal:** You want two distinct icons:
- **Enabled state:** Keep the current `archive.svg` icon
- **Disabled state:** Use the Codeicon library's `Archive` icon instead

A few questions to clarify:

1. **Icon format for disabled state:** The Codeicon `Archive` icon would typically be referenced via its codicon class name (e.g., `codicon-archive`). Do you want to use the raw SVG from the codicon library, or reference it via CSS class? If SVG, do you need me to extract/specify the path?

2. **Where this is wired:** Is this button defined in a `package.json` `contributes.commands` or `viewsContainers`, or is it a custom button rendered in a webview/tree view? The approach differs — if it's a command button, icons are set via `icon` property in `package.json` (which doesn't natively support state-based icons). If it's custom-rendered, we'd need to update the template/render logic.

3. **The toggle mechanism:** How is the enabled/disabled state currently managed? Is there a `when` clause context key we could leverage, or is it managed programmatically in the extension code?

**What's needed to implement:**
- Identify where the icon source is set (likely in the webview HTML or a command registration)
- Add a conditional check for the button's enabled state
- Set `archive.svg` when enabled, `codicon-archive` (or its SVG equivalent) when disabled

If you want me to lay out the specific code changes, I recommend we promote this to a plan first. Alternatively, if you just need design direction, I can describe the approach and you can implement directly.