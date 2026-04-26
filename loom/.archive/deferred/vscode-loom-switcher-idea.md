---
type: idea
id: vscode-loom-switcher-idea
title: "VS Code Extension as a Loom Project Hub"
status: deferred
created: 2026-04-18
version: 1
tags: [vscode, ux, multi-loom, project-management, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# VS Code Extension as a Loom Project Hub

## Problem
Loom's multi‑loom architecture is currently a CLI‑only feature. In VS Code, users must manually open different project folders to switch contexts. There is no visual integration that makes the multi‑loom capability tangible or delightful.

## Idea
Transform the VS Code extension into a **Loom project hub**. Add a status bar item showing the current loom name (or `(local)` for mono‑loom). Clicking it reveals a QuickPick of all registered looms. Selecting a loom switches the global active loom and **opens the corresponding workspace folder** in VS Code.

**Core Experience:**
- User sees "🧵 default" in the status bar.
- Clicks it, picks "payment‑system" from the list.
- VS Code opens the `payment‑system` folder, and the extension displays that project's threads.

**Key Behaviors:**
- In a mono‑loom project, the switcher still works—it just navigates away to the chosen project.
- If a loom path is missing, offer to run `loom cleanup` to remove it.
- Provide a command to "Register Current Project" to add a mono‑loom project to the global registry.

## Why This Matters
Most multi‑workspace tools handle context switching clumsily. A seamless, one‑click switcher makes Loom feel like a **native project manager** for your development workflows. It turns the extension from a passive sidebar into an active, indispensable hub.

## Why Defer
- The core VS Code extension (tree view, commands) must be built first.
- This feature builds on the stable `app` layer and validated multi‑loom CLI behavior.
- Implementing it after the MVP ensures we don't overcomplicate the initial release.

## Open Questions
- Should switching replace the current window or open a new one? (Default: reuse window.)
- Should we auto‑register the current project if it's a mono‑loom? (Provide a command, not automatic.)

## Next Step
Create `vscode-loom-switcher-design.md` to detail the technical design and user interactions.

**Status: Deferred for post‑MVP consideration.**