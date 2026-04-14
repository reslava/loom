---
type: design
id: loom-multi-workspace-mvp-design
title: "Minimal Multi-Loom Workspace Support (MVP)"
status: active
created: 2026-04-14
version: 1
tags: [loom, workspace, cli, mvp]
parent_id: loom-multi-workspace-design
child_ids: [loom-multi-workspace-plan-001]
requires_load: [loom-multi-workspace-design]
---

# Multi-Loom Workspaces & Thematic Vocabulary

## Goal

Extend REslava Loom to support multiple independent workspaces (called **looms**) and introduce a cohesive thematic vocabulary that reinforces the weaving metaphor. This enhances user experience, enables context isolation, and positions the tool as a craft environment.

## Context

The current design assumes a single workspace per project root. Users working on multiple projects or experimenting with workflow configurations must maintain separate directories manually. Additionally, the terminology ("feature", "new", "plan") is functional but lacks the poetic resonance of the Loom brand.

This design addresses both concerns:
1. **Multi-Loom Support:** Allow users to create, switch, and manage multiple looms from a single CLI and VS Code interface.
2. **Thematic Vocabulary:** Replace generic terms with weaving-inspired language that deepens user engagement.

# CHAT

## Rafa:
I want REslava Loom to feel like a craft environment. Multiple independent looms, each with its own config and threads. And the commands should use words like "weave" and "thread". What do you think?

## AI:
This is a brilliant evolution of the brand. It transforms the tool from a utility into a creative workspace. Let's design it systematically.

### 1. Multi-Loom Architecture

#### 1.1 Global Registry

A configuration file at `~/.loom/config.yaml` tracks all known looms and the currently active one.

```yaml
# ~/.loom/config.yaml
active_loom: "/Users/rafa/workspaces/default-loom"
looms:
  - path: "/Users/rafa/workspaces/default-loom"
    name: "default"
    created: "2026-04-14"
  - path: "/Users/rafa/workspaces/test-loom"
    name: "test"
    created: "2026-04-14"
```

#### 1.2 Loom Directory Structure

Each loom is a self-contained workspace:

```
~/workspaces/default-loom/
├── .loom/                    # Local config, workflow.yml, cache
│   ├── workflow.yml
│   ├── templates/
│   ├── prompts/
│   └── cache/
├── chats/                    # Informal AI conversations
├── threads/                  # Features (formerly "features")
│   ├── payment-system/
│   │   ├── payment-system-idea.md
│   │   ├── payment-system-design.md
│   │   └── plans/
│   └── _archive/
└── references/               # Global references
```

#### 1.3 Commands

| Command | Description |
|---------|-------------|
| `loom setup <name>` | Create a new loom workspace. |
| `loom switch <name>` | Switch the active loom context. |
| `loom list` | List all registered looms. |
| `loom current` | Show the currently active loom. |

### 2. Thematic Vocabulary

The following terms replace existing terminology to reinforce the weaving metaphor.

| Current Term | New Term | Rationale |
| :--- | :--- | :--- |
| Feature | **Thread** | A thread is the fundamental unit being woven. |
| Create / New | **Weave** | Intentional act of creation. |
| Plan | **Pattern** (or keep **Plan**) | A pattern guides the weaving process. "Plan" is pragmatic; "Pattern" is thematic. Let's decide. |
| Workspace | **Loom** | The frame on which threads are woven. |

**Commands Evolution:**

| Old | New |
| :--- | :--- |
| `loom new idea` | `loom weave idea` |
| `loom new design` | `loom weave design` |
| `loom new plan` | `loom weave pattern` (or `loom weave plan`) |
| `loom init` | `loom setup` |

**Example:**
```bash
loom setup my-project
cd my-project
loom weave idea "User Authentication"
loom weave design auth
loom weave pattern auth
```

### 3. VS Code Integration

#### 3.1 Tree View

The tree view groups looms at the top level:

```
LOOMS
├── 🧵 default (active)
│   ├── 💬 Chats
│   ├── 🧵 Threads
│   │   ├── payment-system (design)
│   │   └── user-auth (idea)
│   └── 📚 References
├── 🧵 test
│   └── ...
└── 🧵 experimental
    └── ...
```

#### 3.2 Commands

- `Loom: Switch Loom` – Quick pick from registered looms.
- `Loom: Setup New Loom` – Create a new loom workspace.

### 4. Phased Implementation

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **Phase 1 (MVP)** | Single loom, core engine | `loom setup` (equivalent to `init`), `loom weave` commands (aliased from `new`), basic tree view with "Threads" node. |
| **Phase 2** | Multi-loom registry | Global `~/.loom/config.yaml`, `loom switch`, `loom list`, VS Code loom switcher. |
| **Phase 3** | Full thematic rollout | Rename all internal references from "feature" to "thread", update documentation, consider "pattern" vs "plan" based on user feedback. |

### 5. Open Questions

- **"Pattern" vs "Plan":** Which term resonates better? "Pattern" is deeply thematic; "Plan" is universally understood. Could support both via aliases.
- **Backward Compatibility:** Existing single-loom workspaces should be seamlessly adoptable. The system can treat any directory with `.loom/` as a valid loom and register it on first use.

## Decision

Adopt the multi-loom architecture and thematic vocabulary as described. Implement in phases, starting with single-loom support and vocabulary aliases, then expanding to full multi-loom management.

## Next Steps

- Update `loom init` to `loom setup` (with `init` as hidden alias for compatibility).
- Add `weave` as primary command with `new` as alias.
- Document the new vocabulary in `README.md` and CLI reference.
- Design global registry schema.