---
type: design
id: workflow-docs-directories-design
title: "Workflow Documents Directory Structure"
status: active
created: 2026-04-12
version: 1.0.0
tags: [structure, directories, filesystem, organization]
parent_id: workflow-design-v2
child_ids: []
requires_load: []
---

# Workflow Documents Directory Structure

## Goal

Define a clear, scalable, and intuitive directory layout for organizing workflow documents (ideas, designs, plans, contexts, references) within a project workspace. The structure must support both feature-centric grouping and cross-cutting reference materials while remaining compatible with Git and the VS Code extension's tree view.

## Context

The workflow system treats Markdown files as the primary data store. The physical arrangement of these files affects:

- **Discoverability:** How easily a user can locate a specific feature's documents.
- **Derived Feature Resolution:** The algorithm that groups documents into Features relies on parsing `parent_id` fields, not directory location. However, the directory structure can reinforce the logical grouping.
- **Reference Management:** Shared resources (images, external docs, research) may be global or feature-specific.
- **Scalability:** The layout should accommodate hundreds of features without becoming unwieldy.

Two primary organizational models have been considered:

1. **Type‑Based Grouping:** All documents of a given type reside in a single top‑level folder (e.g., `designs/`, `plans/`). This is flat and simple but scatters related documents across the filesystem.
2. **Feature‑Based Grouping:** Each feature resides in its own folder containing all related documents (design, plans, ideas, references). This co‑locates everything for a feature but may complicate sharing references.

This document will evaluate the trade‑offs and propose a final directory layout.

# CHAT

## User:
I'm unsure about the final directory structure. Before we had docs grouped by type: `wf/designs/`, `wf/ideas/`, `wf/plans/`, `wf/references/`. Now we're moving to grouping by feature, e.g., `wf/featureA/designs/`, `wf/featureA/plans/`. But we also need a place for references that are common to all features. I think we need a deep design on this before implementing. Let's discuss options and decide.

## AI:
You're right to pause and design this carefully. The directory structure is the first thing users will see, and it influences how they think about the system.

Let's start by outlining the functional requirements for the layout:

1. **Feature Isolation:** All documents belonging to a single logical feature should be easily identifiable and co‑located for copying, archiving, or sharing.
2. **Type Identification:** The system (and users) need to know a document's type. Currently, this is stored in frontmatter (`type: design`), so the filename and directory do **not** dictate type. This gives us flexibility.
3. **Reference Management:** There are two kinds of references:
   - **Feature‑specific:** Images, PDFs, or notes that are only relevant to one feature.
   - **Global:** Style guides, architecture decision records, research that apply across the project.
4. **Scalability:** Flat folders with hundreds of files become unusable. Grouping by feature creates many subdirectories, which is generally more scalable in modern filesystems and Git.
5. **Derived Feature Algorithm Independence:** The `Feature` aggregate is built by traversing `parent_id` links. The physical layout is a convenience, not a hard requirement. This allows us to change the layout later without breaking the data model.

Given these, I see three viable layout patterns. Let's compare them.

### Option A: Type‑Based (Flat)

```
.wf/                        # All workflow data
├── ideas/
│   └── add-dark-mode.md
├── designs/
│   └── payment-system.md
├── plans/
│   ├── plan-001.md
│   └── plan-002.md
├── ctx/
│   └── payment-system-ctx.md
└── references/
    ├── global/
    └── feature-a/
```

**Pros:** Simple to implement, no nested folders.
**Cons:** Scatters related documents; feature grouping must be inferred solely from `parent_id`; does not visually reinforce the Feature concept.

### Option B: Feature‑Based (Nested)

```
.wf/features/               # All features live here
├── payment-system/
│   ├── design.md           # The anchor document
│   ├── idea.md             # Optional precursor
│   ├── plans/
│   │   ├── plan-001.md
│   │   └── plan-002.md
│   ├── ctx/
│   │   └── session-2026-04-12.md
│   └── references/         # Feature-specific references
│       └── api-spec.pdf
├── user-auth/
│   ├── design.md
│   └── ...
└── _archive/               # Completed/abandoned features
    └── old-checkout/
.wf/references/             # Global references shared by all features
    ├── style-guide.md
    └── adr/
```

**Pros:** Clear co‑location of all feature documents; easy to archive or move a feature; visually reinforces the Feature as a first‑class concept; supports feature‑specific references.
**Cons:** Slightly deeper paths; requires a separate location for global references.

### Option C: Hybrid (Type Subfolders within Feature)

This is a variation of Option B where, inside the feature folder, we still have type subfolders:

```
.wf/features/payment-system/
├── designs/
│   └── main.md
├── plans/
│   ├── plan-001.md
│   └── plan-002.md
├── ideas/
│   └── initial.md
└── references/
```

**Pros:** Even more explicit type separation within a feature; might feel familiar to users coming from Option A.
**Cons:** Adds an extra level of nesting; the system must scan subdirectories to find the design document; increases complexity of `loadFeature`.

### Preliminary Recommendation

**Option B (Feature‑Based, flat inside feature folder)** strikes the best balance. It places `design.md` at the feature root, making it the obvious anchor. Plans, ideas, and contexts can be directly in the feature folder or in subfolders (`plans/`). Since the system identifies documents by frontmatter `type`, the filename and location are flexible. For example, `plan-*.md` files could live in a `plans/` subfolder for tidiness, but the system could also find them at the feature root.

Let's refine the exact structure of a feature directory. Some open questions:

- Should `design.md` be mandatory at the feature root? (Yes, as the anchor)
- Should we allow multiple design documents per feature? (Probably not; that's an Epic)
- Where do `idea.md` files live? (At feature root or in `ideas/` subfolder?)
- How do we handle features that start as an idea before a design exists? (Maybe the feature folder is created when the idea is promoted, or the idea lives in a global `ideas/` staging area.)

What are your thoughts on these questions? Do you have a preference among the options?

## User:

I prefer Option B because devs think in features when develop and the vsix UX will align by default with tree.

## User:

I think using this structure together with custom workflows might conflict.
What you think?
Suggestions?

## AI:

You raise an important point. The physical directory structure (Option B) and custom workflows (`workflow.yml`) serve different but overlapping purposes. Let's analyze potential conflicts and how to mitigate them.

### Potential Conflicts

| Concern | Description | Mitigation |
|---------|-------------|------------|
| **Document discovery vs. `file_pattern`** | Custom workflows define `file_pattern` (e.g., `"design.md"`, `"plan-*.md"`). If the directory structure places files in subfolders (e.g., `plans/plan-001.md`), the pattern must account for that (e.g., `"plans/plan-*.md"`). | In `workflow.yml`, `file_pattern` can include paths relative to the feature root. Users can specify `"plans/*.md"` to match files in the `plans/` subdirectory. |
| **Feature root identification** | The system needs to know the feature root directory to resolve relative paths. Option B assumes the feature root is the folder containing `design.md`. Custom workflows might define a different anchor document. | The system can identify the feature root as the directory containing the document that matches the `child_of: null` or is the designated root type (e.g., `design`). This is independent of the exact folder name. |
| **Multiple designs per feature** | Custom workflows could theoretically allow multiple `design` documents in one feature folder, which would break the 1:1 feature:design assumption. | Validation rule: only one document of the root type per feature directory, or the feature model must be extended to support multiple root documents (epics). For MVP, enforce one root document per feature folder. |
| **Nested features** | Users might want sub-features inside a feature folder. Option B doesn't explicitly support this. | The system can treat any subdirectory containing a root document as a separate feature. The VS Code tree view can display hierarchical features if `parent_id` links are used. |

### Recommendations

1. **Keep the physical structure flexible.** The system should not hardcode assumptions like "design.md is at the feature root." Instead, it should identify features by finding documents that satisfy the root type defined in the active workflow (e.g., the document type with `child_of: null` or no parent). This allows users to organize files as they prefer, as long as the frontmatter relationships are correct.

2. **Document best practices.** Provide examples in `WORKFLOW_YML.md` showing how to configure `file_pattern` for common directory layouts (flat, nested, etc.). Encourage users to adopt Option B as the recommended layout for new projects.

3. **Validation helper.** Add a `wf validate --fix-structure` command that can suggest moving files to match the expected layout based on `workflow.yml` patterns, reducing manual effort.

4. **Avoid over-engineering for MVP.** Start with a simple discovery algorithm: scan the entire `.wf/features/` directory recursively, parse all Markdown files with frontmatter, and build the feature graph from `parent_id` links. The physical layout is just a hint for humans; the system trusts the frontmatter.

### Conclusion

Option B and custom workflows are compatible if the system relies on frontmatter relationships rather than directory position. The key is to make `file_pattern` in `workflow.yml` flexible enough to accommodate subdirectories. With proper documentation, users can confidently organize their features without fear of breaking the system.

## User:

So we can solve this issue by adapting the `workflow.yml`

### TODO

all docs sufixs are `-{type}.md`, so default workflow shoul be:
```yaml
documents:
  - type: idea
    file_pattern: "-idea.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    parent_of: [design]
    version_field: "version"
    staled_field: "staled"

  - type: design
    file_pattern: "-design.md"
    statuses: [draft, active, closed, done, cancelled]
    initial_status: draft
    parent_of: [plan]
    child_of: idea
    version_field: "version"
    staled_field: "staled"

  - type: plan
    file_pattern: "plans/-plan-*.md"
```    
- Agree?

- If so update `default-wf.yaml`

## AI:

```markdown
## AI:
Yes, I agree with the suffix convention. Using `-{type}.md` (e.g., `payment-system-design.md`, `payment-system-idea.md`, `plans/payment-system-plan-001.md`) provides several benefits:

- **Immediate visual identification** of document type without opening the file.
- **Reduced ambiguity** when multiple document types exist in the same directory.
- **Simplified file patterns** in `workflow.yml` because the suffix acts as a natural discriminator.

### Updated `default-wf.yml` Document Patterns

Below is the revised `documents` section for `default-wf.yml` that incorporates the suffix convention and supports the recommended directory structure (Option B). The patterns use `**/` to match files at any depth under the feature root, giving users flexibility to place documents in subdirectories like `plans/` or `ctx/`.

```yaml
documents:
  - type: idea
    file_pattern: "**/*-idea.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    parent_of: [design]
    version_field: "version"
    staled_field: "staled"

  - type: design
    file_pattern: "**/*-design.md"
    statuses: [draft, active, closed, done, cancelled]
    initial_status: draft
    parent_of: [plan]
    child_of: idea
    version_field: "version"
    staled_field: "staled"

  - type: plan
    file_pattern: "**/*-plan-*.md"
    statuses: [draft, active, implementing, done, blocked, cancelled]
    initial_status: draft
    child_of: design
    version_field: "version"
    staled_field: "staled"

  - type: ctx
    file_pattern: "**/*-ctx.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    child_of: design   # or could be standalone
    version_field: "version"
    staled_field: "staled"
```

### Important Implementation Note

The `file_pattern` should be evaluated **relative to the feature root**, not the workspace root. The feature root is determined as the directory containing the design document (or the root-type document). When scanning for documents, the system should traverse subdirectories and match patterns accordingly.

For example, with the pattern `**/*-design.md` and a feature root `features/payment-system/`, the file `features/payment-system/payment-system-design.md` will match, as will `features/payment-system/designs/main-design.md`.

### Update `default-wf.yml` File

I'll now provide the complete updated `default-wf.yml` with the new document patterns and the previously defined events and validation rules. This file can replace the existing one in the repository.

```yaml
# default-wf.yml
# Built‑in workflow for idea → design → plan → done
name: "default-idea-design-plan"
version: 1

documents:
  - type: idea
    file_pattern: "**/*-idea.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    parent_of: [design]
    version_field: "version"
    staled_field: "staled"

  - type: design
    file_pattern: "**/*-design.md"
    statuses: [draft, active, closed, done, cancelled]
    initial_status: draft
    parent_of: [plan]
    child_of: idea
    version_field: "version"
    staled_field: "staled"

  - type: plan
    file_pattern: "**/*-plan-*.md"
    statuses: [draft, active, implementing, done, blocked, cancelled]
    initial_status: draft
    child_of: design
    version_field: "version"
    staled_field: "staled"

  - type: ctx
    file_pattern: "**/*-ctx.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    child_of: design
    version_field: "version"
    staled_field: "staled"

events:
  # Idea events
  - name: ACTIVATE_IDEA
    applies_to: idea
    from_status: draft
    to_status: active
    effects: []

  - name: COMPLETE_IDEA
    applies_to: idea
    from_status: active
    to_status: done
    effects: []

  - name: CANCEL_IDEA
    applies_to: idea
    from_status: [draft, active]
    to_status: cancelled
    effects:
      - delete_child_documents
        child_types: [design, plan]

  # Design events
  - name: CREATE_DESIGN
    applies_to: design
    from_status: draft
    to_status: draft
    effects:
      - create_child_document
        child_type: design
        template_path: "templates/design-template.md"

  - name: ACTIVATE_DESIGN
    applies_to: design
    from_status: draft
    to_status: active
    effects: []

  - name: CLOSE_DESIGN
    applies_to: design
    from_status: active
    to_status: closed
    effects: []

  - name: REOPEN_DESIGN
    applies_to: design
    from_status: closed
    to_status: active
    effects: []

  - name: REFINE_DESIGN
    applies_to: design
    from_status: [active, closed, done]
    to_status: active
    effects:
      - increment_version
      - mark_children_staled

  - name: FINALISE_DESIGN
    applies_to: design
    from_status: active
    to_status: done
    effects: []

  - name: CANCEL_DESIGN
    applies_to: design
    from_status: [draft, active, closed]
    to_status: cancelled
    effects:
      - delete_child_documents
        child_types: [plan]

  # Plan events
  - name: CREATE_PLAN
    applies_to: design
    from_status: done
    to_status: done
    effects:
      - create_child_document
        child_type: plan
        template_path: "templates/plan-template.md"

  - name: ACTIVATE_PLAN
    applies_to: plan
    from_status: draft
    to_status: active
    effects: []

  - name: START_IMPLEMENTING_PLAN
    applies_to: plan
    from_status: active
    to_status: implementing
    effects: []

  - name: COMPLETE_STEP
    applies_to: plan
    from_status: implementing
    to_status: implementing
    effects:
      - increment_step_counter

  - name: FINISH_PLAN
    applies_to: plan
    from_status: implementing
    to_status: done
    effects: []

  - name: BLOCK_PLAN
    applies_to: plan
    from_status: [active, implementing]
    to_status: blocked
    effects:
      - send_notification
        message: "Plan blocked, awaiting resolution"
        severity: warning

  - name: UNBLOCK_PLAN
    applies_to: plan
    from_status: blocked
    to_status: active
    effects: []

  - name: CANCEL_PLAN
    applies_to: plan
    from_status: [draft, active, implementing, blocked]
    to_status: cancelled
    effects: []

validation:
  - rule: "Plan cannot be active if its design is not done"
    check: "plan.status == 'active' => design.status == 'done'"
  - rule: "Design cannot be done if it has no plans"
    check: "design.status == 'done' => count(design.plans) > 0"
  - rule: "Public docs must not be stale when design version changes"
    check: "design.version == child.source_version"
  - rule: "actual_release must be a valid semver or null"
    check: "actual_release == null or actual_release matches '^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9\\.]+)?(\\+[a-zA-Z0-9\\.]+)?$'"
  - rule: "actual_release should only be set when status is done"
    check: "actual_release == null or status == 'done'"
```

### Next Steps

1. **Replace `default-wf.yml`** in the repository with the updated version above.
2. **Update document templates** to reflect the suffix naming convention in examples and placeholder filenames.
3. **Document the file pattern flexibility** in `WORKFLOW_YML.md` so users understand how to customize for their own layouts.

This update aligns the default configuration with the proposed directory structure while maintaining full backward compatibility for users who choose different naming conventions.