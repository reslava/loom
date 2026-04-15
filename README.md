# 🧵 Loom

**Weave ideas into features with AI.**

**Document-driven. Event-sourced. Git-native. AI-agnostic.**

Stop losing context when working with AI. Loom turns your Markdown files into a structured, versionable workflow engine that weaves human intent with AI execution.

> ⚠️ **Early Development** — This project is in active design and initial implementation. The core engine is being built. See [Roadmap](#current-status--roadmap) for current status.

---

## Why This Exists

AI-assisted development is stuck in the **Chat Era**. You prompt, the AI generates, you copy-paste, and context is lost. Threads drift. Plans go stale. There's no single source of truth.

REslava Loom replaces ephemeral chat with **persistent documents** that act as both specification and conversation log:

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

## Key Features (Planned / In Progress)

| Feature | Description |
|---------|-------------|
| 📁 **Filesystem as DB** | 100% Git-friendly. Every state change is a versioned Markdown diff. |
| 🔄 **Reactive Staleness** | Change a design? Linked plans are marked `staled: true` automatically. |
| 🤖 **AI Handshake Protocol** | Structured JSON proposals + diff approval. No rogue changes. |
| ⚙️ **Declarative Custom Workflows** | Define your own document types and transitions in `.loom/workflow.yml`. |
| 🧩 **Built-in Effects** | Automate linting, deployment, notifications with `run_command`, etc. |
| 🖥️ **VS Code Native** | Tree view, file decorations, toolbar commands. Fits your existing workflow. |
| 🔌 **AI Agnostic** | Works with DeepSeek, OpenAI, Anthropic, or local models (Ollama). |
| 🧵 **Multi-Loom Support** | Manage multiple independent workspaces with `loom switch`. |

---

## Current Status & Roadmap

The project is in **Phase 1: Core Engine Implementation**.

- [x] Comprehensive design documentation
- [x] Document templates and workflow configuration schema
- [x] AI integration protocol and handshake design
- [x] Multi-loom workspace architecture and vocabulary alignment
- [ ] Core engine (reducers, derived state, event applier)
- [ ] Filesystem layer (Markdown load/save)
- [ ] CLI interface (`loom` command)
- [ ] VS Code extension (tree view, commands)
- [ ] Native AI client integration

---

## Getting Started (For Contributors)

### Prerequisites

- Node.js 18+
- VS Code
- (Optional) DeepSeek or OpenAI API key for AI features

### Development Setup

```bash
git clone https://github.com/reslava/loom.git
cd loom
npm install
npm run build
```

To test the extension:
- Press `F5` in VS Code to launch the Extension Development Host.
- Open a workspace and run `Loom: Initialize`.

---

## Quick CLI Example

```bash
# Initialize your first loom
loom init

# Weave a new idea
loom weave idea "Add Dark Mode"

# Start a chat session
loom chat new --title "Auth strategy debate"

# Refine a design using a chat
loom refine-with-chat threads/auth/auth-design.md chats/security-chat.md

# Check thread status
loom status auth

# Switch to a test loom
loom switch test
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) | Derived state, reducers, and event flow. |
| [**WORKFLOW_YML.md**](./docs/WORKFLOW_YML.md) | Custom workflow configuration reference. |
| [**EFFECTS.md**](./docs/EFFECTS.md) | Catalog of built-in effects. |
| [**AI_INTEGRATION.md**](./docs/AI_INTEGRATION.md) | AI handshake protocol and native client design. |
| [**DOCUMENTATION_GUIDE.md**](./docs/DOCUMENTATION_GUIDE.md) | Writing conventions and structure. |
| [**CONFIGURATION.md**](./docs/CONFIGURATION.md) | Complete reference for all VS Code settings. |
| [**CLI Commands Reference**](./references/cli-commands-reference.md) | Every `loom` command documented. |
| [**VS Code Commands Reference**](./references/vscode-commands-reference.md) | All `Loom:` commands and keybindings. |
| [**Workspace Structure Reference**](./references/workspace-directory-structure-reference.md) | Directory layout and file naming conventions. |
| [**Templates**](./.loom/templates/) | Base templates for `idea`, `design`, `plan`, `ctx`. |

---

## Example: Custom Blog Post Workflow

REslava Loom is not limited to software development. Here's a `workflow.yml` for a blog pipeline:

```yaml
name: "Blog Pipeline"
documents:
  - type: draft
    file_pattern: "draft-*.md"
    statuses: [writing, review, approved]
    initial_status: writing
  - type: published_post
    file_pattern: "published/*.md"
    statuses: [live, archived]
    initial_status: live

events:
  - name: PUBLISH
    applies_to: draft
    from_status: approved
    to_status: live
    effects:
      - run_command:
          command: "bundle exec jekyll build"
          cwd: "{{workspaceRoot}}"
```

When a draft is approved, the static site rebuilds automatically.

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