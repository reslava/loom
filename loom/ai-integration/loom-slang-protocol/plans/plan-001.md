---
type: plan
id: pl_01KX95FKR61M4YHDWX4X930NSS
title: Ship the Loom slang protocol (doc + contract)
status: done
created: 2026-07-11
updated: 2026-07-11
version: 1
design_version: 1
tags: []
parent_id: de_01KX93MWNFW1BVNFCDNM07RSA4
requires_load: []
target_version: 0.1.0
actual_release: 1.23.0
steps:
  - id: author-the-canonical-slang-reference
    order: 1
    status: done
    description: Create loom/refs/loom-slang-reference.md (via loom_create_reference) with the canonical vocabulary table, each word's trigger context and exact tool/command mapping, the `do` execution-namespace framing, the explicit multi-tool chains (reply, do step), the docs done recipe (idea+design+chats→done; never plans; req stays locked; report open plans), the stop-rule alignment (do step {N} stops; do steps/do plan run through; rules 2 & 3 still interrupt), and the explicit rejections (no single-letter aliases; no slang for self-naming commands; docs done is a documented recipe, not a command).
    files_touched: [loom/refs/loom-slang-reference.md]
    blocked_by: []
    satisfies: []
  - id: add-a-loom-slang-section-to
    order: 2
    status: done
    description: Add a 'Loom slang' section to docs/WAYS-TO-USE-LOOM.md that summarizes the vocabulary and links loom-slang-reference.md, framed for the ② Power terminal / ③ Pure agent ways where the words remove real friction. Verify the availability clause still holds (no way advertises a capability the slang can't reach).
    files_touched: [docs/WAYS-TO-USE-LOOM.md]
    blocked_by: []
    satisfies: []
  - id: add-the-shared-slang-rule-to
    order: 3
    status: done
    description: "Add a shared slang rule to CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts, each carrying a matching <!-- rule:loom-slang --> marker with voice tailored per surface. The rule directs every Loom AI to treat the slang words as canonical and fire them only in their trigger context. Honor the doc-sync contract: both markers must match or tests/claude-md-sync.test.ts fails."
    files_touched: [CLAUDE.md, packages/app/src/installWorkspace.ts]
    blocked_by: []
    satisfies: []
  - id: build-test-and-verify-parity
    order: 4
    status: done
    description: Run ./scripts/build-all.sh then ./scripts/test-all.sh; confirm tests/claude-md-sync.test.ts passes (rule-set parity across both CLAUDE.md surfaces). No runtime code changed, so this is doc/contract verification only.
    files_touched: []
    blocked_by: [author-the-canonical-slang-reference, add-a-loom-slang-section-to, add-the-shared-slang-rule-to]
    satisfies: []
---
# Ship the Loom slang protocol (doc + contract)

## Goal

Ship the canonical Loom slang vocabulary as documentation + session-contract work, with no code changes — every word maps onto existing tools. Deliver a canonical reference doc, a user-guide section, a shared rule mirrored across both CLAUDE.md surfaces, and extension launch-prompt coverage, so every Loom AI treats the seven words (read {path}, reply, do quick, do step {N}, do steps {N,M}/{N-Z}, do plan, docs done) deterministically in their trigger context instead of guessing. docs done stays a documented recipe (sweep idea+design+chats→done, never plans, req stays locked, report open plans), not a command.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create loom/refs/loom-slang-reference.md (via loom_create_reference) with the canonical vocabulary table, each word's trigger context and exact tool/command mapping, the `do` execution-namespace framing, the explicit multi-tool chains (reply, do step), the docs done recipe (idea+design+chats→done; never plans; req stays locked; report open plans), the stop-rule alignment (do step {N} stops; do steps/do plan run through; rules 2 & 3 still interrupt), and the explicit rejections (no single-letter aliases; no slang for self-naming commands; docs done is a documented recipe, not a command). | loom/refs/loom-slang-reference.md | — | — |
| ✅ | 2 | Add a 'Loom slang' section to docs/WAYS-TO-USE-LOOM.md that summarizes the vocabulary and links loom-slang-reference.md, framed for the ② Power terminal / ③ Pure agent ways where the words remove real friction. Verify the availability clause still holds (no way advertises a capability the slang can't reach). | docs/WAYS-TO-USE-LOOM.md | — | — |
| ✅ | 3 | Add a shared slang rule to CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts, each carrying a matching <!-- rule:loom-slang --> marker with voice tailored per surface. The rule directs every Loom AI to treat the slang words as canonical and fire them only in their trigger context. Honor the doc-sync contract: both markers must match or tests/claude-md-sync.test.ts fails. | CLAUDE.md, packages/app/src/installWorkspace.ts | — | — |
| ✅ | 4 | Run ./scripts/build-all.sh then ./scripts/test-all.sh; confirm tests/claude-md-sync.test.ts passes (rule-set parity across both CLAUDE.md surfaces). No runtime code changed, so this is doc/contract verification only. | — | author-the-canonical-slang-reference, add-a-loom-slang-section-to, add-the-shared-slang-rule-to | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
