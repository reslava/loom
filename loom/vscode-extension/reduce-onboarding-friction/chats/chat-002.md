---
type: chat
id: ch_01KWY29ATW21P7NDBG8GSA8C2J
title: reduce-onboarding-friction Chat 002
status: active
created: 2026-07-07
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# reduce-onboarding-friction Chat 002

## Rafa:

I installed new vsix 
restarted VSCode

and a popup prompt asked me:
Initialize Loom in this workspace? (creates .loom/, .mcp.json, and session rules)
when it is already installed, this is loom repo

## AI:

Reproduced and root-caused it. This is a **false "not installed" signal specific to the Loom dev repo** — not a general downstream bug.

**Why the prompt fires.** `showSetupNotification` (`packages/vscode/src/extension.ts:429`) treats the workspace as fully initialised only if **all three** are true:

1. `.loom/` dir exists — ✅ true here
2. `.mcp.json` has a `loom` server — ✅ true here
3. `.loom/CLAUDE.md` exists — ❌ **missing here**

This repo has no `.loom/CLAUDE.md`. Its session contract lives at **root `CLAUDE.md`** (the recursive contract this whole project is built around). `.loom/CLAUDE.md` is only ever written by `loom install` into *downstream* projects — this self-hosting repo predates that layout and never adopted it. So the gap signature is `claude` and the extension prompts. Downstream the three-gate check is correct (a real install always writes `.loom/CLAUDE.md`); the dev repo is the anomaly.

**Don't click "Initialize" here — it would edit files you don't want touched.** `runLoomInstall` → `loom_install {}` (no `--force`). Effect on this repo:

- `.mcp.json` — **safe**, skipped because it already exists (`installWorkspace.ts:366`). Your dev `command: "loom"` stays.
- `loom/ctx.md`, `.loom/settings.json` — safe, skipped (exist).
- `.loom/CLAUDE.md` — **created** (written unconditionally, `:319`).
- **Root `CLAUDE.md` — mutated** (`:334`): it prepends `@.loom/CLAUDE.md` + `@CLAUDE-LOCAL.md` import lines to the top of your carefully-maintained recursive contract.
- `CLAUDE-LOCAL.md` — created once.

Git-recoverable, but not what you want. **"Not now" is the correct choice.** It records `loom.setupDismissedGap="claude"` *before* showing the prompt (`:446`), so it's a **one-time prompt, not a forever-nag** — the FP1 fix is working as designed; it just won't fire again unless the gap changes.

**The one real question — should detection be tightened?** Two ways to read it:

- **(a) Leave it — the prompt is telling the truth.** This repo genuinely lacks the modern `.loom/CLAUDE.md`; it's just a dismissible one-off in the dev repo, zero downstream impact. Cheapest.
- **(b) Accept a root `CLAUDE.md` that imports the contract as satisfying the "session rules" gate.** i.e. gate 3 = `.loom/CLAUDE.md` exists **OR** root `CLAUDE.md` contains `@.loom/CLAUDE.md`. More robust for any repo (including this one, and users who keep a root contract), but slightly looser — a stale root import with a deleted `.loom/CLAUDE.md` would read as "installed."

I lean **(a)** — it's a self-hosting-only cosmetic prompt and the detection is honest for real users. Not worth widening the gate and its edge cases for the dev repo. But it's your call since it's detection semantics.

Next: waiting for your pick on (a) dismiss / (b) tighten the gate — or tell me if you're seeing this prompt in a *downstream* repo (that would make it a real bug worth chasing).

## Rafa:

(a)
commit