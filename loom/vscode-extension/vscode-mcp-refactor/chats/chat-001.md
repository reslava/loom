---
type: chat
id: ch_01KV8NMWERXE6R360WTXJY15ZC
title: Close the vscode-fs layer gap
status: done
created: 2026-06-16
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 11
---
# Close the vscode-fs layer gap

## Rafa:

This is chat loom/core-engine/roadmap/chats/roadmap-chat-006.md continuation
I moved the conversation here, to continue in the thread, this is the active chat now

plan deleted
create it again




## AI:

Recreated cleanly — `plans/vscode-mcp-refactor-plan-003.md`, status `active`. Passing `steps` as a real array did it: `loom_list_plan_steps` returns all 11, no body leak, the `## Steps` table generated correctly. (The malformed wire-format was the only difference; the content is identical to what I'd described.)

**The 11 steps, in dependency order:**

*Build the missing MCP surface first (tools → app use-case + wrapper + register):*
1. `loom_create_weave` (IN3)
2. `loom_delete` — doc or thread/weave folder (IN3)
3. Extend `loom_archive` to folders (IN3)
4. `loom_restore` (IN3)

*Then migrate the commands onto those tools (remove fs/app, thin callers):*
5. `threadCreate` + `weaveCreate` → drops the eager `chats/`, fixes the `thread.md` bug (IN3/IN4/C1)
6. `deleteItem` (IN3/IN4/C1)
7. `archiveItem` + `restoreItem` (IN3/IN4/C1)
8. `validate` → MCP diagnostics surface, kills the only `vscode→app` import (IN4/C1)
9. `addRequiresLoad` refs picker → MCP resource (IN4/C1)

*Then lock it in:*
10. Import guard test — fails the build on any `fs`/`fs-extra`/`app` import under `packages/vscode/src` (C1/IN4)
11. Build + test + Extension-Host smoke test

Dependencies are encoded by order (tools before their consumers, guard second-to-last so it goes green exactly when the last import dies), so `loom_do_step` will walk it top to bottom. No `blockedBy` needed.

Two notes before any implementation:
- Steps 8 and 9 introduce **new read surfaces** (`loom://diagnostics` and `loom://refs`) — a design choice (resource vs tool) I flagged inside those steps; worth a look when we reach them.
- I should still log the `loom_create_plan` serialization glitch as a finding on the core-engine roadmap so the tool gets hardened — want me to, or let it ride since a clean retry worked?

Plan is ready to start whenever you want (`loom_start_plan` → `do-next-step`).

STOP — waiting for direction: start the plan, or review it first?

## AI:

👍 Plan locked in as good. It's sitting at `status: active`, ready to go.

Whenever you want to begin, the entry is `loom_start_plan` (→ `implementing`), then `do-next-step` walks it from step 1 (`loom_create_weave`). I'll stop between steps per the usual rule unless you authorize a range.

Still open, your call when convenient: should I log the `loom_create_plan` serialization glitch as a finding on the core-engine roadmap so the tool gets hardened?

## Rafa:

Yes, log the `loom_create_plan` serialization glitch
plan started
do whole plan

## AI:

Steps 1–9 done and **`build-all` is green** (core→fs→app→mcp→cli→vscode all compile). What's there: `loom_create_weave`, `loom_delete`, folder-aware `loom_archive`, `loom_restore` (each app use-case + tool + registered); `threadCreate`/`weaveCreate`/`deleteItem`/`archiveItem`/`restoreItem`/`validate`/`addRequiresLoad` all migrated off raw `fs`; the only `vscode→app` *import* (`validate.ts`) gone via a new `loom_validate` query tool; and a `loom://refs` resource backing the requires_load picker.

**Stopping at step 10 (the guard) — it surfaced violators the commands-only audit missed.** Besides `claudeTerminal.ts` (the intended tmpfile carve-out), four more files under `packages/vscode/src/` still import `fs`/`app`:

| File | Uses | Verdict |
|---|---|---|
| `diagnostics.ts` | `validate` from app **+ fs-extra** | **migrate** — a *second* `vscode→app` import; same fix as the command (`loom_validate`). I missed it because it's not under `commands/`. |
| `services/tokenEstimatorService.ts` | `fs.readFileSync` a doc to count tokens | **migrate** — read-only; `loom://docs/{id}` already exists as the MCP equivalent. |
| `extension.ts` | `fs.existsSync('.loom')`, reads `.loom/CLAUDE.md` at **activation** | **carve-out** — runs before MCP is connected (chicken-and-egg) and reads `.loom/` *config*, not `loom/` docs. The layering rule is about loom-doc ops + app coupling, so this is principled, not a cop-out. |
| `tree/treeProvider.ts` | one `fs.existsSync(loomDir)` guard | **borderline** — could route through `loom://state`, or carve out as a cheap bootstrap guard. |

So the guard can't just go green over the current tree. Three ways to land it:

- **A (recommended):** migrate `diagnostics.ts` (→ `loom_validate`) and `tokenEstimatorService.ts` (→ `loom://docs/{id}` read) now — they're real violations with clean MCP equivalents — and carve out the genuine bootstrap reads (`extension.ts` activation, `treeProvider` guard) with explicit comments. Guard then bans `fs`/`fs-extra`/`@reslava-loom/app` everywhere under `packages/vscode/src/` **except** a small, commented, justified whitelist (`claudeTerminal`, `extension`, `treeProvider`). Fully closes the hole; ~2 more files of work.
- **B:** scope the guard to `commands/` only for now; file follow-up steps for `diagnostics`/`tokenEstimator`/bootstrap. Lands today, partial coverage.
- **C:** whitelist all current violators as known debt; guard only blocks *new* ones. Cleanest to land, but leaves `diagnostics.ts`'s app import standing — which is the exact thing we're trying to kill.

My recommendation is **A** — it's the only option that actually removes the second `vscode→app` import, and the carve-outs are defensible (pre-MCP `.loom/` config reads, not loom-doc mutations). It widens the plan by two files; I'd add them as steps 10a/10b before the guard.

How do you want the guard scoped — A, B, or C? (And if A, are you OK carving out `treeProvider`'s single `existsSync` guard, or should that route through `loom://state` too?)

STOP — waiting on the guard-scope call.

## AI:

Going with A + `treeProvider` through `loom://state`. Final scope for step 10:

- Migrate `diagnostics.ts` → `loom_validate`.
- Migrate `tokenEstimatorService.ts` → `loom://docs/{id}` read.
- Migrate `treeProvider.ts`'s `existsSync(loomDir)` guard → `loom://state`.
- Carve out only `claudeTerminal.ts` (tmpfile) and `extension.ts` (pre-MCP `.loom/` activation reads), both commented.
- Then the guard test bans `fs`/`fs-extra`/`@reslava-loom/app` under `packages/vscode/src/` except that two-file whitelist.

Implementing now; will report when the guard goes green.

## AI:

✅ **Plan done** (`vscode-mcp-refactor-plan-003`, all 11 steps, auto-closed). `build-all` + `test-all` both green.

**What shipped:**
- **4 new MCP tools** (app use-case + wrapper + registered): `loom_create_weave`, `loom_delete` (doc or thread/weave folder), folder-aware `loom_archive`, `loom_restore`. Archive's old raw-`fs.move` logic moved into an app use-case along the way.
- **`loom_validate`** query tool + **`loom://refs`** resource (new read surfaces).
- **9 files de-coupled from fs/app**: `threadCreate`, `weaveCreate`, `deleteItem`, `archiveItem`, `restoreItem`, `validate`, `addRequiresLoad`, `diagnostics`, `tokenEstimatorService`, `treeProvider` — all now reach Loom only through the MCP client. The original bug (`thread.md` not written on create) is fixed, and both `vscode→app` imports (`validate.ts`, `diagnostics.ts`) are gone.
- **The guard**: `tests/vscode-no-fs-imports.test.ts` fails the build on any `fs`/`fs-extra`/`@reslava-loom/{app,fs}` import under `packages/vscode/src` (whitelist: `claudeTerminal`, `extension` bootstrap — both commented). Wired into `test-all`. This is the durable answer to your "essential the chain isn't broken again."

**One regression I caught and fixed** (honest note): my archive/delete/restore/createWeave tools first resolved paths via `getActiveLoomRoot(root)`, which falls back to cwd when the root has no `.loom/` — that broke `resolution-dx.test.ts` (it resolved against the real loom instead of the test fixture). Fixed to use the server-provided `root` directly; full suite green after.

**Your move — the live smoke test.** ⚠️ It needs a **Reload Window** (rebuilt extension) **and a fresh MCP server** — the session's running `loom mcp` is stale, so the new tools + `loom://refs` aren't live yet. Once reloaded: create / delete / archive / restore a weave + a thread, confirm `thread.md` appears on create, run validation, open the requires_load picker. If anything misbehaves there, that's where to look first (extension launch + MCP restart, per the usual gotcha).

Next: waiting on your smoke-test result, or anything you want adjusted.

## Rafa:

I rebuild extension, reload...
Fast smooke test
create new thread, thread.md created, archive, restore, delete all OK

this has been big refactoring cause good architecture design not proper followed

I wonder if more layers chain are broken

cli -> app -> fs -> core
are cli direct calls to fs also?

any other possible chain break?

## AI:

Smoke test passing is the real confirmation — thanks. I audited every layer's imports. Good news: the CLI is **not** the disaster the vscode layer was. The one genuine break is elsewhere.

### CLI → fs: mostly by-design, not a break

I checked all ~30 CLI commands. Almost every one **imports its app use-case** (`weaveIdea`, `weaveDesign`, `weavePlan`, `completeStep`, `finalize`, `rename`, `validate`, `getState`, `searchDocs`, `getStaleDocs`, `getBlockedSteps`, `runEvent`, …). The `fs-extra` + `fs/dist` imports sitting next to them are **dependency injection**: the CLI builds `{ getActiveLoomRoot, saveDoc, loadWeave, … }` and passes them *into* the app use-case.

That's the intended pattern. `cli` and `mcp` are **composition roots** — the place where `app`'s injected deps get wired (your own rule: "every app use-case receives its dependencies explicitly via a `deps` argument"). So a composition root importing `fs` is correct; it's how `fs` reaches `app`. This is exactly why the vscode guard bans `fs` there but the MCP tools import it freely: vscode is a UI *client* that must go through MCP, whereas cli/mcp are the roots. **The vscode break was real because those commands did raw `fs.ensureDir` *instead of* calling the app use-case. I found no CLI command doing that** — `weaveIdea` et al. all delegate. (A handful of read-only commands — `roadmap`, `context`, `resources`, `catalog` — resolve the root and call `core`/a resource directly without `app`; minor, read-only, low-risk.)

### The real break: `core` is not pure

`packages/core/src/registry.ts` — `ConfigRegistry` — imports `fs-extra`/`os`/`yaml` and **reads/writes `~/.loom/config.yaml` in its constructor**. That's filesystem IO living in `core`, which the contract says is "Pure domain logic. No IO. No side effects." It's imported widely (cli `list`/`switch`/`current`/`init`/`setup`/`install`, and `getActiveLoomRoot`'s registry fallback), so the impurity has spread. This is the same class of drift you flagged: a layer doing something its contract forbids.

The clean fix: split it — keep the pure registry *model/operations* in `core` and move the file load/save into `fs` (e.g. a `registryRepository`), or move `ConfigRegistry` wholesale to `fs`. Either restores "core has zero IO."

### The rest of the chain is clean

- `fs` → imports `core` only. No `app`/`cli`/`mcp` imports. ✓
- `app` → no imports of `cli`/`mcp`/`vscode` (never imports upward). ✓
- `core` → pure **except** `registry.ts`. ✓ otherwise
- `mcp` → `app` (+ `fs` for DI). By-design. ✓

### Recommendation

Two things, if you want them — both are separate small threads, not urgent:
1. **Fix the core-purity break** — move `ConfigRegistry`'s IO into `fs`.
2. **Add a `core`-purity guard test** (sibling to `vscode-no-fs-imports`): fail the build if anything under `packages/core/src/` imports `fs`/`fs-extra`/`node:fs`. That's the mechanical enforcement that stops *this* layer from drifting again — same philosophy you just endorsed for vscode. It'd go red right now on `registry.ts`, so it lands *after* the fix.

Want me to spin up a thread/plan for the `core` purity fix + guard, or just log it as a finding for later?

STOP — your call.

## Rafa:

yes, spin up a thread/plan for the `core` purity fix + guard

(letting pending stuff parked is dangerous)

we also have pending: `loom_create_plan` serialization glitch, I even do not remember where landed?

## AI:

Agreed — parking findings is how drift accumulates. Doing both:

**The `loom_create_plan` glitch landed** in `loom/core-engine/roadmap/chats/roadmap-chat-006.md` — as a FINDING block (symptom: large `steps` array dropped to `[]` + the `<parameter name="steps">` wire-wrapper leaking into the body; root-cause guess: stringified-blob `steps` not coerced/validated; hardening candidates listed). It's just a chat note, so it counts as "parked." I'll promote it to a tracked thread too.

So I'll spin up **two** threads in `core-engine`:
1. `core-purity` — move `ConfigRegistry`'s IO out of `core` into `fs`, + a core-purity guard test (idea + plan).
2. `create-plan-hardening` — formalize the serialization-glitch finding (idea), so it's tracked for a fix.

Creating them now.

## AI:

Both threads are up in `core-engine` (nothing parked now):

**1. `core-purity`** — idea + plan ready.
- Idea: `loom/core-engine/core-purity/core-purity-idea.md`
- Plan: `core-purity-plan-001` (`status: active`, 5 steps, verified clean): (1) move `ConfigRegistry` IO → `fs` repository; (2) repoint all importers, drop the core export; (3) verify core is IO-free; (4) add `tests/core-no-fs-imports.test.ts` guard + wire into `test-all`; (5) build + full suite.

**2. `create-plan-hardening`** — idea only (deliberately no plan yet).
- Idea: `loom/core-engine/create-plan-hardening/create-plan-hardening-idea.md`
- Captures the `loom_create_plan` glitch (symptom, suspected cause, 3 hardening candidates: validate-don't-silently-empty, reject body-leak, post-write length assertion). I held off on a plan because the root cause is still a **hypothesis** — the first real step is to reproduce and isolate it in code, then plan the fix. Promoting it to a thread means it's tracked instead of buried in `roadmap-chat-006.md`.

Both threads will show on the roadmap (thread.md auto-scaffolded). Neither is started/implementing.

Where to next?
- Start `core-purity-plan-001` (it's well-scoped, low-risk — I have 95% confidence)?
- Or dig into `create-plan-hardening` first to confirm the root cause?
- Or park both as tracked backlog and stop here?

STOP — your call.