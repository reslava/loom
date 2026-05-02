---
type: done
id: mvp-plan-to-publish-plan-done
title: Done — MVP — Plan to publish
status: final
created: "2026-05-02T00:00:00.000Z"
version: 4
tags: []
parent_id: mvp-plan-to-publish-plan
child_ids: []
requires_load: []
---
# Done — MVP — Plan to publish

## Step 1 — **Phase 0** — Audit every toolbar button: `weaveCreate`, `threadCreate`, `chatNew`, `weaveIdea`, `weaveDesign`, `weavePlan`, `setGrouping`, `setStatusFilter`, `setTextFilter`, `generateGlobalCtx`, `toggleArchived`, `refresh`, `reconnectMcp`. Verify each invokes its handler, mutates state correctly, and refreshes the tree

Static audit of toolbar buttons (`view/title`).

**Result:** 12/13 wired correctly. 1 stub.

| Button | Status | Note |
|--------|--------|------|
| weaveCreate | ✅ | path bug already fixed (`weaves/` → `loom/`) |
| threadCreate | ✅ | path bug already fixed |
| chatNew | ✅ | |
| weaveIdea / weaveDesign / weavePlan | ✅ | |
| setGrouping / setStatusFilter / setTextFilter | ✅ | |
| toggleArchived / refresh / reconnectMcp | ✅ | |
| generateGlobalCtx | ⚠️ stub | already tracked as step 10 (Phase 2) |

No new toolbar bugs. `generateGlobalCtx` stub is intentional and queued.

## Step 2 — **Phase 0** — Audit every inline (item-context) button: `weaveIdea`, `weaveDesign`, `weavePlan`, `summarise`, `finalize`, `refineDesign`, `startPlan`, `doStep`, `completeStep`, `validate`, `chatReply`, `promoteToIdea`, `promoteToDesign`, `promoteToPlan`, `refineIdea`, `refinePlan`, `closePlan`, `rename`, `archive`, `delete`. Verify the `when` clause shows them on the right node types and the handler receives the node

Static audit of inline (item-context) buttons (`view/item/context`).

**Result:** 14/19 wired correctly. **5 broken** — promote/refine handlers ignore the `node` argument and operate on `vscode.window.activeTextEditor` instead.

| Button | Status | Finding |
|--------|--------|---------|
| weaveIdea / weaveDesign / weavePlan | ✅ | when-clause + handler match |
| summarise / finalize / refineDesign | ✅ | |
| startPlan / completeStep / closePlan | ✅ | extract plan from node |
| doStep | ✅ | extracts `node?.doc` correctly |
| validate | ⚠️ | ignores node param, but launches modal — acceptable |
| chatReply | ✅ | uses `node?.doc?.id` |
| rename / archive / delete | ✅ | use node fields |
| **promoteToIdea** | ❌ | handler does not accept `node`; reads `activeTextEditor` |
| **promoteToDesign** | ❌ | same |
| **promoteToPlan** | ❌ | same |
| **refineIdea** | ❌ | same |
| **refinePlan** | ❌ | same |

**Bug class** (single root cause): five commands have `view/item/context` registrations whose `when` clauses depend on tree contextValue, but the implementations were written before tree-context wiring landed and still rely on the active editor. Tree-menu invocations succeed only by accident (when the active editor happens to match the same doc the user right-clicked).

These five rows go under step 5 as bugs to fix.

## Step 3 — **Phase 0** — Fix `weaveCreate` / `threadCreate` path bug (wrote to `weaves/` instead of `loom/`). Confirm fix lands in vsix; smoke-test creating an empty weave and an empty thread end-to-end

`weaveCreate.ts` and `threadCreate.ts` path bug fixed in prior session (`'weaves'` → `'loom'`). Rafa confirmed both work after vsix repackage + reinstall: empty weave and empty thread create successfully under `loom/`.

## Step 4 — **Phase 0** — Repair selection→context wiring so `loom.selectedWeaveId` is set when a weave OR any descendant doc is clicked (currently driven only by `node.weaveId`; verify it's set for thread-level and doc-level selections too)

Static audit of selection→context wiring (`packages/vscode/src/extension.ts`).

**Result:** ⚠️ Fragile but functional in current code.

- `loom.selectedWeaveId` is set in the tree's `onDidChangeSelection` handler via `setContext('loom.selectedWeaveId', node?.weaveId ?? '')`.
- Every `TreeNode` (weave / thread / doc / chat / plan / chats-section / plans-section) carries a `weaveId` field set by `treeProvider.ts`, so reading `node?.weaveId` works for all node types — selecting a doc, thread, chat, or section all yield the correct weave.
- **Caveat:** there is no parent-walking fallback. If a future node type is added without setting `weaveId` on it, `loom.selectedWeaveId` silently goes empty. Not currently broken, but a latent footgun.
- Global-level selections (loom-ctx, global chat, refs) correctly leave `loom.selectedWeaveId` empty — toolbar buttons relying on a weave context (`weaveCreate` etc.) fall back to input prompts.

**Verdict:** No bug to fix today. File a hygiene note: when adding new node types, always set `weaveId` (or introduce a `getWeaveId(node)` helper that walks parents).
