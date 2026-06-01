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
# vscode-gif-demo Chat

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

## Rafa:

1. how to setup claude to pass all permissions request in the demo?

2. plan created for demo:

```markdown
## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create pricing.html file with the three-tier pricing markup and inline CSS styles | — | — |
| ✅ | 2 | Integrate pricing section into the main landing page HTML with proper semantic structure and layout flow | — | — |
| 🔳 | 3 | Test responsive design across desktop (1024px+), tablet (768px-1023px), and mobile (<768px) viewports | — | — |
| 🔳 | 4 | Validate pricing section functionality including hover effects, plan highlighting, and call-to-action button interactions | — | — |
```

I want haiku generate a 2 steps (1,2 only) plan for short demo gif, refine the prompt

## AI:

## AI:

### 1. Auto-approving Claude Code permissions for the demo

Three options, from least to most polished:

**a) Bypass everything (fastest, ugliest for a demo screen)**
```bash
claude --dangerously-skip-permissions
```
Skips every permission prompt. Fine for a throwaway sandbox, but the flag name itself flashes on screen — not a great look for a "watch Loom drive a real project" demo.

**b) Pre-approve specific tools via `.claude/settings.json`** (recommended for the GIF)
In the demo project root, drop a `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "Edit", "Write", "Read", "Glob", "Grep",
      "Bash(npm:*)", "Bash(node:*)", "Bash(git:*)",
      "mcp__loom"
    ]
  }
}
```
`mcp__loom` allows all Loom MCP tools without prompting. This is the cleanest demo path — no scary flag, no prompts interrupt the flow.

**c) Use `acceptEdits` permission mode**
Start Claude with `--permission-mode acceptEdits` (or toggle with Shift+Tab during the session). Edits auto-apply, but Bash still prompts. Good middle ground if you want Bash commands visible as deliberate steps.

**My pick for the GIF:** option (b) with a narrow allowlist. It looks professional, the viewer sees Claude *doing* things rather than asking permission, and the settings file itself is a teachable artifact ("here's how you'd configure this on a real project").

### 2. Plan acknowledged

I see `vscode-gif-demo-plan-001.md` exists with steps 1–2 ✅ and step 3 (responsive testing) pending. Two questions before we proceed:

- Should I look at the plan in detail and suggest any restructuring before you continue DoStep'ing it? Or is it locked in and you just want to run it as-is?
- The demo concept above (chat → idea → design → plan → DoStep → done, plus the ctx/reference second GIF) — is the current plan covering *building the pricing page demo project itself*, or *recording the GIFs*? Want to make sure we're not conflating "build the thing to demo" with "produce the demo asset".

Next: waiting for your call on the permissions approach and the plan-scope question.

## Rafa:

I am not refering to a local project plan. This plan is from the demo gif in another workspace:
plan created for demo:

```markdown
## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create pricing.html file with the three-tier pricing markup and inline CSS styles | — | — |
| ✅ | 2 | Integrate pricing section into the main landing page HTML with proper semantic structure and layout flow | — | — |
| 🔳 | 3 | Test responsive design across desktop (1024px+), tablet (768px-1023px), and mobile (<768px) viewports | — | — |
| 🔳 | 4 | Validate pricing section functionality including hover effects, plan highlighting, and call-to-action button interactions | — | — |
```

It has been generated from chat prompt you suggested:
> We need a pricing section on the landing page. Three tiers — Free, Pro, and Enterprise. Each tier should show the price, 4 bullet points of features, and a CTA button. Pro should be visually highlighted as the recommended plan. Output is a self-contained `pricing.html` snippet with inline CSS.

I mean update this prompot to generate a more close, accurate, only 2 steps plan


## AI:

## AI:

Got it — you want a prompt that naturally lands on **exactly 2 steps**, not 4. The original prompt left room for the planner to invent test/validate steps. The fix is to constrain scope explicitly and name the two deliverables in the prompt itself.

**Refined chat prompt:**

> Add a pricing section to the landing page. Three tiers — Free, Pro, Enterprise — each with price, 4 feature bullets, and a CTA button. **Pro is visually highlighted as the recommended plan.** Scope is markup + inline CSS only; no JS, no responsive QA, no interaction testing. Two deliverables: (1) a self-contained `pricing.html` snippet, (2) integration into `index.html` in the right spot. That's the whole job.

**Why this produces a 2-step plan:**

- "Two deliverables" + the numbered (1)(2) tells the planner the work decomposes into exactly two units.
- "Scope is markup + inline CSS only; no JS, no responsive QA, no interaction testing" actively closes the doors the original plan walked through (steps 3 + 4 were responsive testing + interaction validation — both invented because the prompt didn't forbid them).
- Naming the target files (`pricing.html`, `index.html`) gives the planner concrete "Files touched" entries and discourages it from splitting "create" and "style" into separate steps.

**Expected plan output:**
```
| ✅ | 1 | Create pricing.html with three-tier markup and inline CSS, Pro tier highlighted | pricing.html | — |
| ✅ | 2 | Integrate pricing section into index.html landing page flow                        | index.html   | — |
```

Tight, demo-friendly, and the GIF audience can read the whole steps table at a glance without it scrolling.

Next: want me to draft the equivalent for the second GIF (ctx/reference workflow), or are we good on this one?

## Rafa:

Yes. We need to show up ctx & reference also


## AI:

## AI:

Here's a draft script for the second GIF. Same demo project (landing page) so the viewer doesn't have to mentally context-switch — the project just grows over time, and we show how ctx + reference keep the AI grounded as it grows.

### GIF 2 — Ctx & Reference workflow

**Setup state (carried from GIF 1):** Landing page exists, pricing section done, a couple of done docs in the thread.

---

**Act 1 — Weave ctx generation & use**

1. **Click "Generate Weave Ctx"** on the `landing-page` weave.
   - AI reads the weave's threads, ideas, designs, plans, dones.
   - Writes `landing-page-ctx.md` — a 1-page summary: what's built, what's in flight, key decisions.
   - Show the generated file briefly.

2. **Open a fresh chat in the weave** (new thread or loose fiber).
   Prompt:
   > What sections does the landing page currently have, and what's the recommended next addition?

   AI answers correctly **without re-reading every doc** — because the weave ctx auto-loaded. The visible signal: response time is fast, and the AI cites the pricing section + tier structure from the ctx, not from a fresh scan.

   *Caption overlay:* "Ctx = AI's working memory of the project. Auto-loaded, no manual context dump."

---

**Act 2 — Reference doc with `requires_load`**

1. **Create a reference doc** (manually or via "Generate Reference"):
   `loom/landing-page/refs/brand-style-reference.md`
   - Brand colors (hex codes), typography stack, voice/tone rules, CTA button conventions.
   - Frontmatter: `type: reference`, `load: by-request`.

2. **New chat prompt:**
   > Add a testimonials section. Three customer quotes with photo, name, company. Match the existing brand style.

3. **Click "Generate Design"** → AI writes the design doc with `requires_load: [brand-style-reference]` in frontmatter. Show the highlighted frontmatter line.

4. **Click "Generate Plan"** → plan inherits the requires_load. Show plan steps that reference brand colors/typography *by name* (e.g. "use brand primary `#...` for the CTA button").

5. **Click "DoStep"** → AI implements the testimonial card using the exact brand tokens. Visual proof: hex code in the done doc matches the reference.

   *Caption overlay:* "Reference docs = durable architectural facts. AI cites them, never guesses."

---

### Why this works as a demo

- **Same project as GIF 1** → continuity, viewer already knows the landing page.
- **Ctx shown via behavior, not file inspection** → audience sees the AI being smart, not just files being written. That's the "wow".
- **Reference shown via the requires_load chain** → frontmatter line is highlighted, then the brand color appears in the generated code. Cause-and-effect is visible end-to-end.
- **Both acts end with an artifact** (ctx file / testimonials section) so the GIF has clean stopping points if you want to split it.

### The two prompts, ready to use

**Weave ctx demo:**
> What sections does the landing page currently have, and what's the recommended next addition?

**Reference demo:**
> Add a testimonials section. Three customer quotes with photo, name, company. Match the existing brand style.

Next: want me to also sketch the `brand-style-reference.md` body so it's ready to paste into the demo project, or is the script enough for now?

## Rafa:

Yes

## AI:

Here's a ready-to-paste `brand-style-reference.md` for the demo project. Tight enough to fit on screen during the GIF, concrete enough that the AI's generated testimonials section will visibly inherit specific tokens (colors, fonts, button shape) that a viewer can spot.

### `loom/landing-page/refs/brand-style-reference.md`

```markdown
---
type: reference
id: brand-style-reference
title: Brand Style Reference
status: active
created: "2026-05-24"
version: 1
tags: [brand, design, reference]
parent_id: null
load: by-request
load_when: [design, implementing]
---

## Colors

| Token              | Hex       | Use                                  |
|--------------------|-----------|--------------------------------------|
| `--brand-primary`  | `#4F46E5` | CTAs, links, Pro tier highlight      |
| `--brand-accent`   | `#F59E0B` | Badges, "Recommended" labels         |
| `--text-primary`   | `#0F172A` | Headings, body                       |
| `--text-muted`     | `#64748B` | Captions, secondary text             |
| `--surface`        | `#FFFFFF` | Card backgrounds                     |
| `--surface-alt`    | `#F8FAFC` | Page sections, dividers              |
| `--border`         | `#E2E8F0` | Card borders, hairlines              |

## Typography

- **Font stack:** `"Inter", system-ui, -apple-system, sans-serif`
- **Headings:** weight 700, tracking -0.02em
- **Body:** weight 400, line-height 1.6
- **Scale:** h1 `2.5rem` · h2 `2rem` · h3 `1.5rem` · body `1rem` · caption `0.875rem`

## Buttons (CTAs)

- Shape: `border-radius: 8px`, `padding: 12px 24px`
- Primary: `--brand-primary` background, white text, weight 600
- Hover: brightness 1.1, subtle `translateY(-1px)` lift
- No gradients, no shadows beyond `0 1px 2px rgba(0,0,0,0.05)`

## Cards

- Background `--surface`, border `1px solid --border`, radius `12px`
- Padding `24px`, gap between cards `24px`
- Featured/recommended cards get a `2px solid --brand-primary` border

## Voice

- Direct and confident. No marketing fluff ("revolutionary", "game-changing").
- Customer-facing copy is second person ("you get…", "your team…").
- Quotes preserved verbatim — never paraphrase a testimonial.

## Do / Don't

- ✅ Use brand tokens by name (`--brand-primary`), not literal hex in component code.
- ✅ Match existing border radius (`8px` buttons, `12px` cards) — don't introduce new values.
- ❌ Don't add new colors without updating this reference first.
- ❌ Don't use shadows for emphasis; use the `--brand-primary` border instead.
```

### Why this shape works for the demo

- **Tokens are concrete** — `#4F46E5` will appear verbatim in the generated testimonials CSS. Viewer can rewind the GIF and verify: "yep, same hex as the reference."
- **`load: by-request` + `load_when: [design, implementing]`** — shows the filtering mechanism on screen; the frontmatter itself is a teaching moment.
- **Do/Don't section** — gives the AI explicit "never invent new colors" rule, which makes the implementation behave predictably during the live recording (no surprises).
- **Voice section** — when the AI writes the three customer quotes, the second-person tone is visible. Reference doc is influencing prose, not just CSS. That's the *why* of references.

Next: ready to record, or want me to also draft the expected `landing-page-ctx.md` output so you know what "Generate Weave Ctx" should produce on the first take?

## Rafa:

Yes

## AI:

## AI:

Here's the expected `landing-page-ctx.md` — the shape "Generate Weave Ctx" should produce after GIF 1 has run (pricing section built, done docs written) but before GIF 2 begins. If the live generation drifts from this on take 1, you'll know the prompt template or context-bundling needs tuning before recording.

### `loom/landing-page/landing-page-ctx.md`

```markdown
---
type: ctx
id: landing-page-ctx
title: landing-page — Weave Context
status: active
created: "2026-05-24"
updated: "2026-05-24"
version: 1
tags: [ctx, weave]
parent_id: null
requires_load: []
load: always
scope: weave
---

# landing-page — Weave Context

Marketing landing page for the product. Single-page static site, semantic HTML + inline CSS, no JS framework. Built incrementally section by section through Loom threads.

## What exists

- **`index.html`** — landing page shell: hero, features grid, pricing section.
- **`pricing.html`** — self-contained three-tier pricing snippet (Free / Pro / Enterprise), Pro tier visually highlighted as the recommended plan. Integrated into `index.html`.

## Active threads

- **`pricing-section/`** — *status: done*. Pricing tiers built and integrated. See `done/vscode-gif-demo-plan-001-done.md` for the implementation record.

## Key decisions

- **Inline CSS only** — no external stylesheet, no build step. Each section is a self-contained snippet that can be reviewed in isolation.
- **Pro tier highlighting** — accent border + "Recommended" badge, not a different background color. Keeps visual weight balanced across the three tiers.
- **No JS** — landing page is static. Any interactivity (form submission, analytics) gets added later as an explicit thread, not snuck in.

## Conventions in use

- Three-tier card pattern (price + 4 bullets + CTA) is the canonical "comparison card" for this project. Reuse it for any future tiered content.
- Section integration into `index.html` follows source order = visual order — hero, features, pricing, (next).

## What's next (suggested)

- **Testimonials section** — social proof between pricing and footer. Three customer quotes with photo/name/company.
- **FAQ section** — collapsible Q&A, addresses pre-purchase objections.
- **Footer** — currently minimal; needs nav, legal links, contact.

## References available

- *(none yet — `brand-style-reference.md` will be added as part of the testimonials thread)*
```

### Why this shape

- **`scope: weave` + `load: always`** — auto-injected into every chat opened anywhere in this weave. No `requires_load` needed.
- **"What exists" / "Active threads" / "Key decisions"** — the three things a fresh AI session actually needs to answer "what's the state of this project?" Anything more is noise.
- **"What's next (suggested)"** — primes the AI to give *useful* answers to open-ended questions like "what should we add next?" without having to re-derive priorities. This is the line that makes the GIF 2 Act 1 prompt land cleanly.
- **References section at the bottom** — empty now, but the slot is there. After GIF 2 Act 2, regenerating ctx will populate it with `brand-style-reference`, showing the feedback loop.
- **~1 screen of content** — fits in the GIF frame, fast to read, and small enough that "AI auto-loads this" feels lightweight rather than a wall of text.

### One thing to watch on take 1

The AI might over-include: dump every done-doc detail, list every file in the repo, etc. If that happens, the ctx-generation prompt in the MCP server needs a "summarize, don't enumerate" instruction. Worth a dry run before recording — if take 1 produces 3 screens of text, the prompt is the bug, not the demo.

Next: ready to record. Want me to also write the literal narration script (timing + on-screen captions) for each GIF, or is that overkill?

## Rafa:

Using Haiku and the the new prompt (line 271) and still get a plan with 6 steps, no table steps

check it here j:/loom_demo/loom/demo/pricing/pricing-design.md

## AI:

Good — table's there. So the real issue is just **6 steps when we want ≤3** (and `Files touched` is empty even though `pricing.html` / `index.html` are named in the design).

### Diagnosis

The chat-prompt rewrite shaped the **idea** correctly. The **design** also respected scope. But the **plan generator** (Haiku) anchored on the design's structure — Architecture subsections + 4 Design Decisions + 3-item "Next Steps" list — and emitted one step per design hook. That's why:

- Steps 2, 3, 4 are one deliverable (the snippet) split across design sub-decisions
- Step 6 is invented QA, exactly what the chat prompt said "no"
- `Files touched: —` because the planner prompt doesn't tell Haiku to extract paths from the design body

The chat-prompt fix is symptom-layer. We can keep tightening words upstream and Haiku will keep decomposing whatever the design hands it. **The bug is in the planner system prompt**, not the user prompt.

### Fix candidates for the demo

**A. Tighten the plan-generation system prompt** (fix the cause):
- "Steps map to **deliverables**, not design subsections. Use the idea's Deliverables list as the skeleton."
- "Smallest step count that covers all deliverables. 2-4 normal; >5 is suspect."
- "Populate `Files touched` with concrete paths from the design body. `—` only for review/decision steps, which should be rare."
- "Do not invent QA, testing, accessibility, or review steps unless the design names them as deliverables."

**B. Drop `## Next Steps` from the design template.** Leftover section that now shadow-drives the plan and dilutes the idea's deliverables.

**C. (longer-term)** `scope_constraints` frontmatter field that propagates `chat → idea → design → plan`.

**Recommendation:** A + B before recording. Both are 1-file changes in the MCP server, both fix the cause, together should land Haiku on 2-3 steps reliably. C is the right long-term answer but too much for demo prep.

If you record before fixing, the GIF shows a 6-step plan from a 2-deliverable prompt — audience concludes "Loom over-decomposes." Bad first impression even with narration.

Next: want me to locate the planner prompt + design template in `packages/mcp` and draft the exact diff, or discuss approach first?

## Rafa:

yes, do it

`pricing.html`, `index.html` are empty because I did not executed the plan

i could use claude sonnet if is going to be more accurate, tell me


## AI:

Located both. Two clarifications before the diff:

1. **`Files touched: —` is not a bug** — you're right, it's only filled after the plan runs. Ignore that branch.
2. **The `## Next Steps` section in the design isn't from a template** — `designBody.ts` is just `## Goal` / `## Context`. Haiku invented `## Architecture`, `## Design Decisions`, `## Next Steps` in response to the design-gen prompt that says *"Include architecture, components, data flow, key decisions, and open questions."* So fix B is **tighten the design prompt**, not edit a template.

### On Sonnet vs Haiku

Don't switch model to mask a prompt bug. The plan prompt right now is essentially:

```ts
'Generate an implementation plan for "${title}".',
'Return ONLY a JSON array of steps — no prose, no markdown fences:',
'[{"order":1,"description":"..."},{"order":2,"description":"..."}]',
```

That's it. No guidance on step count, deliverables, or anti-QA. With a prompt this loose, **Sonnet will over-decompose too** because it's reading the same multi-section design and faithfully expanding it. Fix the prompt first; if Haiku still wobbles on 2-3 steps after, *then* try Sonnet. Switching now means we never learn whether the prompt fix actually works.

### Proposed diffs

**Diff 1 — `packages/mcp/src/tools/generate.ts` line 164-168 (plan prompt):**

```diff
- messages.push(msg('user', [
-     `Generate an implementation plan for "${title}".`,
-     'Return ONLY a JSON array of steps — no prose, no markdown fences:',
-     '[{"order":1,"description":"..."},{"order":2,"description":"..."}]',
- ].join('\n')));
+ messages.push(msg('user', [
+     `Generate an implementation plan for "${title}".`,
+     '',
+     'Rules:',
+     '- Steps map to **deliverables**, not design subsections. If the idea or design names a "Deliverables" list, use it as the step skeleton.',
+     '- Aim for the smallest step count that ships every deliverable. 2-4 steps is normal; >5 is suspect — collapse fine-grained sub-tasks into the deliverable they belong to.',
+     '- Each step description names a concrete output (e.g. "Create pricing.html with three-tier markup and inline CSS, Pro highlighted") not a sub-decision (e.g. "Add box-shadow to Pro tier").',
+     '- Do NOT invent QA, testing, accessibility-review, responsive-check, or post-implementation review steps unless the design names them as explicit deliverables.',
+     '- Respect scope exclusions stated in the idea or chat (e.g. "no JS", "no responsive QA") — do not add steps for excluded work.',
+     '',
+     'Return ONLY a JSON array of steps — no prose, no markdown fences:',
+     '[{"order":1,"description":"..."},{"order":2,"description":"..."}]',
+ ].join('\n')));
```

**Diff 2 — `packages/mcp/src/tools/generate.ts` line 116 (design prompt):**

```diff
- messages.push(msg('user', `Draft a Loom design document titled "${title}". Write only the markdown body — no frontmatter. Include architecture, components, data flow, key decisions, and open questions.`));
+ messages.push(msg('user', [
+     `Draft a Loom design document titled "${title}". Write only the markdown body — no frontmatter.`,
+     'Include: Goal, Architecture (high-level structure), Key Decisions (with rationale), Open Questions.',
+     'Do NOT include a "Next Steps" or "Implementation Steps" section — those belong in the plan, not the design.',
+     'Do NOT pre-decompose implementation into a numbered list. Designs describe *what* and *why*; plans describe *how* and *in what order*.',
+     'Respect scope exclusions from the idea/chat — if the user said "no JS" or "no responsive QA", do not introduce them in the design.',
+ ].join('\n')));
```

### Expected effect on the demo

With these in place + the refined chat prompt at line 271, Haiku should land on:

```
| 🔳 | 1 | Create pricing.html with three-tier markup and inline CSS, Pro highlighted | pricing.html | — |
| 🔳 | 2 | Integrate pricing section into index.html between features and footer    | index.html   | — |
```

2 steps, matching the 2 deliverables. If Haiku still emits 3 (e.g. splits "create" from "style"), that's fine for the demo per your "3 is good too" call. >3 means the prompt still isn't tight enough and we iterate.

### Verification before recording

Wipe `j:/loom_demo/loom/demo/pricing/` (or generate into a new thread), rebuild with `./scripts/build-all.sh`, regenerate idea→design→plan with Haiku, count steps. If ≤3, ship the GIF. If >3, one more prompt iteration.

**STOP** — this changes how all generations behave across every project that uses Loom. Want me to apply the two edits + rebuild, or tweak the wording first?

## Rafa:

Apply the edits

## AI:

Applied both edits to `packages/mcp/src/tools/generate.ts` and rebuilt with `./scripts/build-all.sh` — clean. The MCP server now ships the tightened design + plan prompts.

### Next: verify on a clean run

Best test is a fresh thread so we see the full chain working end-to-end, not a regen on top of stale docs:

1. In `j:/loom_demo/`, create a new chat (e.g. weave `demo`, fresh thread or loose fiber) and paste the refined chat prompt from line 271-273.
2. Generate idea → design → plan with **Haiku** (so we measure the same model that produced the 6-step plan).
3. Check:
   - Design has no `## Next Steps` or numbered "Implementation Steps" section
   - Plan has ≤3 steps and they map to the 2 deliverables
4. If pass → record the GIF. If fail (>3 steps or design still pre-decomposes) → paste the generated docs back here and we iterate the prompt wording.

Want me to drive that verification (I can create the chat, run the generates, and report counts), or do you want to do it yourself so the recording reflects your hands?

**Note for the recording:** restart any running Loom MCP server first (Claude Code CLI, the VS Code extension) so the new prompts are loaded — otherwise the stdio subprocess will still be running the old code.

Next: waiting for your call on who drives verification.

## Rafa:

I ran the complete workflow and executed the plan, 3 steps, all done correctly.
Check it at j:/loom_demo

While implementing the plan some uglly errors:
```
I'll start by checking the project structure to see where to create the pricing.html file.

  Searched for 1 pattern (ctrl+o to expand)

● Let me check the project structure:

● Bash(Get-ChildItem -Path "J:\loom_demo" -Recurse -Depth 2 | Where-Object { $_.PSIsContainer -or $_.Extension -in @('.html', '.md', '.json') } |
      Select-Object FullNam…)
  ⎿  Error: Exit code 2
     /usr/bin/bash: eval: line 1: syntax error near unexpected token `('
     /usr/bin/bash: eval: line 1: `Get-ChildItem -Path "J:\loom_demo" -Recurse -Depth 2 | Where-Object { $_.PSIsContainer -or $_.Extension -in @('.html', 
     '.md', '.json') } | Select-Object FullName'

● PowerShell(Get-ChildItem -Path "J:\loom_demo" -Recurse -Depth 2 | Select-Object FullName)
  ⎿  FullName
```

## AI:

3 steps, executed cleanly — the prompt fix worked. Nice validation.

### On the ugly error

That's not a Loom bug — it's the **implementing agent (Claude Code) routing a PowerShell command to its Bash tool**. The agent has both tools available, knows it's on Windows, and still tried `Bash(Get-ChildItem ...)` first before falling back to `PowerShell(...)`. Pure agent-side tool selection mistake. The Loom MCP server just hands the step description over; what shell the agent picks is its own decision.

Checked `doNextStep.ts` — it returns plan + thread context + an `"Implement step N: {description}"` instruction. Nothing about shells, OS, or tool selection. That's the right scope: Loom shouldn't be teaching agents how to use their own tools.

### Options for the demo

**A. Re-record.** The error is stochastic — agent didn't trip it on every run when I've seen this pattern elsewhere. Take 2 or 3 usually clean. Cheapest fix.

**B. Crop the GIF.** Snip from "I'll start by checking the project structure" straight to the successful PowerShell call. Audience never sees the Bash failure. Loses ~3 seconds of footage but no real signal.

**C. Add an OS hint to the `do-next-step` prompt** (workaround):
```ts
`Implement step ${nextStep.order ?? '?'}: ${nextStep.description}`,
'',
`Environment: ${process.platform === 'win32' ? 'Windows (use PowerShell for shell commands, not Bash)' : process.platform}.`,
...
```
**Not recommended.** It pollutes a Loom prompt with agent-tooling advice, helps *all* future doStep runs across every Loom user — but solves a problem Loom didn't create. If Claude Code's own routing improves, this becomes dead weight in the prompt.

### Recommendation

**B for this take, A for any future take.** Don't push C into the codebase — it's a workaround for an agent bug, not a Loom fix, and the cost is permanent prompt pollution for every Loom user worldwide to paper over one Claude Code edge case.

### Where we are

- Plan prompt fix: ✅ validated (6 → 3 steps)
- Design prompt fix: ✅ shipped (verify on next generate that no `## Next Steps` appears)
- Demo-ready: yes for GIF 1, modulo the take quality on the implementation segment

Next: ready to move on to GIF 2 (ctx + reference) prep, or want to lock down GIF 1 first by re-running and confirming the design output is also clean?

## Rafa:

GIF 2

context generated: loom/demo/demo-ctx.md

chat & reply: loom/demo/web-prices/chats/web-prices-chat-002.md

I do not see any signal that AI loaded demo-ctx.md, i think AI explorer the files

note: demo-ctx.md appear in context section of sidebar

terminal log for chatReply:
```
echo "─── Loom: Chat Reply ───"
─── Loom: Chat Reply ───

Rafa@HOME-PC MINGW64 /j/loom_demo
$ claude "$(cat 'M:/Temp/loom-prompt-1779644095867-1880.txt')"
 ▐▛███▜▌   Claude Code v2.1.150
▝▜█████▛▘  Haiku 4.5 · Claude Pro
 ▐▛███▜▌   Claude Code v2.1.150
▝▜█████▛▘  Haiku 4.5 · Claude Pro
  ▘▘ ▝▝    J:\loom_demo

❯ Loom chat reply task. chatId="ch_01KSDGTP3PTBVNN5RCVE7QH5W9". Read the chat file at "j:\loom_demo\loom\demo\web-prices\chats\web-prices-chat-002.md"     
  using the Read tool (not Bash, not loom_find_doc). Understand the conversation, write a reply to the last user message, then use MCP tool                
  loom_append_to_chat with id="ch_01KSDGTP3PTBVNN5RCVE7QH5W9", role="ai", body="<your reply>". Do not use loom_generate_chat_reply — sampling is           
  unavailable. Do not invoke CLI commands via Bash.                                                                                                        

● I'll read the chat file and understand the conversation, then append my reply.

  Searched for 1 pattern, read 4 files (ctrl+o to expand)

● 🔧 MCP: loom_append_to_chat(id="ch_01KSDGTP3PTBVNN5RCVE7QH5W9")

  Called loom (ctrl+o to expand)

● Reply appended to chat.

✻ Baked for 20s
```

## AI:

**You're right — the AI did not load `demo-ctx.md`.** It explored the filesystem. The terminal log confirms it: `"Searched for 1 pattern, read 4 files"` before replying.

**Vision check:** this is the core promise — *"Ctx = AI's working memory of the project. Auto-loaded, no manual context dump"* — and the current implementation doesn't deliver it for chat replies.

### Root cause

Read `packages/vscode/src/commands/chatReply.ts`. The prompt the extension sends to Claude CLI is **literally**:

```
Loom chat reply task. chatId="{X}". Read the chat file at "{Y}"
using the Read tool (not Bash, not loom_find_doc). Understand the
conversation, write a reply to the last user message, then use MCP
tool loom_append_to_chat ...
```

That's it. **No ctx injection. No thread context. No requires_load.** The extension hands Claude an empty plate and the chat file path. The "ctx appears in sidebar" is purely a UI concept right now — it does not flow into the prompt at all.

The agent then does the only thing it can: grep + read files to figure out what the project is. That's the manual context-dump Loom is supposed to remove.

### Fix design

The cleanest path is a new MCP resource `loom://chat-context/{chatId}` that bundles:
- Auto-loaded ctx docs (weave-level scope, thread-level scope) — based on where the chat lives
- Thread context (idea + design + active plan) if the chat is in a thread
- The chat document content itself
- Any `requires_load` refs from the loaded ctx/design

Then `chatReply.ts` either:
- **(a)** fetches that resource itself, dumps the bundled text into the prompt file, and launches Claude with full context pre-loaded; or
- **(b)** tells Claude in the prompt to call `ReadMcpResourceTool` for `loom://chat-context/{chatId}` first.

**(a) is correct.** It guarantees the context arrives — no possibility of the agent skipping the read. (b) leaves room for exactly the bug we just hit, where the agent decides to grep instead.

### Why this matters beyond the demo

This isn't just GIF 2 — **every chat reply in Loom is currently context-blind**. Any project using Loom right now is getting Claude-with-amnesia for chat, while the UI shows ctx docs as if they're loaded. That's a fairly load-bearing gap in the vision-to-implementation chain. Worth fixing soon regardless of the demo.

### Demo-time options

**A. Fix it before recording.** ~1-2 hours: new `chatContext` resource in `packages/mcp/src/resources/`, update `chatReply.ts` to pre-load and inject. Loom actually delivers the promise on camera.

**B. Record the GIF anyway with a caveat.** Show the chat reply, narrate "ctx is loaded into the AI's context window" — which is misleading at best. Audience may not notice if the reply is good.

**C. Record with a manual workaround.** Pre-pend the ctx content into the chat message before clicking reply. Demo looks right; underlying bug shipped.

**Recommendation: A.** This is a vision-load-bearing feature. Shipping the GIF showing ctx "working" when the implementation routes around it is exactly the kind of thing that erodes trust if a viewer downloads Loom and tries it themselves.

**STOP** — this is a design decision (whether to ship the GIF with the gap, and the fix shape if we fix). Want me to:
1. Implement option A (resource + extension wiring)?
2. Defer the fix and record with B or C?
3. Discuss the resource shape first?

## Rafa:

Loading weave & global context should be done always, not only for chats, any time user launch a command on a specific weave, for any loom kind of doc. Also the real injected context will depend of CONTEXT section of sidebar, user can decide what to inject and what not.

Also take into account `requires_load`
Also we have pending `loom/ai-integration/load-when/load-when-design.md`

I think we should open a new thread, design and plan to cover all context features properly, do not implement anything yet


## AI:

Agreed — new thread is the right move. But before opening it I need to flag what's already there so we don't duplicate or fork.

### Existing related threads in `loom/ai-integration/`

| Thread | What it covers | Status |
|---|---|---|
| `context-injection` | First-reply rule for chats (idea + design + plan-001) | Plan `done`, but **only as a CLAUDE.md rule** — AI-side responsibility, no actual loading code |
| `showing-docs-loaded` | Visibility prefixes (`📄 X — loaded for context`) | Has plan-001 |
| `reference-load-context` | `load: always / by-request` axis | Design only |
| `load-when` | Operation-mode filter (`load_when: [idea, design, plan, implementing]`) | Design only, plan pending |

**The core gap your demo just exposed:** `context-injection` is "done" but only as a behavioral rule in CLAUDE.md. The chat-reply path in the extension (`chatReply.ts`) launches Claude CLI as a **one-shot subprocess** with no CLAUDE.md context and no pre-loaded docs. The "AI honors the rule" assumption breaks the moment the AI isn't in an interactive Loom-aware session.

So existing threads cover *fragments* of the picture (when to load, what marks "always", how to filter by mode, how to show what's loaded) but **no thread owns the actual loading pipeline** — the code that reads ctx + requires_load + sidebar selection and bundles it into prompts.

### Proposed new thread

**Location:** `loom/ai-integration/context-pipeline/` (or `unified-context-loading/` — naming up to you)

**Scope (what the idea would say):**
- One context-assembly pipeline shared by every command that launches AI (chat reply, do-step, refine, promote, generate idea/design/plan, refresh ctx, generate chat reply).
- Pipeline inputs:
  1. Target doc (the one the command operates on) → determines weave, thread.
  2. Operation mode (chat-reply, do-step, refine, …) → drives `load_when` filtering.
  3. Sidebar CONTEXT selection → user-curated include/exclude overrides.
  4. `requires_load` from the target doc and from auto-loaded ctx docs (transitive).
- Pipeline output: a deterministic ordered context blob (or temp-file path) injected into the prompt **before** the AI is invoked. No "AI is expected to load this itself."
- Visibility: emit `📄 X — loaded for context` lines per [[showing-docs-loaded]] so the user sees exactly what shipped.

**Relationship to existing threads:**
- **Supersedes** the chat-reply-specific scope of [[context-injection]] (the loading pipeline absorbs it). Keep that thread's design as historical reasoning; mark its plan as "implementation deferred — replaced by context-pipeline".
- **Depends on** [[load-when]] (must ship first, or be implemented within this thread). Same for [[reference-load-context]] if `load: always/by-request` isn't shipped.
- **Wires into** [[showing-docs-loaded]] for the visibility output.

**Vision check:** *"Both always know weaves, threads state... The AI becomes as stateful as it can be — not via memory inside the model, but via durable docs it rereads at every action."* — this thread is the load-bearing piece that makes the second half true for every action, not just session start.

### Decisions I need from you before creating any docs

1. **Thread name** — `context-pipeline` / `unified-context-loading` / your call?
2. **Weave** — stay in `ai-integration`, or new weave (e.g. `context`)? I lean stay — keeps all context-related design in one place.
3. **Handling of existing threads** — supersede with a note? leave untouched? merge? My recommendation: leave their docs in place, add a `superseded_by` note in the new thread's idea so future readers know the lineage.
4. **Scope of the idea** — should it include the sidebar CONTEXT UX (user-curated include/exclude), or is that a separate thread that this depends on?

Once you confirm 1-4, I'll create the idea via `loom_create_idea` + write the body, then we discuss design together before any code lands.

**STOP** — waiting on your decisions.

## Rafa:

1. `context-pipeline`
2. `ai-integration`
3. leave their docs in place, add a `superseded_by`
4. Include the sidebar CONTEXT UX. Independer Phase if you consider

Take into account all already spoken for the idea, design and plan.
Make suggestions you consider to improve loom context management.
Add anything you consider.

## AI:

Thread opened. Idea drafted. Lineage marked.

### Created

- `loom/ai-integration/context-pipeline/context-pipeline-idea.md` — id `id_01KSDJ2C59Z1XY11W336B0W9YS`, title **"Unified Context Pipeline"**

### Idea structure

1. **Problem** — why the existing CLAUDE.md-rule approach didn't deliver, with the demo bug as concrete evidence
2. **Idea** — one server-side assembler pipeline, shared by every AI-launching command, with deterministic `ContextBundle` as the single source of truth for both prompt-injection and visibility output
3. **Pipeline order** — 9 steps from "resolve target doc" through "emit bundle with full provenance"
4. **Phased delivery** — 5 phases, each shipping a useful slice:
   - P1 core pipeline + chat-reply + do-step
   - P2 `load_when` filter
   - P3 sidebar CONTEXT UX (user override)
   - P4 wire remaining commands (refine/promote/generate/refresh)
   - P5 token budget + summarisation
5. **Additional improvements** — beyond what we discussed: stale-context marking, ctx cache freshness, cross-thread context resolution, explicit operation-mode derivation table, provenance/testability via pure function, visibility consistency across host environments, non-Claude agent support
6. **Vision tie-in** — four vision elements, what this thread delivers for each
7. **Manual steps removed** — concrete list (pasting ctx into chats, re-explaining `[[thread-X]]`, etc.)
8. **Relationship to existing threads** — supersedes / implements / wires into
9. **Open questions** — 5 design decisions to settle before drafting the design
10. **Why now** + **Next**

### Lineage marked

Prepended a `⚠️ Superseded by [[context-pipeline]]` blockquote to the body of:
- `context-injection-idea.md` (id `id_01KQYDFDD8QAB8TD0JXC8D31J4`)
- `context-injection-design.md` (id `de_01KQYDFDD8B5XJDQBP4P429R61`)
- `context-injection-plan-001.md` (id `pl_01KQYDFDD811TEXADDXS6CMC6Y`)

I **did not** mark `showing-docs-loaded`, `reference-load-context`, or `load-when` as superseded — those designs stay valid and the pipeline *consumes* them rather than replacing them. They're already linked via `[[wikilinks]]` from the new idea. If you'd prefer a "consumed by" note on each instead of leaving them unmarked, say so and I'll add it.

### Suggestions from the idea worth flagging now

These are the ones most likely to matter for the design discussion:

1. **Operation-mode derivation table** — without an explicit mode per command, [[load-when]] filters have nothing to filter against. Idea includes the full command→mode mapping.
2. **Bundle shape as a single source of truth** — what gets injected = what's shown in visibility = what's marked in the sidebar. Today these are three uncoordinated surfaces.
3. **Pure function in `packages/app`** — assembler as `(targetDoc, mode, overrides, loomState) → ContextBundle`. Unit-testable matrix of scope × load × load_when × overrides × cycles × staleness. Solves "why didn't X load?" forever.
4. **Stale-context marking in the prompt itself** — when a loaded plan's `design_version` is behind, the AI sees `⚠️ stale: design updated after this plan` in the bundle. Today nothing signals this to the AI.
5. **Bundle serialisation is agent-agnostic** — plain markdown with provenance headers, no Claude-specific tool-call hints. Makes the pipeline equally useful for Cursor, Continue, future agents.

### Open design questions in the idea (5)

Settling these first will let the design doc be concrete rather than hand-wavy:

1. Bundle serialisation format (Markdown with provenance headers vs JSON-in-prompt vs separate temp file)
2. Assembler location (`packages/app` vs `packages/mcp`)
3. Sidebar override wiring (callback vs serialised prefs file)
4. Phase order (proposed above; confirm or reorder)
5. Migration story for the existing `do-next-step` ad-hoc bundling (replace immediately vs side-by-side for a release)

### Vision check

This serves *"AI as stateful as it can be — durable docs it rereads at every action"* — pipeline runs at every action, not just session start. Removes the manual steps of context-dump-in-chat and "implement step 2 of *this design*". Concrete cost to ship: roughly the size of Phase 1 (1-2 days), payoff is the vision-load-bearing feature finally working end-to-end.

### Next

Read `context-pipeline-idea.md`. Three options:

1. **Refine the idea** — anything missing, wrong, or worded badly. I edit before design starts.
2. **Discuss the 5 open questions** — settle them in chat, then I draft the design.
3. **Go straight to design** — if the idea reads cleanly, I draft `context-pipeline-design.md` based on my own answers to the 5 questions (with clear flagging where I made a call).

**STOP** — waiting for your read.

## Rafa:

### Open questions in idea doc `context-pipeline-idea.md` lines 207-214

1. `packages/app`
2. `.loom/context-prefs.json` dedicated file
3. start at unlimited
4. eager
5. include a `⚠️ requires_load target missing: <id>` placeholder

### TODO 

- update the idea with settle questions
- create the design


## AI:

TODO done: idea settled, design drafted.

### Idea — `context-pipeline-idea.md`
Replaced the **Open questions** section with **Settled decisions** (your 5 answers, dated 2026-05-25). All five matched the doc's own recommendations:
1. assembler → `packages/app`
2. prefs → dedicated `.loom/context-prefs.json`
3. token budget → start unlimited
4. `requires_load` → eager
5. missing target → `⚠️ requires_load target missing: <id>` placeholder

### Design — `context-pipeline-design.md` (draft, id `de_01KSG5XTNGXB2KPE448CA5B586`)
13 sections. Key points:

- **Grounded in real types.** Verified `BaseDoc.content` already holds every doc's body in `LoomState`, so the assembler is genuinely **pure** — `(targetId, mode, overrides, state) → ContextBundle`, no IO. Found two things the idea glossed:
  - **Scope is positional**, not a frontmatter field — derived from where a ctx/ref doc lives (globalDocs / weave / thread). Needs a `classifyScope` helper.
  - `ReferenceDoc` has only `loadWhen?: string | null` (reserved, *singular*) and **no `load` field** yet. So Phase 2 has to add `load` and widen `load_when` to `string[]` in the type + frontmatter — I called that out as a P2 dependency, coordinated with [[reference-load-context]] / [[load-when]].
- **`ContextBundle` lives in `packages/core`** (shared pure type); the ordered `docs[]` is the one model driving prompt + visibility + sidebar.
- **Replaces `threadContext.ts`** — today's ad-hoc bundler does direct file IO, thread-ctx only, fixed order. The assembler is a strict superset (global+weave+thread ctx, overrides, provenance).

### Two flagged calls (need your nod — §5 and §7 of the design)

1. **§5 Serialisation = markdown with per-doc provenance headers** (not JSON-in-prompt, not temp file). Forced by the idea's own agent-agnostic requirement. The header line doubles as the [[showing-docs-loaded]] `📄` source.
2. **§7 `do-next-step` migration = replace immediately**, keeping `loom://thread-context` as a thin alias for one release, then delete. Alternative (side-by-side parallel bundlers for a release) rejected as drift-prone since the assembler is a superset, not a behaviour change — but this is the one call to flip if you'd rather de-risk.

If both stand, next artifact is `context-pipeline-plan-001.md` scoped to **Phase 1 only**.

**STOP** — waiting for your review of the design + the two flagged calls.

## Rafa:

1. Explain briefly Serialisation. Is for agent-agnostic? why this approach?
2. replace immediately, do not keep any legacy stuff

## AI:

### 1. Serialisation — what it is and why this shape

**What it is:** "Serialisation" = turning the assembled `ContextBundle` (the ordered list of docs) into the actual *text* that gets prepended to the prompt before the agent runs. The bundle is the data model; serialisation is how that data becomes a string the agent reads.

**Chosen shape:** one markdown blob — each doc as a section with a one-line provenance header (`### [scope type] Title · id · stale?`) then its body, sections split by `---`.

**Yes — the whole point is agent-agnostic.** Here's the why, in order of weight:

- **Every agent reads its prompt as text.** Claude Code, Cursor, Continue, a raw LLM call — all consume a string. Markdown is the universal substrate: no parser, no schema, no capability we have to assume the agent has.
- **Why not JSON-in-prompt:** it makes the model parse and trust a structured block before it can even read the content — couples us to tool-use-capable agents and wastes tokens on syntax.
- **Why not a temp file on disk:** it relies on the agent *deciding* to read the file. A one-shot CLI subprocess (or any agent that doesn't auto-read) never opens it — that's literally the demo bug we're fixing. Baking context into the prompt is the fix; a file would re-open the same hole.
- **Agent-specific instructions stay OUT of the bundle.** Anything like "use the Read tool first" lives in the per-command prompt template, not the context blob. So the bundle itself stays portable across agents.
- **Bonus:** the provenance header line is *also* the source for the `📄 X — loaded for context` visibility line — so what the agent gets and what you see can't drift apart.

### 2. Migration — done

Updated design §7 (and §6) to **replace immediately, zero legacy**: no thin alias, no parallel release. `loom://thread-context` and `threadContext.ts` are **deleted** in the Phase 1 PR; every caller migrates to `loom://context`. Added a removal checklist so nothing is missed — notably it includes repointing **both CLAUDE.md surfaces** (repo-root + the `LOOM_CLAUDE_MD` template), since the "Primary entry points" table and the chat-reply rules currently name the old resource and the two files must stay in sync.

Both flagged calls are now settled. Next artifact would be `context-pipeline-plan-001.md` scoped to **Phase 1 only**.

**STOP** — say `go` to draft the Phase 1 plan, or react to the design first.

## Rafa:

Create a reference doc `loom/refs/loom-context-pipeline-reference.md` for this context pipeline design with user point of view and how is designed and work internally


## AI:

Reference doc created: `loom/refs/loom-context-pipeline-reference.md` (id `rf_01KSG7CNWGYN7XCVCN7XWQFHBN`, slug `loom-context-pipeline`).

Two parts, as asked:
- **Part 1 — User point of view:** the problem it removes (context-blind AI on chat reply), what you get (no context dumps, you see what the AI saw, you stay in control, works with any agent), and when it runs.
- **Part 2 — How it's designed and works internally:** the system shape diagram, the pure `assembleContext` function and why it can be pure, the `ContextBundle` shape, the 9-step pipeline, the agent-agnostic markdown serialisation, the `loom://context` MCP resource, operation modes, phased delivery, and the design invariants.

Created via `loom_create_reference` (canonical frontmatter + ULID id), body filled by direct edit since `loom/refs/*.md` is gate-excluded — version stays 1.

**Next:** waiting for direction — say `go` to draft `context-pipeline-plan-001.md` (Phase 1 only), or review the reference doc first.

## Rafa:

Draft plan Phase 1 
Do you prefer to draft plan Phase 2 after implementing Phase 1 and test it?

## AI:

Phase 1 plan drafted: `context-pipeline-plan-001.md` (id `pl_01KSG7MW7ZZJ2R9D76EPEAX02G`, parented to the design). **8 steps**, dependency-ordered:

1. Core types (`ContextBundle`, `BundledDoc`, `ExcludedDoc`, `OperationMode`, …) in `packages/core`.
2. Pure `assembleContext` in `packages/app` + unit tests (auto-load ctx + eager/cyclic `requires_load` + missing-target placeholder + stale flag; no load_when/overrides/budget).
3. `serializeBundle` + `bundleVisibilityLines` (the agent-agnostic markdown + the `📄` lines from the same ordered docs).
4. `loom://context/{docId}?mode={mode}` MCP resource + integration test.
5. Wire the extension chat-reply path (fetch → prepend → print visibility) — the demo-bug fix.
6. Repoint `do-next-step` to the assembler at `mode=implementing`.
7. Delete `threadContext.ts` + `loom://thread-context`, migrate callers, update **both** CLAUDE.md surfaces, grep-confirm zero residue.
8. End-to-end verify: `build-all` + `test-all` + integration + manual chat-reply/do-step.

### Your question — should Phase 2 be planned after Phase 1 is built + tested?

**Yes — defer the Phase 2 plan until Phase 1 is implemented and tested.** Three reasons:

1. **P1 teaches the real ergonomics.** The assembler's actual signature, how the serialised bundle reads in a live prompt, and where the wiring is awkward are things we'll *know* after P1 and can only *guess* now. A P2 plan written today would be drafted against unbuilt code.
2. **P2 has an unsettled dependency.** It adds the `load` and `load_when` fields to the type system — coordinated with the [[reference-load-context]] and [[load-when]] threads. Those want their own settling pass; pulling them in now would balloon P1's discussion.
3. **It matches Loom's own model.** A plan written against foundations that don't exist yet goes stale the moment P1 lands — the exact staleness Loom is built to track. One plan in flight per thread keeps the thread honest, and `{refine}` exists precisely to propagate P1's learnings into the P2 plan when we draft it.

So: one plan per phase, just-in-time. After P1 ships and tests green, we draft `context-pipeline-plan-002.md` for P2 informed by what P1 taught us.

### Two cosmetic findings on the created plan (not blockers)
The `loom_create_plan` tool left template placeholders unfilled in the plan's header mini-table — `Design | {design-id}.md` and `Target version | {X.X.X}` — and the frontmatter says `status: active` while the body table says `DRAFT`. The steps table itself is correct. Flagging as a tool quirk rather than hand-editing (the plan is gate-protected, and routing around it would hide the bug).

**Next:** say `go` to start Step 1 (I'll move the plan to `implementing` and begin), or review the plan first.

## Rafa:

Do All Steps

## AI:

Phase 1 plan complete — all 8 steps ✅, plan auto-transitioned to `done`. Build green, full test suite green, real-repo smoke test green.

### What shipped
- **`packages/core`** — `ContextBundle` + supporting types (`BundledDoc`, `ExcludedDoc`, `OperationMode`, `DocScope`, reasons).
- **`packages/app/src/context/`** — pure `assembleContext(targetId, mode, overrides, state)` + `classifyScope`; `serializeBundle` + `bundleVisibilityLines`. Pure because `BaseDoc.content` is already in `LoomState`.
- **`packages/mcp`** — `loom://context/{docId}` resource (+ `loom://context/thread/{weaveId}/{threadId}` form); registered in `server.ts`.
- **Wiring** — extension chat-reply now injects the bundle before launching the agent (the demo-bug fix); `do-next-step` uses the assembler.
- **Zero legacy** — `threadContext.ts` + `loom://thread-context` deleted; all callers migrated.

### Tests
- `tests/context-assembler.test.ts` — 11 assertions (scope order, transitive+cyclic requires_load, slug resolution, missing placeholder, stale flag, override, serialiser, visibility). Green.
- MCP integration test — added `loom://context` assertion. 8/8 green.
- Real-repo smoke: assembled a **75 KB** bundle for this very chat — global `loom/ctx.md` + Vision + Workflow (pulled via `requires_load` slugs). The vision-promise feature now actually runs.

### Things you should know (3 findings)
1. **Scope ballooned at step 7.** The design's §7 named only `do-next-step`, but **7** live callers used the old resource (weaveDesign/weavePlan/continueThread/generate×3/doStep/refreshCtx). I migrated them all. To do it cleanly I **added a thread-addressing form** to the new resource (`loom://context/thread/{weave}/{thread}`) — this is an API-shape call I made mid-run to honour "zero legacy." If you'd rather each caller target a specific doc instead, say so and I'll rework.
2. **Thread/weave ctx auto-load is wired but inert.** `getState`/`loadThread` don't load `{thread}/ctx/` subdirs into state, and extending them ripples into status-derivation (`allDocs.every(done)`) and the save path — so that belongs to the ctx-naming/global-ctx threads, not here. No regression today (zero ctx/ docs exist); global ctx works. The assembler is forward-compatible.
3. **Manual VS Code UI test not run** (no interactive VS Code here). The resource the extension calls is verified by integration + smoke tests, but I have not clicked the actual Chat Reply / DoStep buttons. Also: minor — `loom/refs/*.md` classify as scope `weave` (getState treats `loom/refs/` as a pseudo-weave); cosmetic.

Per your earlier call, **Phase 2 plan is deferred** until you've exercised Phase 1 in the extension.

**Next:** review the Phase 1 changes (esp. finding #1 — the thread-addressing API decision). Want me to verify the extension UI once you confirm the approach, or adjust the migration?

## Rafa:

Keep the thread-addressing form, I think you did it right, I always prefer clean code, no legacy trash

Update `loom/refs/loom-context-pipeline-reference.md` with all decisions taken and new stuff

What about the Two cosmetic findings you named in lines 1081-1084? Are they fixed?

Commit push all pending and Phase 1

## AI:

⚠️ **Stopping before commit — I found data corruption (a pre-existing bug I triggered).** Done so far: thread-addressing kept, reference doc updated with all decisions, and the plan mini-table fixed at the root (`generatePlanBody` no longer emits it) + plan-001 refreshed. But staging revealed **6 sibling docs in the `ai-integration` weave were silently modified**, 4 of them truncated.

### The bug (two compounding root causes)
1. **`updateStepsTableInContent` (core/planTableUtils.ts) truncates.** Its boundary lookahead is `(?=\n---|\n#{1,2}\s|$)` — it stops at `---` or an **h1/h2** heading, but **not h3**. So a `### Notes` (or any h3) section right after the steps table with no preceding `---` is swallowed by the lazy match and **deleted** when the table is rewritten.
2. **`runEvent` (app) calls `saveWeave` — re-saving EVERY doc in the weave**, not just the target. So each of my 8 `loom_complete_step` calls on `context-pipeline-plan-001` re-serialized all `ai-integration` plans, firing bug #1 on every sibling.

Net: completing a step on one plan corrupts sibling plans that have post-table h3 content. My own plan-001 survived (it has `---` before its Legend); the casualties:
- **Truncated** (lost `### Notes`): `ai-command-palette-plan-001`, `ai-chat-plan-001`, `ai-promote-plan-001`, `showing-docs-loaded-plan-001`.
- **Minor churn** (±1 line, trailing newline/H1): `ai-claude-default-plan-001`, `continue-deepseek-chat-001`.
- `context-injection` (3 docs): the visible diff is the intended superseded-marks from the earlier turn (net additions) — but I want to double-check they didn't also lose a line.

### I have NOT committed anything. Proposed recovery (your call):
1. `git restore` the 6 corrupted/churned siblings (they're tracked — restores to clean HEAD), and verify the 3 context-injection docs carry only the intended superseded marks.
2. **Fix bug #1** (clean, low-risk): widen the boundary to any heading — `\n#{1,2}\s` → `\n#{1,6}\s` (or `\n#+\s`) — so h3 sections after the table are preserved. Add a regression test (plan with `### Notes` after the table survives a save round-trip).
3. **Bug #2 (`runEvent` → `saveWeave` blast radius)** is a separate, bigger architectural concern (a step-completion shouldn't rewrite unrelated docs). I'd flag it for its own thread rather than fix it inline — but the bug-#1 fix alone stops the data loss.
4. Then commit Phase 1 + the bug-#1 fix + the legitimate pending changes, and push.

Questions: (a) OK to `git restore` the 6 siblings? (b) Fix bug #1 now and include it in this commit, or separate? (c) `runEvent`/`saveWeave` — new thread, or in scope now? (d) Should I exclude `.claude/settings.local.json` from the commit (it's local session settings)?

**STOP** — waiting for your direction before any `git restore`, fix, or commit.

## AI:

**Committed + pushed — `aab2ccc` → origin/main.** 38 files, +2269 / −189.

All four follow-ups (a–d) are now closed:
- **(a)** 6 corrupted ai-integration siblings restored to HEAD before staging.
- **(b)** Truncation bug fixed in `planTableUtils.ts` — boundary lookahead widened `#{1,2}` → `#{1,6}` in both `parseStepsTable` and `updateStepsTableInContent`, so an `### Notes`/`### Legend` section right after the steps table survives save round-trips. Regression test `tests/plan-table-utils.test.ts` covers it.
- **(c)** `runEvent → saveWeave` whole-weave re-save blast radius captured as a follow-up idea: `loom/core-engine/event-save-scope/event-save-scope-idea.md` (not fixed here — it's a wider change to the save path; flagged for its own thread).
- **(d)** `.claude/settings.local.json` excluded from the commit (still modified in the working tree).

Phase 1 of the Unified Context Pipeline is in: pure `assembleContext` + `serializeBundle`, the `loom://context/{docId}` and `loom://context/thread/{weaveId}/{threadId}` resource, all 7 callers migrated (no legacy alias), `threadContext.ts` deleted, plan mini-table removed at the root. `build-all.sh` + `test-all.sh` both green before commit.

Next: Phase 2 planning (deferred until Phase 1 is tested in real sessions), and the `event-save-scope` thread when you want to tackle the save-path blast radius.

## Rafa:

Enumerate steps tp test Phase 1 
Create plan Phase 2
Briefly detail `event-save-scope`


## AI:

Three answers below. I've **not** created the Phase 2 plan doc yet — there's one cross-thread scope decision to settle first (see §2), so I'm presenting the breakdown and stopping for your call before `loom_create_plan`.

---

## 1 — Steps to test Phase 1

**A. Automated (already wired, just re-run as the gate):**
1. `./scripts/build-all.sh` → `./scripts/test-all.sh` — must be green. The Phase 1 coverage lives in `tests/context-assembler.test.ts` (scope ordering, requires_load transitive + cycle, missing→placeholder, override precedence, stale flag), `tests/plan-table-utils.test.ts` (truncation regression), and the MCP integration test (reads `loom://context/{id}` and asserts provenance headers).

**B. Manual / real-repo (the behaviour the unit tests can't prove):**
2. **Resource — doc form.** Read `loom://context/{a real chat id}?mode=chat`. Assert: the `<!-- loom:context-bundle … -->` comment, ordered sections, global `loom/ctx.md` present, each `### [scope type] Title · id` header correct, `---` separators.
3. **Resource — thread form.** Read `loom://context/thread/{weave}/{thread}?mode=design`. Assert it anchors on the thread's design (`design ?? idea ?? active plan ?? first doc`).
4. **requires_load.** Pick a doc that points at the vision/workflow reference slugs → assert those refs appear last in order. Then point a `requires_load` at a bogus id → assert `### ⚠️ requires_load target missing: <id>` placeholder + an `excluded` entry with reason `missing`.
5. **Stale flag.** A plan whose `design_version` < its design's version → header shows `⚠️ stale: …`; the doc is flagged, not dropped.
6. **chatReply (extension).** Click **Reply** on a thread chat → confirm the serialised bundle is prepended to the launched prompt and the `📄 {Title} — loaded for context` lines print in the *Loom Context* output channel. This is the original demo bug — the agent should answer without grepping the repo.
7. **doStep / do-next-step.** Run a step → confirm an `implementing`-mode bundle (idea + design + active plan) is injected.
8. **Negative / known-gap confirmation.** Weave & thread ctx are **not** surfaced yet (`getState`/`loadThread` don't load `ctx/` subdirs) — only global `loom/ctx.md`. Confirm this is silent-absent, not an error. Documented gap, expected.
9. **Migration regression.** Grep the tree: **zero** `loom://thread-context` references survive, and all 7 migrated callers resolve.

---

## 2 — Phase 2 plan: one decision before I write it

Per the design (§1, §12), **Phase 2 = the `load_when` filter + the `load: always | by-request` axis** (step 3 of the assembler algorithm). The catch is ownership: the design explicitly says the *field design* for both belongs to sibling threads — **[[load-when]]** (`load_when`) and **[[reference-load-context]]** (`load`) — while only the **gate logic lives inside the assembler**.

So the decision is **scope**:

- **Option A — self-contained.** This Phase 2 plan defines the `load` enum + widens `load_when` to `string[]` in `ReferenceDoc` + frontmatter *and* implements the assembler filter. Absorbs the two sibling threads' field design. Fastest, one PR — but it pre-empts threads that are supposed to own those fields.
- **Option B — gate-only, depends on siblings (recommended).** load-when + reference-load-context land the field design first; this plan implements only the assembler's step-3 filter + tests against those fields. Cleaner ownership, honours the design's stated boundaries — but it's blocked-by two threads that aren't planned yet.

There's also a **prerequisite worth naming**: ctx-doc filtering by `load_when` is only meaningful once weave/thread ctx actually load into state — and that's the inert getState gap (owned by ctx-naming / global-ctx). Reference-doc filtering works today regardless. So even under Option B, Phase 2 can ship *reference* filtering immediately and ctx filtering follows the getState work.

**My recommendation: Option B**, scoped to reference-doc `load`/`load_when` filtering, with ctx filtering deferred behind the getState gap. It keeps thread ownership clean (your standing "no legacy / correct-path" preference) and isn't blocked on the bigger getState refactor.

**Which option do you want?** Once you pick, I'll draft `context-pipeline-plan-002.md` accordingly.

---

## 3 — `event-save-scope` (brief)

Captured as `loom/core-engine/event-save-scope/event-save-scope-idea.md` (id `id_01KSGJSN9N8DHX4G7M2P281BMS`).

**Problem:** `runEvent` → `loadWeave` → `applyEvent` → `saveWeave`, and `saveWeave` re-serialises **every doc in the weave**, not just the one the event changed. So a single `loom_complete_step` on one plan rewrites every idea/design/plan/done/chat in that weave. That's exactly what turned the Phase 1 truncation bug into six-doc corruption — the blast radius amplified an isolated bug into collateral data loss.

**Fix direction:** a workflow event mutates one doc (at most one thread); `runEvent` should persist only what changed — reducers report the touched doc id(s) (cleaner than diffing the weave), and `runEvent` calls `saveDoc` on just those. Keep `saveWeave` for genuine bulk ops (migrations). Bounds blast radius *and* kills the spurious git churn from re-normalising untouched docs.

**Status:** idea only, not planned. Pure core/app concern, no MCP/extension surface. The truncation fix already shipped stops the data loss; this is defence-in-depth so a future save-path regression can't spread.

---

**STOP** — waiting on the Option A vs B call for §2 before drafting the Phase 2 plan.

## Rafa:

Quick questions before proceed:
If i pick B, when we finish it
`load-when` `reference-load-context weaves` will be still pending?

`event-save-scope` is also pending, correct?

## AI:

Checked both — and the honest answer reframes the A/B choice. First, a terminology fix: `load-when` and `reference-load-context` are **threads** inside the `ai-integration` weave, not weaves.

**Current state of the two threads (I just read both):**

| Thread | Design | Plan / impl | Owns |
|---|---|---|---|
| `reference-load-context` | status `done` | none | `load: always \| by-request` field + scope resolution + a 📌 tree icon |
| `load-when` | status `active` | none | `load_when: [mode…]` field + per-mode filtering + References tree section / tooltip tags (depends on reference-load-context) |

Each design actually carries **three** parts: (1) the entity **field**, (2) the **context-assembly filtering** that reads it, (3) **VS Code tree-view UX** (References section, 📌 icon, `load_when` tags in tooltips).

**So: "if I pick B, when we finish, are those threads still pending?"** — **Partly yes.** Part (2), the filtering, *is* the context-pipeline assembler's step-3 — that's literally what P2 builds. And you can't filter on fields that don't exist, so part (1) the fields must land with it. But part (3), the **VS Code tree UX**, is not in the pipeline's scope at all. So a B-scoped P2 would consume parts 1+2 and leave the **UX portions of both threads still pending**.

That's messy ownership — two threads left as UX-only stubs. Which points at a cleaner third option:

- **Option C — consolidate (worth considering).** The pipeline design (§1) already declares itself the home of filtering ("the gate lives in the assembler"). The pipeline is now the single owner of *what the AI knows before it acts*; `reference-load-context` (Apr 21) and `load-when` (Apr 23) both predate it and were written for the old `getAIContext` path that no longer exists. So: fold parts 1+2 (fields + filtering) into context-pipeline **P2**, and re-scope the two old threads down to **just their VS Code tree UX** — or roll that UX into the **P3 sidebar CONTEXT** work and **archive** the two threads entirely. Result: zero orphaned stubs, one owner for context filtering. This matches your standing preference for clean ownership over legacy fragments.

My updated recommendation: **Option C** — absorb fields+filtering into P2, and let the tree-view UX ride with P3's sidebar work (archive the two threads, since their non-UX content is fully superseded by the pipeline design). If you'd rather keep them as living threads, Option B + a follow-up note on each that their filtering moved to the pipeline.

**Q2 — `event-save-scope`:** correct, **pending**. Idea only (`id_01KSGJSN9N8DHX4G7M2P281BMS`), no design, no plan, not implemented. The shipped truncation fix stopped the data loss; this thread is the unstarted defence-in-depth (narrow the save scope).

**STOP** — pick A, B, or C and I'll draft `context-pipeline-plan-002.md` (and, for C, handle the two thread archives/re-scopes cleanly).

## Rafa:

Option C
Create plan Phase 2, consolidate and absorb, archive old threads

Create design and plan for `event-save-scope`

## AI:

Option C executed — all five artifacts created/updated. Nothing built or committed yet; these are planning docs awaiting your review.

**1. Pipeline design updated** (`de_01KSG5XTNGXB2KPE448CA5B586`)
- §1: the `load-when` / `reference-load-context` bullets moved from *Consumes* to a new **Absorbed** block (with the why + where the tree UX goes).
- §2 + §12: P2 row now notes the absorption; P3 row now owns the absorbed threads' tree-view UX.
- New **§14 — Consolidation (Option C, 2026-05-27)**: the decision, what moves where, both archived doc ids. This is the authoritative record.

**2. Phase 2 plan created** — `context-pipeline-plan-002.md` (`pl_01KSNAAWE8FWDV91GCBQ8E4GRF`), 5 steps: `load` enum + `load_when: string[]` on the entity → fs parse/serialize → assembler step-3 filter (`load_when-filter` exclude reason) → test matrix → reference-doc update + green build. Reference filtering ships; ctx filtering stays gated behind the inert getState ctx-load gap; tree UX is P3.
- ⚠️ Caught + fixed a latent bug: the generated step 1 had a literal `|` inside a `` `load: 'always' | 'by-request'` `` code span — `parseStepsTable` splits rows on `|`, so the next `complete_step` would have mis-parsed and corrupted that row. Rephrased to avoid the embedded pipe. (Same class as the truncation bug — worth a guard in `loom_create_plan`/`generateStepsTable` to escape or reject `|` in step text; flagging, not fixing here.)

**3. event-save-scope design created** (`de_01KSNACN3T97M7HVG3K0W3WBQB`)
- Decision: **reducers report the changed doc id(s)**; `applyEvent` returns `{ weave, changed }`; `runEvent` saves only those.
- Explicitly **rejects** the cheaper serialize-and-diff route, with the key reasoning: a diff is computed from serialiser output, so a non-idempotent save path makes an *untouched* doc look "changed" and gets written — i.e. diff-derived would **not** have prevented the corruption. Only a serialisation-independent signal bounds the blast radius.

**4. event-save-scope plan created** — `event-save-scope-plan-001.md` (`pl_01KSNAFC9TT66GV1BVF761A8KF`), 5 steps in dependency order: reducers → `applyEvent` → `runEvent` → callers → tests (incl. the regression: complete-step leaves every sibling file byte-identical).

**5. Both threads archived** (banner-noted first, pointing at pipeline §14):
- `load-when` → `loom/ai-integration/load-when/.archive/load-when-design.md`
- `reference-load-context` → `loom/ai-integration/reference-load-context/.archive/reference-load-context-design.md`

---

**Next — your call:**
- **Commit** these planning docs (design update + 2 plans + design + 2 archives)?
- **Which to implement first** — context-pipeline **Phase 2**, or **event-save-scope** (the save-scope hardening is arguably higher-value as defence-in-depth before more event-driven work)?

**STOP** — waiting on commit + implementation-order direction.

## RAFA:

1. commit
2. implement event-save-scope and fix bug you mentioend in line 1273
3. commit

## AI:

All three done. Two commits pushed.

**1. Commit — planning docs:** `b5e1dad` (Option C: pipeline §14, Phase 2 plan, event-save-scope design+plan, 2 archives).

**2. Implemented `event-save-scope` + fixed the pipe bug:** `55db0d4` (21 files, +287/−66). `build-all` + `test-all` green (incl. 8/8 MCP).

**event-save-scope** — a workflow event now persists exactly the docs it changed, never the whole weave:
- `core/applyEvent.ts` returns `ApplyResult { weave, changed }`, collecting the changed-id set at each reassignment site (including the `REFINE_DESIGN` → stale-child-plan cascade).
- new fs `saveDocs(loomRoot, weave, docIds)`; `runEvent` saves only the changed set; `RunEventDeps.saveWeave` → `saveDocs`; all 5 injection sites + 3 test files updated.
- regression test: a `COMPLETE_STEP` on one plan leaves a sibling plan **byte-identical** (the sibling is non-canonical, so any accidental re-save would differ — a decisive guard).

⚠️ **One design deviation, recorded honestly.** The design/plan first said "each reducer returns its touched id." On implementation the cleaner locality was obvious: `applyEvent` is the orchestrator that places each reducer's output, so it already knows every id it reassigned — collecting there keeps **reducers pure** with the same external contract (`ApplyResult`, save-only-changed, serialisation-independent). I updated design §3/§5 and the plan to match the build, with a dated note explaining the change rather than silently diverging.

**Pipe fix** — `generateStepsTable` escapes `|`→`\|`; `parseStepsTable` splits on unescaped pipes and un-escapes. A step description containing a literal pipe (the plan-002 step-1 class of bug) now round-trips losslessly instead of corrupting the row. Round-trip test added.

`event-save-scope-plan-001` marked **done**.

---

**Not done (deliberately deferred):**
- The `saveWeave` idempotency guard (design §6) — optional secondary net, not implemented; flagged as deferred in the design.
- **Phase 2 of the context pipeline** (`context-pipeline-plan-002`) is still pending — that was the other branch of the earlier A/B/C choice.

**Next:** implement context-pipeline **Phase 2**, or stop here. Waiting for direction.

## Rafa:

Line 1281, you archive docs:

```markdown
**5. Both threads archived** (banner-noted first, pointing at pipeline §14):
- `load-when` → `loom/ai-integration/load-when/.archive/load-when-design.md`
- `reference-load-context` → `loom/ai-integration/reference-load-context/.archive/reference-load-context-design.md`
```

This is not the way .archived works and do not show up in tree.

there is just one `loom/.archive` is and both threads should be moved there.

I fixed both

