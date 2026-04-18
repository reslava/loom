---
type: design
id: loom-analysis-design
title: "REslava Loom — Pre-VSCode Codebase Analysis"
status: active
created: 2026-04-18
version: 1
tags: [analysis, architecture, refactor, vscode, vision]
parent_id: core-engine-design
child_ids: []
requires_load: [core-engine-design, body-generators-design, app-layer-refactor-design]
target_release: null
actual_release: null
---

# REslava Loom — Pre-VSCode Codebase Analysis

## Goal

Provide an honest, comprehensive assessment of the codebase as it stands before starting the VS Code extension. Surface bugs, architectural gaps, code quality issues, and unresolved design decisions that should be addressed — or at least understood — before building the visual layer on top of them.

## Context

The core engine, filesystem layer, application layer, and CLI are functionally complete and tested. The VS Code extension work is about to begin, making this a natural inflection point. Building the extension on top of shaky foundations would compound any existing problems. This document captures everything worth knowing before crossing that threshold.

# CHAT

## Rafa:
Before I start on the VS Code extension, I want a full, honest analysis of where the project stands. Read everything — the codebase, threads, archive, references. Tell me what you think. Strengths, weak points, bugs, vision, new ideas. Be direct.

## AI — Full Codebase Analysis

---

### 1. Overall Impression

This is genuinely good work. The architecture is coherent, the philosophy (filesystem as database, derived state, human-in-the-loop AI) is sound and differentiating, and the layered separation (core → fs → app → cli/vscode) is clean enough that the VS Code extension should be a natural extension of what already exists. Most importantly, the design documentation and the code actually match each other — which is rare.

That said, there are a handful of real bugs, several architectural inconsistencies that survived the refactor, and a few design decisions that were deferred long enough that they are now blocking clarity on the VS Code layer.

---

### 2. Confirmed Bugs [ALL FIXED ✅]

#### ✅ 2.1 `ConfigRegistry.removeLoom` — Index Off-by-One After Splice

**File:** `packages/core/src/registry.ts`

```typescript
this.registry.looms.splice(index, 1);
// BUG: removedLoom is read after splice — index is now invalid
const removedLoom = this.registry.looms[index];
if (this.registry.active_loom === removedLoom?.path) {
  this.registry.active_loom = null;
}
```

`Array.splice` modifies the array in place. After `splice(index, 1)`, `this.registry.looms[index]` is the item *after* the removed one, not the removed one. The removed loom should be captured *before* splicing.

**Fix:**
```typescript
const removedLoom = this.registry.looms[index]; // capture FIRST
this.registry.looms.splice(index, 1);
if (this.registry.active_loom === removedLoom?.path) {
  this.registry.active_loom = null;
}
```

#### ✅ 2.2 `weaveDesign.ts` — Raw Regex Frontmatter Parsing

**File:** `packages/app/src/weaveDesign.ts`

The `findIdeaFile` function reads idea documents using raw regex instead of `loadDoc`:

```typescript
const idMatch = content.match(/^id:\s*["']?(.+?)["']?\s*$/m);
const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
```

This bypasses the canonical YAML frontmatter parser (`gray-matter`), skips validation, and will silently misparse titles containing colons or quotes. It also means the canonical `serializeFrontmatter` roundtrip is not used when auto-finalizing ideas, so the output format could diverge.

**Fix:** Use `loadDoc` + `saveDoc` for idea auto-finalization, the same way `finalize.ts` does it.

#### ✅ 2.3 `app/src/validate.ts` — Validation Utilities Not Used

`validation-utils-plan-001` was marked `✅ done`, but `packages/app/src/validate.ts` re-implements the same helpers inline:

```typescript
// In app/src/validate.ts — duplicated from core/src/validation.ts
function validateParentExists(doc: Document, index: LinkIndex): boolean { ... }
function getDanglingChildIds(doc: Document, index: LinkIndex): string[] { ... }
function validateStepBlockers(plan: PlanDoc, index: LinkIndex): string[] { ... }
function validateDesignRole(doc: DesignDoc): string | null { ... }
```

These are identical to (or minor variants of) the functions in `packages/core/src/validation.ts`. The extraction plan was completed in `core`, but the `app` use-case never adopted the extracted functions. This means any bug fix in `core/validation.ts` will not flow through to `app/validate.ts`.

**Fix:** Import from `core/dist/validation` in `app/src/validate.ts` and delete the local copies.

#### ✅ 2.4 `entities/thread.ts` — Import at End of File (Structural Issue)

**File:** `packages/core/src/entities/thread.ts`

```typescript
export interface Thread { ... }

// Re-export Document type to avoid circular dependencies
import { Document } from '../types';  // ← import at end of file
```

This is semantically valid TypeScript (hoisted), but it is confusing and signals an unresolved circular dependency concern. The comment "to avoid circular dependencies" suggests this was a workaround, not a solution. The `Thread` interface references `Document[]` in `allDocs`, while `types.ts` imports `Thread` from `entities/thread`. This circular relationship should be resolved properly when `refactor-imports-plan-001` is implemented.

---

### 3. Architectural Inconsistencies

#### ✅ 3.1 `types.ts` is Still a Re-Export Facade

`refactor-imports-plan-001` (status: `draft`) was supposed to eliminate `types.ts` as a re-export layer and force direct imports from entity modules. This plan was explicitly deferred until after the app layer refactor. The app layer refactor is now complete — this plan should be promoted and executed before the VS Code extension adds yet another consumer importing from `types.ts`.

Every new import added in the VS Code extension that goes through `types.ts` makes the eventual migration larger.

#### ✅ 3.2 `getActiveLoomRoot()` Has Two Implementations With Inverted Priority

There are two implementations with opposite resolution order:

| File | Order |
|------|-------|
| `packages/fs/src/utils/workspaceUtils.ts` | cwd walk-up FIRST, then global registry |
| `packages/core/src/registry.ts` design | global registry FIRST, then cwd walk-up |

The current `workspaceUtils.ts` implementation prioritizes mono-loom (cwd walk-up). This means: if you're in any directory that has a `.loom/` ancestor, the global registry is completely ignored, even if a different loom is active. This is actually a reasonable choice for mono-loom users, but it is not the behavior described in the multi-workspace design and it is not documented clearly.

This decision needs to be made explicit — it is currently an implicit behavior that will surprise VS Code extension users who switch looms and then open a project folder.

#### ✅3.3 `weavePlan` Has Two Implementations

##### Rafa:
- `app-use-cases-completion-plan.md` has the old way, code is correct

There are two `weavePlan` functions:
- `packages/app/src/weavePlan.ts` — uses `saveDoc` from fs
- The earlier version in the plan doc uses `fs.outputFile` directly

The CLI command `weavePlanCommand` currently calls the `app/src/weavePlan.ts` version, which is correct. But the two implementations differ in how they construct the `PlanDoc` (one creates a full `PlanDoc` typed object, the other builds a raw frontmatter + body string). The `app` version is correct; the plan doc version should be considered superseded.

#### 3.4 `PlanDoc.steps` Is Not Loaded by `loadThread`

`parseStepsTable` is called in `frontmatterLoader.ts` for plan documents:
```typescript
if (doc.type === 'plan' && parsed.content) {
  doc.steps = parseStepsTable(parsed.content);
}
```

But `PlanDoc.steps` is typed as `PlanStep[]` — a required field with no default. If `parseStepsTable` returns an empty array (e.g., on a freshly generated plan before any steps are written), this is fine. But the `PlanDoc` interface declares `steps` as required without `| undefined`, so any plan document without a `# Steps` table will produce a type-valid but semantically incomplete object. The body generators now produce a placeholder table, which mitigates this, but it should be made explicit.

---

### 4. Design Debt Worth Addressing Before VSCode

#### 4.1 `ChatDoc` Type Is Declared But Not Implemented

`DocumentType` in `base.ts` includes `'chat'` as an option:
```typescript
export type DocumentType = 'idea' | 'design' | 'plan' | 'ctx' | 'chat';
```

But there is no `ChatDoc` entity, no `chatReducer`, no `chatEvents`, no body generator, and no `loadThread` handling for chat documents. The `new-chat-doc-type-idea.md` is archived as `deferred`. Including `'chat'` in the `DocumentType` union without an implementation is a type lie — it will cause unexpected behavior in any switch/case that tries to be exhaustive over `DocumentType`.

**Recommendation:** Either remove `'chat'` from `DocumentType` until the feature is implemented, or add a minimal `ChatDoc` stub with the `type: never` sentinel.

#### 4.2 `role` Field Has No Validation at Document Creation Time

`DesignDoc.role` (`'primary' | 'supporting'`) is validated by `loom validate` after the fact, but nothing enforces it at creation time. `weaveDesign` sets `role: 'primary'` correctly, but any manually created design file (or one written by an AI) that omits `role` will pass `loadDoc` silently and only surface as a warning during `loadThread`. In the VS Code tree view, a missing `role` means the design won't appear as the thread anchor — the thread will simply be missing.

**Recommendation:** Add a `role: 'primary'` default in `createBaseFrontmatter` when `type === 'design'`, or explicitly require it in `loadDoc` for design documents.

#### 4.3 The `requires_load` Field Does Nothing Yet

Every document has a `requires_load` array in frontmatter, referenced heavily in the AI integration design. But no current code path reads or acts on `requires_load`. The field is loaded, stored, and serialized — but never traversed to actually load the referenced documents into context. This is fine for the CLI, but the VS Code native AI client (when built) will need this implemented. It should not be forgotten.

---

### 5. Code Quality Observations

#### 5.1 Strong Points

- **Dependency injection is consistent and correct** across all app use-cases. The `deps` pattern will make the VS Code extension straightforward to wire up.
- **`serializeFrontmatter` is deterministic.** Stable key order and inline arrays mean `git diff` output is clean and predictable.
- **Atomic writes** in `frontmatterSaver.ts` with EXDEV fallback for cross-device moves — this is production-quality I/O.
- **`parseStepsTable` / `generateStepsTable` / `updateStepsTableInContent` are well-contained** in `planTableUtils.ts`, with the Markdown table serving as both a human-readable view and the serialized state.
- **The event/reducer pattern** (`designReducer`, `planReducer`) with `assertStatus` guards makes invalid transitions impossible at the type level and runtime.
- **`buildLinkIndex` is fast and correct.** O(N) scan, incremental updates designed for.

#### 5.2 Areas to Tighten

- **Error messages in reducers** are good but not user-facing enough. When `assertStatus` throws, the CLI catches and prints `e.message` directly. These messages (e.g., `"Invalid transition: ACTIVATE_DESIGN requires status draft, got 'active'"`) are fine for developers but raw for end users. The deferred `CliError` class idea is worth revisiting.
- **`summarise.ts`** — both the CLI command version and `app/src/summarise.ts` use simple string-matching heuristics for extracting goal, decisions, and open questions. These are placeholder implementations. The design says "real implementation would use AI" but this is not flagged prominently. Any user running `loom summarise-context` today will get a very thin summary.
- **`weavePlan`** auto-finalizes the design if not `done` by directly writing `status: 'done'` without firing the `FINALISE_DESIGN` event or running the reducer. This bypasses the event system and means `mark_children_staled` / other effects would not run if they were wired. It works today because `FINALISE_DESIGN` has no effects — but it sets a dangerous precedent.

---

### 6. Vision & Future Ideas

#### 6.1 The VS Code Extension Is the Unlock

The CLI is solid, but Loom's value proposition is most legible in the VS Code tree view. The `loom status` output in a terminal is functional; seeing a thread hierarchy with staleness badges, status colors, and one-click actions is when the "document-native workflow OS" vision becomes viscerally obvious. Everything done so far — the clean `app` layer, the link index, the ViewModel design — was architected specifically so the extension can be thin. That investment is about to pay off.

#### 6.2 AI Client Is the Second Unlock

The `requires_load` field, the `-ctx.md` summarization, the handshake protocol, the `loom ai respond` / `loom ai propose` commands — all of this is designed but unimplemented. The token optimization design alone is sophisticated enough that implementing it correctly would differentiate Loom significantly from any other "AI + documents" tool. The priority after the VS Code tree view should be the native AI client.

#### 6.3 `ChatDoc` + `loom chat` Deserves Promotion From Deferred

The `new-chat-doc-type-idea.md` is archived as deferred, but the informal chat workflow is actually the *entry point* for the system. A user's first interaction is almost always "I have an idea, let me think it through with AI." The current flow (weave idea → finalize → weave design → chat inside design) is a lot of steps. A `loom chat new` that creates a lightweight conversation file, and `loom promote` to turn it into an idea/design, is a much lower-friction onboarding path. It is also already fully designed in the CLI reference.

#### 6.4 Plan Steps v2 (Frontmatter-First) Is Worth Scheduling

`plan-steps-v2-design.md` is `draft` but the problem it solves — fragile table parsing, no stable step IDs, AI agents struggling to generate consistent tables — is real and growing. The current `parseStepsTable` works for human-authored plans but will break down as soon as an AI agent tries to generate a plan programmatically. Scheduling this for `0.6.0` (after the extension is stable) is reasonable.

#### 6.5 `loom doctor` Is Underestimated

The deferred `loom-doctor-idea.md` describes a diagnostic + repair command. In practice, after a team starts using Loom, merge conflicts in frontmatter and manually renamed files will be the most common failure modes. A `loom doctor --fix` that can heal broken `parent_id` links and mismatched file names will be disproportionately valuable relative to its implementation cost.

#### 6.6 Validation Extraction Should Power VS Code Diagnostics Natively

The `LinkIndex` + `validation.ts` combination was built with VS Code diagnostics in mind (`vscode-extension-plan-004` step 7). When implemented, the extension should show yellow squiggles under broken `parent_id` values in frontmatter, red icons on stale plans in the tree view, and inline warnings when a plan's `design_version` is behind. This is the "surfaces inconsistencies clearly" design principle made real — and it requires no new design work, only wiring what already exists.

#### 6.7 Multi-Loom in the Tree View Is a Meaningful UX Moment

The `vscode-extension-toolbar-design.md` describes a loom selector in the toolbar. When implemented correctly — showing `🧵 default ▼` with a quick-pick to switch — it will make the multi-loom architecture tangible. Most tools that support multiple workspaces do so clumsily. Doing it elegantly in the toolbar is a polish opportunity worth prioritizing over some other features.

---

### 7. Recommended Pre-VSCode Actions (Ordered by Impact)

| Priority | Action | Effort | Risk if Skipped |
|----------|--------|--------|-----------------|
| 1 ✅| Fix `ConfigRegistry.removeLoom` bug | 5 min | Low (unused in current flows) |
| 2 | Fix `weaveDesign` raw regex frontmatter parsing | 1h | Medium — will affect any idea with `:` in title |
| 3 | Remove `'chat'` from `DocumentType` union (until implemented) | 10 min | Low-medium — type unsafety |
| 4 | Fix `app/src/validate.ts` to use `core/validation.ts` functions | 30 min | Low (correctness only) |
| 5 | Add `role: 'primary'` default in `weaveDesign` (already done) / enforce in `loadDoc` | 30 min | Medium — missing role = invisible thread in VS Code |
| 6 | Execute `move-thread-to-entities-plan-001` | 1h | Low now, grows as VS Code adds consumers |
| 7 | Execute `cli-delegate-directory-creation-plan-001` | 1h | Low |
| 8 ✅| Document the `getActiveLoomRoot` priority order explicitly | 15 min | Medium — will confuse multi-loom VS Code users |

Items 6, 7, 8 are already in the roadmap (`vscode-roadmap-reference.md`). Items 1–5 are bugs/gaps not yet tracked.

---

## Decision

This analysis should be reviewed before starting `vscode-extension-plan-004`. The five bugs/gaps in section 7 (items 1–5) should be resolved in a short cleanup session. Items 6–8 from the existing roadmap can proceed as planned. None of the issues found are architectural — the foundation is sound.

## Next Steps

- Fix the five bugs/gaps listed in section 7, items 1–5 (suggest a single `pre-vscode-cleanup-plan-001.md`).
- Proceed with `move-thread-to-entities-plan-001` and `cli-delegate-directory-creation-plan-001` as planned.
- Then begin `vscode-extension-plan-004`.
- Create a `chat-doc-type-design.md` when the AI client work begins — it belongs in the onboarding flow, not the archive.
