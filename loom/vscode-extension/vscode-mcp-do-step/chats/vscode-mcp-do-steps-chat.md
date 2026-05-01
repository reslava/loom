---
type: chat
id: vscode-mcp-do-steps-chat
title: "vscode mcp do step(s) Chat"
status: active
created: 2026-05-01
version: 1
tags: []
parent_id: vscode-mcp-do-step
child_ids: []
requires_load: []
---
# CHAT

## Rafa:

When user click in sparkle button to ask AI to implement next step(s) he should be able to choose do:
- next doable step
- all pending doables steps
- a selecction of doable steps

note: plan sparkle inline button should only be visible when there are remaining doable steps

Which UX you suggest?

## AI:

**Vision-check:** this serves the `{implement step(s)}` phase — the button is the user's "do real work, not flip state" trigger. Replaces the manual choice "which steps do I want Claude to grind through right now?" without forcing the user to type plan IDs or step numbers.

**Definition first — what's a "doable step"?** I'll assume: not yet ✅ AND no unmet `requires_step` deps within the plan AND parent plan status is `implementing`. If all steps fail this check the plan has nothing doable → sparkle hidden. Sound right?

---

### Three UX options

**Option A — Single sparkle, QuickPick on click (recommended)**

Click sparkle → VS Code QuickPick:
```
▶ Next doable step          (Step 3 — write tests)
⏩ All doable steps          (3 steps: 3, 4, 5)
☰ Pick steps…               (multi-select)
```
Pick → if "Pick steps…" opens a second multi-select QuickPick listing remaining doable steps with checkboxes. Confirm → launches Claude with the chosen step list.

- ✅ Native VS Code UX, zero tree clutter, one button per plan.
- ✅ Default action ("next") is one extra Enter — feels fast.
- ✅ Scales to any number of steps without UI changes.
- ❌ Two clicks for the common case ("just do the next one").

**Option B — Click = next, right-click = options**

Click sparkle → runs next doable step immediately. Context menu on the plan node adds `Run all doable steps`, `Run selected steps…`.

- ✅ Fastest happy path (one click for the 80% case).
- ❌ Power options are hidden behind right-click — discoverability poor; on touchpads it's awkward.
- ❌ Context menu actions on tree nodes are easy to miss.

**Option C — Step-level sparkles + plan-level "all"**

Each step row gets its own sparkle (`run this step`, enabled only if doable). Plan row sparkle becomes "run all doable steps". Selection = the user clicks per-step buttons one at a time, or shift-clicks a range.

- ✅ Physical, visible, no modal pickers.
- ✅ Step-level run gives a natural "retry this step" affordance later.
- ❌ Tree gets denser — every plan now shows N inline icons.
- ❌ Multi-step launching by clicking N times is awkward.
- ❌ Doesn't really cover "pick a subset" without a separate UI.

---

### My recommendation

**Option A.** It's the only one that handles all three modes (next / all / pick) coherently, stays out of the way visually, and matches how VS Code itself surfaces multi-choice actions (Run and Debug, task pickers, etc.). The "extra click for next step" cost is real but small — Enter on the default-highlighted item.

Visibility rule: hide the inline sparkle when the plan has zero doable steps. If the plan has steps but all are blocked, show a non-clickable hint icon (`$(circle-slash)`) on hover with "blocked by missing deps" — so the user knows it's not just empty.

---

**Open questions before implementing:**

1. Confirm the "doable step" definition above — especially whether cross-plan blockers count.
2. When user picks "All doable steps", do we launch a single Claude session that loops `loom_do_step → implement → loom_append_done → loom_complete_step` per step, or one Claude session per step? (Single session is cheaper and lets Claude carry context; per-step session is more isolated and easier to abort.)
3. For "Pick steps…", do we allow selecting steps that are *currently blocked* (assuming earlier picks unblock them), or only currently-doable ones?

Once these are settled I can fold the choice into a plan.

STOP — waiting for your pick (A / B / C / something else) and answers to the three questions.

## Rafa:

### Three UX options
Option A

### Open questions 
1. `doable step`: no done yet, not blocked by a step not picked
2. The idea is keeping context by using one single session for all
3. We allow pick blocked by a previous step if this is marked to be implemented

Tell me if all is clear 100% or need more info
If clear create plan `loom/vscode-extension/vscode-mcp-do-step/plans/vscode-mcp-do-step-plan-002.md`

## AI:

Clear. Locking in:
- **Doable** = not done AND every `blockedBy` step is either ✅ already OR included in the same launch pick.
- **Visibility** = sparkle on plan node iff plan `status: implementing` AND at least one step is not done. (No special "blocked-only" hint icon; if you pick blockers together it's fine, and if a plan has only blocked-no-deps-met steps the user can still launch by picking the chain.)
- **All / Pick launch** = single Claude session; we send the full ordered list of step numbers; Claude iterates `loom_do_step(planId, stepNumber) → implement → loom_append_done → loom_complete_step` for each, in dep order, without exiting.

One small derived requirement that follows from this: `loom_do_step` must accept an optional `stepNumber` arg, otherwise multi-step iteration can't target specific steps. Folded into the plan as Step 1.

⚠️ MCP unavailable in this session (the loom_* tools aren't in this Claude Code's tool list — I'm in `J:/src/loom` itself, where we haven't run `loom install` to register `.mcp.json`). Writing the plan file directly per the visibility rule. Plan written to [vscode-mcp-do-step-plan-002.md](../plans/vscode-mcp-do-step-plan-002.md).

STOP — waiting for `go` to start Step 1.

## Rafa:

I think you can not connect MCP from here becuase there is no
`.mcp.json` file, create it

Do all steps of plan

## AI:

`.mcp.json` written at project root with `"type": "stdio"` and the loom server entry. That registers the loom MCP for the *next* Claude Code session in `J:/src/loom` — it doesn't affect this running session, since MCP servers are loaded at startup. (You'll need one-time approval — `claude /mcp` or just answering the prompt next time.)

Plan-002 status flipped to `implementing`. Steps 1-5 done; Step 6 is the manual test for you in Extension Development Host.

⚠️ MCP unavailable — edited plan/extension files directly.

**Step 1 — `loom_do_step` accepts optional `stepNumber` ✅** ([packages/mcp/src/tools/doStep.ts](../../../../packages/mcp/src/tools/doStep.ts))
- `inputSchema` adds `stepNumber: number`. When provided, looks up the exact step by `order`; errors if not found or already done. When omitted, keeps the original "first not-done step" behavior.
- Tool description updated to reflect both modes.

**Step 2 — `loom_list_plan_steps` tool ✅** ([packages/mcp/src/tools/listPlanSteps.ts](../../../../packages/mcp/src/tools/listPlanSteps.ts))
- Input: `{ planId }`. Output: `{ planId, planTitle, planStatus, steps: [{ order, description, filesToTouch, done, blockedBy }] }`.
- Pure read; reuses `findDocumentById` + `loadDoc`. Registered in `BASE_TOOLS` of `server.ts`.

**Step 3 — sparkle visibility ✅** ([packages/vscode/src/tree/treeProvider.ts](../../../../packages/vscode/src/tree/treeProvider.ts), [packages/vscode/package.json](../../../../packages/vscode/package.json))
- `contextValue` is now `plan-implementing-doable` only when status is `implementing` AND there's at least one not-done step. Otherwise `plan-${status}` (so a plan with all steps ✅ but still `implementing` status no longer shows the sparkle — that's the "no doable steps remain" case).
- `loom.doStep` and `loom.completeStep` `when` clauses now match `plan-implementing-doable`. Dropped the `loom.aiEnabled` gate from doStep — the new flow doesn't need an in-process AI key, only the `claude` CLI on PATH.

**Step 4 — QuickPick flow ✅** ([packages/vscode/src/commands/doStep.ts](../../../../packages/vscode/src/commands/doStep.ts))
- On click: builds a list of all steps with `done`/`blockedBy`, computes `nextDoable` and `allDoable`, shows a 3-item QuickPick (Next / All / Pick…).
- "Pick steps…" opens a multi-select QuickPick over not-done steps, each with a `· blocked by N, M` detail line where applicable. After the user confirms, validates that every picked step is doable given the pick set; if a picked step is still missing a blocker, shows a clear error naming the missing step numbers and aborts.
- Final list always topo-sorted by `blockedBy` so launches respect dependency order even when the user picks out of order.

**Step 5 — multi-step prompt ✅** ([packages/vscode/src/commands/doStep.ts](../../../../packages/vscode/src/commands/doStep.ts) — `buildPrompt`)
- Single-step launch keeps a tight prompt naming `planId` and `stepNumber` (matches plan-001's wording).
- Multi-step launch sends a single Claude session with `stepNumbers: [N, M, …]`. Instructions: for each number in order, call `loom_do_step → implement → loom_append_done → loom_complete_step`, then continue without exiting; on failure, stop and report. The `claude` binary detection from plan-001 stays.

**Build:** `./scripts/build-all.sh` → core, fs, app, cli, vscode, mcp all clean.

---

**Step 6 — manual test (you):**

1. Press F5 to launch Extension Development Host.
2. Open a workspace with a 3-step implementing plan where Step 2 blockedBy 1 and Step 3 blockedBy 2.
3. Verify each mode:
   - **Next doable** → Claude session runs only Step 1.
   - **All doable** → single Claude session runs 1 → 2 → 3 in order, calling `loom_do_step(stepNumber=N)` for each.
   - **Pick steps…** → select {2, 3} alone → expect error "Step 2 is blocked by step 1…". Re-run, pick {1, 2, 3} → runs all three.
   - After all steps ✅ → sparkle disappears from the plan node.
4. Spot-check: `done.md` contains one section per executed step; plan markdown shows ✅ on each completed row.

If anything misbehaves, paste here. Otherwise, mark Step 6 ✅ and the plan can close.

Next: waiting for your test result.

## Rafa:

- mcp loom should be active now for this project
- I did the test using Haiku, i picked 2, 3 but haiku do this:
```
✅ Complete. All steps done.

  Summary:
  - Step 1 (prerequisite): Created empty test.txt
  - Step 2: Appended "hola step 2" to test.txt
  - Step 3: Appended "ahora step 2" to test.txt

  File now contains both lines as expected. Note: I completed step 1 first since it was a blocking dependency for steps 2 and 3.
```

## AI:

Two separate things happened here — let me untangle them.

**First: did the validation fire?**

The "Pick steps…" validation in `doStep.ts` should have shown an error when you picked {2, 3} without {1}:
```
Step 2 is blocked by step 1. Include it in your pick or run it first.
```

If you saw that error, dismissed it, and then re-picked {1, 2, 3} (or used "All doable steps") — then the session that ran Haiku had `stepNumbers=[1,2,3]` and Haiku did the right thing. In that case validation is working; Haiku's behavior was correct.

If you **did not** see an error and launched with `stepNumbers=[2,3]` — then the `blockedBy` on the test plan's steps probably wasn't populated (empty array), so the validation silently passed. The question to answer is: does your test plan's step 2 actually have `blockedBy: ["1"]` in the markdown?

**Second: why did Haiku do step 1 when it wasn't asked?** (the real bug, regardless of the first point)

`loom_do_step(planId, stepNumber=2)` returns a `planSummary` showing all steps:
```
⬜ Step 1: Create empty test.txt
⬜ Step 2: Append "hola step 2"
⬜ Step 3: Append "ahora step 2"
```

The prompt says "implement steps [2, 3] in this exact order" but doesn't say "do NOT touch steps outside this list." Haiku saw step 1 pending in the summary, noticed step 2 was implicitly dependent on it (or read it from thread context), and decided to "help" by doing step 1 first. This is the AI ignoring the pick — a real bug.

**Fix needed in `buildPrompt`:** add an explicit prohibition:

```ts
// in the multi-step prompt
`... Step numbers in dependency order: ${list}. Implement ONLY the steps in this list — do not implement any other steps even if they appear not-done in the plan summary or seem like prerequisites. If a step cannot be completed without an unlisted prerequisite, stop and report the issue instead of resolving it yourself. For each step number in this exact order: ...`
```

**Questions before I fix it:**
1. When you picked {2, 3}, did you see an error message ("Step 2 is blocked…"), or did the session launch directly?
2. Does your test plan's step 2 row have `blockedBy` populated in the markdown table?

These two answers tell me whether I need to fix only the prompt, or the validation too.

STOP — waiting for answers.

## Rafa:

This is the steps table I used:
```markdown
| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | create `test.txt` file | `test.txt` | — |
| 🔳 | 2 | append `hola step 2` to `test.txt` |  | 1 |
| 🔳 | 3 | append `ahora step 2` to `test.txt` |  | 2 |
```

I don't remember if this is the correct canonical format for `Blocked by` column, verify it 

I did not see any error when I picked 2, 3

## AI:

Found and fixed both bugs.

**Bug 1 — parser drops empty cells (root cause of the silent validation pass)**

In `packages/core/src/planTableUtils.ts:28`, the column split was:
```ts
line.split('|').map(c => c.trim()).filter(c => c !== '')
```
When "Files touched" is empty (`|  |`), `.filter(c => c !== '')` removes it. "Blocked by" shifts from `cols[4]` to `cols[3]`, so `cols[4]` is `undefined` → `blockedByRaw = '—'` → `blockedBy = []`. Validation always passed.

Fix: `line.split('|').slice(1, -1).map(c => c.trim())` — slices off the outer empty strings, preserves inner empty cells. Column positions are now stable regardless of empty cells.

**Bug 2 — prompt didn't tell Claude to stay in scope**

Added an explicit prohibition in `buildPrompt` for multi-step sessions:
> "Implement ONLY these steps — do not implement any other steps even if they appear not-done in the plan summary or seem like prerequisites. If a step cannot be completed without an unlisted step, stop and report the issue instead of resolving it yourself."

**Canonical format for `Blocked by`:** your table is correct. `—` for no blockers; comma-separated step numbers (e.g. `1` or `1, 2`) for blockers. `🔳` for not done, `✅` for done — also correct (generated by `generateStepsTable`).

Both packages rebuilt clean (`core` then `vscode`).

**Re-test:**
1. Rebuild the extension and relaunch Extension Development Host.
2. Use your same 3-step plan (step 2 blocked by 1, step 3 blocked by 2).
3. "Pick steps…" → select {2, 3} → expect error "Step 2 is blocked by step 1. Include it in your pick or run it first."
4. Retry → select {1, 2, 3} → session should run all three cleanly.
5. If you pick only {2, 3} by mistake and somehow launch, Claude should now stop at step 2 and report it can't proceed without step 1, rather than doing it silently.

Next: waiting for your test result.
