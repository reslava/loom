---
type: chat
id: ch_01KQYDFDDFPQSVEEJ62XEC9N9Y
title: Vscode Mcp Refactor Plan 002 Done Chat
status: done
created: "2026-04-29T00:00:00.000Z"
version: 1
tags: []
parent_id: null
requires_load: []
---
# CHAT

## Rafa:

How was the session start?
What you load in your context?

## AI:

Session start went well. Here's what landed in context:

1. **CLAUDE.md** — auto-loaded by the harness. Full session contract: terminology, architecture, AI rules, stop rules, collaboration style.

2. **loom/loom-ctx.md** — read per the session-start protocol. This is the global ctx doc: concept (what Loom is), architecture (layers, reducers, doc types), and operating rules (MCP, stop rules, chat-doc surface). Emitted `📘 loom-ctx loaded`.

3. **This chat doc** — you asked me to read it, so it's now the active conversation surface. All replies go here.

What I did *not* load (because the session start protocol calls for it but MCP isn't reachable from this surface):
- `loom://state?status=active,implementing` — would give the live active thread list.
- `do-next-step` prompt with the active planId — would load thread context + next step.

So I have the static contract (CLAUDE.md + loom-ctx) but not the live state snapshot. If you want me to pick up where plan-002 left off, point me at the plan doc or tell me the active planId and I'll read it directly.

## Rafa:

1. Is there any workaround for you to access mcp from `claude vscode extension`?

2. When user clicks any loom vscode extension button, is a new session? you read claude.md? how is the workflow? becuase the layers are:
vscode -> mcp thin client -> mcp
this imply any session start, new context?

## AI:

**1. MCP access from the Claude VS Code extension — no clean workaround**

The Claude VS Code extension is a chat UI that talks to Anthropic's cloud; it doesn't implement the MCP client protocol, so it can't reach the Loom MCP server at all. The three realistic options:

- **Switch to Claude Code CLI** — runs in the terminal, fully MCP-capable. This is what you're doing for design sessions. No workaround needed; just use the right surface.
- **Fake it with direct file reads** — when inside the Claude VS Code extension, I read loom markdown files directly (like I did just now for plan-002). It works for reading; mutations have to go through MCP so this surface is read-only for Loom state changes.
- **There is no way to make the Claude VS Code extension host MCP** — that's a feature Anthropic hasn't shipped. It's not a configuration gap; the protocol layer simply isn't there.

Bottom line: Claude VS Code extension = static/read-only Loom. Claude Code CLI = full MCP access.

---

**2. Button clicks in the Loom VS Code extension — this is a different thing entirely**

The *Loom* VS Code extension (`packages/vscode/`) is not the *Claude* VS Code extension. They are unrelated programs. The flow when a user clicks a Loom button:

```
User clicks button
  → Loom VS Code extension (TypeScript, running in the extension host)
      → mcp-client.ts (thin stdio wrapper)
          → Loom MCP server (Node process, spawned once at activation)
              → app → core + fs
```

There is **no AI session involved in this path at all** unless the command specifically asks for inference. The extension is just calling tools on the MCP server, which is deterministic code. CLAUDE.md is never read here — that's a Claude Code concept.

The one place AI enters is when the user clicks **DoStep** (plan-002's goal):

```
User clicks DoStep
  → loom.doStep command
      → mcp.callTool('loom_do_step', { planId })
          → MCP server calls server.createMessage(prompt)   ← inference request
              → routed back to mcp-client.ts sampling handler
                  → calls the extension's configured AI client (Anthropic SDK)
                      → inference happens
                  ← returns result to MCP server
              → MCP server applies file edits, marks step done
          ← returns result
      ← extension refreshes tree
```

So **each DoStep click is not a "session" in the CLAUDE.md sense** — it's a single inference call with a prompt built on-the-fly by the MCP server from the thread's current context (idea + design + plan step). The MCP server loads that context fresh each call from the file system. No persistent session, no CLAUDE.md, no memory across clicks.

The implication: if you want AI-driven buttons to be context-aware, the context has to be injected into the sampling prompt by the MCP server. That's exactly what plan-002 step 3 (`loom_do_step` tool) has to build.

## Rafa:

1. ok
2. Nice, it works like I think, and it is the perfect way for Loom, just injected context. We provide AI the related -ctx files, always fresh. What you think?

## AI:

Yes, this is the right design. A few reasons it holds up well:

**Fresh context is the right unit.** Each DoStep call loads the ctx snapshot from disk at call time — no stale state from a previous session, no accumulated drift. The ctx files are the cache; the file system is the source of truth. This is exactly what event-sourced design should feel like.

**Ctx files doing double duty.** They were already useful for human-readable summaries and for Claude Code sessions. Now they're also the AI input payload for button-driven inference. Same artifact, three consumers — that's good compression.

**The boundary is clean.** The MCP server owns "what context to inject" (it knows the thread structure, which ctx files exist, which plan step is next). The AI client owns "how to perform inference." Neither bleeds into the other. When you later want to tune what gets injected — add the design doc, add the done files for prior steps — that's a one-file change in the MCP tool, not a change to the extension or the AI client.

**One thing to watch:** ctx files need to stay current. If a step is done but the ctx hasn't been regenerated, the next DoStep call gets a stale picture. Two options: (a) `loom_do_step` regenerates the thread ctx as part of marking the step done, or (b) we accept manual `loom_generate_ctx` calls and document the discipline. Option (a) is safer — it closes the loop automatically. Worth deciding before step 3 is implemented.

## Rafa:

We have global, weave, thread level ctx. And future `loadWhen` filter.
But the thread context it is no stale by doing a plan step. It is stale by updating, refining, the idea, the design or plan. Agree? 

## AI:

Yes, agree. I had the wrong mental model in my previous reply.

A plan step being marked done doesn't change what the thread *is* — the idea, design, and plan docs themselves are unchanged. The thread ctx summarizes those, so it stays valid. The step status is already tracked in the plan doc's steps table; the ctx doesn't need to re-summarize that.

Ctx goes stale when the *substance* changes: someone rewrites a section of the design, refines the idea, or adds/removes steps from the plan. Those are editorial changes to the source docs. That's when `loom_generate_ctx` (or a future auto-trigger on doc save) needs to fire.

So the correct staleness triggers are:

| Event | Ctx stale? |
|---|---|
| Step marked done | No — plan step table updated, ctx still accurate |
| Design doc edited/refined | Yes — thread ctx needs regeneration |
| Idea doc edited | Yes |
| Plan steps added/removed/reworded | Yes |
| New done.md written | Maybe — if ctx includes a summary of done docs, otherwise no |

This also means DoStep can safely read the thread ctx without regenerating it first — the ctx is fresh relative to what the AI needs to know to implement the next step. Clean.

## Rafa:

Are we ready for plan or any question? 
If ready do `loom/vscode-extension/vscode-mcp-refactor/plans/vscode-mcp-refactor-plan-002.md` steps 1, 2, 3

## AI:

Steps 1, 2, 3 done. Both packages compile clean (`tsc --noEmit` exits 0).

**Step 1 — `sampling/createMessage` handler in `mcp-client.ts`**
- Added `sampling: {}` to client capabilities so the MCP server knows it can call back.
- Imported `CreateMessageRequestSchema` from the SDK.
- Registered `client.setRequestHandler(CreateMessageRequestSchema, ...)`: maps `SamplingMessage[]` + `systemPrompt` → `makeAIClient().complete([...])` → returns `{ model, stopReason, role, content: { type: 'text', text } }`.

**Step 2 — `chatReply.ts` reverted**
- Removed the `makeAIClient()` bypass, `SYSTEM_PROMPT` constant, and direct `loom_append_to_chat` call.
- Command now just calls `mcp.callTool('loom_generate_chat_reply', { chatId })`. The MCP server tool handles read + sampling + write.

**Step 3 — `loom_do_step` tool created**
- New file: `packages/mcp/src/tools/doStep.ts` — `createDoStepTool(server)` factory (same pattern as `refreshCtx` and `generate`).
- Flow: find plan by ID → derive `weaveId`/`threadId` from file path → load `PlanDoc` (canonical steps) → pick first non-done step → load thread context via `handleThreadContextResource` → call `requestSampling` → write implementation chat to `{thread}/chats/` → call `completeStep` app use-case to mark step done.
- Registered in `server.ts` alongside the other server-dependent tools.

One note: `loom_do_step` relies on `loadDoc`'s `parseStepsTable` parsing canonical-format steps (`Done | # | Step | Files touched | Blocked by`). Plan-002 uses the hand-written `# | Step | Status | Notes` format, so `completeStep` would fail if called on it — I marked steps 1–3 done by editing the file directly.

**Next:** Steps 4, 5, 6 remain — `loom.doStep` extension command (MCP-based), toolbar button, manual test.

## Rafa:

I read you said: `⚠️  MCP unavailable — editing file directly (plan-002 uses non-canonical step format; loom_complete_step can't parse its steps table) `

I don't know how when I ask you for creating a plan you do not use canonical format.

- Update plan to have correct table steps format
- Do 4, 5

## AI:

Fair call — plan-002 was hand-written with a non-canonical format. Fixed.

**Plan format fixed** (`vscode-mcp-refactor-plan-002.md`)
Steps table converted to canonical `Done | # | Step | Files touched | Blocked by`. Steps 1–4 marked ✅, step 6 still ⬜.

**Step 4 — `doStep.ts` rewritten to use MCP** (`packages/vscode/src/commands/doStep.ts`)
- Removed direct imports of `app/doStep`, `fs`, and `makeAIClient`.
- Command now calls `mcp.callTool('loom_do_step', { planId: plan.id })`, opens the generated chat doc, refreshes the tree.
- No QuickPick for step selection — `loom_do_step` picks the next pending step automatically.

**Step 5 — already done**
`loom.doStep` command and its `view/item/context` entry (`viewItem == plan-implementing && loom.aiEnabled`, `group: inline@1`) were already in `package.json` from prior plan-007 work. Nothing to add.

`tsc --noEmit` passes clean.

**Next:** Step 6 — manual test in Extension Development Host. Waiting for go.

## Rafa:

go

## AI:

Both packages built clean (`packages/mcp` tsc, `packages/vscode` esbuild — 1.5 MB bundle). `extension.ts` already registers `loom.doStep → doStepCommand(treeProvider, node)`, no changes needed there.

**Step 6 — manual test checklist** (run in Extension Development Host):

1. Press **F5** in this workspace to launch the Extension Development Host.
2. Open a workspace that has a Loom project with an `implementing` plan (canonical step format).
3. In the Loom tree, expand the plan — it should show `$(sparkle) Do Step(s)` inline.
4. Click the button. Progress notification "Loom: AI implementing step…" should appear.
5. Verify after completion:
   - A new chat doc opens in the editor (AI implementation notes for the step).
   - The step is marked ✅ in the plan file.
   - The tree refreshes automatically.
   - If it was the last step, the success message says "Plan complete".
6. Test failure path: remove the AI API key from settings, click DoStep — expect a VS Code error notification "Do Step failed: No AI API key configured."

**Cannot test automatically** — Extension Development Host requires interactive VS Code. Run the checklist above and report back. If anything fails, share the error message and I'll diagnose.

STOP — waiting for test results.

## Rafa:

Everything work.

### Issues to fix
- After doing a step should append the implementation notes to a `{plan-id}-done.md` doc
- The plan task was to create a file `test.txt`, the AI reply tell file was created, but it is false, file do not exist.
- No streaming of AI implementing at all, no posibility of stop, watch what AI is doing, or send a side note while implementing. I wonder if is possible to us e Claude Code terminal and call `DoStep` mcp from there, so user can see streaming of AI implementing and interact?

## AI:

All three are real and reveal the architectural truth of this design. Let me address them in order — issue 1 is a simple fix, 2 and 3 are coupled and need a design call.

---

**Issue 1 — Write to `{plan-id}-done.md`, not a chat doc.** Easy fix. Change `loom_do_step` to append to `{thread}/done/{plan-id}-done.md` (creating it on first step, appending a `## Step N` section on subsequent steps). Existing done docs in the repo follow this layout (`done/vscode-extension-plan-007.md` etc.). I'll fix this.

---

**Issue 2 — AI hallucination is structural, not a prompt bug.** This is the important one.

The MCP `sampling/createMessage` protocol is **text completion only**. The provider (DeepSeek / OpenAI / whatever) returns a string. It cannot:
- Write files
- Run shell commands
- Read other files mid-response
- Use tools

So when DeepSeek says "I created `test.txt`", it's lying *because the protocol gave it no other option*. It was asked to "implement a step" and the only thing it can return is prose. So it returns prose pretending to be implementation.

Two honest fixes:

- **(a) Make the prompt admit the truth.** Reframe `loom_do_step` as "write the implementation spec for this step" — not "implement it." The AI returns a detailed spec (files to create, code to write, commands to run). A human or Claude Code reads the spec and executes it. The done.md becomes a checklist. Honest, ships today, no architectural change.

- **(b) Parse code blocks from the response and write them.** Define a contract: AI must respond with fenced blocks like ` ```ts file=src/foo.ts ` and the tool extracts and writes them. Brittle (AI doesn't follow contracts perfectly), risky (we'd auto-write whatever the AI hallucinates), and still doesn't run shell commands or verify. Don't recommend.

I'd go with **(a)**. It matches what the protocol actually is.

---

**Issue 3 — Yes, Claude Code as the MCP client is the killer path.** This is exactly what MCP was designed for, and it solves issues 2 *and* 3 in one move.

The flow when Claude Code is the client:

```
Rafa (in Claude Code terminal): "do the next step of plan-002"
  → Claude Code calls loom_do_step({ planId: "vscode-mcp-refactor-plan-002" })
      → MCP server builds the prompt with thread context + next step
      → MCP server calls server.createMessage(...)   ← sampling request
          → routed BACK to Claude Code (the same agent)
              → Claude (full tool use, streaming, file edits, shell)
                  ← actually does the work, with Rafa watching, able to interrupt
              → returns result
          ← back to MCP server
      → MCP server appends to {plan-id}-done.md, marks step done
  ← Rafa sees the result + the live stream of what just happened
```

The same MCP tool, with a different sampling provider, becomes radically more capable. With DeepSeek behind it: a spec generator. With Claude Code behind it: an actual implementer with full tool use and live interaction. **No code changes needed** — `.claude/mcp.json` already has loom configured, so Claude Code already has access to `loom_do_step`. You can try it right now from a Claude Code terminal session.

The VS Code extension's DoStep button stays useful for "I want a quick spec without opening a terminal" workflows. For real implementation work, Claude Code wins.

---

**Proposed action:** I fix issue 1 now (done.md routing) and reframe issue 2 with prompt option (a) — the spec-not-implementation framing. Issue 3 needs no code, just a doc note that real implementation should happen via Claude Code. Sound right, or do you want a different split?

STOP — waiting for go.

## Rafa:

notes: 
- correct file is `.claude/settings.json` not `.claude/mcp.json`
- for testing I am using just Claude. I am not using DeepSeek for now

### 1 
Fix them

### 2 and 3
I would like that by clicking extension button, open claude code terminal and call mcp `loom_do_step`. Then Claude implement the plan, write the needed code for plan specs.
I think this will make extension buttons useful.

## AI:

Got the corrections. The button-launches-Claude-Code direction is the right move — and noticing that Claude itself hallucinated "file created" when the protocol gave it no tool path is a great validation that text-only sampling is not enough for real implementation work. The fix is to give Claude its real tools by running it as the agent, not as a captive text generator.

Before I code, one architectural question — the API shape of `loom_do_step` changes meaningfully under the new flow. Two options:

---

**Option X — `loom_do_step` is an executor (current code, plus a done.md fix).** It calls `server.createMessage(...)` internally, gets a text response, marks the step done, writes done.md. Claude Code calling it would trigger a sampling request *back to itself* — recursive. Whether sampling-from-self gives Claude tool use depends on the client implementation. With the Anthropic SDK in the VS Code extension it's plain text. With Claude Code as the client, it's unclear and likely text-only too. So this option keeps the hallucination problem; we'd just be moving it to a fancier surface.

**Option Y — `loom_do_step` is a briefing.** It returns thread context + the next pending step + instructions, nothing else. No sampling. No completion. Claude (running as the agent in Claude Code, with full tool use) reads the brief, edits files for real, then explicitly calls `loom_complete_step` + a new `loom_append_done` to record what happened. The MCP server stays deterministic; the "AI doing the work" lives entirely in Claude Code's normal agent loop where tools actually exist.

Y is correct. It matches what MCP tools are supposed to be (deterministic surfaces) and keeps inference where it has tools (the host agent loop). It also means the same `loom_do_step` works equally well from a Claude Code session, a Cursor session, or any future MCP host — none of them need sampling support for it.

---

**Proposed concrete plan:**

1. **Redesign `loom_do_step`**: returns `{ stepNumber, stepDescription, threadContext, planSummary, instructions }` as a JSON brief. No sampling, no side effects.
2. **New tool `loom_append_done`**: appends a `## Step N — <desc>` section to `{thread}/done/{plan-id}-done.md` (creates the file with proper frontmatter on first call).
3. **Rewrite extension `doStep.ts`**: opens an integrated terminal at workspace root, runs `claude` with a prompt like:
   > Use the loom MCP server. Call `loom_do_step` with `planId="..."` to get the brief. Implement the step using your tools. After implementation, call `loom_append_done` with your notes, then call `loom_complete_step`. Show me what you did.
4. **Drop the `mcp-client.ts` sampling handler from step 1**: with the executor pattern gone, the extension never needs to handle sampling requests. This removes ~25 lines and a dependency on `makeAIClient`. Step 1 was a means to an end; the end changed.
5. **`chatReply.ts` (step 2 of plan-002)**: still calls `loom_generate_chat_reply`, which still uses sampling. Question: does that tool also move to a briefing pattern, or does chat reply remain a sampling-based feature (because chat replies *are* just text)? My take: chat reply stays sampling — it's a true text-completion task, not implementation. So step 2 stays as-is, *but* the sampling handler in `mcp-client.ts` has to stay too. (Reversing point 4.)

So actually keep the sampling handler from step 1 — it's still needed for `loom_generate_chat_reply` and the other `loom_generate_*` tools. The handler is fine; it just isn't part of the DoStep path anymore.

---

This is bigger than "fix the issues" — it's a rethink of what `loom_do_step` is. Worth confirming before I touch code. Does Option Y match your mental model? Any concerns about the `loom_append_done` shape, or the fact that done.md becomes one file per plan with appended sections rather than one file per step?

STOP — waiting for go.

## Rafa:

For `loom_do_step`
create:
- `loom/vscode-extension/vscode-mcp-do-step/vscode-mcp-do-step-design.md`
- `loom/vscode-extension/vscode-mcp-do-step/plans/vscode-mcp-do-step-plan-001.md`

NOTE: I think we are approaching my oirigin idea / concept of loom, but I am amazed but how many changes along the way we are needing. The recursive nature of this project makes me difficul for me, but I think even for you. It is even hard for me to get you having the top vision of what I want that Loom do. I’m trying to automate the process that I currently do manually with you.

I don’t know how to make you get the closest vision and this way you could help me to design the correct approach

## AI:

Created:
- [loom/vscode-extension/vscode-mcp-do-step/vscode-mcp-do-step-design.md](../../vscode-mcp-do-step/vscode-mcp-do-step-design.md) — full design, including why plan-002’s executor pattern was structurally wrong and why the briefing pattern is structurally right.
- [loom/vscode-extension/vscode-mcp-do-step/plans/vscode-mcp-do-step-plan-001.md](../../vscode-mcp-do-step/plans/vscode-mcp-do-step-plan-001.md) — 5-step plan, canonical step format, supersedes plan-002 steps 3 & 4.

Edited via direct file write (loom MCP not bound to this session), `parent_id` left null on the design — happy to retroactively add an idea doc if you want a parent.

---

### On the meta-concern — getting me to your top vision

You’re right that this is the bottleneck. The pattern I keep hitting: I read the docs, understand the *architecture*, propose changes that are locally correct, and miss the *purpose*. Two examples from this thread alone:
- I designed `loom_do_step` as a sampling executor when the actual goal was "Claude really does the work" — I optimized for the protocol shape instead of the user value.
- I treated the DoStep button as a feature to ship, not as a step toward "human clicks, system runs" — when you reframed it, the whole design pivoted.

I think the fix is structural, not me-trying-harder. Three concrete moves:

**1. A `vision.md` that’s narrative, not architectural.** `loom-ctx.md` is good but it leans technical. What’s missing is one short doc that answers, in your words: *what does the world look like when Loom works? what problem in your day disappears?* Something I can read in 30 seconds at session start and that grounds every design choice. I’d suggest you draft 2–3 paragraphs with no architecture words in them — just the experience you want. I’d then read it before everything else.

**2. A "manual flow" doc — what you do today.** Literally write down the steps you take when collaborating with me manually: open a chat, paste context, ask, read response, copy code, mark plan done, etc. Each Loom button replaces one of those steps. When I propose a feature, I should be able to point to which manual step it’s automating. If I can’t, the feature is probably wrong.

**3. A vision-check at the top of every design conversation.** Cheap and worth doing: before I propose code, I should write one sentence saying what user-visible behavior this serves and which manual step it removes. If I’m vague, you stop me. If I’m wrong, you redirect early. Lower cost than letting me code the wrong thing for an hour.

A meta-observation: Loom-on-Loom is unusually punishing because every design decision is *also* a decision about how we have this very conversation. Most projects you can hold the meta and the object level separately. Here they collapse. So the cost of staying mis-aligned compounds — every misaligned hour is also building tools that will misalign future hours. That’s why your instinct to slow down and re-ground is right.

I’d suggest: when you’re up for it, draft the `vision.md`. Three paragraphs is plenty. I’ll read it at every session start (will add it to the session-start protocol in `loom-ctx.md` once it exists). That single doc, plus the vision-check habit at the top of designs, would close most of the gap.

STOP — waiting for go on plan-001 or feedback on the vision-doc idea.

## Rafa:

- I wrote a short draft for 1 and 2 summary: `loom/refs/vision.md` 
What you think? 
- Add 3. to CLAUDE.md. vision-check is a good idea.

## AI:

**On the vision draft** — it lands. A few observations:

What's working:
- The opening contrast (chat windows = uncomfortable, no history, no structure) is the right hook. It frames Loom as solving a real felt pain, not as an abstract platform.
- The flow `chat → {generate|refine} idea/design/plan/ctx → {implement step(s)} → done` is the cleanest expression of the loop I've seen anywhere in the project. Worth promoting — it could be the one diagram everyone references.
- "Both always know weaves, threads state. Plans pending steps." nails the durability claim. The docs *are* the shared memory.
- "User decide when to ask AI" — explicit user agency, no autonomous AI, matches how Loom actually works.
- "AI works in a terminal window showing process (streaming) and letting user view and interact" — directly captures the lesson from the DoStep redesign.
- The NO AI / AI split at the bottom is genuinely useful. It separates the deterministic surface (state, CRUD, filters) from the inferential surface (generate, refine, implement). That distinction had been buried in code; nice to see it stated.

Three small things I'd consider, only if you want to tighten — not rewrite:
- A one-sentence opener before the contrast, e.g. *"Loom replaces the chat-window way of working with AI by making structured docs the shared context, the workflow surface, and the durable memory."* Gives readers (and me) one line to grab onto if they're in a hurry.
- The "Refine documentation stale child docs" sentence is doing a lot of work. Maybe split: *"When a parent doc changes, child docs go stale. The user can ask AI to refine them so specs propagate."*
- Tiny: "uncorfortable" → "uncomfortable", "Loom turn" → "Loom turns".

Otherwise leave it. Three short paragraphs is the right scope; over-editing this would dilute it.

**CLAUDE.md updates done:**
- Added a `Vision check` bullet at the top of `Collaboration style` — before any design proposal I must state in one sentence which vision element it serves and which manual step it removes.
- Added `Load vision` as step 2 of the session-start protocol, between `Load global ctx` and `Read active work from MCP`. Emits `🌟 vision loaded`.

Both edits direct-to-file (no MCP for repo-root docs).

**Next:** plan-001 of `vscode-mcp-do-step` is ready to implement when you say go. First step: redesign `loom_do_step` MCP tool to be a briefing tool. Files touched: `packages/mcp/src/tools/doStep.ts`.

STOP — waiting for go.

## Rafa:

- Update `loom/refs/vision.md` with the suggestions you made lines 386-389
- Create a doc `loom/refs/workflow.md` for `chat → {generate|refine} idea/design/plan/ctx → {implement step(s)} → done` with a diagram and details you consider
- Update `loom/loom-ctx.md` with vision and workflow

### Vision expand
- Loom is for making AI-User collaboration more development oriented. Try to help both of them. AI become `stareful` (the closest it can be)
- Loom recursive nature is here now, while developing itself, but is not the final purpose and nature and this is very important. Loom is for helping final users/teams developers to build any kind of solution. This imply Loom install (and even possible customs `.loom/workflow.yml`). Add this point to `loom/refs/vision.md`. 

## AI:

Done. Four files touched:

**[loom/refs/vision.md](../../../refs/vision.md) — updated.**
- Added `type: ref` frontmatter (matches `loom/refs/loom.md` convention).
- Opening sentence reframed as your "development-oriented" line, with the structured-docs-as-context expansion folded in.
- Typo fixes (uncomfortable, turns).
- "Refine documentation stale child docs" sentence split.
- New section `## Beyond Loom-on-Loom` capturing your expansion: recursion is bootstrapping, not the purpose; `loom install` and `.loom/workflow.yml` for end-user teams; "Loom-on-someone-else's-codebase" is the real test.
- Kept the Chat / UX sections in your original informal style — that voice is part of why the doc reads honest.

**[loom/refs/workflow.md](../../../refs/workflow.md) — created.**
- ASCII diagram of the loop (chat is the entry, generate produces the four doc types, refine cycles back to any of them, implement step(s) drives the plan to done).
- Phase definitions: chat / {generate} / {refine} / {implement step(s)} / done. Each names what it produces and what triggers it.
- Transitions table: from → to, trigger, artifact change.
- "What is NOT a phase" — context loading, CRUD operations, sessions. Calling these out explicitly because they kept getting confused with workflow steps in our chats.
- `## Customization (future)` section noting `.loom/workflow.yml` is the eventual end-user customization point.
- Frontmatter `type: ref`, `requires_load: [vision]` so loading workflow auto-loads vision too.

**[loom/loom-ctx.md](../../../../loom-ctx.md) — updated.**
- `requires_load: [vision, workflow]` in frontmatter.
- New "Canonical refs" block right after the intro, pointing at vision.md and workflow.md with one-line each.

**[CLAUDE.md](../../../../../CLAUDE.md) — updated.**
- Session-start step 2 expanded: "Load vision and workflow" — both read at every session start. Emit `🌟 vision + workflow loaded`.

The vision-check rule (added earlier in Collaboration style) now has its data — every future session will read both docs at start, so the check has something concrete to compare against.

**Next:** plan-001 of `vscode-mcp-do-step` is ready. First step: redesign `loom_do_step` to a briefing tool. Files: `packages/mcp/src/tools/doStep.ts`. Vision-check for that step: it serves the workflow phase `{implement step(s)}` and removes the manual step "I (Rafa) read the plan, paste the next step into Claude, get an implementation, paste it back into a done.md." Sound right? Say go and I'll implement.

STOP — waiting for go.