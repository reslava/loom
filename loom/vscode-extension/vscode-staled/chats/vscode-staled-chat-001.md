---
type: chat
id: ch_01KR1F8C4WF4H818J3X8Y94CZR
title: vscode-staled Chat
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 2
tags: []
parent_id: vscode-staled
requires_load: []
---
# CHAT

## Rafa:

### Show staled docs in extension tree

I think we need to polish and finish, staled and refine...
1. Tell me what info is in getState, getThread... that is not showed in tree yet
2. Extension executes loom Validate? when?
3. Suggestions to show user with docs are staled
4. Briefly detail refine?

We have MCP time out pending...
Do you find any gap in Loom functionality apart from these?



## AI:

Good questions — let me go through each with what the code actually does.

---

## 1. Info in getState / getThread not shown in the tree

**LoomState.summary (fully computed, never surfaced):**
- `stalePlans` count, `blockedSteps` count, `totalWeaves`, `activeWeaves`, `implementingWeaves`, `doneWeaves`, `totalPlans` — these live in the `summary` block returned by `getState` but zero of them appear in the tree UI. A status bar item or root-level summary node could expose them.
- `generatedAt` — state timestamp, not shown.
- `mode` / `loomName` — mono vs. multi and loom name, not shown.

**Thread-level gaps:**
- `dones` are only shown if `dones.find(d => d.parent_id === p.id)` matches a plan. A done doc whose parent plan was deleted is invisible — no warning.
- Thread status `BLOCKED` and `CANCELLED` — `getThreadStatus` can return both but `getThreadIcon` has no case for them (falls through to the default thread icon, silent).

**Plan staleness gap (important):**
The tree shows `⚠️ stale` based on `plan.staled` (a frontmatter boolean flag). But `getState`'s `summary.stalePlans` uses `isPlanStale(plan, design)` from `derived.ts` — a computed version comparison (`plan.design_version < design.version`). These two can disagree: if a design is refined but the MCP tool doesn't set `plan.staled = true`, the plan silently misses the badge. The tree should drive stale detection from the version math, not the flag.

**Design / idea staleness:**
`getStaleDocs` (MCP tool) detects stale ideas and designs via parent-update timestamp heuristic, but the tree shows no indicator for stale ideas or designs. Only plans have the `⚠️ stale` badge. The `DesignDoc.refined` field is also set after a refine but unused in the tree.

**Design `target_release`:**
Used in `groupByRelease` mode but not shown as a label on design nodes in the default thread view.

---

## 2. When does the extension execute validate?

Two paths, both explicit:

1. **On activation and manual refresh** — `syncAndRefresh()` calls `updateDiagnostics()`. This runs on: extension activation, `loom.refresh` command, `onDidChangeWorkspaceFolders`.

2. **Manual validate command** — `loom.validate` opens a QuickPick to pick "All weaves" or "Specific weave" and writes to an Output Channel (separate from diagnostics).

**What does NOT trigger it:** the file watcher (`loom/**/*.md`) only calls `treeProvider.refresh()`, not `syncAndRefresh()`. So editing a doc does not re-run validation or refresh diagnostics. Structural issues (broken parent_id, stale plans) only surface on activation or manual refresh.

---

## 3. Suggestions to show stale docs

Three approaches, ordered by effort vs. value:

**A — Fix plan staleness at source (quick, correct):**
In `createPlanNode`, replace `plan.staled` with `isPlanStale(plan, thread.design)` computed inline. This makes the `⚠️ stale` badge reliable regardless of whether the frontmatter flag was set. The tree already has the design in scope at that point.

**B — Badge stale ideas and designs (medium):**
After calling `loom://state`, run through `getStaleDocs` logic (or inline the parent-timestamp check) and collect stale doc IDs. Pass this set into `createDocumentNode` — if a doc ID is in the stale set, append `⚠️ stale` to its description. Same visual treatment as plans, just extended.

**C — Summary header node (visible, low noise):**
Add a non-clickable root node: `⚠️ 3 stale · 2 blocked` derived from `state.summary.stalePlans` and `state.summary.blockedSteps`. Expands to list the specific docs. This makes the dashboard visible without changing individual node descriptions.

My recommendation: do A first (it's a correctness fix, not a UX addition), then B to extend coverage to ideas/designs. C is good polish once A+B are solid.

---

## 4. Refine — brief detail

Refine is the staleness propagation operation. When a parent doc changes (idea bumped → design stale; design refined → plans stale), the user clicks Refine on the stale child. The flow:

1. Extension calls `loom_refine_idea` / `loom_refine_design` / `loom_refine_plan` via MCP.
2. The tool loads the stale doc + its parent(s) + any `context_ids` the user pinned in the context sidebar.
3. Sends all of it to AI via **MCP sampling** — the AI rewrites the child doc to reflect what changed in the parent.
4. Saves the result with `version` bumped. Design gets `refined: true` on frontmatter.

Key constraint: refine uses sampling, so it requires an MCP client that supports sampling (Claude Code / Claude desktop). If the client doesn't support sampling, the tool fails — there's no fallback path today.

Currently refine is one-doc-at-a-time. There's no "refine all stale" batch operation, which becomes painful when a design refine makes three plans stale simultaneously.

---

## 5. MCP timeout (existing handling)

The tree already handles this: `treeProvider.getRootChildren()` catches errors containing `32001` or `'timed out'` and shows a "MCP timed out — click to reconnect" node that runs `loom.reconnectMcp` (`disposeMCP()` + `syncAndRefresh()`).

**Gap:** this detection only covers the tree-load path. If a tool call (doStep, refine, chatReply) times out mid-operation, each command has its own `catch` that shows an error message — but none offer the reconnect node. The timeout handling is inconsistent. A shared `handleMcpError(e)` helper that checks for timeout and triggers reconnect would unify this.

---

## 6. Other gaps I see

**a. `updateDiagnostics` not wired to file changes** — covered in Q2. Validation only runs on activation/manual refresh, not when docs are edited.

**b. No blocked-step indicator per plan** — `blockedSteps` is in the summary but no tree node shows "1 step blocked" on the specific plan. Only the `plan-implementing-doable` vs. other contextValues distinguish doability, not blockedness.

**c. Thread BLOCKED/CANCELLED icons missing** — silent fallthrough to default icon. Easy to add to `getThreadIcon`.

**d. Orphaned done docs** — done docs without a matching plan are invisible. Could surface them under the thread's Chats/Context section, or as a validation warning.

**e. No batch refine** — single refine only. Annoyance when design changes cascade to multiple plans.

**f. `refineDesign` command name vs. actual scope** — `loom.refineDesign` is the registered command for design refine, but it's also the command name used for idea nodes via `refine.ts`. Worth verifying the routing is correct for both idea and design nodes in the context menu.

The most impactful near-term work: fix the `plan.staled` vs. `isPlanStale` gap (A), extend stale badges to ideas/designs (B), and wire diagnostics to file changes so structural issues surface without a manual refresh.

## Rafa:

It is too much to be discussed at same time, agree?
Organize all in different weave/threads, design if worth it and plans or other way you consider better, group them as you consider.
Show me a brief schema first.




## AI:

Agreed — let me group these into coherent threads before doing anything.

Here's a proposed schema:

---

### Thread grouping proposal

**Weave: `vscode-extension/`** (existing)

| Thread | What it covers | Form |
|--------|---------------|------|
| `vscode-staled/` | Stale doc detection + visualization in the tree | Design + Plan |
| `vscode-diagnostics/` | Wire `updateDiagnostics` to file changes; make validation continuous | Plan (small) |
| `vscode-blocked-steps/` | Surface blocked steps per-plan in the tree | Design + Plan |
| `vscode-mcp-timeout/` | Unify MCP timeout handling across all command paths | Plan (small) |
| `vscode-tree-gaps/` | Minor gaps: orphaned dones, BLOCKED/CANCELLED icons, summary header node | Plan (small, batched) |

---

### Rationale for splits

- **`vscode-staled`** is the biggest and most design-heavy: fix `plan.staled` vs `isPlanStale`, extend stale badges to ideas/designs, decide on visualization approach (badges vs. section vs. header). Needs a design before a plan.
- **`vscode-diagnostics`** is independent: wiring the file watcher to `syncAndRefresh` is a one-file change with a clear scope. No design needed.
- **`vscode-blocked-steps`** touches both the tree and possibly a new MCP query path — small design needed.
- **`vscode-mcp-timeout`** is a shared helper extraction. Small plan, no design needed.
- **`vscode-tree-gaps`** batches the three smallest fixes (orphaned dones, missing icons, summary node) that don't warrant their own threads.

---

### What I'd do next

Create the threads (ideas only at this stage) for the two biggest ones — `vscode-staled` and `vscode-blocked-steps` — and plain plans for the three small ones. That gives you a visible backlog without over-generating docs for things that are 30-line changes.

Does this grouping look right, or do you want to merge / split anything?

## Rafa:

Agree with the splits and next proposal.
Create threads and plans for `vscode-staled` and `vscode-blocked-steps`.

## AI:

## Sampling failure — findings

The error is `-32603` (Internal Error) wrapping `MethodNotFound` on `sampling/createMessage`. That means Claude Code's MCP host receives the sampling request and returns "I don't know this method." Here's what the code shows:

**Root cause candidate A — missing `sampling` in server capabilities (most likely):**

`server.ts` creates the server with:
```typescript
{ capabilities: { resources: {}, tools: {}, prompts: {} } }
```
`sampling` is not declared. In MCP SDK 1.x, the server advertising `sampling: {}` in its capabilities is what signals to the client "I will call sampling/createMessage." Without it, some clients (including Claude Code) may not route sampling requests — they see the method as unregistered.

Fix to try first:
```typescript
{ capabilities: { resources: {}, tools: {}, prompts: {}, sampling: {} } }
```
Then rebuild and test `loom_generate_idea`.

**Root cause candidate B — SDK version too old:**

`package.json` pins `"@modelcontextprotocol/sdk": "^1.0.0"`. The sampling capability handling changed between minor versions of the SDK. Run `npm ls @modelcontextprotocol/sdk` in `packages/mcp` to see what's actually installed — if it's below `1.6.0` or so, bumping to `^1.11.0` (current) may be the fix.

**Root cause candidate C — detection code catches wrong error code:**

`sampling.ts` detects failure by checking `error?.code === -32601` (MethodNotFound) or message includes 'MethodNotFound'. But the actual thrown code is `-32603` (InternalError) — the MethodNotFound is nested inside the message. The detection works (the message check matches), but the symptom suggests the SDK is wrapping the error rather than forwarding the raw code — which is itself a sign of an older SDK version.

**Recommended order:**
1. Check installed SDK version: `cd packages/mcp && npm ls @modelcontextprotocol/sdk`
2. Try adding `sampling: {}` to server capabilities + rebuild
3. If still failing, bump SDK to `^1.11.0` + rebuild

Should I make the capability fix now and we test it?

## Rafa:

Try fix 
Then we test by continue wirh designs and plans pending

## AI:

## Sampling — root cause found

**SDK is 1.29.0** (current, not the issue). `sampling: {}` is not a server capability in the type system — sampling is declared by the *client*, not the server, so that fix was wrong direction.

The real cause: **`sampling/createMessage` is a server→client request** — the Loom MCP server sends the request to the MCP host asking it to run inference. Claude Code returns `MethodNotFound` for it. This is almost certainly intentional: Claude Code in interactive assistant mode does not support server-initiated sampling because it would mean a nested AI call — the AI calling itself through the MCP layer while it's already executing. That's a circular loop risk and a cost explosion surface.

**The design split:**

| Path | When sampling works | When it doesn't |
|------|---------------------|-----------------|
| VS Code extension button → Loom MCP `loom_generate_*` | ✅ Extension is the host, routes `sampling/createMessage` to its configured AI API key | — |
| Claude Code session → Loom MCP `loom_generate_*` | — | ❌ Claude Code is already the AI; recursive inference is blocked |

The `generate` tools were designed for the VS Code extension's "Generate Design" button flow — the extension calls MCP, the MCP server asks the extension's host to run inference via sampling. In a Claude Code session, the right path is `loom_create_*` + `loom_update_doc` with Claude Code writing the content directly.

**What this means practically:**
- Sampling failure in Claude Code sessions is *by design*, not a bug.
- The fix for the extension (sampling from button clicks) is separate: the VS Code extension's `mcp-client.ts` needs to wire up `sampling/createMessage` so that when the extension calls `loom_generate_*`, it routes the sampling request to the extension's AI client.
- For Claude Code sessions, we should document the `create` + `update` path as the canonical workflow.

**Action: check if the VS Code extension's MCP client handles sampling.** If not, that's the real gap — sampling works correctly when called via the extension's AI button.

Shall I check `mcp-client.ts` to see if sampling is wired up there?

## AI:

## Sampling — conclusion (no fix needed in Loom)

The VS Code extension wires sampling correctly:

- `mcp-client.ts:56` — `new Client(..., { capabilities: { sampling: {} } })` — advertises sampling to the server
- `mcp-client.ts:58-77` — `CreateMessageRequestSchema` handler routes sampling requests through `makeAIClient()` to the configured AI API key

**Sampling works from the extension. It doesn't work from Claude Code CLI.**

That's expected, not a bug:

| Host | Sampling | Reason |
|------|----------|--------|
| VS Code extension (Generate button) | ✅ works | Extension advertises `sampling: {}`, routes to AI API key |
| Claude Code CLI session | ❌ MethodNotFound | Claude Code is already the AI — it doesn't advertise `sampling: {}` to MCP servers |

Nothing to fix in Loom. The correct workflow per host:
- **Extension buttons** → `loom_generate_*` (sampling path, AI API key configured)
- **Claude Code sessions** → `loom_create_*` + `loom_update_doc` (Claude writes content directly)

Ready to continue with designs and plans for `vscode-staled` and `vscode-blocked-steps`.

## Rafa:

1. Add this important note about sampling to CLAUDE.md (and sync with loom install template). You should know always what path use.
2. Continue with designs and plans

## Rafa:

handle the three small threads:         
vscode-diagnostics, vscode-mcp-timeout, vscode-tree-gaps
so we do not forget them in the future

## AI:

All five threads are now stacked under `loom/vscode-extension/`:

| Thread | Idea | Design | Plan |
|--------|------|--------|------|
| `vscode-staled` | ✅ | ✅ | ✅ 5 steps |
| `vscode-blocked-steps` | ✅ | ✅ | ✅ 5 steps |
| `vscode-diagnostics` | ✅ | — | ✅ 3 steps |
| `vscode-mcp-timeout` | ✅ | — | ✅ 4 steps |
| `vscode-tree-gaps` | ✅ | — | ✅ 4 steps |

Also updated: `CLAUDE.md` + `installWorkspace.ts` with the sampling path note.

Next: start implementing any of the plans, or continue designing/discussing.

## Rafa:

Sometimes in extension tree, some thread nodes do not expand its content.
Right now, for example:
vscode-tree-gaps
vscode-mcp-timeout
vscode-blocked-steps

do not expand

the sidebar activity icon shows refresh signal icon hang out and after a while... MCP timed out

i reconnected MCP

## AI:

## Tree nodes not expanding after bulk doc creation — diagnosis

The tree self-corrects because the issue is a **mid-creation snapshot race**:

1. Each file write fires the file watcher → debounce (300ms) → `treeProvider.refresh()` → `loom://state` MCP read.
2. When we create 5 threads × 2-3 docs each (≈15 files in quick succession), the debounce keeps resetting. But if any intermediate refresh fires before all files are written, the state snapshot is incomplete — threads appear in the tree but their children (idea, plan, design) haven't landed yet, so the node shows `TreeItemCollapsibleState.None` (no children = not expandable).
3. After the last file is written and the debounce settles, the final `loom://state` read returns the complete state and the tree corrects itself.

**Why it self-corrects:** the last file write always triggers a final debounce, which loads the complete state.

**Root cause:** the file watcher calls `treeProvider.refresh()` not `syncAndRefresh()`. `treeProvider.refresh()` fires `_onDidChangeTreeData` which causes VS Code to re-call `getRootChildren` → `loom://state`. If the MCP server is slow (cold-start, large workspace), intermediate refreshes catch the workspace mid-write.

**Fix candidates:**
1. **Debounce for bulk ops** — increase the watcher debounce from 300ms to 800-1000ms. Reduces intermediate snapshots at the cost of slightly slower single-file feedback.
2. **Post-creation settle** — after MCP tools that create docs, the extension could skip one refresh cycle. Harder to implement cleanly.
3. **Optimistic tree** — mark newly created nodes as "loading" and don't flip to `None` state until the state confirms children = 0. More complex.

Option 1 is the right short-term fix. Option 3 is the correct long-term UX. This is a natural item for `vscode-tree-gaps` or a new small thread. Worth noting but not urgent — the tree always corrects itself.

## Rafa:

When it got hand out, threads not expanding, refresh icon froozen and ending MCP timed out do not refresh tree alone, it need to manually MCP reconnect

Option 1. could help

Also I think if loom://state get a broken/unfinished tree, should do some debounce and N retries, leaving tree untouched until get correct state

## AI:

## Frozen refresh + manual reconnect required

The freeze happens because rapid file writes fire many `loom://state` requests in quick succession. The MCP server processes each one synchronously (builds link index, scans all weave dirs), so concurrent requests pile up and the queue times out. When `getRootChildren` catches the timeout it shows the reconnect node — but it doesn't auto-reconnect, which is the gap `vscode-mcp-timeout` tracks. The frozen refresh icon is VS Code's spinner staying open while the timed-out MCP call hangs.

**Option 1 (debounce increase)** directly attacks this: fewer intermediate refreshes = fewer concurrent `loom://state` calls = less MCP overload. 300ms → 800ms means 15 rapid file writes produce one refresh instead of potentially several.

---

## Rafa's idea — preserve last good state on incomplete reads

This is the right architectural answer. Current behavior:

```
state read → partial/empty state → render broken tree → user sees non-expanding nodes
```

Better behavior:

```
state read → partial/empty state → keep previous state → retry (up to N times, with backoff)
                                 → only replace tree when state looks valid
```

"Looks valid" can be a simple heuristic: if the number of threads or total docs dropped significantly vs. the last good state, treat it as suspect and retry rather than render.

This belongs in `vscode-tree-gaps` as an additional step — it's a tree provider behavior change, no new thread needed. I'll add it to the plan.

Should I update `vscode-tree-gaps-plan-001.md` to include these two steps: (a) increase debounce to 800ms, and (b) preserve-last-good-state on suspect state reads?