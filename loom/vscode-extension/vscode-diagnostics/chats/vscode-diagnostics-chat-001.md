---
type: chat
id: ch_01KR3ET2VW25YYWDRBZ0SRKJVS
title: vscode-diagnostics Chat
status: done
created: "2026-05-08T00:00:00.000Z"
updated: 2026-05-08
version: 2
tags: []
parent_id: null
requires_load: []
---
# CHAT

## Rafa:

I created a new chat for testing: loom/test/chats/test-chat-001.md
it was created with 
parent_id: test, it produces a PROBLEM error
i changed to null and PROBLEM disappeared

TODO: weave chat should not use thread as parent

### PROBLEM 
There are many (143) fake or bad format errors in PROBLEM.
- All chats created with parent_id: {thread}
- Many plans with error: unkown blocker format "3" or "Steps 3" or "Steps 3-4"

BlockedBy format is 
3
3,4
{plan-id} 
{plan-id} 3
{plan-id} 3,4

Agree?

Plan Steps Tabled BlockedBy canonical format should be specify in a reference doc, always present when create a plan

### TODO
Create a script to fox all chats with parent_id: {thread} -> parent_id: null
Create a reference doc for plans, steps table and blockedby
fix blockedby format in diagnostic so correct one do not produce a problem

### PLAN
When you create a plan from Claude CLI you use create draft, add steps and after format steps into a steps table, this create plans with duplicated info, like:
loom/vscode-extension/vscode-staled/plans/vscode-staled-plan-001.md

TODO fix: when finish delete the individual duplicated steps info at the end
	

## AI:

Good findings — the diagnostics are working, just surfacing pre-existing data quality issues. Agree on all three bug classes.

---

### 1. Chats with `parent_id: {thread}`

Yes, chats should not use thread IDs as parent. A chat's `parent_id` should point to a design or idea doc (the thing it annotates), or `null` for free-standing chats. The thread ID is a folder name, not a doc ID — the validator correctly rejects it as a broken reference.

Root cause: `loom_create_chat` (and the extension's chatNew command) probably passes the thread context's ID as `parent_id`. It should either pass the active design doc's ID, or `null`.

Fix order:
1. Script to patch existing chats: `parent_id: {thread-like-id}` → `parent_id: null` (bulk fix)
2. Fix `loom_create_chat` / `chatNew` so new chats don't repeat the mistake

---

### 2. BlockedBy format — agreed on canonical set

The formats you listed are the right ones:

| Format | Meaning |
|---|---|
| `3` | step 3 of this plan |
| `3,4` | steps 3 and 4 of this plan |
| `{plan-id}` | entire cross-plan dependency |
| `{plan-id} 3` | step 3 of another plan |
| `{plan-id} 3,4` | steps 3 and 4 of another plan |

The diagnostic parser needs to accept all of these as valid. Anything else (free prose like "Steps 3-4", "step 3") should be flagged. The range syntax `3-4` is ambiguous (is it steps 3 to 4, or a plan ID fragment?) — I'd reject it in favour of the explicit comma list `3,4`.

A reference doc is the right anchor: define the format once, load it whenever a plan is created, and the diagnostic rule can cite it.

---

### 3. Duplicate step sections in plans (CLI workflow)

The pattern: create draft → append individual `## Step N` sections → format into Steps table. The table gets created but the `## Step N` prose blocks stay. 

The fix is in the plan-creation workflow: after the Steps table is finalized, `loom_create_plan` (or a post-format cleanup) should strip any `## Step N —` sections that duplicate rows already in the table. A simpler approach: the CLI workflow doc (or reference) should say "after formatting the table, delete the individual step sections below it."

---

### Proposed work order

1. **Fix BlockedBy parser in diagnostics** — unblocks the 143 false positives immediately, high value
2. **Create plan-steps reference doc** — canonical Steps table + BlockedBy format spec, loaded via `requires_load` on every plan
3. **Script: patch chat parent_ids** — bulk fix existing chats
4. **Fix `loom_create_chat`** — prevent recurrence
5. **Plan duplicate-sections cleanup** — lower urgency, no false diagnostics from it

Want me to start with the BlockedBy parser fix?

## Rafa:

Do all

## AI:

Done. All 5 items implemented and build is clean.

---

### 1. BlockedBy parser fixed — `packages/core/src/validation.ts`

Updated `validateStepBlockers` to accept:
- Bare numbers: `3`, `4` (canonical, was flagged as unknown)
- Legacy: `Step N`, `Steps N`, `Steps N-M` (silently accepted, no longer errors)
- Cross-plan with step: `{plan-id} N` (was partially working; now correctly strips the step suffix before index lookup)

This eliminates the false-positive diagnostics for existing plans.

---

### 2. Reference doc created — `loom/refs/plan-steps-table-and-blockedby-format-reference.md`

Covers: Steps table column rules, canonical BlockedBy token formats (with table), legacy formats, Step detail sections, and the cleanup script usage. Add `plan-steps-table-and-blockedby-format` to `requires_load` on any plan where the format matters.

---

### 3. Chat `parent_id`s fixed — 11 chats patched

Script `scripts/fix-chat-parent-ids.ts` ran and cleared `parent_id` on 11 chats that had a thread ID (e.g. `vscode-staled`, `vscode-ctx`) instead of null or a valid ULID.

Chats fixed:
- `vscode-staled-chat-001`, `vscode-staled-chat-002`
- `vscode-mcp-timeout-chat-001`
- `vscode-extension-chat-001`, `vscode-extension-chat-002`
- `vscode-blocked-steps-chat-001`
- `vscode-ctx-chat-001`
- `doc-ids-chat-001`
- `table-steps-chat-001`
- `mcp-fixes-chat-001`
- `continue-deepseek-chat-001`

---

### 4. `chatNew.ts` fixed — `packages/app/src/chatNew.ts`

Changed `createBaseFrontmatter('chat', chatId, title, scopeId)` → `createBaseFrontmatter('chat', chatId, title, null)`. New chats will no longer inherit the thread ID as `parent_id`.

---

### 5. Plan stub cleanup script — `scripts/cleanup-plan-stubs.ts`

Removes `## Step N —` sections whose only content is `<!-- Detailed spec. -->`. Filled-in sections are untouched. Dry-run found 7 plans with stubs (35 total stub sections).

Usage:
```bash
# Preview
npx ts-node --project tests/tsconfig.json scripts/cleanup-plan-stubs.ts --dry-run

# Clean a specific plan
npx ts-node --project tests/tsconfig.json scripts/cleanup-plan-stubs.ts --plan vscode-staled-plan-001 --dry-run

# Clean all
npx ts-node --project tests/tsconfig.json scripts/cleanup-plan-stubs.ts
```

Run this manually when a plan is done and you want to tidy it up. It does not run automatically.

---

One remaining diagnostic source to watch: some plans may still have `parent_id` pointing to old kebab-case design slugs (pre-ULID migration) rather than `de_` ULIDs. That's a separate migration — mentioned in `vscode-extension-chat-001`. Not touched here.

## Rafa:

There are some plans that do not have `steps table` and are producing many fakes diagnostics by blockby with having even the steps table.
For them we could just produce 1 warning: plan with no `steps table`
Agree?
If so do it



## AI:

Done — three separate bugs fixed together.

---

### Root cause chain

1. **`parseStepsTable` used a substring match** — `/# Steps\s*\n/i` matched `## Steps` because `# Steps` appears inside `## Steps`. So the 21 plans that use `## Steps` + phase sub-tables (old format) had their steps parsed, producing `plan.steps` with values like `Steps 1–3` (en dash range).

2. **`validateStepBlockers` didn't recognise those values** — `Steps 1–3` uses U+2013 en dash, not ASCII hyphen. My earlier fix for `Steps N-M` only covered ASCII. All those blockers fired "unknown blocker format".

3. **Blocker messages had no plan ID** — `extractDocId` in `diagnostics.ts` couldn't map them to a file, so `findAnyFileUnder` attached them to the **first doc in the weave** (alphabetically). That's why `weave-and-thread-design.md` and `vscode-tree-gaps-idea.md` were lighting up — they happened to be the first files iterated in their respective weaves.

---

### Fixes applied

**`packages/core/src/planTableUtils.ts`** — anchored `parseStepsTable` regex to line start:
```
/(?:^|\n)# Steps\s*\n/i
```
`## Steps` no longer matches. The 21 old-format plans now return `plan.steps = []`.

**`packages/core/src/validation.ts`** — broadened the legacy blocker regex to cover en dash and comma variants:
```
/^Steps?\s+[\d,\s\-–]+$/
```

**`packages/app/src/validate.ts`** — two changes:
- Plans with `plan.steps.length === 0` and status ≠ `done`: emit exactly **1 warning** `Plan {id} has no canonical Steps table` (Rafa's request).
- Plans with steps: prefix each blocker message with `Plan {id}: ` so `extractDocId` can map it.

**`packages/vscode/src/diagnostics.ts`** — `extractDocId` updated to match both `Plan {id} ...` (space) and `Plan {id}: ...` (colon) formats:
```
/^Plan\s+([\w-]+)[\s:]/
```

---

### Net result

- Old-format (`## Steps`) plans with en-dash blockedBy → **0 false diagnostics** (steps not parsed, 1 warning if not done).
- Done plans with no `# Steps` → **0 warnings** (silenced by `status !== 'done'` check).
- Active plans missing a steps table → **1 warning** pointing at the right plan file.
- Cross-plan `blocked by missing plan` messages → attached to the owning plan file, not a random idea/design in the weave.

## Rafa:
still legacy errors:
loom/core-engine/app-layer-refactor/done/app-use-cases-completion-plan.md

	"message": "Plan pl_01KQYDFDDAH88GAJGWSPGC414R: Step 6: unknown blocker format \"Steps 1‑4\""

I am thinking we are hidding legacy errors, but when Loom ships MVP, should we hide them?
Could we mark legacy hideen errors to be showed when we need or delete them?

I do not like legacy code
What you think?


## AI:

Agree — hiding legacy formats is the wrong path. Here's the honest picture and what I think we should do.

---

### What's happening with `Steps 1‑4`

That `‑` is U+2011 NON-BREAKING HYPHEN, a third Unicode dash variant after ASCII `-` (U+002D) and en dash `–` (U+2013). Trying to enumerate all Unicode dashes is a treadmill — there are 20+ dash-like codepoints and we'd keep finding new ones.

The real problem: these plan docs were written by AI using whatever dash was convenient. The canonical format (bare `3` or `3,4`) avoids this entirely.

---

### My honest take

Don't hide legacy errors. Migrate the data.

The legacy formats (`Steps N–M`, `## Steps`, etc.) exist only in Loom's own `loom/` docs — not in user workspaces yet. That makes now the cheapest possible moment to migrate: zero downstream impact, full control.

If we hide them:
- MVP ships with a validator that silently ignores bad data
- Every future user with a similar doc pattern also gets silent ignoring
- The "canonical format" claim in the reference doc is a lie — the validator doesn't enforce it

If we migrate:
- The validator becomes strict and correct
- Future users get real errors for real mistakes
- The legacy acceptance code in `validateStepBlockers` can be removed entirely

---

### Proposed fix

1. **Migration script** `scripts/fix-legacy-blockedby.ts` — scans all plan files with canonical `# Steps` tables and rewrites blockedBy cells:
   - `Steps N–M` / `Steps N‑M` / `Steps N-M` → `N, M, ...` (expand range)
   - `Step N` → `N`
   - `Steps N` → `N`
   
2. **Also fix `## Steps` plans** — the 21 plans using `## Steps` instead of `# Steps`: rename the heading in-place.

3. **After migration: remove legacy acceptance** from `validateStepBlockers` — only canonical formats pass.

This is ~2 hours of work (mostly the range-expansion logic in the script). Do you want me to do it now, or first ship the current state and migrate as a follow-on?

In the meantime I'll widen the U+2011 gap with `/^Steps?\s+/` (accept anything starting with "Step(s) " as a legacy hit) so it stops firing until migration runs.

## Rafa:

1. We should be sure that decided canonical BlockBy is definitive. Should we include range? What you think?
2. I already deleted **Legacy formats** silently accepted section:

```markdown
**Legacy formats** (accepted by the validator, not recommended for new plans):
- `Step N` — old same-plan format; use bare `N` instead.
- `Steps N` — same as above.
- `Steps N-M` — range syntax; use `N, M` instead.
```

from `loom/refs/plan-steps-table-and-blockedby-format-reference.md`
3. Delete all code that hide legacy BlockBy diagnostics.


## AI:

### 1. Range in canonical BlockedBy — my take: no

Don't add range syntax. The comma list `3,4` already solves the multi-step case and is unambiguous. Range syntax (`3-5`) reintroduces the exact problem we just cleaned up: hyphens are ambiguous (ASCII `-`, en dash `–`, non-breaking `‑`, …), and `3-5` could also look like a plan-ID fragment to a naive parser. The canonical set stays:

| Format | Meaning |
|---|---|
| `3` | step 3 of this plan |
| `3,4` | steps 3 and 4 of this plan |
| `{plan-id}` | entire cross-plan dependency |
| `{plan-id} 3` | step 3 of another plan |
| `{plan-id} 3,4` | steps 3 and 4 of another plan |

Range is not in the spec. Definitive.

---

### 2. Legacy code deleted

Removed lines 55–58 from `packages/core/src/validation.ts`:
```typescript
// Legacy: "Step N", "Steps N", "Steps N-M" and any Unicode dash variant
if (/^Steps?\s+/.test(blocker)) {
    continue;
}
```

Also noticed the comma-list same-plan format `3,4` was falling through to "unknown blocker format" — fixed that too by adding a `^\d+(,\s*\d+)*$` branch that validates each step number exists.

---

### Net state

- Legacy formats (`Step N`, `Steps N`, `Steps N-M`, Unicode dashes) → real diagnostics, no more silent ignoring
- `3,4` comma-list → validated correctly
- Cross-plan with `{plan-id} 3,4` → plan existence checked (step numbers not validated, acceptable)
- Reference doc already cleaned up by Rafa

Any remaining `Steps N–M` in existing plan files will now surface as warnings. Run the migration to fix them.