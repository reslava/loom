---
type: chat
id: ch_01KRKKP7W1KG3B3FD7Y5VA1547
title: MVP ready to publish vsix
status: active
created: 2026-05-14
version: 1
tags: []
parent_id: null
requires_load: []
---
# CHAT

## Rafa:

Are we ready to publish MVP vsix 0.5.0?
We have plan `loom/mvp/mvp/plans/mvp-plan-to-publish-plan.md` phases 4, 5, 6 pending

We also have this `loom/mvp/tutorial/plans/tutorial-plan-001.md` plan pending

What you think?

Do you see any pendind gap before MVP?


## AI:

**Not ready yet — phases 4–6 have 19 steps pending. Here's the honest read:**

## Where we stand

Phases 0–3 are fully ✅ (steps 1–19). That's a strong base: all buttons wired, `loom install` working, AI commands through MCP sampling, empty-workspace UX polished.

What remains is the publish gate itself (phases 4–6):

**Phase 4 — Marketplace blockers (steps 20–26):** These must be done before `vsce publish` will even be accepted.
- Step 20: `vsce package` warnings clean-up — hard blocker, marketplace rejects dirty packages
- Step 21: README rewrite — users won't understand the extension without it
- Step 22: Icon at 128×128 minimum — marketplace requirement
- Step 23: Strip dev `console.log` — minor but required for a clean release
- Step 24: Publisher account PAT — **do this first**, it's external (Azure DevOps) and can't be done last-minute
- Step 25: LICENSE files in all published packages — legal requirement
- Step 26: `resources/templates/list` MCP handler — fixes `-32601` on Continue.dev; worth doing now while it's a known gap

**Phase 5 — Docs sweep (steps 27–31):** Can run in parallel with phase 4. Mostly `loom/refs/` rewrites and CLAUDE.md template review. None block the vsix package step but all should land before publish.

**Phase 6 — Publish (steps 32–38):** Version bump, changelog, final clean build+test, package vsix, publish, npm publish, git tag. Sequential, gates everything.

## Tutorial plan — NOT a blocker

`tutorial-plan-001` is in `draft` and all 5 steps pending. It's aspirational onboarding — but:
- The plan itself says "do not write it before plan-008 and vscode-tests-plan-001 polish are done — the GIF will be wrong."
- Step 21 of the publish plan (README marketplace rewrite) covers the minimum users need to get started.
- The GIF + full tutorial can be a 0.5.1 follow-up once UX is fully locked.

I'd set the tutorial plan aside for MVP and not treat it as a blocker.

## Critical path to publish

```
Step 24 (PAT) ← start immediately, external
   ↓
Steps 20–23, 25–26 (Phase 4 blockers) ← can batch these in one session
   ↓ parallel with ↓
Steps 27–31 (Phase 5 docs sweep)
   ↓
Steps 32–38 (Phase 6: bump → build → package → publish)
```

Realistic scope: 2–3 focused sessions. Nothing here is architecturally risky — it's all polish, packaging, and external account work.

**Recommendation:** Start Phase 4, step 20 (`vsce package` warnings) first — it tells you exactly what the marketplace will reject and may surface a few extra items. Do step 24 (PAT) in parallel since it's external.

## Rafa:

Do Step 20

## Rafa:

### -chat-NNN.md docs
i see you did not recognize this doc loom/mvp/mvp/chats/mvp-chat-001.md as a chat doc and you did not reply inside it.
loom and also claude cli should recognize -chat-NNN.md as a chat docs, update CLAUDE.md or whatever need it

### PAT
in the first vsix I made with you this is the command I used to publish:
npx vsce publish --pat NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
correct?

reply inside this chat doc

## AI:

### Chat doc recognition — fixed

You're right. The rule said `whenever a -chat.md doc` — but chat files are named `*-chat-NNN.md` (e.g. `mvp-chat-001.md`), so the pattern didn't match and I treated the session as non-chat. Fixed in both:

- `CLAUDE.md` (root) — rule now says "any file matching `*-chat.md` or `*-chat-NNN.md`, i.e. `type: chat` in frontmatter"
- `packages/app/src/installWorkspace.ts` (template) — same fix

The two files are kept in sync as required by the CLAUDE.md contract.

### PAT

Yes, `npx vsce publish --pat <PAT>` is correct. That's the direct command for step 36. The publisher account (`reslava`) needs to exist on the VS Code marketplace first (marketplace.visualstudio.com/manage), and the PAT must have **Marketplace → Publish** scope in Azure DevOps.

If you already have the PAT from the first publish, the same one works — PATs don't expire unless you set a short TTL or rotate them.

## Rafa:

Do 27-31

## AI:

Steps 27–31 done. Summary:

**27 — vision-reference.md** — "Beyond Loom-on-Loom" section retitled "Who Loom is for". Rewritten to lead with any-project use case; Loom-on-Loom repositioned as a stress test footnote, not the headline.

**28 — getting-started.md** — Created `loom/refs/getting-started.md`: six-step guide (install CLI → extension → `loom install` → connect agent → first chat → generate idea). Linked from marketplace README under a new Documentation section.

**29 — architecture-reference.md** — Chat doc location table was missing weave-level chats. Fixed: now lists thread-, weave-, and refs-scoped.

**30 — workflow-reference.md** — No drift. The doc describes abstract phases (chat, generate, refine, implement, done) with no hardcoded button/command IDs, so the `new → weave` rename didn't affect it.

**31 — installWorkspace.ts template** — Removed the "Maintainer note (Loom repo only)" block from the top of `LOOM_CLAUDE_MD`. Outside users don't need to know about the two-surface sync contract; that lives in the recursive CLAUDE.md for Loom contributors only.