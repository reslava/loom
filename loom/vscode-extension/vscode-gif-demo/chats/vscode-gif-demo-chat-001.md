---
type: chat
id: ch_01KRQT5P4KDZQN1PHTEDPSATVV
title: vscode-gif-demo Chat
status: active
created: "2026-05-16T00:00:00.000Z"
version: 1
tags: []
parent_id: null
requires_load: []
---

## Rafa:

Main Readme and extension Readme should show a GIF and description of a little demo of the full workflow showing how to install and use Loon end to end:

1. install
2. chat > idea > design > plan (2 steps at least) >  dosteps > done doc generation

In same gif or other:

1. Global / weave context generation and use
2. Reference document generation and use required_load

### Side vsix fixes

all docs body builders should not add any `# {Title}` section cause we decided to have frontmatter title as only source of truth

ensure 1 space line between end of frontmatter and body, for example in this doc:

```markdown
---

## Rafa:

```

### vsix README

should have all features of extension
should name sidebar CONTEXT windows and how uses it

### main README

link to extension, shows packages/vscode/media/loom.png as main Icon, name main vsix visual functions

## AI:

### GIF 1 — Full Workflow (~45s, loopable)

Suggested scene order:

1. **Terminal:** `loom install` → shows `.loom/` and `loom/` created, `CLAUDE.md` written
2. **Extension opens** — CONTEXT panel in Activity Bar, empty workspace tree
3. **New Chat** button → chat doc opens in editor → type a prompt → AI reply appears inline inside the doc
4. **Generate Idea** → idea doc appears under the weave in the CONTEXT tree
5. **Generate Design** → design doc added to the thread
6. **Generate Plan** → plan doc with steps table appears in the tree
7. **Do Step** → editor shows AI writing code, step marked ✅ in the plan table
8. **Done doc** auto-created and visible in the CONTEXT tree

**Key visual hook:** the tree updating in real time as each doc is created makes the document-graph tangible. Slow down on that transition — it's the "aha" moment.

---

### GIF 2 — Context System (~30s)

Suggested scene order:

1. Open `loom/ctx.md` — show the global project summary already filled in
2. Tree: right-click weave → **Generate Ctx** → weave-level ctx doc appears
3. Open a reference doc — highlight `requires_load: [arch-reference]` in frontmatter
4. Start a chat in that thread — show AI reply with `📄 arch-reference.md — loaded for context` visibility line before the first response

**Key framing:** contrast with "usual AI chat — you paste context every time." One shot of the AI already knowing the architecture before you type anything lands the value prop.

---

### README suggestions

**vsix README:**
- Rename "The panel" section → **"The CONTEXT panel"** throughout
- Add a full button inventory: *Generate Idea*, *Generate Design*, *Generate Plan*, *Do Step*, *Refine*, *Promote*, *AI Reply*, *Generate Ctx*, *New Chat*, *Start Plan*, *Rename*, *Archive*
- Add GIF placeholder at the top (path `media/loom-demo.gif`) with a short caption

**Main README:**
- Add `packages/vscode/media/loom.png` as hero icon at the top of the VS Code Extension section
- Add GIF placeholder right after the Workflow section
- In the extension bullet list, use exact button names: *Generate Idea*, *Generate Design*, *Generate Plan*, *Do Step*, *AI Reply*, *Generate Ctx*
- Link to the vsix README / marketplace listing

---

### vsix body-builder fixes — scope

Files with `# Title` headers that need removing:
- `packages/core/src/bodyGenerators/ideaBody.ts` → `# ${title}`
- `packages/core/src/bodyGenerators/designBody.ts` → `# ${title}`
- `packages/core/src/bodyGenerators/planBody.ts` → `# Plan — ${title}`
- `packages/core/src/bodyGenerators/ctxBody.ts` → `# Design Context Summary`
- `packages/mcp/src/tools/appendDone.ts` → `# Done — ${planDoc.title}` passed as preamble

Spacing note: `saveDoc` writes `${frontmatterStr}\n${body}` — single newline. After removing the title, each body generator must start with `\n` so the file gets one blank line between `---` and the first heading.

Plan created separately.

## Rafa:

Give me chat suggestion for GIF 1

## AI:

### Chat script — GIF 1 (Full Workflow)

Each caption appears as a short overlay at the bottom of the screen while the action plays. Keep them to one line — viewers read fast when watching a GIF.

| Scene | Action shown | Caption |
|-------|-------------|---------|
| 1 | Terminal: `loom install` running | **"One command sets up the whole workspace"** |
| 2 | CONTEXT panel appears in Activity Bar, empty tree | **"Your document graph lives in the sidebar"** |
| 3 | New Chat → chat doc opens → user types → AI replies inside the doc | **"Chat with AI inside a persistent doc — not a throwaway window"** |
| 4 | Click *Generate Idea* → idea node appears in tree | **"One click turns the conversation into a scoped idea"** |
| 5 | Click *Generate Design* → design node added | **"Promote to a design — decisions and trade-offs recorded"** |
| 6 | Click *Generate Plan* → plan with steps table | **"Break the design into reviewable implementation steps"** |
| 7 | Click *Do Step* → code appears in editor → step ✅ | **"AI implements one step at a time — you stay in control"** |
| 8 | Done doc visible in tree | **"What was built is recorded. Nothing disappears."** |

**Closing hold frame caption (2s):** `chat → idea → design → plan → done`

---

**Recording notes:**
- Slow the tree update transitions to ~0.5s each — that's the moment that shows the graph building up
- Use a small, clean project (3–4 files) so the editor isn't distracting
- Dark theme looks better on GIF compression

## Rafa:

You did not understand.
I meant suggestion for what could you I write to start the chat and generate the corresponding workflow for as 2, 3 steps task, maybe creating an html file and something that brings final users attention. What kind of simple project (for demo purpose) could show the potential of Loom for complex projects?

## AI:

Got it — you want the demo scenario itself: what project, what first chat message, and what 2-3 plan steps to show.

---

### Recommended demo project: SaaS landing page pricing section

**Why this works:**
- Every developer has seen a pricing page — zero explanation needed
- The output is immediately visual and polished
- It feels like real product work, not a toy example
- 2 plan steps is the perfect length for a GIF: not trivial, not exhausting

**What you type in the chat to kick it off:**

> We need a pricing section on the landing page. Three tiers — Free, Pro, and Enterprise. Each tier should show the price, 4 bullet points of features, and a CTA button. Pro should be visually highlighted as the recommended plan. Output is a self-contained `pricing.html` snippet with inline CSS.

That's concrete enough that the AI generates a real design (not vague), and the final output — a styled 3-column card layout — looks great in a screenshot.

**Resulting plan steps (2):**

1. Generate the HTML structure — three `<div class="tier">` cards with price, feature list, and CTA
2. Add CSS — card layout with highlight on the Pro tier, hover effect on the CTA buttons

**What the viewer sees:** a clean `pricing.html` open in the editor with a Pro card visually distinct. Clear, instant payoff.

---

### Why this shows Loom's potential for complex projects

The demo is simple — but the *process* is the point. Viewers see:
- The decision ("highlight Pro") captured in the **design doc**, not just in the code
- The steps reviewed before execution — human approval at every phase
- The done doc recording exactly what was built and why

The implicit message: *if Loom does this for a pricing section, imagine it managing an auth system, a payment flow, or a multi-team API refactor.* The complexity scales; the workflow stays the same.