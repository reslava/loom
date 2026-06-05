---
type: reference
id: rf_01KT4P8QYQH49VKD8P187XNMJZ
title: "Demo Script Reference"
status: active
created: 2026-06-02
version: 1
tags: [reference, internal, vscode, demo]
parent_id: null
child_ids: []
requires_load: []
slug: demo-script-reference
description: "Verbatim prompts, caption scripts, and seed assets for recording the Loom demo GIFs (D2 workflow + D3 ctx/reference). Cited by the vscode-demo plans."
load: by-request
---
Durable capture of the demo prompts and seed assets that were refined in `loom/vscode-extension/vscode-gif-demo/chats/vscode-gif-demo-chat-001.md` (now `status: done`). The recordings type these **verbatim**. Cited by the `vscode-demo` plans.

> **Naming note:** the assets below use `landing-page` / `pricing` names from the original drafting session. Use whatever the actual demo project is named at record time; the paths here are illustrative, the prompt text is verbatim.

---

## D2 — Workflow GIF

**Demo project:** small pricing-page project (3–4 files), dark theme.

### Chat opener prompt (verbatim — use exactly)

> Add a pricing section to the landing page. Three tiers — Free, Pro, Enterprise — each with price, 4 feature bullets, and a CTA button. **Pro is visually highlighted as the recommended plan.** Scope is markup + inline CSS only; no JS, no responsive QA, no interaction testing. Two deliverables: (1) a self-contained `pricing.html` snippet, (2) integration into `index.html` in the right spot. **Produce a plan of at most three steps, one per deliverable — no verification, smoke-test, browser-check, or palette-confirmation step.** That's the whole job.

**Why this wording:** "Two deliverables" + the numbered (1)(2) tells the planner the work is exactly two units; the explicit "no JS / no responsive QA / no interaction testing" closes the doors that previously produced invented QA steps; the explicit **"at most three steps … no verification, smoke-test, browser-check, or palette-confirmation step"** clause closes the gap a weaker/cheaper model still exploited (Sonnet produced a 5-step plan with a manual smoke-test from the original wording); naming `pricing.html` / `index.html` gives concrete Files-touched entries. This is the rewrite that turned a 6-step plan into a tight 2–3 step plan.

> **Acceptance bar (hard):** ≤3 steps, **no smoke-test / verification step**. If live generation produces more, re-run — do not record. This is a prompt-level hedge only; the cheap/Sonnet model still drifts without the explicit clause above, so the durable fix (hardening `packages/mcp/src/tools/generate.ts` so the planner never invents QA steps and never decomposes a single deliverable file) remains open.

### Expected plan output (2 steps)

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Create pricing.html with three-tier markup and inline CSS, Pro tier highlighted | pricing.html | — |
| 🔳 | 2 | Integrate pricing section into index.html landing page flow | index.html | — |

3 steps (e.g. splitting create/style) is acceptable for the GIF. >3 means the prompt drifted — re-tighten before recording.

### 11-scene caption script (one-line overlays)

| Scene | Action shown | Caption |
|---|---|---|
| 1 | Terminal: `loom install` | **"One command sets up the whole workspace"** |
| 2 | CONTEXT panel appears, empty tree | **"Your document graph lives in the sidebar"** |
| 3 | New Weave → name it `landing-page` | **"Start a project: create a weave"** |
| 4 | New Thread under the weave → name it `pricing-section` | **"Group the work into a thread"** |
| 5 | New Chat → type prompt → AI replies inside the doc | **"Chat with AI inside a persistent doc — not a throwaway window"** |
| 6 | Generate Idea → idea node appears | **"One click turns the conversation into a scoped idea"** |
| 7 | Generate Design → design node | **"Promote to a design — decisions recorded"** |
| 8 | Generate Plan → plan with steps table | **"Break the design into reviewable steps"** |
| 9 | Do Step → AI implements all plan steps, each marked ✅ | **"AI implements the plan, step by step — you stay in control"** |
| 10 | Done doc in tree | **"What was built is recorded. Nothing disappears."** |
| 11 | Browser: rendered pricing page | **"And the result is live."** |
| hold (2s) | — | `chat → idea → design → plan → done` |

**Scene 3–4 (weave + thread):** a chat must live inside a thread, so the demo creates the `landing-page` weave and `pricing-section` thread *before* the first chat. Use proper, real-looking names (not `test`/`foo`) — the names appear in the tree for the rest of the GIF.

**Scene 9 (implement all steps):** trigger the plan to run *all* steps in one go rather than recording a separate Do-Step take per step — keeps the GIF short. The steps still land one-by-one in the plan table (each ⬜ → ✅), so the "step by step / you stay in control" message holds; only the recording is collapsed.

**Scene 11 (final result):** after the done doc appears, cut to the rendered `index.html`/`pricing.html` in a browser so the GIF closes on a real, working web page — proof the workflow produced something, not just documents.

**Key visual:** slow the tree-update transitions to ~0.5s each — the graph building node-by-node is the hook.

---

## D3 — Ctx / Reference GIF (for Plan 002)

Same demo project, grown. **Hard prerequisite:** weave-ctx auto-load must work live (the `📄 {doc} — loaded for context` line must print before the AI reply) — verify in the extension before recording.

### Act 1 — Weave ctx prompt (verbatim)

> What sections does the landing page currently have, and what's the recommended next addition?

Caption: **"Ctx = the AI's working memory of the project. Auto-loaded, no manual context dump."**

### Act 2 — Reference + requires_load prompt (verbatim)

> Add a testimonials section. Three customer quotes with photo, name, company. Match the existing brand style.

Caption: **"Reference docs = durable facts the AI cites, never guesses."** The matching brand hex (`#4F46E5`) appearing in the generated CSS / done doc is the verifiable proof.

### Seed asset — `brand-style-reference.md` (paste into demo project before recording)

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

### Expected `Generate Weave Ctx` output (`landing-page-ctx.md`)

Use this to judge take 1 — if live generation produces 3 screens of text, the ctx-generation prompt is the bug, not the demo.

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

- **`pricing-section/`** — *status: done*. Pricing tiers built and integrated.

## Key decisions

- **Inline CSS only** — no external stylesheet, no build step. Each section is a self-contained snippet that can be reviewed in isolation.
- **Pro tier highlighting** — accent border + "Recommended" badge, not a different background color.
- **No JS** — landing page is static. Any interactivity gets added later as an explicit thread.

## Conventions in use

- Three-tier card pattern (price + 4 bullets + CTA) is the canonical "comparison card" for this project.
- Section integration into `index.html` follows source order = visual order — hero, features, pricing, (next).

## What's next (suggested)

- **Testimonials section** — social proof between pricing and footer.
- **FAQ section** — collapsible Q&A.
- **Footer** — nav, legal links, contact.

## References available

- *(none yet — `brand-style-reference.md` will be added as part of the testimonials thread)*
```

---

## Already-shipped prompt-gen fixes (context, not a to-do)

The tightening that makes the D2 prompt land ≤3 steps is **already in the codebase** — two edits to `packages/mcp/src/tools/generate.ts`, validated live (6 → 3 steps):

- **Plan prompt:** steps map to deliverables not design subsections; smallest step count; no invented QA/testing/review steps; respect scope exclusions.
- **Design prompt:** no `## Next Steps` / pre-decomposition section; respect scope exclusions.

Before recording, run `./scripts/build-all.sh` and restart any running `loom mcp` so the recording uses the current prompts (stale-after-build gotcha).

---

## Recording session settings (speed)

Agent-loop latency is the enemy of a tight GIF. Settings that matter, in order of impact:

- **Effort: Opus *low*.** The D2 prompt is hardened enough (the ≤3-step clause above) that low-effort drift risk is acceptable for a scripted recording. Medium/high buys invisible thinking budget on every reply and step — keep those for real authoring, not recording. (First run at Opus medium was 7:10 total; most of that is thinking budget the viewer never sees.)
- **Expect single-call doc creation.** `loom_create_idea/design/plan` take an optional `content` param that writes the body in the same call. The AI should create each doc in **one** call — not a `create` stub followed by `loom_update_doc`. A 3-doc run that does create+update is doing ~3 wasted round-trips. **If you see the two-call pattern when promoting via the extension's Promote buttons**, the cause is the launch prompt in `packages/vscode/src/commands/promoteTo*.ts` — those prompts must instruct a single `loom_create_*` call with `content` (as `promoteToPlan.ts` already does), not "create then loom_update_doc". This is *not* a stale `.loom/CLAUDE.md` (CLAUDE.md and the tool descriptions are already single-call; the launch prompt out-ranks them). Fix the command prompt, `build-all`, and reload the Extension Host.
- **Trim latency in post — expected, not a failure.** Even at low effort the loop won't be snappy on camera. Record the full run, then cut dead air; slow *only* the tree-update transitions (~0.5s) so the node-by-node graph build stays the visible hook. Viewers should see the loop, not the wait.
