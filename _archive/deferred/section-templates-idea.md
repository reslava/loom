---
type: idea
id: section-templates-idea
title: "Composable Section Templates for Document Bodies"
status: deferred
created: 2026-04-17
version: 1
tags: [templates, customization, ux, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Composable Section Templates for Document Bodies

## Problem
The current body generators (`ideaBody.ts`, `designBody.ts`, etc.) hardcode the Markdown structure. While this ensures consistency, it prevents users from customizing the sections to fit their own workflows. A user writing a blog post may want a `## Next blog post` section instead of `## Next step`. Another may want to add a `## Budget` section to their designs.

The old `.loom/templates/` files allowed full document customization, but they were too coarse—changing the entire template meant duplicating the core structure. We need a way to allow **section‑level customization** while preserving Loom's expected document structure.

## Idea
Instead of a single template file per document type, introduce **composable section templates**. Each section of a document (e.g., `## Problem`, `## Next step`) is defined by a small Markdown fragment. The body generator assembles the final document by concatenating these fragments.

**Proposed structure:**
```
.loom/sections/
├── idea/
│   ├── problem.md
│   ├── idea.md
│   ├── why-now.md
│   ├── open-questions.md
│   └── next-step.md
├── design/
│   ├── goal.md
│   ├── context.md
│   └── chat-header.md
└── shared/
    └── (common sections)
```

**Example `next-step.md`:**
```markdown
## Next step
<!-- design | spike | discard -->
```

A user could customize it to:
```markdown
## Next blog post
<!-- article | instagram | linkedIn -->
```

**Fallback behavior:** If a custom section template is not found, Loom falls back to a built‑in default. This means users only override what they care about.

## Why Defer
- The MVP body generators are **sufficient** for initial adoption.
- This feature adds significant complexity (template discovery, fallback logic, validation).
- Real‑world usage patterns will inform which sections users *actually* want to customize.
- We have higher‑priority architectural work (Body Generators, Validation Extraction, VS Code extension).

## Open Questions
- Should sections be tied to document `type`, or can they be shared across types?
- How to handle required vs. optional sections?
- Should users be able to reorder sections?
- How to validate that customized sections still contain the expected placeholders?

## Next Step
Re‑evaluate after Body Generators are implemented and real user feedback is collected. Create `section-templates-design.md` and a corresponding implementation plan.

**Status: Deferred for post‑MVP consideration.**