---
type: design
id: de_01KT4MRDAM5R9Q2N7WTM3VJDCA
title: Loom Demo Deliverables
status: done
created: 2026-06-02
updated: 2026-06-02
version: 2
idea_version: 2
tags: []
parent_id: id_01KT4MA3Z7SX80DNYAJSTH3YYV
requires_load: []
---
# Loom Demo Deliverables

## Goal

Produce the adoption-facing assets defined in the idea (D1–D4) and land them on the marketplace listing + repo README. This design fixes the format, specs each asset, and sets the production sequence.

## 1. Format decision (settled 2026-06-02)

**Two captioned GIFs, sequenced: D2 (workflow) ships first, D3 (ctx/reference) after.**

- GIF chosen for both because the marketplace README renders GIF inline (it does not embed video), and a single format keeps production and hosting simple.
- **Captions are mandatory on both** — they carry the narration a silent loop can't.
- **Sequencing is a validate-first hedge:** D2 is the easier, higher-confidence asset and proves the core loop; we publish it, gauge response, then invest in D3.

### The D3 legibility risk and its mitigation

D3's value — *"the AI already knew the project"* — is behavioral and invisible. A caption that merely *claims* "ctx auto-loaded" is unprovable to a viewer. **Mitigation: the GIF must show the on-screen `📄 {doc} — loaded for context` visibility line** in the Loom output channel before the AI's reply. That line is the closest a silent GIF gets to *proving* the AI read project context rather than grepping the repo — caption + visible evidence, not caption alone.

## 2. D1 — README updates (no recording; do first)

**vsix README (`packages/vscode/README.md`):**
- Rename "the panel" → "the CONTEXT panel" throughout.
- Full button inventory: Generate Idea, Generate Design, Generate Plan, Do Step, Refine, Promote, AI Reply, Generate Ctx, New Chat, Start Plan, Rename, Archive.
- Demo-asset placeholder at top (`media/loom-demo-workflow.gif`) with a one-line caption.

**main README (`README.md`):**
- Hero icon `packages/vscode/media/loom.png` at the top of the VS Code Extension section.
- Demo-asset placeholder right after the Workflow section.
- Exact button names in the extension bullet list.
- Link to the extension / marketplace listing.

## 3. D2 — Workflow GIF

**Demo project:** small pricing-page project (3–4 files), dark theme. Chat prompt (refined, from chat-001): a three-tier pricing section, markup + inline CSS only, two named deliverables → yields a tight 2–3 step plan.

**Scene + caption script** (captions are one-line overlays):

| Scene | Action | Caption |
|---|---|---|
| 1 | `loom install` in terminal | "One command sets up the whole workspace" |
| 2 | CONTEXT panel appears, empty tree | "Your document graph lives in the sidebar" |
| 3 | New Chat → type prompt → AI replies inside the doc | "Chat with AI inside a persistent doc — not a throwaway window" |
| 4 | Generate Idea → idea node appears | "One click turns the conversation into a scoped idea" |
| 5 | Generate Design → design node | "Promote to a design — decisions recorded" |
| 6 | Generate Plan → plan with steps table | "Break the design into reviewable steps" |
| 7 | Do Step → code appears, step ✅ | "AI implements one step at a time — you stay in control" |
| 8 | Done doc in tree | "What was built is recorded. Nothing disappears." |
| hold | — | `chat → idea → design → plan → done` |

**Key visual:** slow the tree-update transitions (~0.5s) — the graph building node-by-node is the hook.

## 4. D3 — Ctx / reference GIF (record after D2 ships)

**Continuity:** same pricing-page project, grown. **Hard prerequisite:** weave-ctx auto-load must work live (appears resolved by the 2026-05-31 ctx-load work; `assembleContext` step 2b collects weave ctx) — **verify in the extension before recording** (see §6).

**Act 1 — weave ctx:** Generate Weave Ctx → `demo-ctx.md` appears → open a fresh chat → ask "what sections exist and what's next?" → AI answers correctly **and the `📄 demo-ctx.md — loaded for context` line is visible** before the reply. Caption: "Ctx = the AI's working memory of the project. Auto-loaded, no manual context dump."

**Act 2 — reference + requires_load:** create `brand-style-reference.md` (`load: by-request`, body drafted in chat-001) → new chat asks for a testimonials section "matching brand style" → Generate Design shows `requires_load: [brand-style-reference]` in frontmatter → Do Step produces CSS using the exact brand hex (`#4F46E5`) from the reference. Caption: "Reference docs = durable facts the AI cites, never guesses." The matching hex in the done doc is the verifiable proof.

## 5. D4 — Recording infra

- **Permissions:** demo-project `.claude/settings.local.json` allowlist (Edit/Write/Read/Glob/Grep, scoped Bash, `mcp__loom`) — no `--dangerously-skip-permissions` on screen.
- **MCP freshness:** restart any running `loom mcp` after `build-all.sh` so the recording runs current code (known stale-after-build gotcha).
- **Capture:** Windows screen-to-GIF tool; dark theme; small window; target ≤ a few MB per GIF (mind marketplace/GitHub size limits — crop dead air, trim to the scene list).

## 6. Production sequence & dependencies

1. **D1 READMEs** — unblocked, do first.
2. **D2 record + publish** — needs clean `build-all` + D4 infra.
3. **Validate** D2 response.
4. **Verify weave-ctx loads live** in the extension (click Reply on a thread chat, confirm the `📄` line prints) — gates D3.
5. **D3 record + publish.**

## 7. Open questions / risks

- **GIF size budget** vs scene count — may need to split D2 or speed non-hook scenes.
- **Hosting** of full-res copies if GIF compression hurts legibility (link out from README?).
- **D3 ctx verification** — if the live check in step 4 fails, D3 is blocked on the ctx-load fix (not this thread's work) before recording.

## Vision tie

Makes the vision-reference promises ("AI as stateful as it can be via durable docs", "no manual context dump") legible to a prospective user — removing the manual step of *imagining* the workflow from prose.