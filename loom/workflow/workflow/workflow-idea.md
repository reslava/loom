---
type: idea
id: workflow-idea
title: "Document-Driven AI Workflow System (Refined Vision)"
status: draft
created: 2026-04-11
version: 2.0.0
tags: [workflow, ai, architecture, markdown, vscode, meta-tool]
parent_id: null
child_ids: [workflow-design-v2, workflow-feature-model-design, workflow-run-command-design]
requires_load: [workflow-design-v2]
---

# AI-native Development Workflow System (Refined Vision)

## Problem (Revisited)

AI-assisted development is stuck in the "Chat Era." We prompt, the AI generates, we copy-paste, and context is lost to the ether. 

**Specific Pain Points:**
1.  **Context Collapse:** AI forgets *why* we chose Approach A over Approach B three turns ago.
2.  **Unbounded Execution:** AI eagerly writes 500 lines of code for a "draft idea" before we've validated the design.
3.  **Invisible State:** There is no way to answer "Is this feature blocked?" or "Which plan is stale?" without manually reading chat logs or scanning folders.
4.  **Fragile Automation:** Running a linter or build script after an AI change requires manual intervention or brittle, one-off scripting.

## Idea (Evolved)

Create a **document-native operating system for AI collaboration** where the filesystem is the database and Markdown is the API.

Instead of fighting the AI to follow a process, we embed the process into the files it reads and writes.

### Core Mechanics (How it Works Now)

1.  **Markdown as State Machine:** Every document (`idea.md`, `design.md`, `plan-*.md`) contains a `status` in its frontmatter. The system's state is **derived** by reading these files. No central database required.
2.  **Design as Conversation Log:** The `design.md` file is not just a spec; it's a log of the `## User:` and `## AI:` interaction. This gives the LLM perfect recall of the decision history.
3.  **Reactive Staleness:** If you change `design.md` (e.g., "Actually, let's use Postgres instead of SQLite"), the system automatically marks all child `plan-*.md` files as `staled: true`. The UI shows a warning, preventing you from executing a dead plan.
4.  **Declarative Custom Workflows (`workflow.yml`):** Users can define their own document types, statuses, and side effects (like running a linter or a deploy script) without writing a single line of TypeScript. The system is a **platform**, not just a fixed process.
5.  **AI Handshake Protocol:** The extension injects structured context into the AI prompt. The AI responds with a JSON proposal (e.g., `{"action": "REFINE_DESIGN", "reasoning": "..."}`). **Nothing changes on disk until the human clicks "Approve."**

### Why This Approach is Robust

- **Git-Native:** Rollback a bad AI decision? `git checkout design.md`. Done.
- **LLM-Agnostic:** It works with Copilot, Cursor, or raw API calls because the interface is just **files**.
- **Zero Lock-In:** If you stop using the VS Code extension tomorrow, you still have a perfectly organized folder of Markdown files that make sense to a human.

## Why Now (Updated)

- **Context Windows are Huge:** Models can read entire `design.md` histories, but they need **structure** to make sense of them. This system provides that structure.
- **VS Code is the Universal Editor:** Building this as an extension (VSIX) puts it exactly where developers live.
- **The "Agent" Gap:** Current AI agents are too autonomous and prone to error. This system provides **governance** for agents, allowing them to be powerful while remaining safe.

## Open Questions (Refined)

- **Performance:** How does derived state calculation scale with 100+ features in a monorepo? (Caching strategy is defined, needs implementation).
- **Team Adoption:** How do we handle merge conflicts in `design.md` when two developers are collaborating on the same feature? (Git handles it, but frontmatter merges need to be human-friendly).
- **Security Sandbox:** How do we safely enable the `run_command` effect without opening a local RCE vulnerability? (Addressed in `workflow-run-command-design.md` via opt-in settings and deny-lists).

## Next Step

**Implementation of Core Engine (Plan 001)** — The design is stable. The next step is building the TypeScript reducers and the filesystem I/O layer to make this a reality.