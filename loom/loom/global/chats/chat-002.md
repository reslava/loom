---
type: chat
id: ch_01KT9WBDNPVE8M5KEEBFFFMBK2
title: update README
status: done
created: "2026-06-04T00:00:00.000Z"
updated: 2026-06-05
version: 2
tags: []
parent_id: null
requires_load: []
---
# update README

## Rafa:

### Main README.md

GIF is in `VS Code Extension` section
but I think should be the first user watch to catch inmediately his attention

move the GIF above 

## AI:

Agreed — the workflow demo is the single strongest "show, don't tell" asset in the README, and right now it's buried at line 225 inside **VS Code Extension**, after ~220 lines of prose. A first-time visitor has to scroll past The Problem / What Loom Does / Fresh-Scoped-Auditable / How Loom is Different before they ever see the thing move. That's backwards: the GIF should hook them, then the prose explains what they just watched.

**Recommendation: hero placement, right under the intro block.** Put it immediately after the value-prop + User Guides line + quote (after the `Context / Reference` icon table, line ~17), before `## The Problem`. That way the order is:

1. Title + one-line value prop
2. User guide links + Rafa quote
3. 🎬 **demo GIF** ← first motion the eye catches
4. The Problem → What Loom Does → …

**On duplication:** keep it a *single* copy. Commit `2836bc6` already de-duped the GIF down to one copy in the VS Code section — if we move it to the hero, we should *remove* it from the VS Code section (line 225), not leave two. I'd keep the 🎬 caption line ("See the loop in motion…") with it as the hero caption, and leave a plain text pointer in the VS Code section instead.

Two small open questions before I touch the file:
- **Caption wording at the hero spot** — keep the current "See the loop in motion — one project taken chat → … → done" caption, or tighten it for a top-of-page hero?
- **The VS Code section** — drop the GIF entirely there and rely on the hero, or replace it with a still screenshot of the panel (different asset, shows the static UI)?

Say `go` and I'll move it (single copy, hero spot, GIF removed from the VS Code section). README.md is at repo root, so this is a normal file edit — outside the MCP gate.

## Rafa:

Is worth to keep the section `Status`?
I don't think so, you?
Suggestion to improve the main README and CLI, extension READMEs?

## AI:

**Status section — agree, drop it.** Every row is ✅ Shipped, so it carries almost no signal: it reads like an internal changelog, and an all-green "everything works" table near the bottom of a public README is the kind of thing a skeptical visitor skims past. Worse, it's a *maintenance tax that lies over time* — the moment something ships and the table isn't updated, it's stale and makes the project look unmaintained. The version numbers (v0.5.0, v0.7.0…) belong in CHANGELOG/releases, not the front page.

What I'd do instead: cut the section, and if you want to preserve the "it's real, not vaporware" signal, fold a single line into the intro or Quick Start — e.g. *"Shipped and on npm: `npm i -g @reslava/loom`."* The npm badge + marketplace link do that job better than a table.

---

**Cross-README suggestions.** Reading all three together, the biggest issue isn't any single file — it's that they don't agree with each other. A few concrete things:

**1. The MCP-config story contradicts itself (highest priority).**
- Main README's MCP block (the `mcpServers` JSON) has **no `"type": "stdio"`** field; CLI and extension READMEs both include it. Pick one and make all three identical.
- More important: the **CLI README says `loom install` writes `.mcp.json` for you** (line 30), but the **main README and extension README both tell the user to hand-write `.mcp.json`**. That's a real contradiction — a new user follows the main README, manually creates a file `loom install` was going to generate, and may clobber it. Decide the truth (does install write it or not?) and make every README say the same thing. If install writes it, the others should say "already wired up by `loom install` — shown here for reference."

**2. Three different one-liners for the same product.**
- Main: "Document-native workflow for AI-assisted development."
- CLI: "Weave ideas into features with AI."
- Extension: "AI-assisted workflow for VS Code."

Not necessarily wrong (each has an audience), but the *core* tagline should be one canonical sentence reused everywhere, with the surface-specific spin added, not replaced. Right now they feel like three different products.

**3. Main README is front-loaded with problem/prose before the reader knows what it looks like.** Moving the GIF to the hero (done) fixed the worst of it. The next lever: **The Problem** is ~17 lines before **What Loom Does**. Consider tightening The Problem to ~3 bullets — the GIF now does the hook, so the prose can be leaner.

**4. CLI README is missing the visual + guide links the other two have.** It has no GIF and no 📚 guide-links line. At minimum add the same `📚 Guides:` line (with absolute github URLs, like the extension uses) so npm-page visitors can reach the docs. A small "what this looks like" GIF wouldn't hurt either, since npm renders it.

**5. Drop the Status table from main, and audit the Architecture section for length.** The Architecture block in the main README duplicates what's in `architecture-reference.md`. A README should *point* to deep references, not inline them. Could shrink to the one-line layer diagram + a link.

---

**Priority order if you only do a few:** (1) reconcile the `.mcp.json` install story across all three — that's a correctness bug, not polish. (2) drop Status. (3) add guide-links to the CLI README. (4) canonical tagline. The rest is optional tightening.

Want me to make a focused pass — drop Status + fix the `.mcp.json` contradiction across all three READMEs — in one commit? I'd want your call on the install question first: **does `loom install` write `.mcp.json`, or does the user create it by hand?** (CLI README claims the former.)

## Rafa:

Do all improvements
Cross refer repo, CLI and extension links in all readmes
I think `loom install` write `.mcp.json`, verify it and reconcile the readmes

## AI:

Done — all improvements applied across the three READMEs.

**Verified first:** `loom install` *does* write `.mcp.json` to the project root (`installWorkspace.ts:272-287`), with the canonical config including `"type": "stdio"`, skipping if the file exists unless `--force`. So the CLI README was correct and the other two were wrong. Reconciled to match reality.

**Main `README.md`**
- 🔗 cross-link line added (GitHub repo · CLI on npm · VS Code Marketplace).
- MCP JSON: added missing `"type": "stdio"` + note that `loom install` writes it automatically ("shown for reference").
- **The Problem** tightened — dropped the throat-clearing intro paragraph, bolded the three bullets.
- **Architecture** shrunk — replaced the 6-line per-layer list with one sentence + a pointer to the Architecture Reference (no longer duplicating the deep doc).
- **Status** section removed entirely.

**CLI `README.md`** (`packages/cli`)
- Canonical tagline as the lead ("Document-native workflow for AI-assisted development.").
- 🔗 cross-links + 📚 guide-links lines added (it had neither).
- Workflow demo GIF added (absolute raw-github URL so npm renders it).
- MCP story was already correct — left as is.

**Extension `README.md`** (`packages/vscode`)
- Canonical tagline added under the H1.
- 🔗 cross-links line added (it already had 📚 guides).
- Fixed the `.mcp.json` framing: "Add `.mcp.json`…" → "`loom install` already wrote `.mcp.json`… shown here for reference."

All three now share one canonical tagline, the same 🔗 repo/CLI/extension links, and a single consistent `.mcp.json` story. Ready to commit when you give the word.