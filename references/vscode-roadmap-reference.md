---
type: reference
id: vscode-roadmap-reference
title: "VS Code Extension & Final Polishing Roadmap"
status: active
created: 2026-04-18
version: 1
tags: [roadmap, vscode, cli, refactor]
requires_load: []
---

# VS Code Extension & Final Polishing Roadmap

This document outlines the recommended execution order for the remaining plans and deferred ideas. The sequence is designed to complete foundational clean‑up first, followed by the visual layer (VS Code extension), and finally polishing items.

## Recommended Execution Order

| Order | Plan / Idea | Type | Dependencies | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **1** | ✅`move-thread-to-entities-plan-001.md` | Refactor | None | Completes domain restructuring; low‑risk, high‑clarity improvement. |
| **2** | ✅`cli-delegate-directory-creation-plan-001.md` | Refactor | None (or Step 1) | Ensures CLI fully delegates to `app` layer; prevents architectural leak. |
| **3** | `vscode-extension-plan-004.md` | Feature | Steps 1‑2 | Builds the core extension structure and tree view. |
| **4** | `vscode-extension-plan-005.md` | Feature | `vscode-extension-plan-004` | Adds thread‑based grouping to the tree view. |
| **5** | `vscode-extension-plan-006.md` | Feature | `vscode-extension-plan-004`, `vscode-extension-plan-005` | Implements toolbar controls and actions. |
| **6** | `cli-error-standardization-idea.md` | Polish (Deferred) | None | Improves CLI UX; can be done anytime, even after initial VS Code release. |

---

## Detailed Phase Breakdown

### Phase 1: Core Cleanup (Before VS Code)

These two small refactors solidify the architecture and eliminate the last remaining inconsistencies.

#### 1. Move `Thread` and Derived Types to `entities/thread.ts`

- **Goal:** Remove `Thread`, `ThreadStatus`, and `ThreadPhase` from the monolithic `types.ts` and place them in their own domain entity.
- **Benefit:** Completes the domain restructuring; makes the core model even more discoverable.

#### 2. Delegate CLI Directory Creation to `app` Use‑Cases

- **Goal:** Ensure `initLoom` and `setupLoom` handle all `fs.ensureDirSync` calls internally, removing direct `fs` usage from CLI commands.
- **Benefit:** Maintains a consistent abstraction; the VS Code extension will reuse the exact same logic without duplication.

---

### Phase 2: VS Code Extension Foundation

These three plans build the visual layer step‑by‑step.

#### 3. `vscode-extension-plan-004.md` – VSIX MVP

- **Scope:** Create the extension package, register the tree view, implement basic commands that call `app` use‑cases.
- **Outcome:** A working, minimal Loom sidebar in VS Code.

#### 4. `vscode-extension-plan-005.md` – Thread‑Based Grouping

- **Scope:** Implement `groupByThread` in the ViewModel, showing a hierarchical view of threads and their documents.
- **Outcome:** The tree view becomes work‑centric, matching the CLI `loom status` experience.

#### 5. `vscode-extension-plan-006.md` – Toolbar & View Controls

- **Scope:** Add grouping selectors, filters, and action buttons to the view toolbar.
- **Outcome:** Full interactive control over the Loom view, on par with the CLI.

---

### Phase 3: Polishing & UX Improvements

These items can be done after the initial VS Code extension is stable, or even deferred further.

#### 6. `cli-error-standardization-idea.md` – `CliError` Class

- **Scope:** Introduce a custom error class and standardize exit codes and user‑friendly messages.
- **Benefit:** Better scripting support and cleaner console output.

---

## Execution Notes

- **Phase 1** plans are independent and can be completed quickly, providing a clean slate for the extension work.
- **Phase 2** plans are sequential; each builds on the previous one.
- **Phase 3** is a deferred polish item that can be tackled at any time without blocking the extension.

This roadmap ensures we build on a solid, fully refactored foundation and deliver the visual layer incrementally.

---
*Last updated: 2026-04-18*
