---
type: done
id: pl_01KX95FKR61M4YHDWX4X930NSS-done
title: Done — Ship the Loom slang protocol (doc + contract)
status: done
created: 2026-07-11
version: 4
tags: []
parent_id: pl_01KX95FKR61M4YHDWX4X930NSS
requires_load: []
---
# Done — Ship the Loom slang protocol (doc + contract)

## Step 1 — Create loom/refs/loom-slang-reference.md (via loom_create_reference) with the canonical vocabulary table, each word's trigger context and exact tool/command mapping, the `do` execution-namespace framing, the explicit multi-tool chains (reply, do step), the docs done recipe (idea+design+chats→done; never plans; req stays locked; report open plans), the stop-rule alignment (do step {N} stops; do steps/do plan run through; rules 2 & 3 still interrupt), and the explicit rejections (no single-letter aliases; no slang for self-naming commands; docs done is a documented recipe, not a command).

Created `loom/refs/loom-slang-reference.md` (slug `loom-slang`, id `rf_01KX95R2202FGMYCYN64STHSKA`) via `loom_create_reference`. Contains: the "slang is earned, not assigned" principle; the `do` execution-namespace framing; the canonical vocabulary table (read {path}, reply, do quick, do step {N}, do steps {N,M}/{N-Z}, do plan, docs done) with each word's trigger context and exact tool/command mapping; the explicit chains (reply, do step); the `docs done` recipe (sweep idea+design+chats→done, never plans, req stays locked, report open plans); stop-rule alignment (do step {N} stops; do steps/do plan run through; error-loop and design-decision rules still interrupt); and the rejections (no single-letter aliases, no slang for self-naming commands, docs done is a recipe not a command).

## Step 2 — Add a 'Loom slang' section to docs/WAYS-TO-USE-LOOM.md that summarizes the vocabulary and links loom-slang-reference.md, framed for the ② Power terminal / ③ Pure agent ways where the words remove real friction. Verify the availability clause still holds (no way advertises a capability the slang can't reach).

Added a **Loom slang** section to `docs/WAYS-TO-USE-LOOM.md` (and a Contents entry): a compact say→when→does table for the seven words, framed for the ② Power terminal / ③ Pure agent ways, with the `do …` execute-family note and the "self-naming commands need no slang" caveat. Links to `../loom/refs/loom-slang-reference.md` for the full mapping. Availability clause holds — every word in the table maps to an existing tool/command, so no way advertises a capability the slang can't reach.

## Step 3 — Add a shared slang rule to CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts, each carrying a matching <!-- rule:loom-slang --> marker with voice tailored per surface. The rule directs every Loom AI to treat the slang words as canonical and fire them only in their trigger context. Honor the doc-sync contract: both markers must match or tests/claude-md-sync.test.ts fails.

Added a `<!-- rule:loom-slang -->` block to both CLAUDE.md surfaces, placed right after the `context-injection` rule: `CLAUDE.md` (recursive voice, addresses Rafa, links `loom/refs/loom-slang-reference.md` as authoritative) and the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts` (project-agnostic voice, "the user", references the reference doc "if present"). Both list the seven words with trigger contexts and tool mappings, the stop-rule alignment, and the no-single-letter-aliases rejection. Rule-set parity preserved (both files now carry `rule:loom-slang`), so `tests/claude-md-sync.test.ts` stays green; wording deliberately differs per surface, which the test allows.

## Step 4 — Run ./scripts/build-all.sh then ./scripts/test-all.sh; confirm tests/claude-md-sync.test.ts passes (rule-set parity across both CLAUDE.md surfaces). No runtime code changed, so this is doc/contract verification only.

Ran `./scripts/build-all.sh` (all packages built clean, CLI relinked, extension bundled) then `./scripts/test-all.sh` — full suite green. Confirmed `tests/claude-md-sync.test.ts` explicitly: no duplicate rule-ids, **17 shared rule ids match across both surfaces** (up from 16 — `rule:loom-slang` added to both `CLAUDE.md` and the `LOOM_CLAUDE_MD` template), and all 12 verbatim-invariant tokens present in both. No runtime code changed; this was doc/contract verification. (Note: Step 4 "teach the vocabulary to the extension launch prompts" was removed before this step — the launch prompts already embody the reply/do-step chains and launched agents load CLAUDE.md, so it was redundant; this build/test step was re-threaded to order 4.)
