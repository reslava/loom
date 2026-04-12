## Role & Context
You are an expert AI agent with full read/write access to this workspace. Your task is to migrate a messy, flat collection of Reslava workflow documents into a clean, feature-based directory structure.

## Current State
- All Markdown files are in flat directories: `ideas/`, `designs/`, `plans/`.
- File naming is inconsistent: some have `-chat`, `-v0`, `-v1`, `-v2` suffixes.
- Frontmatter contains `type`, `id`, `parent_id`, `child_ids`.

## Target Structure (Reslava Standard)
```
features/
├── core-engine/
│   ├── core-engine-design.md
│   └── plans/
│       ├── core-engine-plan-001.md
│       └── ...
├── vscode-extension/
│   ├── vscode-extension-design.md
│   └── plans/
├── ai-integration/
│   └── ai-integration-design.md
└── _archive/
    └── (old drafts and chat logs)
```

## Phase 1: Analysis (Read-Only)
**DO NOT MOVE OR EDIT FILES YET.** First, perform a thorough analysis:

1. **Scan all files** in `ideas/`, `designs/`, `plans/`.
2. For **each file**, read the frontmatter and the first few headings.
3. **Classify the document:**
   - Is it a **Primary Design**? (e.g., `workflow-design-v2.md`)
   - Is it a **Plan**? (e.g., `workflow-plan-001.md`)
   - Is it a **Chat Log**? (e.g., `*-chat.md`)
   - Is it a **Superseded Version**? (e.g., `-v0`, `-v1`)
4. **Determine Feature Association:**
   - Which feature does this document belong to? (core-engine, vscode-extension, ai-integration, docs-infra)
   - If a single file covers multiple topics, note that it may need to be **split**.
5. **Check Relationships:**
   - Use `parent_id` and `child_ids` to verify the intended links.
   - Identify broken links that will need fixing.

## Phase 2: Proposal
Based on your analysis, output a **Migration Plan** in the following format:

```json
{
  "features": {
    "core-engine": {
      "design": "path/to/design.md",
      "plans": ["path/to/plan1.md", "path/to/plan2.md"],
      "ideas": [],
      "chat_logs": ["path/to/chat.md"]
    },
    "vscode-extension": { ... },
    "ai-integration": { ... }
  },
  "files_to_split": [
    {
      "path": "designs/big-design.md",
      "reasoning": "This file covers both core engine and AI integration. Should be split into two design docs.",
      "suggested_parts": [
        { "feature": "core-engine", "filename": "core-engine-design.md", "extract_headings": ["## Core Engine", "## State Management"] },
        { "feature": "ai-integration", "filename": "ai-integration-design.md", "extract_headings": ["## AI Handshake", "## Context Injection"] }
      ]
    }
  ],
  "files_to_archive": ["ideas/old-idea.md", "designs/workflow-design-v0.md"],
  "operations": [
    { "action": "move", "source": "designs/workflow-design-v2.md", "dest": "features/core-engine/core-engine-design.md" },
    { "action": "move", "source": "plans/workflow-plan-001.md", "dest": "features/core-engine/plans/core-engine-plan-001.md" }
  ]
}
