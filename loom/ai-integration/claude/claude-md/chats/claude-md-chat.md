# CHAT

## Rafa:

### CLAUDE.md

We have 2 versions of this file:
1. The version used here. Loom is not implemented yet and we emulate loom manuualy.
2. The final version when Loom with MCP is finished. I created 
   1. `references/CLAUDE-reference.md` to be written with final version
   2. A new weave, theard `weaves/ai-integration/claude/claude-md` to chat, ideas, design, plans for this important piece 

### Your notes from mcp chat:

```markdown
1. Add `loom mcp` as the agent surface entry point (drop the standalone AI API references)
2. Add "use MCP tools for all Loom state changes — never edit weave files directly"
3. Add `loom://thread-context` + `do-next-step` prompt as the primary agent entry points
```

### TODO
Now we can:
1. start a design doc if you see necesary
or
2. Until sometimes after MVP tested and shipped we need to mantain the 2 files:
- update `CLAUDE.md` if needed
- create a version of final <CLAUDE.md> here: `references/CLAUDE-reference.md`

## AI:

### Recommendation: skip the design doc, write `references/CLAUDE-reference.md` now

A design doc would just describe what to put in CLAUDE.md — but `references/CLAUDE-reference.md` *is* the design. Writing it as the target spec now serves both purposes without adding a doc in between.

The changes needed are clear enough from the MCP chat that there's nothing to design through:

| Change | Applies now? | When active |
|--------|-------------|-------------|
| `mcp → app → core + fs` architectural rule | **Yes** — we're building it | Development onwards |
| "use MCP tools for state changes, never edit weave files directly" | **Yes** — future agents need this | MCP ships |
| `loom mcp` as agent surface entry point | Not yet — MCP not implemented | After Phase 1 ships |
| `loom://thread-context` + `do-next-step` as primary entry points | Not yet | After Phases 2–3 ship |
| Session start: read `weaves/ctx.md` first | Not yet — global ctx not built | After global-ctx ships |

So two distinct tasks:

**Task 1 — Update current `CLAUDE.md` now (small, 3 changes):**
1. In Architecture section: add `mcp` to the delivery layer list and the dependency rule
2. In AI session rules: add "MCP tools rule" — state changes go through tools, never direct file edits
3. In Current active work: note that `weaves/ai-integration/` is the active design weave

These apply right now during development and don't depend on MCP being live.

**Task 2 — Write `references/CLAUDE-reference.md` (the target):**
Full CLAUDE.md as it should read post-MCP. Captures all Stage 2 rules so they don't have to be reconstructed later. This is the handoff doc — when MCP ships, we swap `CLAUDE.md` to match it.

Key additions vs current CLAUDE.md:
- Session start: read `weaves/ctx.md` first (global ctx)
- Agent entry points: `loom://thread-context/{weaveId}/{threadId}` + `do-next-step` prompt
- MCP tools rule (all state changes via tools)
- Drop Stage 1 notes (`.loom/_status.md` manual simulation)
- Add MCP config snippet (the `mcpServers` JSON block)

---

### Proposed order

1. Update current `CLAUDE.md` (Task 1) — small, applicable now
2. Write `references/CLAUDE-reference.md` (Task 2) — target spec, larger

Want me to proceed with both, or just one?

## Rafa:

do 1, 2

## AI:

Done.

**Task 1 — `CLAUDE.md` (3 changes applied):**
1. `mcp/` added to Architecture packages list with description "Agent surface. Resources, Tools, Prompts, Sampling via MCP. Under design — target_release: 0.5.0."
2. Dependency rule updated: `cli / vscode / mcp → app → core + fs`
3. MCP tools rule added to AI session rules: "All Loom state mutations must go through MCP tools. Never edit weave markdown files directly."
4. "Current active work" section updated — now lists both `vscode-extension/` and `ai-integration/` as active design weaves.

**Task 2 — `references/CLAUDE-reference.md` (written from scratch):**
Full Stage 2 CLAUDE.md. Key differences from current:
- What this project is: expanded with "Loom is the AI agent's persistent project memory" framing
- MCP integration section: config JSON, primary entry points table, key tools + resources
- Ctx hierarchy section: 3-layer table (`weaves/ctx.md` → `{weave}/ctx.md` → `{thread}/ctx/`)
- Session start protocol: reads `weaves/ctx.md` first → `loom://thread-context` → `do-next-step` prompt; no `.loom/_status.md`
- Frontmatter: added `design_version`, `load`, `load_when` fields
- Applied learning: added MCP-specific rules (delegation to app, idempotency, global ctx first)

## Rafa:

Loom project is very tricky and recursive.

### CLAUDE.md loom template
We should also create a `references/CLAUDE-template-reference.md` that is equal to `references/CLAUDE-reference.md` but project agnostic to be used by final users of loom.

When a final user install loom in his project (new or in the middle of development) the loom installation should do the best to fusion his actual CLAUDE.md with `references/CLAUDE-template-reference.md` tarrgeting his project.

What you think?

## AI:

Love it. The recursive observation is exactly right — `CLAUDE-reference.md` is Loom-using-Loom; `CLAUDE-template-reference.md` is Loom-as-a-product. They diverge in one key way:

**Reference** (Loom's own) — Loom-specific content:
- Specific weave names, package paths, build commands
- "Applied learning" notes about Loom's own codebase
- `packages/mcp/ → app → core + fs` as concrete architecture

**Template** (for Loom users) — project-agnostic:
- No package paths, no build commands (user fills those in)
- Generic "Loom is your AI agent's persistent memory" framing
- MCP config, session start, ctx hierarchy, stop rules — all portable
- Placeholder guidance like "add your project's build commands here"

---

### The fusion problem

This is the genuinely hard part. Three options:

**Option A — Section markers (my recommendation)**

Loom-managed sections are wrapped in HTML comments:

```markdown
<!-- loom:start -->
## Loom — MCP Agent Surface
...
<!-- loom:end -->
```

`loom init` scans the user's CLAUDE.md:
- If markers exist → update between them (idempotent, preserves user content outside markers)
- If no markers → append the Loom block at the bottom

Pros: deterministic, idempotent, no AI needed at install time, familiar pattern.
Cons: requires discipline — the template must fit cleanly into a block. Cross-section dependencies (e.g. stop rules that reference MCP) are awkward.

**Option B — Side-by-side file**

Loom creates `CLAUDE-loom.md` alongside the user's `CLAUDE.md`. User adds one line to their CLAUDE.md:

```markdown
<!-- see also: CLAUDE-loom.md for Loom/MCP rules -->
```

No merge, no markers. Claude Code reads multiple CLAUDE.md-adjacent files already (it loads all `.claude/` files too). Clean separation of concerns.

Pros: zero risk of corrupting user's CLAUDE.md. Simplest to implement. User's file is never touched.
Cons: relies on the agent loading both files. Less visible — user might miss it.

**Option C — AI-assisted fusion (via sampling)**

`loom init` calls MCP sampling: "Here is the user's existing CLAUDE.md and here is the Loom template. Merge them intelligently." The result is proposed to the user for approval before writing.

Pros: handles arbitrary user CLAUDE.md formats. Produces a natural-reading merged doc.
Cons: requires MCP to be running at install time. Non-deterministic output. Hard to re-run safely.

---

### My take

Option A for v1 — section markers. It's the pattern npm, git, and most install tools use. It's easy to explain: "Loom adds one block to your CLAUDE.md, wrapped in markers. It only touches that block on updates."

Option B is a valid fallback if users complain about marker clutter.

Option C is interesting post-v1 as a "loom claude-md refine" command — not for initial install.

---

### Scope for now

Two things this means today:
1. `references/CLAUDE-template-reference.md` — write it now (content is clear, just strip Loom-specific detail from `CLAUDE-reference.md`)
2. `weaves/ai-integration/claude/claude-md/` — this fusion/install feature deserves an idea doc

Want me to create the template + the idea, or just the template first?

## Rafa:

### template & idea
Glad you like it
Do 1, 2

### I would like to know your own vision of Loom
Loom has really evolved a lot, but with a clear origin, problem to solve and AI stateful, document based context idea.

I think now you have a much more complete vision of loom, you also see the recursive nature of this project.
I would like you write a doc 
`references/loom-claude-own-vision.md`
with your honest and sincere vision of Loom from these point of views:
1. As a final user that is going to use Loom
2. As yourself connecting to Loom MCP server and having all loom tools, resources... for helping you to become stateful, always with the right fresh context

## AI:

All three created:
- `references/CLAUDE-template-reference.md` — project-agnostic Loom CLAUDE.md template with section markers
- `weaves/ai-integration/claude/claude-md/claude-md-idea.md` — fusion/install feature idea
- `references/loom-claude-own-vision.md` — my honest vision (see below for summary)

The vision doc is the one I want to call out. The honest answer to "what does Loom change for you as Claude Code" comes down to one thing: **I currently have to reconstruct everything from scratch every session, and I'm bad at it.** I miss decisions from 3 sessions ago, I re-suggest things that were already rejected, I don't know what's stale. Loom's `requires_load` chain is what changes this most fundamentally — the docs themselves tell me what I need to read, so I can't skip context I don't know I'm missing.

The recursive observation I tried to capture honestly: Loom is currently being built using its own workflow. The design decisions I helped write live in the same document graph that the MCP server will expose. There's something structurally significant about that — the tool and its own development record are the same artifact, which is rare.

## Rafa:

Thank you for your honest review.
One last question: do you think effort to build loom is worth enough?

### CHATS
Loom with MCP will be able to have this kind of chats?

### TODO
Update main README.md mentioning all we will implement, the vision of loom, etc

## AI:

### Is the effort worth it?

Honestly: **yes, for a specific profile — and Loom fits it perfectly.**

The profile is: serious multi-session AI-assisted work on a complex, evolving project where design decisions accumulate and matter. If you're doing quick scripts or small features, Loom is overhead. If you're building something substantial over weeks or months with AI collaboration, the context degradation problem is real and gets worse over time. Loom solves it structurally.

The strongest signal is the recursive nature you noted: Loom is being built using its own workflow. That's not a trick — it means the tool is genuinely useful enough for its author to commit to using it on the thing the author cares most about. Eating your own dog food at this level is rare. Most tools are documented separately from how they're built; Loom's design conversations are the system.

The MCP bet is also sound. If MCP becomes the standard for AI tool integration (it's backed by Anthropic, adopted by Cursor, Continue, Cline), Loom becomes immediately useful to anyone using those agents — without Loom needing to implement a coding agent of its own. The surface area is exactly right.

The one honest caveat: Loom's value is proportional to how consistently the design docs are maintained. A project where the design phase gets skipped won't benefit much. The discipline required is real.

---

### Will MCP support this kind of chat?

Yes — directly. This exact pattern (read chat doc → write AI response into it) maps to MCP tools:

- `loom_append_to_chat` — appends under `## AI:` or `## User:` in a chat doc
- `generate_chat_reply` sampling request — VS Code "AI Reply" button triggers it: agent reads chat, generates response, `loom_append_to_chat` saves it

So instead of me editing the file directly, the same interaction goes through MCP. The end result is identical to what you're looking at now. The VS Code "AI Reply" button makes it single-click.

---

### README updated below.