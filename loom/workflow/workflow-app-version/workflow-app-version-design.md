---
type: design
id: de_01KQYDFDDF3J8F6P5F3VJQ8BWQ
title: Application Version Tracking in Workflow Documents
status: done
created: "2026-04-12T00:00:00.000Z"
updated: 2026-05-06
version: 1.0.01
tags: [versioning, release, planning, frontmatter]
parent_id: de_01KQYDFDDF4QG72MKRE0KB2HZ4
requires_load: []
---

# Application Version Tracking in Workflow Documents

## Goal

Define a consistent mechanism for tracking which version of the application a feature or document is associated with—both **planned target version** and **actual released version**. This enables release planning, changelog generation, and historical traceability directly within the workflow system.

## Context

The workflow system currently tracks document versions (`version` field) for staleness detection. However, there is no field to indicate:

- **Target app version:** The intended release in which this feature will ship.
- **Actual app version:** The release in which the feature actually shipped.

This information is valuable for:

- **Release planning:** Knowing which features are slated for v1.2.0.
- **Changelog automation:** Generating release notes from completed features.
- **Historical reference:** Understanding when a change was introduced.
- **VS Code extension grouping:** Filtering the tree view by target or actual app version.

The challenge is to design field names and semantics that are clear, unambiguous, and consistent with the existing frontmatter schema.

# CHAT

## User:
We need to include "app version" tracking in the frontmatter. For example:
- `target-app-version`: planned future release
- `app-version`: actual release when shipped

Are these names good? Any better alternatives? Should this be per-document or only on the design document? How should the VS Code extension use this for grouping? Let's design this.

## AI:
Excellent question. Let's break it down.

### 1. Field Naming

Your proposed names are clear, but we should consider consistency with existing fields and potential for confusion with document `version`.

| Proposed Name | Pros | Cons |
|---------------|------|------|
| `target-app-version` | Explicit, self-documenting | Hyphenated; slightly verbose |
| `app-version` | Short, direct | Could be confused with document version |
| `release_version` | Common term | "Release" might imply the document itself |
| `shipped_in` | Concise, action-oriented | Less formal |
| `planned_for` | Clear for planning | Not obvious it's an app version |

**Recommendation:** Use `target_release` and `actual_release`. This avoids overloading the word "version" (since `version` already refers to the document revision). It also aligns with semantic versioning terminology (e.g., "release v1.2.0").

Example:
```yaml
---
type: design
version: 3
target_release: "1.2.0"
actual_release: null   # or omitted until shipped
---
```

### 2. Scope: Which Documents Need These Fields?

Not all documents require release tracking. The primary scope is the **Design** document, as it represents the feature. Plans, ideas, and contexts inherit the release context from their parent design.

- **Design:** Should have both `target_release` and `actual_release`.
- **Plan:** Could optionally have a `target_release` if a feature is split across releases, but this adds complexity. MVP: only Design tracks release.
- **Idea:** Typically not associated with a release until it becomes a design.
- **Context:** Not applicable.

The VS Code extension can read the `target_release` from the feature's design and use it for grouping and filtering.

### 3. Semantics and Lifecycle

| Field | When Set | Value |
|-------|----------|-------|
| `target_release` | During planning (design `active` or `closed`) | Semantic version string, e.g., `"1.2.0"` or `"Next"` |
| `actual_release` | When feature is `done` and shipped | Semantic version string or `null` if not yet shipped |

**Validation Rule:** `actual_release` should only be present if the design status is `done`. Optionally, it must be a valid semver.

### 4. VS Code Extension Usage

- **Group by Release:** Tree view can group features by `target_release` (planned) or `actual_release` (shipped).
- **Filtering:** Show only features targeting a specific release.
- **Status Bar:** Display `Target: v1.2.0` when a feature is selected.
- **Changelog Generation:** `wf changelog --since v1.1.0` could aggregate all designs with `actual_release` in that range.

### 5. Relationship to Git Tags

The workflow system is Git‑native. App releases are typically tagged in Git (e.g., `v1.2.0`). The `actual_release` field can serve as a cross‑reference to the Git tag, enabling traceability without parsing Git history.

### 6. Alternative: Separate Release Document

For larger projects, a dedicated `release.md` document type could be introduced, listing the features included in a release. This is more scalable for teams. However, for MVP, embedding release info in the design is simpler.

**Decision:** Adopt `target_release` and `actual_release` fields in the Design document frontmatter. These fields are optional but recommended for release planning.

## Next Steps

- Update `design-template.md` to include commented `target_release` and `actual_release` fields.
- Add validation rule in default `workflow.yml` to check semver format.
- Design VS Code tree view grouping by `target_release`.

## Rafa:

I updated `design-template.md` and append these fields at the end because the are special 
```markdown
---
type: design
id: {type-id}
title: "{Title}"
status: draft | active | done | cancelled | implementing | implemented
created: {YYYY-MM-DD}
version: 1.0.0
tags: []
parent_id: {parent_id} 
child_ids: []          
requires_load: []
target_release: "1.0.0"
actual_release: null   # or omitted until shipped
---
```

- I renamed ``workflow.yml` to `default-wf.yml` to explicit show it is the default but users can create customs
Tell me the rule to add 

## AI:

Your updates to `design-template.md` look correct. Adding `target_release` and `actual_release` at the end of the frontmatter is a good practice—they are optional and keep the core fields prominent.

Regarding the validation rule for `default-wf.yml`, here is the rule to enforce that `actual_release` follows semantic versioning when present, and that it should only be set when the design is `done`:

```yaml
validation:
  - rule: "actual_release must be a valid semver or null"
    check: "actual_release == null or actual_release matches '^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9\\.]+)?(\\+[a-zA-Z0-9\\.]+)?$'"
  - rule: "actual_release should only be set when status is done"
    check: "actual_release == null or status == 'done'"
```

**Note on regex:** The semver pattern above is simplified. For strict validation, use the official semver regex or a library in the extension. Since `workflow.yml` uses a simple expression language, we may need to implement a `is_semver()` helper function in the validator. For now, the regex check is a reasonable placeholder.

**Regarding `default-wf.yml` renaming:** Good call. This clarifies that users can create their own `workflow.yml` to override it. The extension should look for `workflow.yml` first, then fall back to `default-wf.yml` (or load `default-wf.yml` as the base configuration). Document this discovery behavior in `WORKFLOW_YML.md`.

The changes are ready to be committed. The next step is to implement the validation rule parser in the core engine.
