---
type: chat
id: mvp-plan-to-publish-chat
title: "MVP plan to publish"
status: active
created: 2026-04-25
version: 1
tags: []
parent_id: vscode-extension-fixes-tweaks-chat.md
child_ids: []
requires_load: []
---
# CHAT

## Rafa:

### Default filter
Should be `All` 

### Global
I repeat this:
Global level chats, context and references should appear ALWAYS
Weave level chats, context and references should appear if weave is not filtered
Thread level chats should appear if thread is not filtered

### Plans folders
Assign a codeicon lib icon

### Packages - vsix version
We should unify all versions. Agree?

### Publish vsix, MVP
What you think we need to achieve before MVP?

### MCP timed out -- click to retry 
Still happens, even with new fast filtered getStatus. When I click do not refresh

## AI:

Done on the four code items. Two are discussion items — answers below.

**1 — Default filter `All`**
- Was `['active', 'implementing', 'draft']` in `viewState.ts:14`. Set to `[]`. New installs see `LOOM: All` and the full tree.
- Existing workspaces have the old filter persisted in `workspaceState`; will need *Filter by status → All* once to override.

**2 — Global / Weave / Thread filter visibility — root cause was the refs weave**
You were right to repeat it. I checked carefully: the rule was correctly applied for chats and ctx, but I missed that **the `refs/` directory is loaded as a weave** (`loom/refs/*.md` → weave `refs` with looseFibers). When you filtered by `implementing`, the refs weave had 0 matching threads → my new `.filter(w => w.threads.length > 0)` removed it → the entire References section vanished.
Fix in `treeProvider.ts:127`: `refs` weave is exempt from both the per-thread filter and the empty-weave hide. References now always appear.
- Global chats / ctx / refs → rendered outside `filtered` → always appear ✓
- Weave chats / ctx / refs → live on the weave node → appear iff weave passes filter ✓
- Thread chats → live on the thread node → appear iff thread passes filter ✓

**3 — Plans folder icon**
New `createPlansSection` helper, codicon `checklist` (matches `Icons.plan`). Same pattern as `createChatsSection`.

**4 — Unify versions** — agreed. Current state:
| Package | Version |
|---|---|
| root | 0.1.0 |
| core | (none) |
| fs | (none) |
| app | 0.1.0 |
| cli | 0.1.0 |
| **mcp** | **0.4.0** |
| vscode | 0.1.0 |

`mcp` drifted because of the 0.4.0 release tag for the MCP server feature. The internal packages (`core`, `fs`) don't even publish, so version is moot for them but should be set for consistency. Suggest: bump everything to **`0.5.0`** for the next coordinated release (MCP state-trim + global chats + filter rework + UI polish all qualify as a minor). Or `0.4.1` if you'd rather mark this a patch on top of the 0.4.0 MCP work. Your call — I'll do the find-and-replace once you confirm.

**5 — MVP shortlist (what's left)**
Working backwards from "someone else can use Loom on their own codebase":
1. **`loom install` template parity** — confirm a fresh repo init yields a working `.mcp.json`, `.loom/CLAUDE.md`, and tree. (You did some of this in `installWorkspace.ts` recently — needs an end-to-end smoke test in a clean dir.)
2. **AI commands actually call MCP sampling** — `loom.generateGlobalCtx`, `refineDesign`, `refineIdea` are still stubs / partial. The DoStep flow is the proven path; the others should follow it.
3. **Empty workspace UX** — a brand-new user opens VS Code, no weaves yet. Walkthrough is wired but the tree should show a clear "Create your first weave" empty state, not "No weaves found".
4. **Marketplace publish blockers** — README with screenshots, license, publisher account, icon at the right sizes, no dev-only `console.log`s, `vsce package` warnings cleared.
5. **One-pass docs sweep** — `loom/refs/loom.md` and `vision.md` are the public-facing pitch; the recursion ("Loom-on-Loom") is documented but the "Loom-on-someone-else's-codebase" path isn't yet.

Not blockers, deferrable: multi-loom UI, custom workflow.yml, advanced filters, perf at 100+ weaves. Ship the single-workspace happy path first.

**6 — MCP timeout retry didn't reconnect**
Found it. The retry node fired `loom.refresh`, which calls `treeProvider.refresh()`, which calls `getMCP().readResource()`. But `getMCP` is memoized — the *same* broken client is reused on every retry, so it times out again.
Fix:
- New command `loom.reconnectMcp` — calls `disposeMCP()` (clears the singleton + closes transport) then `syncAndRefresh()` so the next `getMCP()` call spawns a fresh `loom mcp` subprocess.
- Timeout node now wired to `loom.reconnectMcp` (label: "MCP timed out — click to reconnect").
- Command also registered in `package.json` so it's available in the command palette.

Files changed: `packages/vscode/src/view/viewState.ts`, `packages/vscode/src/tree/treeProvider.ts`, `packages/vscode/src/extension.ts`, `packages/vscode/package.json`.

Next: rebuild + repackage vsix to test. Awaiting your call on (4) — bump to `0.5.0` or `0.4.1`?

## Rafa:

### MVP
I alredy created folder for `loom/mvp/mvp/` mvp weave and thread
Create a plan `loom/mvp/mvp/plans/mvp-plan-001.md`
Add a Phase 0: check all toolbar and inline buttons are working
With 5 Phases for 5 points you mentioned in lines 616-624
For each point/phase enumerate detailed Steps
Add a Phase 6: Bump 0.5.0, publish

### Issues
I used weave, thread toolbar buttons, they are not working

## AI:

Both done.

**Toolbar bug — root cause found in 2 minutes**

`weaveCreate.ts:20` and `threadCreate.ts:30` wrote to `path.join(workspaceRoot, 'weaves', ...)`. The whole codebase uses `loom/`, not `weaves/`. So the dirs were silently created at `J:/src/loom/weaves/{id}/` — outside the loom tree, completely invisible. Fixed both to `'loom'`. esbuild rebuilt clean.

This was almost certainly leftover from an earlier rename pass (the design doc still uses the word "weaves" colloquially). Worth grepping the rest of the codebase for stray `'weaves'` literals in path joins — adding it as Phase 0 follow-up.

**MVP plan created**

🔧 MCP: loom_create_plan(weaveId="mvp", threadId="mvp", title="MVP — Plan to publish")
🔧 MCP: loom_update_doc(id="mvp-plan-001", content=...)

`loom/mvp/mvp/plans/mvp-plan-001.md` — 7 phases, 37 steps:

- **Phase 0** (steps 1–5): toolbar audit, inline-button audit, the path-bug fix, selection→context wiring, fix-anything-found.
- **Phase 1** (steps 6–9): `loom install` template parity — verify greenfield workspace works end-to-end.
- **Phase 2** (steps 10–15): wire `generateGlobalCtx`, `refineDesign`, `refineIdea`, `refinePlan`, `summarise`, `chatReply`, `promoteTo*` through MCP sampling — kill all stubs.
- **Phase 3** (steps 16–19): empty-workspace UX (welcome view), walkthrough completion events, first-run notification, MCP status bar.
- **Phase 4** (steps 20–25): marketplace blockers — `vsce package` warnings, README + screenshots, icon sizes, console.log cleanup, publisher account, LICENSE files.
- **Phase 5** (steps 26–30): docs sweep — outside-user perspective for `loom.md`/`vision.md`, new `getting-started.md`, architecture/workflow ref freshness, install-time `CLAUDE.md` review.
- **Phase 6** (steps 31–37): bump all packages to `0.5.0`, CHANGELOG, build/test, package vsix, publish vsix + npm, tag release.

Notes section flags the parallelism: Phase 1 + Phase 5 can run concurrently; Phases 4 and 6 gate the release.

Plan is in `status: draft` — needs `loom_finalize_doc` then `loom_start_plan` before stepping through it.

Next: reload VS Code (or reinstall the new vsix) and try `New Weave` — the bug fix is in `dist/extension.js`. Then your call on starting the MVP plan.

## Rafa:

Plan only have phases, no steps, no details, I think creating it via MCP failed. 

## AI:

Confirmed and root-caused. Plan is now populated (37 steps).

**Why the MCP path failed**

`loom_update_doc` (in `packages/mcp/src/tools/updateDoc.ts`) loads the doc, sets the new `content`, and calls `saveDoc`. `saveDoc` for plans does:

```ts
if (doc.type === 'plan' && steps) {
    bodyContent = updateStepsTableInContent(content, steps);
}
```

The bug: after content is replaced, `doc.steps` still holds the parsed-from-old-content steps (which was `[]` — the brand-new plan had an empty table). `updateStepsTableInContent(newContent, [])` then *overwrites my freshly-written Steps table with an empty one*. That's why the file ended up with `## Steps` as a bare heading.

**Fix**

`updateDoc.ts` now re-parses `steps` from the new content when the doc is a plan:

```ts
...(doc.type === 'plan' ? { steps: parseStepsTable(newContent) } : {}),
```

Rebuilt `packages/mcp/dist/`. The currently-running loom MCP server is the old long-running stdio process and still has the bug — it'll pick up the fix on next restart (`disposeMCP` from the extension, or quit + reconnect this Claude session).

**Plan recovery**

To unblock now without restarting the MCP server, I wrote the plan content directly via the file (one-shot, with the visibility prefix `⚠️ MCP unavailable — editing file directly`). Next time the same situation arises, MCP will work because of the fix above.

The plan file at `loom/mvp/mvp/plans/mvp-plan-001.md` now has all 37 steps across 7 phases, ready to finalize and start.

Files changed: `packages/mcp/src/tools/updateDoc.ts`, `loom/mvp/mvp/plans/mvp-plan-001.md`.

Next: restart the loom MCP server (so the fix is live), then `loom_finalize_doc` + `loom_start_plan` on `mvp-plan-001` to begin Phase 0.

## Rafa:

- Test if mcp is enable and you can access it to create docs correctly

### MCP templates
I truied to install and use Loom with continue instead of claude code. I found an error when loading resource templates for MCP Server loom: MCP error -32601: Method not found
This comes from Continue.dev (VS Code extension) trying to call resources/templates/list on the Loom MCP server. The config is at J:\temp_ds\.continue\mcpServers\.mcp.json.

Why it happens
Loom MCP server (packages/mcp/src/server.ts) does not implement the resources/templates/list handler. It implements:

resources/list ✅
resources/read ✅
tools/list, tools/call ✅
prompts/list, prompts/get ✅
resources/templates/list ❌ — missing
When Continue sends a resources/templates/list request, the server has no handler registered, so the MCP SDK returns MCP error -32601: Method not found.

The SDK already has the schema
I confirmed ListResourceTemplatesRequestSchema is exported from @modelcontextprotocol/sdk/types.js (SDK v1.29.0), so the fix is just adding the import + handler returning an empty array.

— Fix the server (add the missing handler): Works for all MCP hosts (Claude Code, Continue, etc.) but the server needs rebuilding.
- Commit

## AI:

Read the selection. Two items here:

### MCP works (current session)

I just exercised it — `📡 MCP: loom://state?status=active,implementing` returned 284KB of state with `globalChats`, `mvp/mvp/mvp-plan-001` listed as `draft`, and the steps array populated (37 steps). So the rebuilt MCP picked up the `updateDoc.ts` fix on `/mcp` reconnect, and create/update via MCP is healthy. I'll do the next plan operations through MCP rather than direct file writes.

### `resources/templates/list` — fix

Your diagnosis is correct. `packages/mcp/src/server.ts` registers six handlers (`resources/list`, `resources/read`, `tools/list`, `tools/call`, `prompts/list`, `prompts/get`). `resources/templates/list` is not registered, so the SDK's default dispatcher returns `-32601` — that's exactly what Continue.dev sees.

We do have URI templates in our resource list (`loom://docs/{id}`, `loom://thread-context/{weaveId}/{threadId}`, `loom://plan/{id}`, `loom://requires-load/{id}`). So returning `[]` would be a *lie* — better to return them properly so MCP-aware hosts like Continue can discover and offer them.

**Proposed change** (one file, `packages/mcp/src/server.ts`):

```ts
import {
    ReadResourceRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,   // + add
    ListToolsRequestSchema,
    ...
} from '@modelcontextprotocol/sdk/types.js';

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
        { uriTemplate: 'loom://docs/{id}', name: 'Document', description: 'Raw markdown of any Loom document by id', mimeType: 'text/plain' },
        { uriTemplate: 'loom://thread-context/{weaveId}/{threadId}', name: 'Thread Context', description: 'Bundled context for a thread', mimeType: 'text/plain' },
        { uriTemplate: 'loom://plan/{id}', name: 'Plan', description: 'Plan document with parsed steps table as JSON', mimeType: 'application/json' },
        { uriTemplate: 'loom://requires-load/{id}', name: 'Requires Load', description: 'requires_load docs (recursive, deduplicated)', mimeType: 'application/json' },
    ],
}));
```

Side cleanup: the four templated entries above currently live in `ListResourcesRequestSchema` (lines 80–83), which is technically wrong — `resources/list` is for concrete URIs only; templates belong to `resources/templates/list`. Moving them out fixes Continue *and* makes Claude Code's resource list accurate.

**Vision check**: this serves the "Loom-on-someone-else's-codebase" item in [vision.md](../../refs/vision.md#beyond-loom-on-loom) — the Loom MCP server has to behave correctly for *any* MCP host, not just Claude Code. Today Continue users hit a -32601 on connect; that's an immediate adoption blocker.

**Where it fits the MVP plan**: this is a Phase 4 (marketplace blockers) candidate, but it's small and self-contained — could land independently of the plan as a chore commit.

Two questions before I touch code:

1. Should I move the four templated entries *out* of `ListResourcesRequestSchema` (cleaner, spec-correct) or *also* keep them there (more discoverable for hosts that don't call `templates/list`)? My vote: move them out — spec-correct beats permissive.
2. Land this **now** as a standalone fix-and-commit, or queue as a step inside `mvp-plan-001` (e.g. new step "Phase 4 — fix `resources/templates/list` handler")?

Next: waiting on those two answers before editing.

## Rafa:

1. Move them out
2. New step

Do `mvp-plan-001` Phase 0, can you test this or need my manual help?

## AI:

Got it. Plan: add the templates fix as a new step in `mvp-plan-001` (Phase 4 area), move templated URIs out of `resources/list`, then start Phase 0.

### Can I test Phase 0?

**Split — what I can do alone vs. what needs your hands:**

| Task | I can do | Needs you |
|------|----------|-----------|
| Step 1 — Toolbar buttons (audit code: command registration, handler exists, `view/title` `when` clause, mutation path, refresh call) | ✅ static audit | — |
| Step 2 — Inline buttons (audit `view/item/context` menus, `when` clauses match the right `contextValue`, handler signatures receive node) | ✅ static audit | — |
| Step 3 — `weaveCreate` / `threadCreate` path-bug fix | ✅ already fixed (`'weaves'` → `'loom'`) | smoke-test in installed vsix |
| Step 4 — Selection→`loom.selectedWeaveId` wiring | ✅ static audit + reasoning | — |
| Step 5 — Fix bugs found | ✅ implement | smoke-test fix in vsix |
| Smoke testing buttons in real VS Code | ❌ no GUI access | ✅ you click |

**My approach for steps 1–4 (static audit):** read every command registration in `packages/vscode/src/extension.ts`, every handler in `packages/vscode/src/commands/*`, every menu entry + `when` clause in `packages/vscode/package.json`. Cross-reference contextValues set by `treeProvider.ts`. Report a punch list of "wired correctly / wired wrong / handler exists but does nothing / when clause too narrow or too wide". Each finding becomes an appended row in the plan.

**Then you:** repackage vsix from latest dist, install, smoke-test the rows I flagged, give thumbs up/down per finding so I know what to actually fix. Saves you from clicking 33 buttons blind — you only verify the suspects.

**Order of operations:**

1. Append new step to `mvp-plan-001` for `resources/templates/list` fix.
2. Finalize + start `mvp-plan-001` (status: `draft` → `active` → `implementing`).
3. Run the static audit (steps 1, 2, 4 in parallel — they're all read-only).
4. Report findings, append bug rows.
5. You smoke-test the suspects.
6. I fix what you confirm broken (step 5).

Sound right? Reply `go` and I'll start with #1 and #2.

## Rafa:

- add the templates fix as a new step in `mvp-plan-001`
- go

## AI:

### Phase 0 audit — done

Plan finalized + started. Note: `loom_finalize_doc` renamed `mvp-plan-001` → `mvp-plan-to-publish-plan` (auto-derived from title). New step 26 added (templates/list fix) per your decision.

Steps ✅ 1, 2, 4 (static audits). Findings written to `loom/mvp/mvp/done/mvp-plan-to-publish-plan-done.md`.

**Punch list — toolbar (12/13 ok):**
- All wired except `generateGlobalCtx` (stub, already tracked as step 10).

**Punch list — inline (14/19 ok):**
| Button | Status |
|--------|--------|
| weaveIdea/Design/Plan, summarise, finalize, refineDesign, startPlan, doStep, completeStep, chatReply, closePlan, rename, archive, delete | ✅ |
| validate | ⚠️ ignores node param but launches modal — acceptable |
| **promoteToIdea, promoteToDesign, promoteToPlan, refineIdea, refinePlan** | ❌ handlers don't accept `node` argument; depend on `activeTextEditor` instead of tree selection |

The 5 ❌ are one bug class: handlers were written before tree-context wiring landed and still read `vscode.window.activeTextEditor` instead of the passed `TreeNode`. Tree-menu invocation works only when the active editor happens to match the right-clicked doc.

**Selection wiring (step 4 ✅):** functional today — every `TreeNode` carries `weaveId`, so `setContext('loom.selectedWeaveId', node.weaveId)` resolves correctly for all node types. Latent footgun if a future node type forgets `weaveId`. No fix today.

### Step 3 + Step 5 — what's left

- **Step 3** (path bug): code already fixed (`weaves/` → `loom/`). Needs **your** smoke-test: repackage vsix, install, click toolbar `weaveCreate` and `threadCreate`, confirm dirs land under `loom/`. Then I'll mark ✅.
- **Step 5** (fix bugs): 5 handler rewrites for `promoteTo*` + `refine{Idea,Plan}`. I can do this now — pattern is "replace `activeTextEditor` lookup with `node?.doc?.id`-based lookup, fall back to active editor only if no node passed". Plus also wire them through MCP `loom_promote` / `loom_refine` (which dovetails with Phase 2 steps 12 + 15 — likely worth merging Phase 0 step 5 with those Phase 2 steps for these specific commands).

**Two questions:**
1. Do you want to smoke-test step 3 now (so I can mark it ✅), or queue it?
2. For step 5: do I fix just the `node` argument plumbing (Phase 0 hygiene), or fix node + route through MCP in one shot (collapses with Phase 2 steps 12 + 15)? My vote: fix it once, route through MCP — saves a re-touch later.

Next: waiting on those answers.

## Rafa:

1. confirmed they work
2. fix it once, route through MCP — saves a re-touch later. Always choose correct path!

## AI:

### Design decision needed before step 5

Reading the 5 broken handlers + the MCP tool surface, the clean fix splits into two scopes:

**Promote (3 commands) — clean, can do now:**

`loom_promote(sourceId, targetType)` already exists. Each command becomes:

```ts
export async function promoteToIdeaCommand(treeProvider: LoomTreeProvider, node?: TreeNode) {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { /*err*/ return; }
    const sourceId = node?.doc?.id ?? await pickFromActiveEditor();  // fallback path
    if (!sourceId) return;
    const result = await getMCP(root).callTool('loom_promote', { sourceId, targetType: 'idea' });
    treeProvider.refresh();
    // open the new doc
}
```

Net effect:
- Drops `@reslava-loom/app/dist/promoteToIdea` import (Stage 2 layering rule satisfied).
- Drops `loadDoc/saveDoc/fs` deps + `makeAIClient`.
- Source doc resolved from tree node first; active editor only as fallback.

Apply same pattern to `promoteToDesign` and `promoteToPlan`.

**Refine (2 commands) — blocked on a design call:**

There is **no `loom_refine_idea` / `loom_refine_plan` MCP tool**. The current `loom_generate_idea/design/plan` tools generate a *new* doc; they don't refine an existing one. So routing refine through MCP needs a server change first.

Three options, ranked:

1. **Add `loom_refine_idea` and `loom_refine_plan` MCP tools** (use sampling, take docId, rewrite content + bump version). Cleanest, matches the `refineDesign` shape already implemented at MCP level (per step 11 it may need its own audit). ~1 day of work — new tool files, sampling prompts, tests. Should also do `loom_refine_design` while we're there, replacing the current `runEvent`-based path that step 11 calls out.
2. **Reuse `loom_generate_*` and have it detect "doc with this id exists, refine it"** (overload). Bad — double-purpose tools, schemas lie about behaviour, hosts get confused.
3. **Skip MCP routing for refine**, just fix the `node` arg plumbing (drop `activeTextEditor` reads). Violates Stage 2 layering rule — these would still import `app/dist/refineIdea`. Quick win but creates the re-touch you wanted to avoid.

My vote: **option 1**. Bigger scope but it's the correct path you asked for. We can:
- Land it as one chunk: 3 promote-rewrites + 3 new MCP refine tools + 3 refine-rewrites.
- Or split: do promotes now (small, self-contained), add a new plan step `5b` for the refine-MCP work and tackle it next session.

**Question:** option 1 split (promotes now, refines as `5b`), option 1 all in one shot, or option 3 (just fix node plumbing, accept the layering debt and merge it with Phase 2 step 12 later)?

Either way, the MCP server needs a rebuild + reconnect after I touch tools. Want me to also fold the templates/list fix (step 26) into the same MCP rebuild cycle?

Stopping for direction.

## Rafa:

- Promote (3 commands): do it
- Refine (2 commands): option 1: correct path always

## AI:

### Promotes done (3/5 of step 5)

**Files changed:**
- `packages/vscode/src/commands/promoteToIdea.ts` — full rewrite
- `packages/vscode/src/commands/promoteToDesign.ts` — full rewrite
- `packages/vscode/src/commands/promoteToPlan.ts` — full rewrite
- `packages/vscode/src/extension.ts` — registrations now pass `node` through

**Each new handler:**
- Accepts `node?: TreeNode`.
- Reads `sourceId` from `node?.doc?.id` only (no `activeTextEditor` fallback — explicit error if no node).
- Calls `getMCP(root).callTool('loom_promote', { sourceId, targetType })`.
- No more `@reslava-loom/app/dist/...` imports — Stage 2 layering rule satisfied.
- Wrapped in `withProgress`; opens the new doc + refreshes tree on success.

**Build:** `tsc --noEmit` clean, `esbuild` bundled `dist/extension.js` (1.5mb).

**Smoke test (your hands needed):** repackage vsix, install, then in the tree right-click:
- A chat → Promote to Idea / Design / Plan
- An idea → Promote to Design / Plan
- A design → Promote to Plan

Each should call MCP and write a new doc linked back to the source. Confirm before I touch refines.

### Refines next — bigger chunk

For refineIdea + refinePlan via MCP, I need to:
1. Add `loom_refine_idea` MCP tool (`packages/mcp/src/tools/refineIdea.ts`) — sampling-based, takes docId, rewrites body + bumps version.
2. Add `loom_refine_plan` MCP tool (same pattern).
3. Register both in `packages/mcp/src/server.ts`.
4. Rewrite `packages/vscode/src/commands/refineIdea.ts` + `refinePlan.ts` to call them.
5. Rebuild MCP, reconnect (you run `/mcp` reconnect or my `loom.reconnectMcp` command), repackage + install vsix.

I can also fold the templates/list fix (step 26) into the same MCP rebuild since we're touching `server.ts` anyway. Saves one rebuild cycle.

**Confirm before I proceed:**
1. Smoke-test promotes first?
2. Yes/no on folding step 26 into the same MCP touch?

Stopping.

## Rafa:

1. Had problems...
### Tree problem
Selecting any node doc in tree do not open the corresponding doc

### Promote
I test with Haiku:
I got this kind of error:
```
Promote to idea failed: MCP error -32603: AI response did not start with TITLE: line. Got: "TODO: Add implementation notes."
```
Maybe it is related to `Tree problem`

2. Yes, fold

## AI:

### Step 5 + step 26 — landed

Diagnosed both regressions and fixed everything in one MCP rebuild cycle.

#### Tree-click bug (regression I caused)

**Root cause:** my earlier state-size optimization stripped `_path` from the JSON. The tree uses `(doc as any)._path` to wire the `vscode.open` click command — without it, clicks do nothing.

**Fix** (`packages/mcp/src/resources/state.ts`): replacer now strips only `content`, keeps `_path`. State response stays small (content was the bulk), tree clicks work again.

#### Promote bug (root cause: not using sampling)

**Root cause:** `loom_promote` MCP tool used `makeAiClient()` (DeepSeek). With `DEEPSEEK_API_KEY` unset, that client returns `"TODO: Add implementation notes."` — which `app/promoteToIdea` parses for a `TITLE:` line and rejects. The tool was never actually using your Claude/Haiku setup.

**Fix:** rewrote `loom_promote` to factory pattern with sampling, like the existing `loom_generate_*` tools. New helper `samplingAiClient(server)` wraps `requestSampling` to satisfy the `AIClient` interface, so `app/promoteToIdea` etc. now run via MCP sampling against whatever model your client uses.

#### New refine MCP tools

- `loom_refine_idea(id)` — calls `app/refineIdea` with sampling client.
- `loom_refine_plan(id)` — calls `app/refinePlan` with sampling client.

Both registered in `server.ts` via factory pattern.

#### VSCode refine commands rewritten

- `commands/refineIdea.ts` and `commands/refinePlan.ts` — full rewrite, MCP-only.
- Drop `@reslava-loom/app/dist/...` imports (Stage 2 layering rule).
- Drop `activeTextEditor` reads — read `id` from `node?.doc?.id`.
- `extension.ts` registrations updated to pass `node`.

#### Step 26 (templates/list) — folded in

- New handler: `ListResourceTemplatesRequestSchema` returns the 4 templated URIs.
- Templated URIs (`loom://docs/{id}`, `loom://thread-context/{...}`, `loom://plan/{id}`, `loom://requires-load/{id}`) **moved out of** `resources/list` — spec-correct now. Continue.dev should stop hitting `-32601`.

#### Files changed

| Layer | File | Change |
|-------|------|--------|
| mcp | `samplingAiClient.ts` | NEW — wraps `requestSampling` as `AIClient` |
| mcp | `tools/promote.ts` | refactored to factory + sampling |
| mcp | `tools/refineIdea.ts` | NEW |
| mcp | `tools/refinePlan.ts` | NEW |
| mcp | `server.ts` | wire new tools, add templates handler, move templated URIs |
| mcp | `resources/state.ts` | keep `_path` |
| vscode | `commands/refineIdea.ts` | rewrite — MCP-routed |
| vscode | `commands/refinePlan.ts` | rewrite — MCP-routed |
| vscode | `extension.ts` | refine* registrations pass `node` |

#### Builds

- `tsc -p packages/mcp/tsconfig.json` ✅ clean
- `tsc --noEmit -p packages/vscode/` ✅ clean
- `node packages/vscode/esbuild.js` ✅ `dist/extension.js` 1.5mb

#### What you need to do to test

1. **Restart MCP server** so the new server code is live: run `/mcp` to reconnect (or the extension's `Loom: Reconnect MCP` command).
2. **Repackage + reinstall vsix** to pick up the new commands and tree fix.
3. Smoke-test:
   - Click any doc/chat/plan/done node in tree → editor opens (regression fixed).
   - Right-click a chat → Promote to Idea → MCP sampling generates real idea.
   - Right-click an idea → Refine → version bumps.
   - Right-click a plan → Refine → version bumps.
   - Continue.dev should connect without `-32601`.

Then I'll mark step 5 ✅ + step 26 ✅. Stopping.

## Rafa:
All worked with some issues.
note: they use inline buttons instead of right click, this is the correct UX
- Promote generated docs do not fall inside its own thread or weave/new-thread
for example, i promoted to idea the chat `loom/weave-test/thread-test/chats/thread-test-chat-001.md`
and generated idea went to `loom/thread-test/thread-test-creating-a-testtxt-file-with-specified-content-idea.md`
instead of `loom/weave-test/thread-test/thread-test-creating-a-testtxt-file-with-specified-content-idea.md`

## AI:

### Promote target-path bug — fixed

**Root cause:** `app/promoteTo{Idea,Design,Plan}.ts` all used `doc.parent_id` as the weaveId. For a thread-level chat (`loom/{weave}/{thread}/chats/X.md`), `parent_id` is the *thread* id (`thread-test`), not the weave id (`weave-test`). So output landed at `loom/{thread-id}/...` instead of `loom/{weave-id}/{thread-id}/...`.

**Fix:** Replaced the `doc.parent_id` lookup with a `deriveLocation(filePath, loomRoot)` helper in all three files. The helper parses the source path:

- `loom/{weave}/{thread}/chats/X.md` → `{weaveId, threadId}` → output goes to `loom/{weave}/{thread}/`
- `loom/{weave}/{thread}/X.md` → same
- `loom/{weave}/chats/X.md` → `{weaveId}` (weave-level chat) → output goes to `loom/{weave}/`
- `loom/{weave}/X.md` → loose fiber → output goes to `loom/{weave}/`

Plans land in `{thread-or-weave-dir}/plans/`. ID generation uses `threadId ?? weaveId` as the scope prefix, so the generated id becomes `thread-test-creating-...-idea` (matching what you expected).

**Files changed:**
- `packages/app/src/promoteToIdea.ts`
- `packages/app/src/promoteToDesign.ts`
- `packages/app/src/promoteToPlan.ts`

(`mcp/tools/promote.ts` unchanged — it already passes filePath through.)

**Builds:** `tsc -p packages/app` ✅ and `tsc -p packages/mcp` ✅ both clean.

**Note on UX:** you mentioned inline buttons (vs right-click) being the correct UX — agreed, but that's a separate UI question (buttons need icons + `view/item/context` `group` placement to render inline). Adding it as a follow-up step in the MVP plan rather than mixing it with this bug fix.

**To smoke-test:**
1. Reconnect MCP (`/mcp` or `Loom: Reconnect MCP`) — picks up new app/dist via mcp.
2. Right-click `loom/weave-test/thread-test/chats/thread-test-chat-001.md` → Promote to Idea.
3. Confirm idea lands at `loom/weave-test/thread-test/thread-test-...-idea.md`.

Want me to mark step 5 ✅ after this confirms, and add a new step "Inline-button UX (icons + group placement on inline promote/refine actions)"?

Stopping.

## Rafa:

- Inline buttons already exits, they are already implemented.
- idea was created in correct path:
`loom/weave-test/thread-test/thread-test-user-requests-creation-of-a-test-text-file-idea.md` but does not appear in tree, even refreshing



## AI:

### Why the idea didn't appear in the tree

**Root cause:** the thread loader (`fs/repositories/threadRepository.ts:44`) looks for **exactly** `{threadId}-idea.md` (e.g. `thread-test-idea.md`). My promoteToIdea was generating `{threadId}-{kebab-of-title}-idea.md` — that file is dropped on the floor by the loader, even though it's at the correct path. There's even a constraint in the loader that warns if multiple `*-idea.md` exist in a thread root: **one idea per thread** is the design.

Same issue would hit design (`{threadId}-design.md` is the canonical name).

**Fix** (`packages/app/src/promoteToIdea.ts` and `promoteToDesign.ts`):
- **Thread-level promote** → file is exactly `{threadId}-idea.md` / `{threadId}-design.md`. If it already exists, throw `Thread '{x}' already has an idea/design. Refine the existing one instead.` (cleaner UX than silent overwrite).
- **Weave-level (loose fiber) promote** → keep kebab-of-title naming (multiple loose fibers are valid at weave root).

**Build:** `tsc -p packages/app` ✅ clean.

**To test:**
1. Delete the orphan from the previous test:
   `loom/weave-test/thread-test/thread-test-user-requests-creation-of-a-test-text-file-idea.md`
2. Reconnect MCP (`/mcp` or `Loom: Reconnect MCP`).
3. Promote the same chat again → idea lands at `loom/weave-test/thread-test/thread-test-idea.md` and shows in tree.

Then I'll mark step 5 ✅. Stopping.

## Rafa:

I got this error twice:
```
Promote to idea failed: MCP error -32603: AI response did not start with TITLE: line. Got: "I can't create files directly in this chat environment. However, here's the content you requested:"
```
Third time worked, idea showed up

I feel extension fragile, sensitive to regressions, lot of iterations to achive loom structure.

### To Claude
Although docs were created manually, you are using Loom MCP Server, how you you feel using it? Compared to work freely with a codebase?

## AI:

### TITLE: parser brittleness

The model added preamble (`"I can't create files directly..."`) before the `TITLE:` line, and the parser checks only the *first* line — strict mode. The model is being chatty in a context that demands strict format, which is exactly the kind of thing that varies between models, contexts, and even retries with the same prompt.

**One-line fix** in all 3 `app/promoteTo*.ts`: scan for the first line that matches `^TITLE:` instead of demanding it's the first line. If none found, then error.

```ts
// before
const firstLine = firstNewline === -1 ? reply : reply.slice(0, firstNewline);
const titleMatch = firstLine.match(/^TITLE:\s*(.+)$/i);

// after
const lines = reply.split('\n');
const titleIdx = lines.findIndex(l => /^TITLE:\s*.+$/i.test(l));
if (titleIdx === -1) throw new Error(`AI response missing TITLE: line. Got: "${reply.slice(0, 200)}"`);
const titleMatch = lines[titleIdx].match(/^TITLE:\s*(.+)$/i)!;
const body = lines.slice(titleIdx + 1).join('\n').trim();
```

Same lenient pattern for `refineIdea`/`refinePlan`. Want me to land it?

### Honest reflection — Loom MCP vs freeform

You asked, so straight answer:

**Wins (real):**
- The `🔧 MCP:` / `📡 MCP:` visibility prefixes catch me when I'm cheating. In a freeform shell I can silently bypass rules; here I can't pretend I didn't.
- `loom://state?status=active` is a much better answer to "what's active?" than `git log` + grep + intuition. Structured state is queryable.
- The plan/step/done model forces stop-and-wait cadence. A 38-step plan would be unmanageable in freeform — I'd burn through 10 steps without checking in. Loom enforces the discipline.
- Chat docs as durable memory beat terminal-only replies. This conversation will outlive my context window — that's genuinely valuable.

**Friction (also real, this session in particular):**
- **Brittleness cliff.** The TITLE: parser is one line of strictness, but it cost you 2 retries. The DEEPSEEK_API_KEY fallback returning `"TODO:"` cost a debug round. The dist-vs-source drift cost a rebuild cycle. Each individually small, but they compound — what feels like "a lot of iterations" is the system being unforgiving about specific shapes (id-naming, frontmatter, file paths, prompt formats).
- **Indirection tax.** Direct file edit = 1 step. MCP edit = load tool schema → call tool → narrate → parse JSON. For a typo fix that's 5x overhead.
- **Stale dist hazard.** MCP server is a long-lived stdio process. Edit source, forget to rebuild, and the server happily serves old logic. I've eaten that mistake twice this session.
- **Chat-doc duality.** I have to track "is this an active chat-doc context?" and split between terminal-reply and chat-append. Sometimes I write near-duplicates because the answer fits both.
- **Implicit renames.** `loom_finalize_doc` renamed `mvp-plan-001` → `mvp-plan-to-publish-plan` from the title. Freeform has no opinions; Loom has confident opinions about ids. Useful when right, jarring when not.

**Net feeling:** Loom is *worse* for "fix this typo" and *much better* for "build a 38-step thing across multiple sessions." The sensitivity you feel is the cost of the durable-state discipline. Most of the regressions today were me making changes too fast and skipping the rebuild step — operator error the system can't fully prevent. The TITLE: brittleness, though, is a real bug and worth fixing now.

Want the parser fix landed before next test?

## Rafa:

- Yes
- Commit, push