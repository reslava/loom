---
type: chat
id: ch_01KTVNYZMH7S6546XSCJ65Y89D
title: context-dispatcher Chat
status: done
created: 2026-06-11
updated: 2026-06-17
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 9
---
# context-dispatcher Chat

## Rafa:

- what use cases could take advantage of contex-dispatched? only plan and multi step related commands? any others?
- how could I notice AI is taking advantage and not dupolicating context injection?
- worth to open a thread for vscode extension to show up related info for context-dispatcher?
I copy here what you told in a previous chat `loom/loom/global/chats/global-chat-004.md` (line 135):
>On surfacing it in the extension — strong yes on vision grounds: Loom's whole pitch is making AI state *visible and durable*, and "here's exactly what the AI has loaded right now" is that, literally. **But there's a real tension with C you should see before committing:** in C the ledger lives in the *agent's* client. When the agent is a launched Claude CLI process, the extension is a *separate* MCP client and can't see that agent's ledger — so it has nothing to render. The clean resolution that keeps C's safety: have the dispatcher **passively record** the last-declared ledger per session in a spot the extension can read — for *display only*, never to suppress context. Injection stays a pure function of the caller's declaration (C, no silent under-load); observability gets a read-only mirror. That gives you both the correctness and the panel.

### Fix README

README.md lines 80-92 are missing `req.md`, fix itno thtr



## AI:

**1. What else benefits beyond plan / multi-step?**

The dedupe pays off wherever the *same bundle is re-injected across several calls in one session against a doc set that hasn't changed*. After step 3 every context-injecting command routes through the one door (`assembleContext` via `loom://context`), so any of them can opt in just by threading `alreadyLoaded` — the win is just `(re-calls per session) × (bundle size)`:

- **`loom_do_step`** — the heaviest, already wired. 5+ calls/session × ~7k tokens.
- **Chat replies** — the next-biggest. The chat path already dedupes the chat's *own turns* (`read_chat_tail` + `last_ai_block` cursor, 1.4.0), but **not** the thread bundle (req/idea/design/plan) it loads on the first reply. That bundle is exactly what the ledger would dedupe across replies in a long thread session. Today that's left to AI judgment ("is it already in transcript?"); the ledger makes it mechanical. Strong candidate.
- **`continue-thread` / `validate-state` prompts**, and **`weave-design` / `weave-plan` / generate** — all thread-anchored; benefit if re-invoked in a session.
- **`refine_*` / `generate_*`** — load the parent chain to feed sampling; a session doing several refines across one thread repeats it. Caveat: that's the *sampling/extension* path where the ledger lives in a different client (see Q3).

What gets **nothing** (correctly): genuine one-shot commands. Empty ledger → full bundle, which is the right answer. So it's not *only* plan/multi-step — it's anything re-called in-session — but plan loops are where the money is.

**2. How would you notice it's actually deduping (not re-sending)?**

Increasing rigor:

- **Per-call, right now:** the `do_step` brief returns `contextSkipped` and `contextManifest`, and the bundle header reads `<!-- loom:context-bundle … docs=N tokens~=M -->`. A deduped call shows `docs=0` (or fewer) + a non-empty manifest. You saw this live in this very session — steps 2–5 returned `contextSkipped: true` + the suppression marker instead of the ~7k bundle.
- **Negative signal:** if *every* `do_step` in a session shows `manifest: []` / full `docs=N`, the agent is **not** declaring its ledger → not taking advantage. That's the thing to watch for.
- **The honest gap:** there's no *aggregate* readout — "this session saved X tokens over N calls." You can't see cumulative savings today. A one-line debug log in the resource (`loaded=K delta=D manifest=M` per call) would make it greppable cheaply; the real answer is the panel in Q3.

**3. Worth a vscode thread to surface dispatcher info?**

Yes to capturing the design; I'd be cautious about *building* it now. It's a genuine vision fit ("make AI state visible") and the design is already half-solved — your quote from `global-chat-004` is the resolution: the ledger lives in the *agent's* client, so a launched Claude CLI agent's ledger is invisible to the extension (separate MCP client). Fix: the dispatcher **passively records** the last-declared ledger per session somewhere the extension reads — *display only, never to suppress injection*, so model-C's no-silent-under-load safety stays intact and observability gets a read-only mirror.

But two things make it not-now:
- **An open design question gates it:** "session identity" (from the design doc) — where/keyed-how does the dispatcher write the per-session ledger, and the write is a side effect that must stay *out* of the pure assembler (it lives in the resource handler). That's real design work, not a quick panel.
- **Priority:** this is observability polish, not a capability. For dogfooding correctness the Q2 signals already suffice. Given Loom is still an unvalidated bet, I'd open the thread to *record* the idea/design (cheap, keeps it from being lost) and defer the build until a concrete consumer wants to watch the ledger — which is exactly the "follow-up plan, built only when a consumer needs the display hook" the dispatcher design already states.

My recommendation: open a `context-sidebar`-adjacent thread, write the idea + the passive-record design, leave it at `draft`. Don't build until you actually want the panel.

**README fix:** done — `README.md` lines 80–92 (the `loom/` tree) were missing the thread-level `req` doc. Added `{thread}-req.md ← locked requirements (include / exclude / constrain), loaded first`, before idea (req is the authoritative scope the rest of the chain honours). It's committed nowhere yet — it's an uncommitted working-tree edit, separate from the v1.6.0 tag; say the word and I'll commit it.

## AI:

Correction on the README fix: the req doc is **`req.md`** — flat, no `{thread}-` prefix, exactly like `ctx.md` (confirmed against the repo: `loom/core-engine/requirements-driven-development/req.md`). My first edit wrongly wrote `{thread}-req.md`; the tree now reads `req.md ← locked requirements (include / exclude / constrain), loaded first`. So the thread-level doc naming splits two ways: `req.md` / `ctx.md` are flat, while idea/design/plan/done carry the `{thread}-`/`{plan-id}` prefix.

## Rafa:

I commited readme.md
create a thread `context-sidebar` (pick proper weave: `ai-integration` or `vscode-extension`)
create idea

## AI:

Before I create anything — a collision to resolve. **`ai-integration/context-sidebar` already exists** and is *done*: it's the Phase 3 work (the CONTEXT panel rebased on `ContextBundle`, the `loom_get/set_context_prefs` tools, the 7-symbol row set). idea + design + plan + done are all there. Creating a thread named `context-sidebar` would either collide or clobber that shipped record, so I stopped.

The new work you want — *surface the dispatcher's loaded-context ledger in the panel* — is a genuinely new idea, but it's adjacent to that existing thread. Three clean ways to place it:

| Option | Where | Trade-off |
|---|---|---|
| **A (recommended)** | New thread `context-ledger-panel` in **`ai-integration`** | Keeps it beside `context-dispatcher` + `context-pipeline` + the existing `context-sidebar` (the ledger *is* a dispatcher concept); no name collision. The display work is mostly server-side anyway (the passive-record hook), with a thin panel addition. |
| **B** | New thread `context-sidebar` in **`vscode-extension`** | The name you said, no collision (that weave has no such thread). But it splits the context-panel domain across two weaves — the Phase 3 panel in ai-integration, its extension here. |
| **C** | Reopen `ai-integration/context-sidebar` with a *second* idea | Keeps everything in one thread, but breaks Loom's one-idea-per-thread model and reopens a done thread. I'd avoid it. |

My pick is **A** — `ai-integration/context-ledger-panel`. The hard part (where the dispatcher passively records the per-session ledger, keyed by session identity, as a side effect *outside* the pure assembler) is dispatcher/pipeline work that belongs in `ai-integration`; the panel row is the easy tail.

Tell me A, B, or C (or another name) and I'll create the thread + idea.

## AI:

Done — created thread **`ai-integration/context-dispatcher-sidebar`** with its idea:

- `context-dispatcher-sidebar-idea.md` (`id_01KTVQ1XF2F8W8X8K067SY8RE8`, status `draft`).

It frames the read-only ledger view: the **passive-record** resolution (display-only mirror, never suppresses injection — model-C safety intact), the **session-identity** open question as the gating design problem, and the missing **aggregate savings tally**. Scoped into `ai-integration` because the load-bearing part is the server-side record hook; the panel row is the thin tail. Links back to [[context-dispatcher]] and the existing [[context-sidebar]].

Left at `draft` for you to finalize. Next, if you want, I can draft the design — but the honest gate is **session identity** (how the dispatcher keys a session to record its ledger); that decision drives the whole record mechanism, so it's worth settling here in chat before a design doc.

## Rafa:

Fast thinking...
session identity: we tells AI (CLAUDE.md) to create an ID (similar to ULID using a timestamp) when start a session 


## AI:

That's the right shape, and it's pleasingly model-C-consistent: the session id is just *one more thing the client declares*, so the server stays pure — it records the ledger under whatever key the caller hands it, no server-side session tracking. Bonus: that same `sessionId` becomes the **multi-agent-safety key** the rejected server-cache (model B) needed and C gets for free — two agents on one server record under different ids, no cross-talk.

Two refinements before it's a design:

**1. Who mints the id — and the case that actually needs the panel.** The hard case (from chat-004) is the *launched Claude CLI agent*, where the extension is a separate MCP client. There, the cleanest authority is **the extension, not the agent**: the extension *starts* that session, so it should mint the `sessionId` and pass it into the launch (env var / prompt — "use sessionId=X"); the agent just echoes X on `loom_do_step` / `loom://context`; the dispatcher records the ledger under X; the extension reads back **exactly** that key. If the agent mints its own id autonomously, the extension has no reliable way to know *which* id is "current" to display. For a standalone Claude Code CLI session (no extension) the agent minting its own id is harmless — there's no panel to show it anyway, it just enables a future `loom session` readout.

So: **CLAUDE.md tells the agent to *use* a session id (one given by the launcher if present, else mint one)** — rather than always self-minting.

**2. Don't hand-roll a ULID.** Asking the model to emit a *correct* ULID by hand is the weak link (it's a specific Crockford-base32 encoding; the model will approximate it). Either the extension generates it (it has real code), or expose a trivial `loom`-side token. The format barely matters — any unique, sortable string (`sess_<unix-ms>-<rand>`) is enough; don't over-spec it.

**Why this is safe to leave soft:** unlike the ledger-for-injection, a missing/wrong `sessionId` can only make the *panel* stale or empty — it can never under-load context, because injection still keys on the declared `alreadyLoaded`, not the session id. So "AI discipline" is acceptable here in a way it wouldn't be for correctness.

**Honest gate (unchanged):** this is all observability — a permanent session-start instruction + a passive-write path + a panel. The design is sound and cheap to capture now; I'd still hold the *build* until watching the ledger earns its place against the next capability. If you're good with the extension-as-id-authority refinement, that's enough to write the design.

## Rafa:

Agree all. Also add a `loom session` command for pure Claude CLI is good idea.
Create design

## AI:

Design written — `context-dispatcher-sidebar-design.md` (`de_01KTVQNV2T7TXFQNN7XVQB4FFG`, status `draft`). Headlines:

- **Session id = launcher env first.** `LOOM_SESSION_ID` on the `loom mcp` process (stdio = one process per session). The extension mints it and sets it when it spawns the agent's server → the server stamps records itself, **no agent discipline, no hand-rolled ULID**. Agent-declared `sessionId` arg kept only as a fallback for hosts that can't set the env.
- **Passive-record writer** lives in `handleContextResource` (the existing impure boundary), after the pure `assembleContext`. Records the **full held set** (`manifest ∪ delta`) + token math → `.loom/context-ledger.json` (gitignored).
- **Display-only, one-way mirror** — the store is written by the handler, read by the panel, and *never* flows back into assembly. A missing/stale session id degrades only the panel, never injection (no silent under-load). That's the invariant the whole design protects.
- **Build order:** server-side record (load-bearing, independently useful as a `loom session` readout) → extension id-authority → the thin panel row + savings tally.
- **Flagged open:** long-lived extension server (breaks process=session → needs the tier-2 agent-declared id), record GC/cap, multi-target last-wins.

Two things I deliberately put in the design rather than assume — worth your eye before finalize: **(a)** confirm the launched-agent path always spawns a *fresh* `loom mcp` (so tier-1 env keying is enough); **(b)** the `.loom/context-ledger.json` GC policy (keep last N / prune by age). Both are open questions in the doc, not blockers.

Left at `draft`. Want me to plan it, or sit on it until you actually want the panel?