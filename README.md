# 🧵 Loom

**Weave ideas into features with AI.**

**Document-driven. Event-sourced. Git-native. AI-agnostic.**

Stop losing context when working with AI. Loom turns your Markdown files into a structured, versionable workflow engine that weaves human intent with AI execution.

> 🚀 **Stable CLI — v0.1.0 is here!**  
> The core workflow engine is complete. A VS Code extension is in active development.

---

## Why This Exists

AI-assisted development is stuck in the **Chat Era**. You prompt, the AI generates, you copy-paste, and context is lost. Features drift. Plans go stale. There's no single source of truth.

Loom replaces ephemeral chat with **persistent documents** that act as both specification and conversation log:

- **Clear separation** between idea, design, planning, and execution.
- **Automatic staleness detection** when designs change.
- **Human-in-the-loop** approval for AI‑proposed state changes.
- **Customizable workflows** that adapt to *your* process.
- **Zero lock‑in** — everything is Markdown, versioned with Git.

---

## How It Works (In 30 Seconds)

1. **Documents are the Database** — Every thread lives in a folder: `*-idea.md`, `*-design.md`, `*-plan-*.md`.
2. **Status is Derived** — No central state file. Frontmatter (`status: active`) defines the workflow.
3. **AI Reads the Docs** — The extension injects `design.md` (or a summary) into the AI prompt.
4. **You Approve Changes** — AI proposes an action (e.g., "Refine Design"). You see a diff, click **Approve**, and only then does the file change.

```text
Thread: Payment System
├── payment-system-design.md      (status: active)   ← The root of truth
├── plans/
│   ├── payment-system-plan-001.md (status: implementing)
│   └── payment-system-plan-002.md (status: stale ⚠️)
```

---

## Key Features (CLI v0.1.0)

| Feature | Description |
|---------|-------------|
| 📁 **Filesystem as DB** | 100% Git-friendly. Every state change is a versioned Markdown diff. |
| 🔄 **Reactive Staleness** | Change a design? Linked plans are marked `staled: true` automatically. |
| 🤖 **AI Handshake Protocol** | Structured JSON proposals + diff approval. No rogue changes. |
| ⚙️ **Declarative Custom Workflows** | Define your own document types and transitions in `.loom/workflow.yml`. |
| 🧩 **Built-in Effects** | Automate linting, deployment, notifications with `run_command`, etc. |
| 🖥️ **VS Code Native** | Tree view, file decorations, toolbar commands. Fits your existing workflow. |
| 🔌 **AI Agnostic** | Works with DeepSeek, OpenAI, Anthropic, or local models (Ollama). |
| 🧵 **Mono & Multi‑Loom** | Work locally in a single project or manage multiple looms globally. |
| 📊 **Rich Filtering & Sorting** | `loom status --filter status=active --sort id:asc` |
| 🔗 **Blocker Resolution** | See exactly which steps are blocked and what's next. |

---

## Quick Start

### 1. Install

```bash
npm install -g @reslava/loom
```

### 2. Initialize a Workspace

**Mono‑loom (inside your project):**
```bash
cd my-project
loom init
```

**Multi‑loom (global workspace):**
```bash
loom init-multi
```

### 3. Weave Your First Idea

```bash
loom weave idea "Add Dark Mode"
```

### 4. Check Status

```bash
loom status
loom status --verbose
loom status --json
```

### 5. Explore Commands

```bash
loom --help
loom weave --help
```

---

## Example Workflow

```bash
# Create an idea
loom weave idea "User Authentication" --thread auth

# Auto‑finalize and create a design
loom weave design auth

# Auto‑finalize design and create a plan
loom weave plan auth

# Start working on the plan
loom start-plan auth-plan-001

# Complete steps
loom complete-step auth-plan-001 --step 1
loom complete-step auth-plan-001 --step 2

# See progress and next action
loom status auth --verbose
```

---

## Architecture

Loom is built on a clean, layered architecture:

```
CLI / VS Code  →  app (use‑cases)  →  core (domain) + fs (infrastructure)
```

- **`core`**: Pure domain logic (entities, reducers, validation, filters).
- **`app`**: Orchestration use‑cases with dependency injection.
- **`fs`**: Infrastructure adapters (filesystem, serialization, indexing).
- **`cli`**: Thin delivery layer (command parsing, console output).

This separation makes Loom testable, maintainable, and ready for multiple frontends.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) | Derived state, reducers, and event flow. |
| [**WORKFLOW_YML.md**](./docs/WORKFLOW_YML.md) | Custom workflow configuration reference. |
| [**EFFECTS.md**](./docs/EFFECTS.md) | Catalog of built-in effects. |
| [**AI_INTEGRATION.md**](./docs/AI_INTEGRATION.md) | AI handshake protocol and native client design. |
| [**CLI Commands Reference**](./references/cli-commands-reference.md) | Every `loom` command documented. |
| [**VS Code Commands Reference**](./references/vscode-commands-reference.md) | All `Loom:` commands and keybindings. |
| [**Workspace Structure Reference**](./references/workspace-directory-structure-reference.md) | Directory layout and file naming conventions. |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and [DOCUMENTATION_GUIDE.md](./docs/DOCUMENTATION_GUIDE.md) for writing conventions.

- **Report bugs** via GitHub Issues.
- **Propose features** by opening a discussion.
- **Improve documentation** – PRs are always appreciated.

---

## License

MIT © 2026 Rafa Eslava

---

**Ready to stop losing context?**  
Star the repo, and let's weave something great together. 🧵✨
